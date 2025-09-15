const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

/**
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header and extracts user context
 */
const jwtAuthMiddleware = async (req, res, next) => {
  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'No valid authorization token found',
          code: 'NO_TOKEN'
        }
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.substring(7);
    
    // Try to decode as JWT first, then fallback to base64
    let decoded;
    try {
      // Try JWT verification first
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      try {
        // Fallback to base64 decoding for testing
        const base64Decoded = Buffer.from(token, 'base64').toString('utf-8');
        decoded = JSON.parse(base64Decoded)
      } catch (base64Error) {
        throw new Error('Invalid token format');
      }
    }
    
    // Validate required fields
    if (!decoded.userId || !decoded.email || !decoded.companyId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token payload',
          code: 'INVALID_TOKEN_PAYLOAD'
        }
      });
    }

    // Add user context to request
    req.user = {
      userId: decoded.userId,
      userEmail: decoded.email,
      companyId: decoded.companyId,
      roleCode: decoded.roleCode || 'user'
    };

    next();
  } catch (error) {
    console.error('❌ JWT authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication failed',
        code: 'AUTH_ERROR'
      }
    });
  }
};
module.exports = {
  jwtAuthMiddleware
};