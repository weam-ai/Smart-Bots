/**
 * BullMQ Queue Configuration
 * Handles Redis connection and queue setup
 */

const { Queue, Worker, QueueEvents } = require('bullmq');
const Redis = require('redis');

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true
};

// Create Redis client for BullMQ (maxRetriesPerRequest must be null for BullMQ)
const redisConnection = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
  maxRetriesPerRequest: null  // Required by BullMQ
};

console.log(`🔗 BullMQ Redis config: ${redisConfig.host}:${redisConfig.port}`);

// Queue names
const QUEUE_NAMES = {
  DOCUMENT_PROCESSING: 'document-processing',
  FILE_UPLOAD: 'file-upload',
  EMBEDDING_GENERATION: 'embedding-generation',
  NOTIFICATIONS: 'notifications'
};

// Job types
const JOB_TYPES = {
  // File processing pipeline
  EXTRACT_TEXT: 'extract-text',
  CHUNK_TEXT: 'chunk-text', 
  GENERATE_EMBEDDINGS: 'generate-embeddings',
  STORE_EMBEDDINGS: 'store-embeddings',
  
  // Batch operations
  BATCH_PROCESS_FILES: 'batch-process-files',
  REPROCESS_FILE: 'reprocess-file',
  
  // Notifications
  SEND_NOTIFICATION: 'send-notification',
  UPDATE_PROGRESS: 'update-progress'
};

// Job priorities
const JOB_PRIORITIES = {
  URGENT: 1,      // User waiting
  HIGH: 5,        // Interactive operations
  NORMAL: 10,     // Regular processing
  LOW: 20,        // Batch operations
  BACKGROUND: 50  // Maintenance tasks
};

// Default job options
const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: 100,  // Keep last 100 completed jobs
  removeOnFail: 50,       // Keep last 50 failed jobs
  attempts: 3,            // Retry failed jobs 3 times
  backoff: {
    type: 'exponential',
    delay: 2000,          // Start with 2 second delay
  },
  delay: 0,               // No initial delay
  priority: JOB_PRIORITIES.NORMAL
};

// Queue-specific options
const QUEUE_OPTIONS = {
  [QUEUE_NAMES.DOCUMENT_PROCESSING]: {
    ...DEFAULT_JOB_OPTIONS,
    attempts: 5,          // More retries for document processing
    backoff: {
      type: 'exponential',
      delay: 5000,        // Longer delay for document processing
    }
  },
  
  [QUEUE_NAMES.FILE_UPLOAD]: {
    ...DEFAULT_JOB_OPTIONS,
    attempts: 2,          // Fewer retries for uploads
    priority: JOB_PRIORITIES.HIGH
  },
  
  [QUEUE_NAMES.EMBEDDING_GENERATION]: {
    ...DEFAULT_JOB_OPTIONS,
    attempts: 5,          // More retries for OpenAI calls
    backoff: {
      type: 'exponential',
      delay: 10000,       // Longer delay for API rate limits
    }
  },
  
  [QUEUE_NAMES.NOTIFICATIONS]: {
    ...DEFAULT_JOB_OPTIONS,
    attempts: 2,
    priority: JOB_PRIORITIES.HIGH
  }
};

// Worker concurrency settings
const WORKER_CONCURRENCY = {
  [QUEUE_NAMES.DOCUMENT_PROCESSING]: 3,  // Limit concurrent document processing
  [QUEUE_NAMES.FILE_UPLOAD]: 5,          // More concurrent uploads
  [QUEUE_NAMES.EMBEDDING_GENERATION]: 2, // Limit OpenAI API calls
  [QUEUE_NAMES.NOTIFICATIONS]: 10        // High concurrency for notifications
};

// Create queue instances
const createQueue = (queueName) => {
  return new Queue(queueName, {
    connection: redisConnection,
    defaultJobOptions: QUEUE_OPTIONS[queueName] || DEFAULT_JOB_OPTIONS
  });
};

// Initialize all queues
const queues = {};
Object.values(QUEUE_NAMES).forEach(queueName => {
  queues[queueName] = createQueue(queueName);
  console.log(`📋 Initialized queue: ${queueName}`);
});

// Create queue events for monitoring
const queueEvents = {};
Object.values(QUEUE_NAMES).forEach(queueName => {
  queueEvents[queueName] = new QueueEvents(queueName, {
    connection: redisConnection
  });
});

// Test Redis connection
const testRedisConnection = async () => {
  try {
    // Create client compatible with BullMQ requirements
    const client = Redis.createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      password: redisConfig.password,
      database: redisConfig.db,
      // BullMQ compatibility
      maxRetriesPerRequest: null,
      retryDelayOnFailover: 100,
      enableAutoPipelining: true
    });
    
    await client.connect();
    const pong = await client.ping();
    await client.disconnect();
    
    console.log('✅ Redis connection successful:', pong);
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.error('❌ Redis error details:', {
      code: error.code,
      errno: error.errno,
      address: error.address,
      port: error.port
    });
    return false;
  }
};

module.exports = {
  // Configuration
  redisConfig,
  redisConnection,
  
  // Constants
  QUEUE_NAMES,
  JOB_TYPES,
  JOB_PRIORITIES,
  DEFAULT_JOB_OPTIONS,
  QUEUE_OPTIONS,
  WORKER_CONCURRENCY,
  
  // Queue instances
  queues,
  queueEvents,
  
  // Utilities
  createQueue,
  testRedisConnection
};
