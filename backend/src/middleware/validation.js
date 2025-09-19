const Joi = require('joi');
const mongoose = require('mongoose');

/**
 * Joi Validation Middleware Factory
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Show all validation errors
      stripUnknown: true, // Remove unknown properties
      convert: true // Convert types (e.g., string to number)
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
        code: 'VALIDATION_ERROR'
      });
    }

    // Replace request property with validated and sanitized value
    req[property] = value;
    next();
  };
};

/**
 * Custom Joi validators
 */
const customValidators = {
  objectId: Joi.string().custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }, 'MongoDB ObjectId validation').messages({
    'any.invalid': 'Invalid ObjectId format'
  }),
  
  uuid: Joi.string().custom((value, helpers) => {
    // UUID v4 pattern: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  }, 'UUID validation').messages({
    'any.invalid': 'Invalid UUID format'
  })
};

/**
 * Validation Schemas
 */

// Agent validation schemas
const agentSchemas = {
  create: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .trim()
      .required()
      .messages({
        'string.min': 'Agent name must be at least 3 characters long',
        'string.max': 'Agent name must be less than 100 characters',
        'any.required': 'Agent name is required'
      }),
    
    description: Joi.string()
      .max(500)
      .trim()
      .allow('')
      .optional(),
    
    systemPrompt: Joi.string()
      .min(10)
      .max(2000)
      .trim()
      .required()
      .messages({
        'string.min': 'System prompt must be at least 10 characters long',
        'string.max': 'System prompt must be less than 2000 characters',
        'any.required': 'System prompt is required'
      }),
    
    temperature: Joi.number()
      .min(0)
      .max(2)
      .default(0.7)
      .messages({
        'number.min': 'Temperature must be between 0 and 2',
        'number.max': 'Temperature must be between 0 and 2'
      }),
    
    model: Joi.string()
      .valid('gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4o', 'o3')
      .default('gpt-4o')
      .messages({
        'any.only': 'Model must be one of: gpt-5, gpt-5-mini, gpt-5-nano, gpt-4.1, gpt-4o, o3'
      }),
    
    maxTokens: Joi.number()
      .integer()
      .min(1)
      .max(4000)
      .default(1000),
    
    topP: Joi.number()
      .min(0)
      .max(1)
      .default(1.0),
    
    frequencyPenalty: Joi.number()
      .min(-2)
      .max(2)
      .default(0.0),
    
    presencePenalty: Joi.number()
      .min(-2)
      .max(2)
      .default(0.0),
    
    isPublic: Joi.boolean()
      .default(true),
    
    tags: Joi.array()
      .items(Joi.string().trim().max(50))
      .max(10)
      .default([]),
    
    avatar: Joi.string()
      .max(10)
      .default('🤖')
  }),

  update: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .trim()
      .optional(),
    
    description: Joi.string()
      .max(500)
      .trim()
      .allow('')
      .optional(),
    
    systemPrompt: Joi.string()
      .min(10)
      .max(2000)
      .trim()
      .optional(),
    
    temperature: Joi.number()
      .min(0)
      .max(2)
      .optional(),
    
    model: Joi.string()
      .valid('gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4o', 'o3')
      .optional(),
    
    maxTokens: Joi.number()
      .integer()
      .min(1)
      .max(4000)
      .optional(),
    
    topP: Joi.number()
      .min(0)
      .max(1)
      .optional(),
    
    frequencyPenalty: Joi.number()
      .min(-2)
      .max(2)
      .optional(),
    
    presencePenalty: Joi.number()
      .min(-2)
      .max(2)
      .optional(),
    
    isPublic: Joi.boolean()
      .optional(),
    
    tags: Joi.array()
      .items(Joi.string().trim().max(50))
      .max(10)
      .optional(),
    
    avatar: Joi.string()
      .max(10)
      .optional(),
    
    status: Joi.string()
      .valid('draft', 'uploading', 'training', 'trained', 'error', 'archived')
      .optional()
  }).min(1) // At least one field must be provided for update
};

// Chat validation schemas
const chatSchemas = {
  sendMessage: Joi.object({
    message: Joi.string()
      .min(1)
      .max(4000)
      .trim()
      .required()
      .messages({
        'string.min': 'Message cannot be empty',
        'string.max': 'Message must be less than 4000 characters',
        'any.required': 'Message is required'
      }),
    
    sessionId: customValidators.objectId
      .optional()
      .messages({
        'any.invalid': 'Invalid session ID format'
      }),
    
    userEmail: Joi.string()
      .email()
      .optional(),
    
    userName: Joi.string()
      .max(100)
      .trim()
      .optional()
  }),

  createSession: Joi.object({
    sessionName: Joi.string()
      .max(200)
      .trim()
      .optional(),
    
    userEmail: Joi.string()
      .email()
      .optional(),
    
    userName: Joi.string()
      .max(100)
      .trim()
      .optional()
  })
};

// Deployment validation schemas
const deploymentSchemas = {
  createDeployment: Joi.object({
    name: Joi.string()
      .min(1)
      .max(100)
      .trim()
      .required()
      .messages({
        'string.min': 'Deployment name cannot be empty',
        'string.max': 'Deployment name must be less than 100 characters',
        'any.required': 'Deployment name is required'
      }),
    
    description: Joi.string()
      .max(500)
      .trim()
      .optional(),
    
    websiteUrl: Joi.string()
      .uri()
      .optional()
      .messages({
        'string.uri': 'Website URL must be a valid URL'
      }),
    
    settings: Joi.object({
      theme: Joi.string()
        .valid('light', 'dark', 'auto')
        .default('light'),
      
      position: Joi.string()
        .valid('bottom-right', 'bottom-left', 'top-right', 'top-left', 'center')
        .default('bottom-right'),
      
      size: Joi.object({
        width: Joi.string()
          .pattern(/^\d+(px|%|rem|em)$/)
          .default('400px'),
        height: Joi.string()
          .pattern(/^\d+(px|%|rem|em)$/)
          .default('600px')
      }).default({
        width: '400px',
        height: '600px'
      }),
      
      customCSS: Joi.string()
        .max(5000)
        .allow('')
        .optional(),
      
      customJS: Joi.string()
        .max(5000)
        .allow('')
        .optional(),
      
      autoOpen: Joi.boolean()
        .default(false),
      
      welcomeMessage: Joi.string()
        .max(200)
        .trim()
        .default('Hi! How can I help you today?')
    }).optional()
  }),

  updateDeployment: Joi.object({
    name: Joi.string()
      .min(1)
      .max(100)
      .trim()
      .optional(),
    
    description: Joi.string()
      .max(500)
      .trim()
      .optional(),
    
    websiteUrl: Joi.string()
      .uri()
      .optional(),
    
    settings: Joi.object({
      theme: Joi.string()
        .valid('light', 'dark', 'auto'),
      
      position: Joi.string()
        .valid('bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'),
      
      size: Joi.object({
        width: Joi.string()
          .pattern(/^\d+(px|%|rem|em)$/),
        height: Joi.string()
          .pattern(/^\d+(px|%|rem|em)$/)
      }),
      
      customCSS: Joi.string()
        .max(5000)
        .allow(''),
      
      customJS: Joi.string()
        .max(5000)
        .allow(''),
      
      autoOpen: Joi.boolean(),
      
      welcomeMessage: Joi.string()
        .max(200)
        .trim()
    }).optional(),
    
    isActive: Joi.boolean()
      .optional()
  }).min(1), // At least one field must be provided for update

  trackAnalytics: Joi.object({
    event: Joi.string()
      .valid('view', 'interaction', 'chat_start', 'chat_end')
      .required()
      .messages({
        'any.required': 'Event type is required',
        'any.only': 'Event must be one of: view, interaction, chat_start, chat_end'
      }),
    
    data: Joi.object()
      .optional()
  })
};

// Parameter validation schemas
const paramSchemas = {
  objectId: Joi.object({
    id: customValidators.objectId.required()
      .messages({
        'any.required': 'ID parameter is required',
        'any.invalid': 'Invalid ID format'
      })
  }),

  agentId: Joi.object({
    agentId: customValidators.objectId.required()
      .messages({
        'any.required': 'Agent ID parameter is required',
        'any.invalid': 'Invalid agent ID format'
      })
  }),

  sessionId: Joi.object({
    sessionId: customValidators.objectId.required()
      .messages({
        'any.required': 'Session ID parameter is required',
        'any.invalid': 'Invalid session ID format'
      })
  }),

};

// Query validation schemas
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.min': 'Page must be a positive integer'
      }),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10)
      .messages({
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
    
    sort: Joi.string()
      .valid('createdAt', '-createdAt', 'name', '-name', 'updatedAt', '-updatedAt')
      .default('-createdAt')
      .optional(),
    
    status: Joi.string()
      .valid('draft', 'uploading', 'training', 'trained', 'error', 'archived')
      .optional(),
    
    search: Joi.string()
      .max(100)
      .trim()
      .optional()
  })
};

// File upload validation
const fileSchemas = {
  upload: Joi.object({
    maxFiles: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .default(10),
    
    maxFileSize: Joi.number()
      .integer()
      .min(1024) // 1KB minimum
      .max(10 * 1024 * 1024) // 10MB maximum
      .default(5 * 1024 * 1024) // 5MB default
  })
};

/**
 * Middleware functions
 */
const validateAgentCreate = validate(agentSchemas.create, 'body');
const validateAgentUpdate = validate(agentSchemas.update, 'body');
const validateChatMessage = validate(chatSchemas.sendMessage, 'body');
const validateCreateSession = validate(chatSchemas.createSession, 'body');

const validateCreateDeployment = validate(deploymentSchemas.createDeployment, 'body');
const validateUpdateDeployment = validate(deploymentSchemas.updateDeployment, 'body');
const validateTrackAnalytics = validate(deploymentSchemas.trackAnalytics, 'body');

const validateObjectId = validate(paramSchemas.objectId, 'params');
const validateAgentId = validate(paramSchemas.agentId, 'params');
const validateSessionId = validate(paramSchemas.sessionId, 'params');

const validatePagination = validate(querySchemas.pagination, 'query');

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  // Additional sanitization can be added here if needed
  // Joi already handles most sanitization with stripUnknown and convert options
  next();
};

module.exports = {
  // Validation functions
  validate,
  
  // Agent validation
  validateAgentCreate,
  validateAgentUpdate,
  
  // Chat validation
  validateChatMessage,
  validateCreateSession,
  
  // Deployment validation
  validateCreateDeployment,
  validateUpdateDeployment,
  validateTrackAnalytics,
  
  // Parameter validation
  validateObjectId,
  validateAgentId,
  validateSessionId,

  
  // Query validation
  validatePagination,
  
  // Utility
  sanitizeInput,
  
  // Raw schemas for custom validation
  schemas: {
    agent: agentSchemas,
    chat: chatSchemas,
    deployment: deploymentSchemas,
    params: paramSchemas,
    query: querySchemas,
    file: fileSchemas
  }
};
