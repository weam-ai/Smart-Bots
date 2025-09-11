/**
 * Middleware exports
 * Centralized export of all middleware functions
 */

const auth = require('./auth');
const cookieAuth = require('./cookieAuth');
const validation = require('./validation');
const rateLimiting = require('./rateLimiting');
const errorHandler = require('./errorHandler');

module.exports = {
  // Authentication & Authorization
  ...auth,
  ...cookieAuth,
  
  // Validation (Joi)
  ...validation,
  
  // Rate Limiting
  ...rateLimiting,
  
  // Error Handling
  ...errorHandler
};
