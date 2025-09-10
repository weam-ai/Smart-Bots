/**
 * Environment Configuration
 * Centralized configuration using dotenv
 */
// import path from 'path';

// // Load environment variables from .env file
// const envPath = path.join(process.cwd(), '.env');
// console.log("🚀 ~ envPath from frontend:", envPath)
// const result = require('dotenv').config();

// if (result.error) {
//   console.log(`⚠️ Failed to load .env from: ${envPath}`);
//   console.log('Using environment variables from Docker/system environment');
// } else {
//   console.log(`✅ .env file loaded from: ${envPath}`);
// }

// Environment Configuration Interface
interface EnvConfig {
  // Iron Session Configuration
  NEXT_PUBLIC_IRON_SESSION_COOKIE_NAME: string;
  NEXT_PUBLIC_IRON_SESSION_PASSWORD: string;
  // API Configuration
  NEXT_PUBLIC_API_TIMEOUT?: number;
  NEXT_PUBLIC_JWT_EXPIRATION_HOURS?: number;
  NEXT_PUBLIC_API_RETRY_DELAY?: number;

  NEXT_PUBLIC_BACKEND_API_URL: string;
  NEXT_PUBLIC_BACKEND_API_PREFIX: string;
  NEXT_PUBLIC_NODE_ENV: string;
  NEXT_PUBLIC_API_PREFIX: string;
}

// Environment Configuration with defaults and validation
export const envConfig: EnvConfig = {
  // Iron Session Configuration
  NEXT_PUBLIC_IRON_SESSION_COOKIE_NAME: process.env.NEXT_PUBLIC_IRON_SESSION_COOKIE_NAME || process.env.IRON_SESSION_COOKIE_NAME || 'weam',
  NEXT_PUBLIC_IRON_SESSION_PASSWORD: process.env.NEXT_PUBLIC_IRON_SESSION_PASSWORD || process.env.IRON_SESSION_PASSWORD || '',
  
  // API Configuration
  NEXT_PUBLIC_API_TIMEOUT: process.env.NEXT_PUBLIC_API_TIMEOUT ? parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT, 10) : undefined,
  NEXT_PUBLIC_JWT_EXPIRATION_HOURS: process.env.NEXT_PUBLIC_JWT_EXPIRATION_HOURS ? parseInt(process.env.NEXT_PUBLIC_JWT_EXPIRATION_HOURS, 10) : undefined,
  NEXT_PUBLIC_API_RETRY_DELAY: process.env.NEXT_PUBLIC_API_RETRY_DELAY ? parseInt(process.env.NEXT_PUBLIC_API_RETRY_DELAY, 10) : undefined  ,
  
  NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://jay.dev.weam.ai/ai-chatbot-api',
  NEXT_PUBLIC_BACKEND_API_PREFIX: process.env.NEXT_PUBLIC_BACKEND_API_PREFIX || '/ai-chatbot-api',
  NEXT_PUBLIC_NODE_ENV: process.env.NEXT_PUBLIC_NODE_ENV || 'development',
  NEXT_PUBLIC_API_PREFIX: process.env.NEXT_PUBLIC_API_PREFIX || '/ai-chatbot',
};

// Validation function
export const validateEnvConfig = (): void => {
  const requiredFields: (keyof EnvConfig)[] = [
    'NEXT_PUBLIC_IRON_SESSION_COOKIE_NAME',
    'NEXT_PUBLIC_IRON_SESSION_PASSWORD',
    'NEXT_PUBLIC_API_TIMEOUT',
    'NEXT_PUBLIC_JWT_EXPIRATION_HOURS',
    'NEXT_PUBLIC_API_RETRY_DELAY',
    'NEXT_PUBLIC_BACKEND_API_URL',
    'NEXT_PUBLIC_BACKEND_API_PREFIX',
    'NEXT_PUBLIC_NODE_ENV',
    'NEXT_PUBLIC_API_PREFIX',
  ];

  const missingFields = requiredFields.filter(field => !envConfig[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required environment variables: ${missingFields.join(', ')}`);
  }
};

// Export individual configurations for easier access
export const {
  NEXT_PUBLIC_IRON_SESSION_COOKIE_NAME,
  NEXT_PUBLIC_IRON_SESSION_PASSWORD,
  NEXT_PUBLIC_API_TIMEOUT,
  NEXT_PUBLIC_JWT_EXPIRATION_HOURS,
  NEXT_PUBLIC_API_RETRY_DELAY,
  NEXT_PUBLIC_BACKEND_API_URL,
  NEXT_PUBLIC_BACKEND_API_PREFIX,
  NEXT_PUBLIC_NODE_ENV,
  NEXT_PUBLIC_API_PREFIX,
} = envConfig;
