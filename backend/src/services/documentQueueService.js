/**
 * Document Processing Queue Service
 * Handles queuing and processing of document-related jobs
 */

const { queues, QUEUE_NAMES, JOB_TYPES, JOB_PRIORITIES } = require('../config/queue');
const { createServiceError } = require('../utils/errorHelpers');

/**
 * Queue a complete file processing pipeline
 */
const queueFileProcessing = async (fileId, processingData, options = {}) => {
  try {
    console.log(`📋 Queuing file processing for file ${fileId}`);
    
    const jobData = {
      fileId,
      agentId: processingData.agentId,
      filename: processingData.filename,
      s3Key: processingData.s3Key,
      s3Url: processingData.s3Url,
      mimeType: processingData.mimeType,
      fileSize: processingData.fileSize,
      userId: processingData.userId,
      companyId: processingData.companyId,
      uploadedAt: new Date().toISOString(),
      
      // Processing configuration
      chunkingOptions: {
        strategy: processingData.chunkingStrategy || 'recursive',
        chunkSize: processingData.chunkSize || 1000,
        chunkOverlap: processingData.chunkOverlap || 200
      },
      
      embeddingOptions: {
        model: processingData.embeddingModel || 'text-embedding-3-small',
        batchSize: processingData.embeddingBatchSize || 10
      }
    };
    
    const jobOptions = {
      priority: options.priority || JOB_PRIORITIES.HIGH,
      delay: options.delay || 0,
      attempts: options.attempts || 3,
      
      // Job metadata
      jobId: `file-processing-${fileId}-${Date.now()}`,
      
      // Progress tracking
      removeOnComplete: 20,
      removeOnFail: 10
    };
    
    // Add job to document processing queue
    const job = await queues[QUEUE_NAMES.DOCUMENT_PROCESSING].add(
      JOB_TYPES.EXTRACT_TEXT,
      jobData,
      jobOptions
    );
    
    console.log(`✅ File processing job queued: ${job.id} for file ${fileId}`);
    
    return {
      jobId: job.id,
      queueName: QUEUE_NAMES.DOCUMENT_PROCESSING,
      jobType: JOB_TYPES.EXTRACT_TEXT,
      fileId,
      estimatedProcessingTime: estimateProcessingTime(processingData.fileSize),
      status: 'queued',
      queuedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Failed to queue file processing for ${fileId}:`, error);
    throw createServiceError(`Failed to queue file processing: ${error.message}`, 'QUEUE_ERROR');
  }
};

/**
 * Queue text chunking job
 */
const queueTextChunking = async (jobData, parentJobId) => {
  try {
    const job = await queues[QUEUE_NAMES.DOCUMENT_PROCESSING].add(
      JOB_TYPES.CHUNK_TEXT,
      {
        ...jobData,
        parentJobId,
        extractedText: jobData.extractedText,
        textLength: jobData.extractedText.length
      },
      {
        priority: JOB_PRIORITIES.HIGH,
        delay: 500  // Small delay to ensure sequential processing
      }
    );
    
    console.log(`📝 Text chunking job queued: ${job.id}`);
    return job;
    
  } catch (error) {
    console.error(`❌ Failed to queue text chunking:`, error);
    throw createServiceError(`Text chunking queue failed: ${error.message}`, 'QUEUE_ERROR');
  }
};

/**
 * Queue embedding generation job
 */
const queueEmbeddingGeneration = async (jobData, parentJobId) => {
  try {
    const job = await queues[QUEUE_NAMES.EMBEDDING_GENERATION].add(
      JOB_TYPES.GENERATE_EMBEDDINGS,
      {
        ...jobData,
        parentJobId,
        chunks: jobData.chunks,
        totalChunks: jobData.chunks.length
      },
      {
        priority: JOB_PRIORITIES.NORMAL,
        delay: 1000,  // Small delay to ensure sequential processing
        
        // Special handling for OpenAI API
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 10000 // 10 second delay for API rate limits
        }
      }
    );
    
    console.log(`🤖 Embedding generation job queued: ${job.id} for ${jobData.chunks.length} chunks`);
    return job;
    
  } catch (error) {
    console.error(`❌ Failed to queue embedding generation:`, error);
    throw createServiceError(`Embedding generation queue failed: ${error.message}`, 'QUEUE_ERROR');
  }
};

/**
 * Queue Qdrant storage job
 */
const queueQdrantStorage = async (jobData, parentJobId) => {
  try {
    const job = await queues[QUEUE_NAMES.DOCUMENT_PROCESSING].add(
      JOB_TYPES.STORE_EMBEDDINGS,
      {
        ...jobData,
        parentJobId,
        embeddings: jobData.embeddings,
        chunks: jobData.chunks
      },
      {
        priority: JOB_PRIORITIES.HIGH,
        delay: 1500  // Small delay to ensure sequential processing
      }
    );
    
    console.log(`📦 Qdrant storage job queued: ${job.id}`);
    return job;
    
  } catch (error) {
    console.error(`❌ Failed to queue Qdrant storage:`, error);
    throw createServiceError(`Qdrant storage queue failed: ${error.message}`, 'QUEUE_ERROR');
  }
};

/**
 * Queue batch file processing
 */
const queueBatchProcessing = async (fileIds, processingOptions = {}) => {
  try {
    const jobs = [];
    
    for (const fileId of fileIds) {
      const job = await queues[QUEUE_NAMES.DOCUMENT_PROCESSING].add(
        JOB_TYPES.BATCH_PROCESS_FILES,
        {
          fileId,
          ...processingOptions,
          batchId: `batch-${Date.now()}`,
          totalFiles: fileIds.length
        },
        {
          priority: JOB_PRIORITIES.LOW, // Lower priority for batch operations
          delay: Math.random() * 5000   // Stagger batch jobs
        }
      );
      
      jobs.push(job);
    }
    
    console.log(`📦 Batch processing queued: ${jobs.length} files`);
    return jobs;
    
  } catch (error) {
    console.error(`❌ Failed to queue batch processing:`, error);
    throw createServiceError(`Batch processing queue failed: ${error.message}`, 'QUEUE_ERROR');
  }
};

/**
 * Queue notification job
 */
const queueNotification = async (notificationData) => {
  try {
    const job = await queues[QUEUE_NAMES.NOTIFICATIONS].add(
      JOB_TYPES.SEND_NOTIFICATION,
      notificationData,
      {
        priority: JOB_PRIORITIES.HIGH,
        attempts: 2
      }
    );
    
    console.log(`🔔 Notification job queued: ${job.id}`);
    return job;
    
  } catch (error) {
    console.error(`❌ Failed to queue notification:`, error);
    // Don't throw error for notifications - they're not critical
    return null;
  }
};

/**
 * Get job status and progress
 */
const getJobStatus = async (jobId, queueName = QUEUE_NAMES.DOCUMENT_PROCESSING) => {
  try {
    const job = await queues[queueName].getJob(jobId);
    
    if (!job) {
      return {
        exists: false,
        status: 'not_found'
      };
    }
    
    const state = await job.getState();
    const progress = job.progress || 0;
    
    return {
      exists: true,
      jobId: job.id,
      status: state,
      progress: progress,
      data: job.data,
      createdAt: new Date(job.timestamp),
      processedOn: job.processedOn ? new Date(job.processedOn) : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
      failedReason: job.failedReason,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts
    };
    
  } catch (error) {
    console.error(`❌ Failed to get job status for ${jobId}:`, error);
    throw createServiceError(`Failed to get job status: ${error.message}`, 'QUEUE_ERROR');
  }
};

/**
 * Get queue statistics
 */
const getQueueStats = async (queueName = QUEUE_NAMES.DOCUMENT_PROCESSING) => {
  try {
    const queue = queues[queueName];
    
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();
    
    return {
      queueName,
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      },
      jobs: {
        waiting: waiting.slice(0, 5).map(job => ({ id: job.id, name: job.name })),
        active: active.slice(0, 5).map(job => ({ id: job.id, name: job.name, progress: job.progress })),
        failed: failed.slice(0, 5).map(job => ({ id: job.id, name: job.name, reason: job.failedReason }))
      },
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Failed to get queue stats for ${queueName}:`, error);
    throw createServiceError(`Failed to get queue stats: ${error.message}`, 'QUEUE_ERROR');
  }
};

/**
 * Estimate processing time based on file size
 */
const estimateProcessingTime = (fileSize) => {
  // Rough estimates in seconds
  const baseTimes = {
    extraction: Math.ceil(fileSize / 1000000) * 2,  // 2 seconds per MB
    chunking: Math.ceil(fileSize / 1000000) * 1,    // 1 second per MB
    embedding: Math.ceil(fileSize / 100000) * 3,    // 3 seconds per 100KB (API calls)
    storage: Math.ceil(fileSize / 1000000) * 1       // 1 second per MB
  };
  
  const totalSeconds = Object.values(baseTimes).reduce((sum, time) => sum + time, 0);
  
  return {
    estimated: {
      extraction: baseTimes.extraction,
      chunking: baseTimes.chunking,
      embedding: baseTimes.embedding,
      storage: baseTimes.storage,
      total: totalSeconds
    },
    human: `${Math.ceil(totalSeconds / 60)} minutes`
  };
};

module.exports = {
  queueFileProcessing,
  queueTextChunking,
  queueEmbeddingGeneration,
  queueQdrantStorage,
  queueBatchProcessing,
  queueNotification,
  getJobStatus,
  getQueueStats,
  estimateProcessingTime
};
