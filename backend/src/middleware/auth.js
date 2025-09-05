const jwt = require('jsonwebtoken');
const { Agent } = require('../models');

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and attaches user info to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    
    // Attach user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user'
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional Authentication Middleware
 * Checks for token but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user'
      };
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

/**
 * Agent Ownership Middleware
 * Verifies that the user owns the agent they're trying to access
 */
const verifyAgentOwnership = async (req, res, next) => {
  try {
    const { agentId, id } = req.params;
    const targetAgentId = agentId || id;

    if (!targetAgentId) {
      return res.status(400).json({ 
        error: 'Agent ID required',
        code: 'NO_AGENT_ID'
      });
    }

    // For now, allow access to demo agents or if no user is authenticated
    if (!req.user) {
      // Allow anonymous access for demo purposes
      return next();
    }

    // Check if agent exists and user has access
    const agent = await Agent.findById(targetAgentId);
    
    if (!agent) {
      return res.status(404).json({ 
        error: 'Agent not found',
        code: 'AGENT_NOT_FOUND'
      });
    }

    // For now, allow access to public agents or owned agents
    if (agent.isPublic || agent.createdBy === req.user.userId) {
      return next();
    }

    return res.status(403).json({ 
      error: 'Access denied to this agent',
      code: 'AGENT_ACCESS_DENIED'
    });

  } catch (error) {
    console.error('Agent ownership verification error:', error);
    return res.status(500).json({ 
      error: 'Failed to verify agent access',
      code: 'OWNERSHIP_ERROR'
    });
  }
};

/**
 * Role-based Authorization Middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        code: 'INSUFFICIENT_ROLE'
      });
    }

    next();
  };
};

/**
 * Admin Only Middleware
 */
const requireAdmin = requireRole(['admin']);

module.exports = {
  authenticateToken,
  optionalAuth,
  verifyAgentOwnership,
  requireRole,
  requireAdmin
};
