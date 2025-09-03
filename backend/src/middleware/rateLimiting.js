const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Middleware Configuration
 */

// General API rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000000000 : 100, // More lenient in development
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    });
  }
});

// Strict rate limiting for chat messages
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 1000 : 20, // Very lenient in development, strict in production
  message: {
    error: 'Too many chat messages, please slow down.',
    code: 'CHAT_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many chat messages, please slow down.',
      code: 'CHAT_RATE_LIMIT_EXCEEDED',
      retryAfter: '1 minute'
    });
  }
});

// File upload rate limiting
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 5, // Very lenient in development, strict in production
  message: {
    error: 'Too many file uploads, please try again later.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many file uploads, please try again later.',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      retryAfter: '10 minutes'
    });
  }
});

// Agent creation rate limiting
const agentCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 1000 : 5, // Very lenient in development, strict in production
  message: {
    error: 'Too many agents created, please try again later.',
    code: 'AGENT_CREATION_RATE_LIMIT_EXCEEDED',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many agents created, please try again later.',
      code: 'AGENT_CREATION_RATE_LIMIT_EXCEEDED',
      retryAfter: '1 hour'
    });
  }
});

// Authentication rate limiting (for login attempts)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 5, // Very lenient in development, strict in production
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    error: 'Too many login attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    });
  }
});

// Health check rate limiting (more lenient)
const healthCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute for health checks
  message: {
    error: 'Too many health check requests.',
    code: 'HEALTH_CHECK_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Custom rate limiting based on user authentication
 */
const createAuthenticatedLimiter = (windowMs, maxRequests) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise fall back to IP
      return req.user?.id || req.ip;
    },
    message: {
      error: 'Rate limit exceeded for authenticated user.',
      code: 'USER_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Authenticated user chat limiter (more generous)
const authenticatedChatLimiter = createAuthenticatedLimiter(
  1 * 60 * 1000, // 1 minute
  process.env.NODE_ENV === 'development' ? 1000 : 50 // Very lenient in development, generous in production
);

// Authenticated user file upload limiter
const authenticatedUploadLimiter = createAuthenticatedLimiter(
  10 * 60 * 1000, // 10 minutes
  process.env.NODE_ENV === 'development' ? 1000 : 20 // Very lenient in development, generous in production
);

/**
 * Dynamic rate limiting middleware
 */
const dynamicRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    maxAnonymous = 10,
    maxAuthenticated = 50,
    message = 'Rate limit exceeded'
  } = options;

  return rateLimit({
    windowMs,
    max: (req) => {
      return req.user ? maxAuthenticated : maxAnonymous;
    },
    keyGenerator: (req) => {
      return req.user?.id || req.ip;
    },
    message: {
      error: message,
      code: 'DYNAMIC_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

module.exports = {
  // General limiters
  generalLimiter,
  healthCheckLimiter,
  
  // Feature-specific limiters
  chatLimiter,
  uploadLimiter,
  agentCreationLimiter,
  authLimiter,
  
  // Authenticated user limiters
  authenticatedChatLimiter,
  authenticatedUploadLimiter,
  
  // Utility functions
  createAuthenticatedLimiter,
  dynamicRateLimiter
};
