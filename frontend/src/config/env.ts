/**
 * Environment Configuration
 * Centralized configuration using dotenv
 */

import path from 'path';
import dotenv from 'dotenv';

console.log(`✅ .env file loaded from: ${path.join(process.cwd(), '..', '.env')}`);
  dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

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
  NEXT_PUBLIC_BACKEND_API_URL_WITHOUT_PREFIX: string;
  NEXT_PUBLIC_NODE_ENV: string;
  NEXT_PUBLIC_API_PREFIX: string;

  NEXT_PUBLIC_BASIC_AUTH_USERNAME: string;
  NEXT_PUBLIC_BASIC_AUTH_PASSWORD: string;

  NEXT_PUBLIC_SOLUTION_URL: string;
}

// Environment Configuration with defaults and validation
export const envConfig: EnvConfig = {
  // Iron Session Configuration
  NEXT_PUBLIC_IRON_SESSION_COOKIE_NAME: process.env.NEXT_PUBLIC_IRON_SESSION_COOKIE_NAME || process.env.IRON_SESSION_COOKIE_NAME || 'weam',
  NEXT_PUBLIC_IRON_SESSION_PASSWORD: process.env.NEXT_PUBLIC_IRON_SESSION_PASSWORD || process.env.IRON_SESSION_PASSWORD || '',
  
  // API Configuration
  NEXT_PUBLIC_API_TIMEOUT: process.env.NEXT_PUBLIC_API_TIMEOUT ? parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT, 10) : parseInt(process.env.API_TIMEOUT || '30000', 10),
  NEXT_PUBLIC_JWT_EXPIRATION_HOURS: process.env.NEXT_PUBLIC_JWT_EXPIRATION_HOURS ? parseInt(process.env.NEXT_PUBLIC_JWT_EXPIRATION_HOURS, 10) : parseInt(process.env.JWT_EXPIRATION_HOURS || '1', 10),
  NEXT_PUBLIC_API_RETRY_DELAY: process.env.NEXT_PUBLIC_API_RETRY_DELAY ? parseInt(process.env.NEXT_PUBLIC_API_RETRY_DELAY, 10) : parseInt(process.env.API_RETRY_DELAY || '5', 10),
  
  NEXT_PUBLIC_BACKEND_API_URL: process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.BACKEND_API_URL || 'https://dev.weam.ai/ai-chatbot-api',
  NEXT_PUBLIC_BACKEND_API_URL_WITHOUT_PREFIX: process.env.NEXT_PUBLIC_BACKEND_API_URL_WITHOUT_PREFIX || '',
  NEXT_PUBLIC_BACKEND_API_PREFIX: process.env.NEXT_PUBLIC_BACKEND_API_PREFIX || '/ai-chatbot-api',
  NEXT_PUBLIC_NODE_ENV: process.env.NEXT_PUBLIC_NODE_ENV || process.env.NODE_ENV || '',
  NEXT_PUBLIC_API_PREFIX: process.env.NEXT_PUBLIC_API_PREFIX || '/ai-chatbot',

  NEXT_PUBLIC_BASIC_AUTH_USERNAME: process.env.NEXT_PUBLIC_BASIC_AUTH_USERNAME || '',
  NEXT_PUBLIC_BASIC_AUTH_PASSWORD: process.env.NEXT_PUBLIC_BASIC_AUTH_PASSWORD || '',

  NEXT_PUBLIC_SOLUTION_URL: process.env.NEXT_PUBLIC_SOLUTION_URL || '',
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
    'NEXT_PUBLIC_BACKEND_API_URL_WITHOUT_PREFIX',
    'NEXT_PUBLIC_BASIC_AUTH_USERNAME',
    'NEXT_PUBLIC_BASIC_AUTH_PASSWORD',
    'NEXT_PUBLIC_SOLUTION_URL',
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
  NEXT_PUBLIC_BACKEND_API_URL_WITHOUT_PREFIX,
  NEXT_PUBLIC_NODE_ENV,
  NEXT_PUBLIC_API_PREFIX,
  NEXT_PUBLIC_BASIC_AUTH_USERNAME,
  NEXT_PUBLIC_BASIC_AUTH_PASSWORD,
  NEXT_PUBLIC_SOLUTION_URL,
} = envConfig;
