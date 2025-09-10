/**
 * Application Constants
 * Centralized configuration and constants
 */


// API Configuration
export const API_CONFIG = {
  BASE_URL: 'https://dev.weam.ai/ai-chatbot-api',
  TIMEOUT: 30000,
  WITH_CREDENTIALS: true,
} as const
console.log("🚀 ~ API_CONFIG:", API_CONFIG)

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
    BASE: '/agents',
    BY_ID: (id: string) => `/agents/${id}`,
  },
  
  // File Upload
  UPLOAD: {
    BY_AGENT: (agentId: string) => `/upload/${agentId}`,
  },
  
  // Chat
  CHAT: {
    BY_AGENT: (agentId: string) => `/chat/${agentId}/message`,
    SESSIONS: (agentId: string) => `/chat/${agentId}/sessions`,
    SESSION_MESSAGES: (agentId: string, sessionId: string) => 
      `/chat/${agentId}/sessions/${sessionId}/messages`,
  },
  
  // Search
  SEARCH: {
    BY_AGENT: (agentId: string) => `/search/${agentId}`,
    STATS: (agentId: string) => `/search/${agentId}/stats`,
    TEST: (agentId: string) => `/search/${agentId}/test`,
  },
  
  // Health
  HEALTH: '/health',
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
  MAX_FILE_SIZE_MB: 5,
  MAX_FILE_SIZE_BYTES: 5242880, // 5MB in bytes
  MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES: 10,
  ALLOWED_FILE_TYPES: ['pdf', 'doc', 'docx', 'txt'],
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

// AI Model Configuration
export const AI_MODEL = {
  DEFAULT_MODEL: 'gpt-3.5-turbo',
  DEFAULT_MAX_TOKENS: 1000,
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

// File Processing Configuration
export const FILE_PROCESSING = {
  DELAY: 5000, // 5 seconds
  BATCH_JOB_DELAY: 5000, // 5 seconds
  DEFAULT_CHUNK_SIZE: 1000,
  DEFAULT_CHUNK_OVERLAP: 200,
} as const

// Database Configuration
export const DATABASE = {
  MONGODB_SERVER_SELECTION_TIMEOUT: 5000, // 5 seconds
  MONGODB_SOCKET_TIMEOUT: 45000, // 45 seconds
} as const

// UI/UX Configuration
export const UI_UX = {
  TOAST_DURATION_SHORT: 3000, // 3 seconds
  TOAST_DURATION_LONG: 5000, // 5 seconds
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const
