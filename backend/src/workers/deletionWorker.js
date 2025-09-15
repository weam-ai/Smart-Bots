/**
 * File Deletion Worker
 * Processes file deletion jobs in the background
 */

const { Worker } = require('bullmq');
const { QUEUE_NAMES, JOB_TYPES, WORKER_CONCURRENCY } = require('../config/queue');
const { createServiceError } = require('../utils/errorHelpers');

// Import services
const s3Service = require('../services/s3Service');
const pineconeService = require('../services/pineconeService');
const fileUploadService = require('../services/fileUploadService');
const { File } = require('../models');
const { USE_MINIO } = require('../config/env');

/**
 * Process single file deletion
 */
const processFileDeletion = async (job) => {
  const { fileId, agentId, companyId, fileDetails } = job.data;
  
  try {
    console.log(`🗑️  Processing file deletion: ${fileDetails.originalFilename} (${fileId})`);
    
    // Update job progress
    await job.updateProgress(10);
    
    // Delete from S3 (AWS S3 or MinIO)
    if (fileDetails.s3Key) {
      console.log(`🗑️  Deleting from S3: ${fileDetails.s3Key}`);
      await s3Service.deleteFile(fileDetails.s3Key);
      console.log(`✅ S3 deletion successful: ${fileDetails.s3Key}`);
    }
    
    await job.updateProgress(40);
    
    // Delete from Pinecone
    if (companyId && fileDetails.status === 'completed') {
      console.log(`🗑️  Deleting from Pinecone for file ${fileId}`);
      await pineconeService.deleteFileChunks(companyId, agentId, fileId);
      console.log(`✅ Pinecone deletion successful for file ${fileId}`);
    }
    
    await job.updateProgress(70);
    
    // Delete from database (with proper error handling)
    console.log(`🗑️  Deleting from database: ${fileId}`);
    let deletedFile = null;
    try {
      deletedFile = await fileUploadService.deleteUploadedFile(agentId, fileId);
      console.log(`✅ Database deletion successful: ${deletedFile?.originalFilename || fileDetails.originalFilename}`);
    } catch (dbError) {
      // If file not found in database, it might have been already deleted
      if (dbError.message?.includes('not found') || dbError.message?.includes('File not found')) {
        console.log(`⚠️  File already deleted from database: ${fileId}`);
      } else {
        throw dbError;
      }
    }
    
    await job.updateProgress(100);
    
    // Prepare success result
    const deletedFrom = [];
    if (fileDetails.s3Key) {
      deletedFrom.push(USE_MINIO === true ? 'MinIO' : 'AWS S3');
    }
    if (companyId && fileDetails.status === 'completed') {
      deletedFrom.push('Pinecone');
    }
    deletedFrom.push('Database');
    
    const result = {
      success: true,
      fileId,
      agentId,
      originalFilename: fileDetails.originalFilename,
      fileSize: fileDetails.fileSize,
      deletedFrom,
      deletedAt: new Date().toISOString(),
      processingTime: Date.now() - job.timestamp
    };
    
    console.log(`✅ File deletion completed successfully:`, result);
    return result;
    
  } catch (error) {
    console.error(`❌ File deletion failed for ${fileId}:`, error);
    
    // Try to clean up database even if S3/Pinecone deletion fails
    try {
      await fileUploadService.deleteUploadedFile(agentId, fileId);
      console.log(`⚠️  File deleted from database but S3/Pinecone deletion failed`);
    } catch (dbError) {
      // If file not found, it's already deleted - that's okay
      if (dbError.message?.includes('not found') || dbError.message?.includes('File not found')) {
        console.log(`⚠️  File already deleted from database: ${fileId}`);
      } else {
        console.error(`❌ Database deletion also failed:`, dbError);
      }
    }
    
    throw createServiceError(`File deletion failed: ${error.message}`, 'DELETION_FAILED');
  }
};

/**
 * Process batch file deletion
 */
const processBatchFileDeletion = async (job) => {
  const { agentId, companyId, files, totalFiles } = job.data;
  
  try {
    console.log(`🗑️  Processing batch deletion: ${totalFiles} files`);
    
    const results = {
      successful: [],
      failed: [],
      totalFiles,
      processedFiles: 0
    };
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        console.log(`🗑️  Processing file ${i + 1}/${totalFiles}: ${file.originalFilename}`);
        
        // Delete from S3
        if (file.s3Key) {
          await s3Service.deleteFile(file.s3Key);
        }
        
        // Delete from Pinecone
        if (companyId && file.status === 'completed') {
          await pineconeService.deleteFileChunks(companyId, agentId, file.fileId);
        }
        
        // Delete from database
        await fileUploadService.deleteUploadedFile(agentId, file.fileId);
        
        results.successful.push({
          fileId: file.fileId,
          originalFilename: file.originalFilename,
          deletedAt: new Date().toISOString()
        });
        
        console.log(`✅ File ${i + 1}/${totalFiles} deleted successfully: ${file.originalFilename}`);
        
      } catch (fileError) {
        console.error(`❌ Failed to delete file ${file.originalFilename}:`, fileError);
        results.failed.push({
          fileId: file.fileId,
          originalFilename: file.originalFilename,
          error: fileError.message,
          failedAt: new Date().toISOString()
        });
      }
      
      results.processedFiles++;
      
      // Update progress
      const progress = Math.round((results.processedFiles / totalFiles) * 100);
      await job.updateProgress(progress);
    }
    
    const result = {
      success: results.failed.length === 0,
      totalFiles,
      successfulFiles: results.successful.length,
      failedFiles: results.failed.length,
      results,
      completedAt: new Date().toISOString(),
      processingTime: Date.now() - job.timestamp
    };
    
    console.log(`✅ Batch deletion completed:`, {
      totalFiles: result.totalFiles,
      successful: result.successfulFiles,
      failed: result.failedFiles
    });
    
    return result;
    
  } catch (error) {
    console.error(`❌ Batch file deletion failed:`, error);
    throw createServiceError(`Batch file deletion failed: ${error.message}`, 'BATCH_DELETION_FAILED');
  }
};

/**
 * Create deletion worker
 */
const createDeletionWorker = () => {
  const worker = new Worker(
    QUEUE_NAMES.FILE_DELETION,
    async (job) => {
      console.log(`🔄 Processing deletion job: ${job.id} (${job.name})`);
      
      // Check if job is already being processed or completed
      const state = await job.getState();
      if (state === 'completed' || state === 'failed') {
        console.log(`⚠️  Job ${job.id} already ${state}, skipping`);
        return;
      }
      
      try {
        switch (job.name) {
          case JOB_TYPES.DELETE_FILE:
            return await processFileDeletion(job);
            
          case JOB_TYPES.BATCH_DELETE_FILES:
            return await processBatchFileDeletion(job);
            
          default:
            throw new Error(`Unknown job type: ${job.name}`);
        }
      } catch (error) {
        console.error(`❌ Deletion job ${job.id} failed:`, error);
        throw error;
      }
    },
    {
      connection: {
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB,
        maxRetriesPerRequest: null
      },
      concurrency: WORKER_CONCURRENCY[QUEUE_NAMES.FILE_DELETION],
      
      // Job processing options
      removeOnComplete: 50,
      removeOnFail: 25,
      
      // Error handling
      maxStalledCount: 3,
      stalledInterval: 30000, // 30 seconds
      
      // Retry configuration
      retryDelayOnFailover: 100,
      retryDelayOnStall: 5000
    }
  );
  
  // Event listeners
  worker.on('ready', () => {
    console.log(`✅ Deletion worker ready - processing ${QUEUE_NAMES.FILE_DELETION} queue`);
  });
  
  worker.on('error', (error) => {
    console.error(`❌ Deletion worker error:`, error);
  });
  
  worker.on('failed', (job, error) => {
    console.error(`❌ Deletion job ${job?.id} failed:`, error);
  });
  
  worker.on('completed', (job, result) => {
    console.log(`✅ Deletion job ${job.id} completed successfully`);
  });
  
  worker.on('stalled', (jobId) => {
    console.warn(`⚠️  Deletion job ${jobId} stalled`);
  });
  
  return worker;
};

module.exports = {
  createDeletionWorker,
  processFileDeletion,
  processBatchFileDeletion
};
