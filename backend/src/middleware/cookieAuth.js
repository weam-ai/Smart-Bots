const jwt = require('jsonwebtoken');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';

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
        decoded = JSON.parse(base64Decoded);
        console.log('🔍 Using base64 token for testing:', decoded);
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

    console.log('🔐 User authenticated via JWT:', {
      userId: req.user.userId,
      userEmail: req.user.userEmail,
      companyId: req.user.companyId
    });

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

/**
 * Optional JWT middleware for routes that don't require authentication
 * Still extracts user context if valid token is provided
 */
const optionalJwtAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔍 Optional JWT auth debug:', {
      hasAuthHeader: !!authHeader,
      authHeader: authHeader?.substring(0, 20) + '...',
      url: req.url
    });
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Try JWT verification first, then fallback to base64
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ JWT token verified:', { userId: decoded.userId, companyId: decoded.companyId });
      } catch (jwtError) {
        try {
          // Fallback to base64 decoding for testing
          const base64Decoded = Buffer.from(token, 'base64').toString('utf-8');
          decoded = JSON.parse(base64Decoded);
          console.log('✅ Base64 token decoded:', { userId: decoded.userId, companyId: decoded.companyId });
        } catch (base64Error) {
          throw new Error('Invalid token format');
        }
      }
      
      if (decoded.userId && decoded.email && decoded.companyId) {
        req.user = {
          userId: decoded.userId,
          userEmail: decoded.email,
          companyId: decoded.companyId,
          roleCode: decoded.roleCode || 'user'
        };
        console.log('✅ User context set:', req.user);
      } else {
        console.warn('⚠️ Token missing required fields:', { userId: !!decoded.userId, email: !!decoded.email, companyId: !!decoded.companyId });
      }
    } else {
      console.log('ℹ️ No valid authorization header found');
    }
    next();
  } catch (error) {
    console.warn('⚠️ Optional JWT auth failed:', error.message);
    next(); // Continue without user context
  }
};

module.exports = {
  jwtAuthMiddleware,
  optionalJwtAuth
};