/**
 * Background File Deletion Service
 * Handles queuing and processing of file deletion operations
 */

const { queues, QUEUE_NAMES, JOB_TYPES, JOB_PRIORITIES } = require('../config/queue');
const { createServiceError } = require('../utils/errorHelpers');
const { File } = require('../models');

/**
 * Queue a file deletion job
 */
const queueFileDeletion = async (agentId, fileId, context = {}) => {
  try {
    console.log(`🗑️  Queuing file deletion for file ${fileId} in agent ${agentId}`);
    
    // Get file details before queuing deletion
    const file = await File.findOne({ _id: fileId, agent: agentId });
    if (!file) {
      throw createServiceError(`File ${fileId} not found`, 'FILE_NOT_FOUND');
    }
    
    const jobData = {
      fileId,
      agentId,
      companyId: file.companyId,
      userId: context.userId || file.createdBy,
      
      // File details for deletion
      fileDetails: {
        originalFilename: file.originalFilename,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        s3Key: file.s3Key,
        status: file.status,
        createdAt: file.createdAt
      },
      
      // Deletion context
      deletionContext: {
        requestedBy: context.userId,
        requestedAt: new Date().toISOString(),
        reason: context.reason || 'user_requested',
        userAgent: context.userAgent
      }
    };
    
    const jobOptions = {
      priority: JOB_PRIORITIES.BACKGROUND,
      attempts: 3,
      delay: 0, // Process immediately
      removeOnComplete: 50,
      removeOnFail: 25,
      
      // Job metadata - use fileId as unique identifier to prevent duplicates
      jobId: `file-deletion-${fileId}`,
      
      // Progress tracking
      progress: 0
    };
    
    // Check if job already exists
    const existingJob = await queues[QUEUE_NAMES.FILE_DELETION].getJob(jobOptions.jobId);
    if (existingJob) {
      const state = await existingJob.getState();
      if (state === 'waiting' || state === 'active') {
        console.log(`⚠️  Deletion job already exists for file ${fileId}, returning existing job`);
        return {
          jobId: existingJob.id,
          queueName: QUEUE_NAMES.FILE_DELETION,
          jobType: JOB_TYPES.DELETE_FILE,
          fileId,
          agentId,
          status: state,
          queuedAt: new Date(existingJob.timestamp).toISOString(),
          estimatedProcessingTime: '30 seconds'
        };
      }
    }

    // Add job to file deletion queue
    const job = await queues[QUEUE_NAMES.FILE_DELETION].add(
      JOB_TYPES.DELETE_FILE,
      jobData,
      jobOptions
    );
    
    console.log(`✅ File deletion job queued: ${job.id} for file ${fileId}`);
    
    return {
      jobId: job.id,
      queueName: QUEUE_NAMES.FILE_DELETION,
      jobType: JOB_TYPES.DELETE_FILE,
      fileId,
      agentId,
      status: 'queued',
      queuedAt: new Date().toISOString(),
      estimatedProcessingTime: '30 seconds'
    };
    
  } catch (error) {
    console.error(`❌ Failed to queue file deletion for ${fileId}:`, error);
    throw createServiceError(`Failed to queue file deletion: ${error.message}`, 'QUEUE_ERROR');
  }
};

/**
 * Queue batch file deletion
 */
const queueBatchFileDeletion = async (agentId, fileIds, context = {}) => {
  try {
    console.log(`🗑️  Queuing batch deletion for ${fileIds.length} files in agent ${agentId}`);
    
    // Get file details for all files
    const files = await File.find({ 
      _id: { $in: fileIds }, 
      agent: agentId 
    });
    
    if (files.length !== fileIds.length) {
      const foundIds = files.map(f => f._id.toString());
      const missingIds = fileIds.filter(id => !foundIds.includes(id));
      throw createServiceError(`Some files not found: ${missingIds.join(', ')}`, 'FILES_NOT_FOUND');
    }
    
    const jobData = {
      agentId,
      companyId: context.companyId,
      userId: context.userId,
      
      // Batch deletion details
      fileIds,
      totalFiles: fileIds.length,
      files: files.map(file => ({
        fileId: file._id,
        originalFilename: file.originalFilename,
        fileSize: file.fileSize,
        s3Key: file.s3Key,
        status: file.status
      })),
      
      // Deletion context
      deletionContext: {
        requestedBy: context.userId,
        requestedAt: new Date().toISOString(),
        reason: context.reason || 'batch_user_requested',
        userAgent: context.userAgent
      }
    };
    
    const jobOptions = {
      priority: JOB_PRIORITIES.BACKGROUND,
      attempts: 3,
      delay: 1000, // Small delay for batch operations
      removeOnComplete: 25,
      removeOnFail: 10,
      
      // Job metadata
      jobId: `batch-deletion-${agentId}-${Date.now()}`,
      
      // Progress tracking
      progress: 0
    };
    
    // Add job to file deletion queue
    const job = await queues[QUEUE_NAMES.FILE_DELETION].add(
      JOB_TYPES.BATCH_DELETE_FILES,
      jobData,
      jobOptions
    );
    
    console.log(`✅ Batch file deletion job queued: ${job.id} for ${fileIds.length} files`);
    
    return {
      jobId: job.id,
      queueName: QUEUE_NAMES.FILE_DELETION,
      jobType: JOB_TYPES.BATCH_DELETE_FILES,
      agentId,
      totalFiles: fileIds.length,
      status: 'queued',
      queuedAt: new Date().toISOString(),
      estimatedProcessingTime: `${Math.ceil(fileIds.length * 0.5)} minutes`
    };
    
  } catch (error) {
    console.error(`❌ Failed to queue batch file deletion:`, error);
    throw createServiceError(`Failed to queue batch file deletion: ${error.message}`, 'QUEUE_ERROR');
  }
};

/**
 * Get deletion job status
 */
const getDeletionJobStatus = async (jobId) => {
  try {
    const job = await queues[QUEUE_NAMES.FILE_DELETION].getJob(jobId);
    
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
    console.error(`❌ Failed to get deletion job status for ${jobId}:`, error);
    throw createServiceError(`Failed to get deletion job status: ${error.message}`, 'QUEUE_ERROR');
  }
};

/**
 * Get deletion queue statistics
 */
const getDeletionQueueStats = async () => {
  try {
    const queue = queues[QUEUE_NAMES.FILE_DELETION];
    
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();
    
    return {
      queueName: QUEUE_NAMES.FILE_DELETION,
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      },
      jobs: {
        waiting: waiting.slice(0, 10).map(job => ({ 
          id: job.id, 
          name: job.name,
          data: job.data 
        })),
        active: active.slice(0, 10).map(job => ({ 
          id: job.id, 
          name: job.name, 
          progress: job.progress,
          data: job.data 
        })),
        failed: failed.slice(0, 10).map(job => ({ 
          id: job.id, 
          name: job.name, 
          reason: job.failedReason,
          data: job.data 
        }))
      },
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Failed to get deletion queue stats:`, error);
    throw createServiceError(`Failed to get deletion queue stats: ${error.message}`, 'QUEUE_ERROR');
  }
};

/**
 * Cancel a deletion job
 */
const cancelDeletionJob = async (jobId) => {
  try {
    const job = await queues[QUEUE_NAMES.FILE_DELETION].getJob(jobId);
    
    if (!job) {
      throw createServiceError(`Job ${jobId} not found`, 'JOB_NOT_FOUND');
    }
    
    const state = await job.getState();
    
    if (state === 'completed' || state === 'failed') {
      throw createServiceError(`Cannot cancel job in ${state} state`, 'INVALID_JOB_STATE');
    }
    
    await job.remove();
    console.log(`✅ Deletion job ${jobId} cancelled successfully`);
    
    return {
      jobId,
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Failed to cancel deletion job ${jobId}:`, error);
    throw createServiceError(`Failed to cancel deletion job: ${error.message}`, 'QUEUE_ERROR');
  }
};

module.exports = {
  queueFileDeletion,
  queueBatchFileDeletion,
  getDeletionJobStatus,
  getDeletionQueueStats,
  cancelDeletionJob
};
