const { NODE_ENV } = require('../config/env');
const { 
  sendErrorResponse, 
  createErrorResponse,
  logError,
  generateErrorId
} = require('../utils/errorHelpers');

/**
 * Global Error Handling Middleware (Function-based)
 */
const globalErrorHandler = (err, req, res, next) => {
  // Log the error
  logError(err, req);

  // Add request ID for tracking
  if (!req.errorId) {
    req.errorId = generateErrorId();
  }

  // Determine if we should include stack trace
  const includeStack = NODE_ENV === 'development';

  // Send error response using helper
  sendErrorResponse(res, err, includeStack);
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  const errorResponse = createErrorResponse(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND',
    {
      method: req.method,
      path: req.originalUrl
    }
  );

  res.status(404).json(errorResponse);
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  req.requestId = generateErrorId();
  
  if (NODE_ENV === 'development') {
    console.log(`📥 ${req.method} ${req.originalUrl} - ${req.ip} - ${req.requestId}`);
  }
  
  next();
};

/**
 * Response time logger
 */
const responseTimeLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (NODE_ENV === 'development') {
      const statusEmoji = res.statusCode >= 400 ? '🔴' : '🟢';
      console.log(`📤 ${statusEmoji} ${res.statusCode} - ${duration}ms - ${req.requestId || 'N/A'}`);
    }
  });
  
  next();
};

/**
 * Initialize process error handlers
 */
const initializeProcessHandlers = () => {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err, promise) => {
    console.error('💥 UNHANDLED PROMISE REJECTION!');
    console.error('Error:', err.message);
    
    if (NODE_ENV === 'development') {
      console.error('Stack:', err.stack);
    }
    
    // Close server gracefully
    process.exit(1);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('💥 UNCAUGHT EXCEPTION!');
    console.error('Error:', err.message);
    
    if (NODE_ENV === 'development') {
      console.error('Stack:', err.stack);
    }
    
    process.exit(1);
  });
};

/**
 * Graceful shutdown handler
 */
const setupGracefulShutdown = (server) => {
  const shutdown = (signal) => {
    console.log(`👋 ${signal} received. Shutting down gracefully...`);
    
    server.close(() => {
      console.log('💥 Server closed. Process terminated.');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

/**
 * Development error details middleware
 */
const developmentErrorLogger = (req, res, next) => {
  if (NODE_ENV === 'development') {
    // Log request body (excluding sensitive data)
    if (req.body && Object.keys(req.body).length > 0) {
      const safeBody = { ...req.body };
      
      // Remove sensitive fields
      const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
      sensitiveFields.forEach(field => {
        if (safeBody[field]) {
          safeBody[field] = '[REDACTED]';
        }
      });
      
      console.log('📝 Request Body:', JSON.stringify(safeBody, null, 2));
    }

    // Log query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      console.log('🔍 Query Params:', req.query);
    }
  }
  
  next();
};

/**
 * Error validation middleware
 */
const validateError = (err, req, res, next) => {
  // Ensure error has minimum required properties
  if (!err.message) {
    err.message = 'An unknown error occurred';
  }
  
  if (!err.statusCode && !err.status) {
    err.statusCode = 500;
  }
  
  next(err);
};

/**
 * Security headers for error responses
 */
const securityHeaders = (req, res, next) => {
  // Add security headers to error responses
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      res.removeHeader('X-Powered-By');
      
      if (!res.getHeader('X-Content-Type-Options')) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
    }
  });
  
  next();
};

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  requestLogger,
  responseTimeLogger,
  initializeProcessHandlers,
  setupGracefulShutdown,
  developmentErrorLogger,
  validateError,
  securityHeaders
};
