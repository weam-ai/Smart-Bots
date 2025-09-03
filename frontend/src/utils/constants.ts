/**
 * Application Constants
 * Centralized configuration and constants
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  TIMEOUT: 30000, // 30 seconds
  WITH_CREDENTIALS: true,
} as const

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
  },
  
  // Agents
  AGENTS: {
    BASE: '/api/agents',
    BY_ID: (id: string) => `/api/agents/${id}`,
  },
  
  // File Upload
  UPLOAD: {
    BY_AGENT: (agentId: string) => `/api/upload/${agentId}`,
  },
  
  // Chat
  CHAT: {
    BY_AGENT: (agentId: string) => `/api/chat/${agentId}/message`,
    SESSIONS: (agentId: string) => `/api/chat/${agentId}/sessions`,
    SESSION_MESSAGES: (agentId: string, sessionId: string) => 
      `/api/chat/${agentId}/sessions/${sessionId}/messages`,
  },
  
  // Search
  SEARCH: {
    BY_AGENT: (agentId: string) => `/api/search/${agentId}`,
    STATS: (agentId: string) => `/api/search/${agentId}/stats`,
    TEST: (agentId: string) => `/api/search/${agentId}/test`,
  },
  
  // Health
  HEALTH: '/api/health',
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

// Request Headers
export const HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  X_REQUEST_ID: 'X-Request-ID',
} as const

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
} as const

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error - Please check your connection',
  AUTH_REQUIRED: 'Authentication required',
  ACCESS_DENIED: 'Access denied',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
  RATE_LIMITED: 'Too many requests - Please try again later',
  SERVER_ERROR: 'Server error - Please try again',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  UNEXPECTED_ERROR: 'An unexpected error occurred',
  REQUEST_FAILED: 'Request failed - Please try again',
} as const

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES: 10,
  ACCEPTED_TYPES: {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],
    'application/json': ['.json'],
    'text/markdown': ['.md'],
  },
} as const

// Chat Constants
export const CHAT = {
  MAX_MESSAGE_LENGTH: 4000,
  TYPING_INDICATOR_DELAY: 1500,
  AUTO_SCROLL_THRESHOLD: 100,
} as const

// Agent Constants
export const AGENT = {
  MODELS: [
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' },
    { id: 'gpt-4', name: 'GPT-4', description: 'More capable and accurate' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Latest model with improved performance' },
  ],
  TEMPERATURE: {
    MIN: 0.1,
    MAX: 1.0,
    STEP: 0.1,
    DEFAULT: 0.7,
  },
  STATUS: {
    CREATING: 'creating',
    READY: 'ready',
    TRAINING: 'training',
    ERROR: 'error',
  } as const,
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const
