/**
 * Environment Configuration
 * Centralized configuration using dotenv
 */
import dotenv from 'dotenv';

// Load environment variables from .env file
// Try multiple possible paths for .env file
const possiblePaths = [
  '/app/.env',               // Docker container root (mounted .env file)
  '.env',                    // Same directory
  '../.env',                 // Parent directory
  '../../.env',              // Two levels up
  '/app/../.env'             // Docker container parent
];

let envLoaded = false;
for (const envPath of possiblePaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`✅ .env file loaded from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log('⚠️ No .env file found, using environment variables from Docker in frontend');
}

// Environment Configuration Interface
interface EnvConfig {
  // OpenAI Configuration
  OPENAI_API_KEY: string;
  
  // JWT Configuration
  JWT_SECRET: string;
  
  // Iron Session Configuration
  IRON_SESSION_COOKIE_NAME: string;
  IRON_SESSION_PASSWORD: string;
  
  // Database Configuration
  DB_CONNECTION: string;
  DB_HOST: string;
  DB_DATABASE: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  
  // Vector Database
  QDRANT_URL: string;
  QDRANT_API_KEY: string;
  
  // Redis Configuration
  REDIS_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_DB: number;
  
  // Rate Limiting Configuration
  RATE_LIMIT_GENERAL_DEV: number;
  RATE_LIMIT_GENERAL_PROD: number;
  RATE_LIMIT_UPLOAD_DEV: number;
  RATE_LIMIT_UPLOAD_PROD: number;
  RATE_LIMIT_CHAT_DEV: number;
  RATE_LIMIT_CHAT_PROD: number;
  RATE_LIMIT_DEPLOYMENT_DEV: number;
  RATE_LIMIT_DEPLOYMENT_PROD: number;
  RATE_LIMIT_SEARCH_DEV: number;
  RATE_LIMIT_SEARCH_PROD: number;
  RATE_LIMIT_API_USAGE_DEV: number;
  RATE_LIMIT_API_USAGE_PROD: number;
  RATE_LIMIT_VISITOR_DEV: number;
  RATE_LIMIT_VISITOR_PROD: number;
  
  // AWS S3 Configuration
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_S3_BUCKET_NAME: string;
  AWS_S3_REGION: string;
  
  // API Configuration
  API_TIMEOUT: number;
  JWT_EXPIRATION_HOURS: number;
  API_RETRY_DELAY: number;
  
  // CORS Configuration
  CORS_ORIGIN_DEV: string;
  CORS_ORIGIN_PROD: string;
  
  // Frontend Configuration
  NEXT_PUBLIC_API_URL: string;
  FRONTEND_URL: string;
  FRONTEND_PORT: number;
  BACKEND_PORT: number;
  
  // Service Ports
  QDRANT_PORT: number;
  MINIO_API_PORT: number;
  MINIO_CONSOLE_PORT: number;
  
  // Development Settings (MinIO for S3)
  USE_MINIO: boolean;
  MINIO_ENDPOINT: string;
  MINIO_ROOT_USER: string;
  MINIO_ROOT_PASSWORD: string;
  
  // MongoDB Express (Development)
  MONGO_EXPRESS_PORT: number;
  MONGO_EXPRESS_USERNAME: string;
  MONGO_EXPRESS_PASSWORD: string;
  
  // Widget Configuration
  WIDGET_API_URL: string;
  WIDGET_SCRIPT_URL: string;
  
  // Environment Settings
  NODE_ENV: string;
  PORT: number;
  
  // JWT Fallback Secrets (for development)
  JWT_FALLBACK_SECRET: string;
  JWT_FALLBACK_SECRET_ALT: string;
}

// Environment Configuration with defaults and validation
export const envConfig: EnvConfig = {
  // OpenAI Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || '',
  
  // Iron Session Configuration
  IRON_SESSION_COOKIE_NAME: process.env.NEXT_PUBLIC_IRON_SESSION_COOKIE_NAME || process.env.IRON_SESSION_COOKIE_NAME || 'weam',
  IRON_SESSION_PASSWORD: process.env.NEXT_PUBLIC_IRON_SESSION_PASSWORD || process.env.IRON_SESSION_PASSWORD || '',
  
  // Database Configuration
  DB_CONNECTION: process.env.DB_CONNECTION || 'mongodb',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_DATABASE: process.env.DB_DATABASE || 'solution_chatbot',
  DB_PORT: parseInt(process.env.DB_PORT || '27017', 10),
  DB_USERNAME: process.env.DB_USERNAME || 'admin',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',
  
  // Vector Database
  QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
  QDRANT_API_KEY: process.env.QDRANT_API_KEY || '',
  
  // Redis Configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  REDIS_DB: parseInt(process.env.REDIS_DB || '0', 10),
  
  // Rate Limiting Configuration
  RATE_LIMIT_GENERAL_DEV: parseInt(process.env.RATE_LIMIT_GENERAL_DEV || '1000000000', 10),
  RATE_LIMIT_GENERAL_PROD: parseInt(process.env.RATE_LIMIT_GENERAL_PROD || '100', 10),
  RATE_LIMIT_UPLOAD_DEV: parseInt(process.env.RATE_LIMIT_UPLOAD_DEV || '1000', 10),
  RATE_LIMIT_UPLOAD_PROD: parseInt(process.env.RATE_LIMIT_UPLOAD_PROD || '20', 10),
  RATE_LIMIT_CHAT_DEV: parseInt(process.env.RATE_LIMIT_CHAT_DEV || '1000', 10),
  RATE_LIMIT_CHAT_PROD: parseInt(process.env.RATE_LIMIT_CHAT_PROD || '5', 10),
  RATE_LIMIT_DEPLOYMENT_DEV: parseInt(process.env.RATE_LIMIT_DEPLOYMENT_DEV || '1000', 10),
  RATE_LIMIT_DEPLOYMENT_PROD: parseInt(process.env.RATE_LIMIT_DEPLOYMENT_PROD || '5', 10),
  RATE_LIMIT_SEARCH_DEV: parseInt(process.env.RATE_LIMIT_SEARCH_DEV || '1000', 10),
  RATE_LIMIT_SEARCH_PROD: parseInt(process.env.RATE_LIMIT_SEARCH_PROD || '5', 10),
  RATE_LIMIT_API_USAGE_DEV: parseInt(process.env.RATE_LIMIT_API_USAGE_DEV || '1000', 10),
  RATE_LIMIT_API_USAGE_PROD: parseInt(process.env.RATE_LIMIT_API_USAGE_PROD || '50', 10),
  RATE_LIMIT_VISITOR_DEV: parseInt(process.env.RATE_LIMIT_VISITOR_DEV || '1000', 10),
  RATE_LIMIT_VISITOR_PROD: parseInt(process.env.RATE_LIMIT_VISITOR_PROD || '20', 10),
  
  // AWS S3 Configuration
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin',
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || 'ai-chatbot-files',
  AWS_S3_REGION: process.env.AWS_S3_REGION || 'us-east-1',
  
  // API Configuration
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT || '30000', 10),
  JWT_EXPIRATION_HOURS: parseInt(process.env.JWT_EXPIRATION_HOURS || '24', 10),
  API_RETRY_DELAY: parseInt(process.env.API_RETRY_DELAY || '1000', 10),
  
  // CORS Configuration
  CORS_ORIGIN_DEV: process.env.CORS_ORIGIN_DEV || 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,http://frontend:3000',
  CORS_ORIGIN_PROD: process.env.CORS_ORIGIN_PROD || 'https://yourdomain.com',
  
  // Frontend Configuration
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001',
  FRONTEND_PORT: parseInt(process.env.FRONTEND_PORT || '3001', 10),
  BACKEND_PORT: parseInt(process.env.BACKEND_PORT || '5000', 10),
  
  // Service Ports
  QDRANT_PORT: parseInt(process.env.QDRANT_PORT || '6333', 10),
  MINIO_API_PORT: parseInt(process.env.MINIO_API_PORT || '9000', 10),
  MINIO_CONSOLE_PORT: parseInt(process.env.MINIO_CONSOLE_PORT || '9001', 10),
  
  // Development Settings (MinIO for S3)
  USE_MINIO: process.env.USE_MINIO === 'true',
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  MINIO_ROOT_USER: process.env.MINIO_ROOT_USER || 'minioadmin',
  MINIO_ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
  
  // MongoDB Express (Development)
  MONGO_EXPRESS_PORT: parseInt(process.env.MONGO_EXPRESS_PORT || '8081', 10),
  MONGO_EXPRESS_USERNAME: process.env.MONGO_EXPRESS_USERNAME || 'admin',
  MONGO_EXPRESS_PASSWORD: process.env.MONGO_EXPRESS_PASSWORD || 'admin',
  
  // Widget Configuration
  WIDGET_API_URL: process.env.WIDGET_API_URL || 'http://localhost:5000/api',
  WIDGET_SCRIPT_URL: process.env.WIDGET_SCRIPT_URL || 'http://localhost:3001/widget/chat-widget.js',
  
  // Environment Settings
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  
  // JWT Fallback Secrets (for development)
  JWT_FALLBACK_SECRET: process.env.JWT_FALLBACK_SECRET || 'your-jwt-secret-key-change-in-production',
  JWT_FALLBACK_SECRET_ALT: process.env.JWT_FALLBACK_SECRET_ALT || 'fallback-secret-key',
};

// Validation function
export const validateEnvConfig = (): void => {
  const requiredFields: (keyof EnvConfig)[] = [
    'OPENAI_API_KEY',
    'JWT_SECRET',
    'IRON_SESSION_PASSWORD',
  ];

  const missingFields = requiredFields.filter(field => !envConfig[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required environment variables: ${missingFields.join(', ')}`);
  }
};

// Export individual configurations for easier access
export const {
  OPENAI_API_KEY,
  JWT_SECRET,
  IRON_SESSION_COOKIE_NAME,
  IRON_SESSION_PASSWORD,
  DB_CONNECTION,
  DB_HOST,
  DB_DATABASE,
  DB_PORT,
  DB_USERNAME,
  DB_PASSWORD,
  QDRANT_URL,
  QDRANT_API_KEY,
  REDIS_URL,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  REDIS_DB,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET_NAME,
  AWS_S3_REGION,
  API_TIMEOUT,
  JWT_EXPIRATION_HOURS,
  API_RETRY_DELAY,
  CORS_ORIGIN_DEV,
  CORS_ORIGIN_PROD,
  NEXT_PUBLIC_API_URL,
  FRONTEND_URL,
  FRONTEND_PORT,
  BACKEND_PORT,
  QDRANT_PORT,
  REDIS_PORT: REDIS_PORT_CONFIG,
  MINIO_API_PORT,
  MINIO_CONSOLE_PORT,
  USE_MINIO,
  MINIO_ENDPOINT,
  MINIO_ROOT_USER,
  MINIO_ROOT_PASSWORD,
  MONGO_EXPRESS_PORT,
  MONGO_EXPRESS_USERNAME,
  MONGO_EXPRESS_PASSWORD,
  WIDGET_API_URL,
  WIDGET_SCRIPT_URL,
  NODE_ENV,
  PORT,
  JWT_FALLBACK_SECRET,
  JWT_FALLBACK_SECRET_ALT,
} = envConfig;
