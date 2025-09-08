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
  // Iron Session Configuration
  IRON_SESSION_COOKIE_NAME: string;
  IRON_SESSION_PASSWORD: string;
  // API Configuration
  API_TIMEOUT: number;
  JWT_EXPIRATION_HOURS: number;
  API_RETRY_DELAY: number;

  BACKEND_API_URL: string;
  NODE_ENV: string;
}

// Environment Configuration with defaults and validation
export const envConfig: EnvConfig = {
  // Iron Session Configuration
  IRON_SESSION_COOKIE_NAME: process.env.NEXT_PUBLIC_IRON_SESSION_COOKIE_NAME || process.env.IRON_SESSION_COOKIE_NAME || 'weam',
  IRON_SESSION_PASSWORD: process.env.NEXT_PUBLIC_IRON_SESSION_PASSWORD || process.env.IRON_SESSION_PASSWORD || '',
  
  // API Configuration
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT || '30000', 10),
  JWT_EXPIRATION_HOURS: parseInt(process.env.JWT_EXPIRATION_HOURS || '24', 10),
  API_RETRY_DELAY: parseInt(process.env.API_RETRY_DELAY || '1000', 10),
  
  BACKEND_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',

  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Validation function
export const validateEnvConfig = (): void => {
  const requiredFields: (keyof EnvConfig)[] = [
    'IRON_SESSION_COOKIE_NAME',
    'IRON_SESSION_PASSWORD',
    'BACKEND_API_URL',

    'API_TIMEOUT',
    'JWT_EXPIRATION_HOURS',
    'API_RETRY_DELAY',
    'BACKEND_API_URL',
    'NODE_ENV',
  ];

  const missingFields = requiredFields.filter(field => !envConfig[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required environment variables: ${missingFields.join(', ')}`);
  }
};

// Export individual configurations for easier access
export const {
  IRON_SESSION_COOKIE_NAME,
  IRON_SESSION_PASSWORD,
  API_TIMEOUT,
  JWT_EXPIRATION_HOURS,
  API_RETRY_DELAY,
  BACKEND_API_URL,
  NODE_ENV,
} = envConfig;
