/**
 * Function-based Error Handling Utilities
 */

const { NODE_ENV } = require('../config/env');

/**
 * Create standardized error response
 */
const createErrorResponse = (message, statusCode = 500, errorCode = null, details = null) => {
  return {
    success: false,
    error: {
      message,
      code: errorCode || getErrorCodeFromStatus(statusCode),
      status: statusCode >= 400 && statusCode < 500 ? 'fail' : 'error',
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      id: generateErrorId()
    }
  };
};

/**
 * Generate unique error ID for tracking
 */
const generateErrorId = () => {
  return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
};

/**
 * Get error code from HTTP status
 */
const getErrorCodeFromStatus = (statusCode) => {
  const statusCodes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE'
  };
  
  return statusCodes[statusCode] || 'UNKNOWN_ERROR';
};

/**
 * Validation error helper
 */
const createValidationError = (message, details = null, field = null) => {
  const errorDetails = details || (field ? [{ field, message }] : null);
  return createErrorResponse(message, 400, 'VALIDATION_ERROR', errorDetails);
};

/**
 * Not found error helper
 */
const createNotFoundError = (resource, id = null) => {
  const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
  return createErrorResponse(message, 404, 'NOT_FOUND', { resource, id });
};

/**
 * Authentication error helper
 */
const createAuthError = (message = 'Authentication required') => {
  return createErrorResponse(message, 401, 'AUTHENTICATION_ERROR');
};

/**
 * Authorization error helper
 */
const createAuthorizationError = (message = 'Access denied') => {
  return createErrorResponse(message, 403, 'AUTHORIZATION_ERROR');
};

/**
 * Conflict error helper
 */
const createConflictError = (resource, constraint) => {
  const message = `${resource} conflicts with existing ${constraint}`;
  return createErrorResponse(message, 409, 'CONFLICT_ERROR', { resource, constraint });
};

/**
 * Rate limit error helper
 */
const createRateLimitError = (message = 'Rate limit exceeded', retryAfter = null) => {
  const details = retryAfter ? { retryAfter } : null;
  return createErrorResponse(message, 429, 'RATE_LIMIT_ERROR', details);
};

/**
 * File processing error helper
 */
const createFileError = (message, fileName = null) => {
  const details = fileName ? { fileName } : null;
  return createErrorResponse(message, 422, 'FILE_PROCESSING_ERROR', details);
};

/**
 * External service error helper
 */
const createServiceError = (message, service = null) => {
  const details = service ? { service } : null;
  return createErrorResponse(message, 502, 'EXTERNAL_SERVICE_ERROR', details);
};

/**
 * Database error helper
 */
const createDatabaseError = (message = 'Database operation failed', operation = null) => {
  const details = operation ? { operation } : null;
  return createErrorResponse(message, 500, 'DATABASE_ERROR', details);
};

/**
 * Handle MongoDB specific errors
 */
const handleMongoError = (error) => {
  // Validation errors
  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    return createValidationError('Validation failed', details);
  }

  // Cast errors (invalid ObjectId)
  if (error.name === 'CastError') {
    return createValidationError(`Invalid ${error.path}: ${error.value}`);
  }

  // Duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    const value = error.keyValue[field];
    return createConflictError(field, `value '${value}' already exists`);
  }

  // Connection errors
  if (error.name === 'MongoNetworkError') {
    return createDatabaseError('Database connection failed', 'connection');
  }

  if (error.name === 'MongoTimeoutError') {
    return createDatabaseError('Database operation timed out', 'timeout');
  }

  // Default database error
  return createDatabaseError('Database operation failed', 'unknown');
};

/**
 * Handle JWT errors
 */
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return createAuthError('Invalid token');
  }
  
  if (error.name === 'TokenExpiredError') {
    return createAuthError('Token expired');
  }

  return createAuthError('Authentication failed');
};

/**
 * Handle Multer errors
 */
const handleMulterError = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return createFileError('File too large (max 10MB allowed)');
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return createFileError('Too many files (max 10 files allowed)');
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return createFileError('Unexpected file field');
  }

  return createFileError('File upload failed');
};

/**
 * Send error response
 */
const sendErrorResponse = (res, error, includeStack = false) => {
  // Determine if this is a known error format
  if (error.success === false && error.error) {
    // Already formatted error
    return res.status(getStatusFromErrorCode(error.error.code)).json(error);
  }

  // Handle different error types
  let errorResponse;
  
  if (error.name && (error.name.includes('Mongo') || error.name === 'ValidationError' || error.name === 'CastError' || error.code === 11000)) {
    errorResponse = handleMongoError(error);
  } else if (error.name && error.name.includes('JsonWebToken')) {
    errorResponse = handleJWTError(error);
  } else if (error.name === 'MulterError') {
    errorResponse = handleMulterError(error);
  } else {
    // Generic error
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Internal server error';
    errorResponse = createErrorResponse(message, statusCode);
  }

  // Add stack trace in development
  if (includeStack && error.stack && NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  const statusCode = getStatusFromErrorCode(errorResponse.error.code);
  res.status(statusCode).json(errorResponse);
};

/**
 * Get HTTP status from error code
 */
const getStatusFromErrorCode = (errorCode) => {
  const errorCodeMap = {
    'VALIDATION_ERROR': 400,
    'BAD_REQUEST': 400,
    'AUTHENTICATION_ERROR': 401,
    'UNAUTHORIZED': 401,
    'AUTHORIZATION_ERROR': 403,
    'FORBIDDEN': 403,
    'NOT_FOUND': 404,
    'CONFLICT_ERROR': 409,
    'CONFLICT': 409,
    'FILE_PROCESSING_ERROR': 422,
    'UNPROCESSABLE_ENTITY': 422,
    'RATE_LIMIT_ERROR': 429,
    'TOO_MANY_REQUESTS': 429,
    'INTERNAL_SERVER_ERROR': 500,
    'DATABASE_ERROR': 500,
    'EXTERNAL_SERVICE_ERROR': 502,
    'BAD_GATEWAY': 502,
    'SERVICE_UNAVAILABLE': 503
  };

  return errorCodeMap[errorCode] || 500;
};

/**
 * Async handler wrapper to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Log error details
 */
const logError = (error, req = null) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...(req && {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })
  };

  if (NODE_ENV === 'development') {
    console.error('🚨 ERROR DETAILS:', errorInfo);
  } else {
    console.error('❌ ERROR:', error.message);
  }
};

module.exports = {
  // Error response creators
  createErrorResponse,
  createValidationError,
  createNotFoundError,
  createAuthError,
  createAuthorizationError,
  createConflictError,
  createRateLimitError,
  createFileError,
  createServiceError,
  createDatabaseError,

  // Error handlers
  handleMongoError,
  handleJWTError,
  handleMulterError,
  sendErrorResponse,

  // Utilities
  asyncHandler,
  logError,
  generateErrorId,
  getErrorCodeFromStatus,
  getStatusFromErrorCode
};
