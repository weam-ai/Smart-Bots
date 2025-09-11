/**
 * Environment Configuration
 * Centralized configuration using dotenv
 */
const dotenv = require('dotenv');

// Load environment variables from .env file
// Try multiple possible paths for .env file
const possiblePaths = [
  '/app/.env',               // Docker container root (mounted .env file)
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

console.log('🔍 DB_HOST:', process.env.DB_HOST);
console.log('🔍 DB_CONNECTION:', process.env.DB_CONNECTION);

if (!envLoaded) {
  console.log('⚠️ No .env file found, using environment variables from Docker back');
}
// Environment Configuration Object
const envConfig = {
  BACKEND_API_PREFIX: process.env.BACKEND_API_PREFIX,
  // OpenAI Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET,
  
  // Database Configuration
  DB_CONNECTION: process.env.DB_CONNECTION,
  DB_HOST: process.env.DB_HOST,
  DB_DATABASE: process.env.DB_DATABASE,
  DB_PORT: parseInt(process.env.DB_PORT, 10),
  DB_USERNAME: process.env.DB_USERNAME,
  DB_PASSWORD: process.env.DB_PASSWORD,
  
  // Vector Database (Pinecone)
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  
  // Redis Configuration
  REDIS_URL: process.env.REDIS_URL,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DB: parseInt(process.env.REDIS_DB, 10),
  
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
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  AWS_S3_REGION: process.env.AWS_S3_REGION || 'us-east-1',
  
  // API Configuration
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT || '30000', 10),
  JWT_EXPIRATION_HOURS: parseInt(process.env.JWT_EXPIRATION_HOURS || '24', 10),
  API_RETRY_DELAY: parseInt(process.env.API_RETRY_DELAY || '1000', 10),
  
  // CORS Configuration
  CORS_ORIGIN_DEV: process.env.CORS_ORIGIN_DEV || 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,http://frontend:3000',
  CORS_ORIGIN_PROD: process.env.CORS_ORIGIN_PROD || 'https://yourdomain.com',
  
  // Frontend Configuration
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001',
  FRONTEND_PORT: parseInt(process.env.FRONTEND_PORT || '3001', 10),
  PORT: parseInt(process.env.PORT || '5000', 10),
  
  // Service Ports
  MINIO_API_PORT: parseInt(process.env.MINIO_API_PORT || '9000', 10),
  MINIO_CONSOLE_PORT: parseInt(process.env.MINIO_CONSOLE_PORT || '9001', 10),
  
  // Development Settings (MinIO for S3)
  USE_MINIO: process.env.USE_MINIO === 'true',
  MINIO_ENDPOINT: process.env.USE_MINIO === 'true' ? 'http://minio:9000' : '',
  MINIO_ROOT_USER: process.env.MINIO_ROOT_USER || '',
  MINIO_ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD || '',
  
  // MongoDB Express (Development)
  MONGO_EXPRESS_PORT: parseInt(process.env.MONGO_EXPRESS_PORT || '8081', 10),
  MONGO_EXPRESS_USERNAME: process.env.MONGO_EXPRESS_USERNAME || 'admin',
  MONGO_EXPRESS_PASSWORD: process.env.MONGO_EXPRESS_PASSWORD || 'admin',
  
  // Widget Configuration
  WIDGET_SCRIPT_URL: process.env.WIDGET_SCRIPT_URL || 'http://localhost:3001/widget/chat-widget.js',
  
  // Environment Settings
  NODE_ENV: process.env.NODE_ENV || 'development',
  
};

// Validation function
const validateEnvConfig = () => {
  const requiredFields = [
    'BACKEND_API_PREFIX',
    'OPENAI_API_KEY',
    'JWT_SECRET',
    'IRON_SESSION_PASSWORD',
  ];

  const missingFields = requiredFields.filter(field => !envConfig[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required environment variables: ${missingFields.join(', ')}`);
  }
};

// Export configuration and validation
module.exports = {
  envConfig,
  validateEnvConfig,
  BACKEND_API_PREFIX: envConfig.BACKEND_API_PREFIX,
  // Individual exports for easier access
  OPENAI_API_KEY: envConfig.OPENAI_API_KEY,
  JWT_SECRET: envConfig.JWT_SECRET,
  IRON_SESSION_COOKIE_NAME: envConfig.IRON_SESSION_COOKIE_NAME,
  IRON_SESSION_PASSWORD: envConfig.IRON_SESSION_PASSWORD,
  DB_CONNECTION: envConfig.DB_CONNECTION,
  DB_HOST: envConfig.DB_HOST,
  DB_DATABASE: envConfig.DB_DATABASE,
  DB_PORT: envConfig.DB_PORT,
  DB_USERNAME: envConfig.DB_USERNAME,
  DB_PASSWORD: envConfig.DB_PASSWORD,
  PINECONE_API_KEY: envConfig.PINECONE_API_KEY,
  REDIS_URL: envConfig.REDIS_URL,
  REDIS_HOST: envConfig.REDIS_HOST,
  REDIS_PORT: envConfig.REDIS_PORT,
  REDIS_PASSWORD: envConfig.REDIS_PASSWORD,
  REDIS_DB: envConfig.REDIS_DB,
  AWS_ACCESS_KEY_ID: envConfig.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: envConfig.AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET_NAME: envConfig.AWS_S3_BUCKET_NAME,
  AWS_S3_REGION: envConfig.AWS_S3_REGION,
  API_TIMEOUT: envConfig.API_TIMEOUT,
  JWT_EXPIRATION_HOURS: envConfig.JWT_EXPIRATION_HOURS,
  API_RETRY_DELAY: envConfig.API_RETRY_DELAY,
  CORS_ORIGIN_DEV: envConfig.CORS_ORIGIN_DEV,
  CORS_ORIGIN_PROD: envConfig.CORS_ORIGIN_PROD,
  FRONTEND_URL: envConfig.FRONTEND_URL,
  FRONTEND_PORT: envConfig.FRONTEND_PORT,
  MINIO_API_PORT: envConfig.MINIO_API_PORT,
  MINIO_CONSOLE_PORT: envConfig.MINIO_CONSOLE_PORT,
  USE_MINIO: envConfig.USE_MINIO,
  MINIO_ENDPOINT: envConfig.MINIO_ENDPOINT,
  MINIO_ROOT_USER: envConfig.MINIO_ROOT_USER,
  MINIO_ROOT_PASSWORD: envConfig.MINIO_ROOT_PASSWORD,
  MONGO_EXPRESS_PORT: envConfig.MONGO_EXPRESS_PORT,
  MONGO_EXPRESS_USERNAME: envConfig.MONGO_EXPRESS_USERNAME,
  MONGO_EXPRESS_PASSWORD: envConfig.MONGO_EXPRESS_PASSWORD,
  WIDGET_API_URL: envConfig.WIDGET_API_URL,
  WIDGET_SCRIPT_URL: envConfig.WIDGET_SCRIPT_URL,
  NODE_ENV: envConfig.NODE_ENV,
  PORT: envConfig.PORT
};
