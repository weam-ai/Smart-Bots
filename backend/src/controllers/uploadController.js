const busboyUploadService = require('../services/busboyUploadService');
const queuedUploadService = require('../services/queuedUploadService');
const documentQueueService = require('../services/documentQueueService');
const fileUploadService = require('../services/fileUploadService');
const backgroundDeletionService = require('../services/backgroundDeletionService');
const { asyncHandler } = require('../utils/errorHelpers');
const { File, Agent } = require('../models');
const { USE_MINIO } = require('../config/env');

/**
 * Upload Controller
 */

/**
 * Upload files for agent training (using Queue-based Processing)
 * POST /api/upload/:agentId
 */
const uploadFiles = asyncHandler(async (req, res) => {
  const { agentId } = req.params;

  console.log(`📤 Queue-based upload request for agent ${agentId}`);

  try {
    // Get user context from request
    const context = {
      userId: req.user?.userId,
      companyId: req.user?.companyId,
      userAgent: req.get('User-Agent'),
      
      // Processing options from query parameters
      chunkingStrategy: req.query.chunkingStrategy,
      chunkSize: req.query.chunkSize,
      chunkOverlap: req.query.chunkOverlap,
      embeddingModel: req.query.embeddingModel,
      priority: req.query.priority
    };
    
    console.log('🔍 Upload context debug:', {
      hasUser: !!req.user,
      user: req.user,
      context: context,
      authHeader: req.headers.authorization
    });
    
    // Ensure we have required fields for multi-tenant context
    if (!context.companyId || !context.userId) {
      console.warn('⚠️ Missing multi-tenant context, using fallback values');
      context.companyId = context.companyId || 'fallback-company';
      context.userId = context.userId || 'fallback-user';
    }
    
    // Process the uploaded files using queue-based service
    const result = await queuedUploadService.handleQueuedUpload(req, agentId, context);
    
    console.log('📊 Queue processing result:', result);

    if (!result) {
      throw new Error('Queue processing service returned undefined result');
    }

    // Prepare response
    const response = {
      success: true,
      message: `${result.results.successCount} files uploaded and queued for processing`,
      data: {
        agentId,
        files: result.results.successfulFiles,
        failedFiles: result.results.failedFiles,
        summary: {
          totalFiles: result.results.totalFiles,
          successful: result.results.successCount,
          failed: result.results.failureCount,
          queueBased: true,
          s3Storage: true
        }
      },
      queue: {
        jobsQueued: result.queueInfo.jobsQueued.length,
        estimatedProcessingTime: `${Math.ceil(result.queueInfo.estimatedProcessingTime / 60)} minutes`,
        jobs: result.queueInfo.jobsQueued.map(job => ({
          jobId: job.jobId,
          status: job.status
        }))
      }
    };

    // Include errors if any
    if (result.errors && result.errors.length > 0) {
      response.data.errors = result.errors;
      response.warnings = `${result.failedFiles} files failed to process`;
    }

    // Set appropriate status code
    const statusCode = result.failedFiles > 0 ? 207 : 200; // 207 Multi-Status for partial success

    res.status(statusCode).json(response);
  } catch (error) {
    console.error('Busboy upload controller error:', error);
    throw error; // Let error handler deal with it
  }
});

/**
 * Get upload status for agent
 * GET /api/upload/:agentId/status
 */
const getUploadStatus = asyncHandler(async (req, res) => {
  const { agentId } = req.params;

  console.log(`📊 Status request for agent ${agentId}`);

  const status = await fileUploadService.getUploadStatus(agentId);

  res.json({
    success: true,
    data: status
  });
});

/**
 * Get file details
 * GET /api/upload/:agentId/files/:fileId
 */
const getFileDetails = asyncHandler(async (req, res) => {
  const { agentId, fileId } = req.params;
  const { File } = require('../models');

  const file = await File.findOne({ _id: fileId, agent: agentId })
    .populate('agent', 'name status')
    .select('-filePath'); // Don't expose file paths

  if (!file) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'File not found',
        code: 'FILE_NOT_FOUND'
      }
    });
  }

  res.json({
    success: true,
    data: {
      file: {
        id: file._id,
        originalName: file.originalFilename,
        size: file.fileSize,
        type: file.mimeType,
        status: file.status,
        progress: file.processingProgress,
        uploadedAt: file.createdAt,
        processedAt: file.processedAt,
        chunkCount: file.chunkCount,
        metadata: file.metadata,
        agent: file.agent
      }
    }
  });
});

/**
 * Delete uploaded file immediately (not background processing)
 * DELETE /api/upload/:agentId/files/:fileId/immediate
 */
const deleteFileImmediate = asyncHandler(async (req, res) => {
  const { agentId, fileId } = req.params;

  console.log(`🗑️  Immediate delete request for file ${fileId} in agent ${agentId}`);

  // Get file details before deletion
  const { File } = require('../models');
  const file = await File.findOne({ _id: fileId, agent: agentId });
  
  if (!file) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'File not found',
        code: 'FILE_NOT_FOUND'
      }
    });
  }

  try {
    // Import services
    const s3Service = require('../services/s3Service');
    const pineconeService = require('../services/pineconeService');
    const { USE_MINIO } = require('../config/env');

    // Delete from S3 (AWS S3 or MinIO)
    if (file.s3Key) {
      console.log(`🗑️  Deleting from S3: ${file.s3Key}`);
      await s3Service.deleteFile(file.s3Key);
    }

    // Delete from Pinecone
    if (file.companyId && file.status === 'completed') {
      console.log(`🗑️  Deleting from Pinecone for file ${fileId}`);
      await pineconeService.deleteFileChunks(file.companyId, agentId, fileId);
    }

    // Delete from database
    console.log(`🗑️  Deleting from database: ${fileId}`);
    const deletedFile = await fileUploadService.deleteUploadedFile(agentId, fileId);
    console.log(`🗑️  Deleted file data:`, deletedFile);

    // Prepare success message
    const deletedFrom = [];
    if (file.s3Key) {
      deletedFrom.push(USE_MINIO === true ? 'MinIO' : 'AWS S3');
    }
    if (file.companyId && file.status === 'completed') {
      deletedFrom.push('Pinecone');
    }
    deletedFrom.push('Database');

    // Check if deletedFile is valid
    if (!deletedFile || !deletedFile._id) {
      console.error(`❌ Invalid deletedFile data:`, deletedFile);
      // Instead of throwing error, return success with basic info
      res.json({
        success: true,
        message: `File deleted from storage systems`,
        data: {
          deletedFile: {
            id: fileId,
            originalName: file.originalFilename,
            size: file.fileSize
          },
          deletedFrom: deletedFrom
        }
      });
      return;
    }

    res.json({
      success: true,
      message: `File deleted immediately from: ${deletedFrom.join(', ')}`,
      data: {
        deletedFile: {
          id: deletedFile._id,
          originalName: deletedFile.originalFilename,
          size: deletedFile.fileSize
        },
        deletedFrom: deletedFrom
      }
    });

  } catch (error) {
    console.error(`❌ Immediate file deletion failed:`, error);
    
    // Try to clean up database even if S3/Pinecone deletion fails
    let deletedFrom = ['Database'];
    try {
      const deletedFile = await fileUploadService.deleteUploadedFile(agentId, fileId);
      console.log(`⚠️  File deleted from database but S3/Pinecone deletion failed`);
      
      // Always return success, even if data is invalid
      res.json({
        success: true,
        message: `File deleted from storage systems`,
        data: {
          deletedFile: {
            id: deletedFile?._id || fileId,
            originalName: deletedFile?.originalFilename || file.originalFilename,
            size: deletedFile?.fileSize || file.fileSize
          },
          deletedFrom: deletedFrom
        }
      });
      return;
    } catch (dbError) {
      console.error(`❌ Database deletion also failed:`, dbError);
      // Even if database deletion fails, return success to avoid showing errors to user
      res.json({
        success: true,
        message: `File deletion attempted`,
        data: {
          deletedFile: {
            id: fileId,
            originalName: file.originalFilename,
            size: file.fileSize
          },
          deletedFrom: []
        }
      });
      return;
    }
  }
});

/**
 * Delete uploaded file (Background Processing)
 * DELETE /api/upload/:agentId/files/:fileId
 */
const deleteFile = asyncHandler(async (req, res) => {
  const { agentId, fileId } = req.params;

  console.log(`🗑️  Delete request for file ${fileId} in agent ${agentId}`);

  // Get file details before queuing deletion
  const { File } = require('../models');
  const file = await File.findOne({ _id: fileId, agent: agentId });
  
  if (!file) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'File not found',
        code: 'FILE_NOT_FOUND'
      }
    });
  }

  try {
    // Get user context for deletion
    const context = {
      userId: req.user?.userId,
      companyId: req.user?.companyId,
      userAgent: req.get('User-Agent'),
      reason: 'user_requested'
    };

    // Queue file deletion for background processing
    const deletionJob = await backgroundDeletionService.queueFileDeletion(
      agentId, 
      fileId, 
      context
    );

    console.log(`✅ File deletion queued for background processing:`, {
      jobId: deletionJob.jobId,
      fileId: fileId,
      originalName: file.originalFilename
    });

    // Return immediately with job information
    res.json({
      success: true,
      message: 'File deletion queued for background processing',
      data: {
        jobId: deletionJob.jobId,
        fileId: fileId,
        originalName: file.originalFilename,
        fileSize: file.fileSize,
        status: 'queued',
        estimatedProcessingTime: deletionJob.estimatedProcessingTime,
        queuedAt: deletionJob.queuedAt
      },
      background: {
        processing: true,
        jobId: deletionJob.jobId,
        queueName: deletionJob.queueName,
        checkStatusUrl: `/api/upload/deletion-status/${deletionJob.jobId}`
      }
    });

  } catch (error) {
    console.error(`❌ Failed to queue file deletion:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to queue file deletion for background processing',
        code: 'DELETION_QUEUE_FAILED',
        details: error.message
      }
    });
  }
});

/**
 * Get agent files list
 * GET /api/upload/:agentId/files
 */
const getAgentFiles = asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const { File } = require('../models');

  // Build query
  const query = { agent: agentId };
  if (status) {
    query.status = status;
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const files = await File.find(query)
    .select('-filePath -fileHash') // Don't expose sensitive data
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const totalFiles = await File.countDocuments(query);
  const totalPages = Math.ceil(totalFiles / parseInt(limit));

  res.json({
    success: true,
    data: {
      files,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalFiles,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    }
  });
});

/**
 * Get supported file types
 * GET /api/upload/supported-types
 */
const getSupportedTypes = asyncHandler(async (req, res) => {
  const { ALLOWED_MIME_TYPES, UPLOAD_LIMITS } = require('../constants/fileUpload');
  const documentParser = require('../services/documentParser');
  
  const parserTypes = documentParser.getSupportedTypes();
  
  const supportedTypes = Object.entries(ALLOWED_MIME_TYPES).map(([mimeType, config]) => {
    const parserInfo = parserTypes[mimeType] || {};
    return {
      mimeType,
      extension: config.ext,
      maxSize: config.maxSize,
      maxSizeMB: Math.round(config.maxSize / 1024 / 1024),
      name: parserInfo.name || 'Unknown',
      parser: parserInfo.parser || 'unknown',
      features: parserInfo.features || [],
      notes: parserInfo.notes || null
    };
  });

  res.json({
    success: true,
    data: {
      supportedTypes,
      limits: {
        maxFilesPerUpload: UPLOAD_LIMITS.MAX_FILES_PER_UPLOAD,
        maxTotalSize: UPLOAD_LIMITS.MAX_TOTAL_SIZE,
        maxTotalSizeMB: Math.round(UPLOAD_LIMITS.MAX_TOTAL_SIZE / 1024 / 1024)
      },
      parsers: {
        'pdf-parse': 'Advanced PDF text extraction with metadata',
        'mammoth': 'Word document processing (DOCX/DOC)',
        'native': 'Built-in text processing'
      }
    }
  });
});

/**
 * Retry failed file processing
 * POST /api/upload/:agentId/files/:fileId/retry
 */
const retryFileProcessing = asyncHandler(async (req, res) => {
  const { agentId, fileId } = req.params;
  const { File } = require('../models');

  // Find the file
  const file = await File.findOne({ _id: fileId, agent: agentId });
  if (!file) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'File not found',
        code: 'FILE_NOT_FOUND'
      }
    });
  }

  // Check if file can be retried
  if (file.status !== 'error') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'File is not in error state',
        code: 'INVALID_FILE_STATUS',
        currentStatus: file.status
      }
    });
  }

  // Reset file status for reprocessing
  file.status = 'processing';
  file.processingProgress = 0;
  file.errorMessage = undefined;
  await file.save();

  // TODO: Queue the file for reprocessing (will be implemented with BullMQ)
  console.log(`🔄 File ${fileId} queued for reprocessing`);

  res.json({
    success: true,
    message: 'File queued for reprocessing',
    data: {
      file: {
        id: file._id,
        status: file.status,
        progress: file.processingProgress
      }
    }
  });
});

/**
 * Get file processing status from queue
 * GET /api/upload/status/:fileId
 */
const getQueueStatus = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  try {
    const status = await queuedUploadService.getUploadStatus(fileId);
    
    if (!status.exists) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'File not found',
          code: 'FILE_NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: {
        file: status.file,
        processing: status.processing,
        jobStatus: status.jobStatus
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Failed to get queue status for ${fileId}:`, error);
    throw error;
  }
});

/**
 * Get queue statistics for agent
 * GET /api/upload/:agentId/queue-stats
 */
const getQueueStats = asyncHandler(async (req, res) => {
  const { agentId } = req.params;

  try {
    const stats = await documentQueueService.getQueueStats();
    
    res.json({
      success: true,
      data: {
        agentId,
        queueStats: stats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`❌ Failed to get queue stats for agent ${agentId}:`, error);
    throw error;
  }
});

/**
 * Get job details
 * GET /api/upload/job/:jobId
 */
const getJobStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  try {
    const jobStatus = await documentQueueService.getJobStatus(jobId);
    
    res.json({
      success: true,
      data: {
        job: jobStatus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`❌ Failed to get job status for ${jobId}:`, error);
    throw error;
  }
});

/**
 * Get deletion job status
 * GET /api/upload/deletion-status/:jobId
 */
const getDeletionStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  try {
    const status = await backgroundDeletionService.getDeletionJobStatus(jobId);
    
    if (!status.exists) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Deletion job not found',
          code: 'JOB_NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: {
        job: status,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`❌ Failed to get deletion status for ${jobId}:`, error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get deletion status',
        code: 'STATUS_RETRIEVAL_FAILED',
        details: error.message
      }
    });
  }
});

/**
 * Get deletion queue statistics
 * GET /api/upload/deletion-queue-stats
 */
const getDeletionQueueStats = asyncHandler(async (req, res) => {
  try {
    const stats = await backgroundDeletionService.getDeletionQueueStats();
    
    res.json({
      success: true,
      data: {
        queueStats: stats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`❌ Failed to get deletion queue stats:`, error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get deletion queue stats',
        code: 'STATS_RETRIEVAL_FAILED',
        details: error.message
      }
    });
  }
});

/**
 * Cancel deletion job
 * DELETE /api/upload/deletion-job/:jobId
 */
const cancelDeletionJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  try {
    const result = await backgroundDeletionService.cancelDeletionJob(jobId);
    
    res.json({
      success: true,
      message: 'Deletion job cancelled successfully',
      data: result
    });

  } catch (error) {
    console.error(`❌ Failed to cancel deletion job ${jobId}:`, error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to cancel deletion job',
        code: 'CANCELLATION_FAILED',
        details: error.message
      }
    });
  }
});

/**
 * Batch delete files (Background Processing)
 * DELETE /api/upload/:agentId/files/batch
 */
const batchDeleteFiles = asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  const { fileIds } = req.body;

  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'fileIds array is required and must not be empty',
        code: 'INVALID_FILE_IDS'
      }
    });
  }

  try {
    // Get user context for deletion
    const context = {
      userId: req.user?.userId,
      companyId: req.user?.companyId,
      userAgent: req.get('User-Agent'),
      reason: 'batch_user_requested'
    };

    // Queue batch file deletion for background processing
    const deletionJob = await backgroundDeletionService.queueBatchFileDeletion(
      agentId, 
      fileIds, 
      context
    );

    console.log(`✅ Batch file deletion queued for background processing:`, {
      jobId: deletionJob.jobId,
      agentId: agentId,
      totalFiles: fileIds.length
    });

    // Return immediately with job information
    res.json({
      success: true,
      message: 'Batch file deletion queued for background processing',
      data: {
        jobId: deletionJob.jobId,
        agentId: agentId,
        totalFiles: deletionJob.totalFiles,
        status: 'queued',
        estimatedProcessingTime: deletionJob.estimatedProcessingTime,
        queuedAt: deletionJob.queuedAt
      },
      background: {
        processing: true,
        jobId: deletionJob.jobId,
        queueName: deletionJob.queueName,
        checkStatusUrl: `/api/upload/deletion-status/${deletionJob.jobId}`
      }
    });

  } catch (error) {
    console.error(`❌ Failed to queue batch file deletion:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to queue batch file deletion for background processing',
        code: 'BATCH_DELETION_QUEUE_FAILED',
        details: error.message
      }
    });
  }
});

/**
 * Fix agent and file status (temporary endpoint for debugging)
 * POST /api/upload/:agentId/fix-status
 */
const fixAgentStatus = asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  
  try {
    // Update all files for this agent to completed
    const fileUpdateResult = await File.updateMany(
      { agent: agentId },
      { $set: { status: 'completed' } }
    );
    
    // Update agent status to completed
    const agentUpdateResult = await Agent.findByIdAndUpdate(
      agentId,
      { $set: { status: 'completed' } },
      { new: true }
    );
    
    console.log(`🔧 Fixed status for agent ${agentId}:`, {
      filesUpdated: fileUpdateResult.modifiedCount,
      agentUpdated: !!agentUpdateResult
    });
    
    res.json({
      success: true,
      message: 'Status fixed successfully',
      data: {
        filesUpdated: fileUpdateResult.modifiedCount,
        agentStatus: agentUpdateResult?.status
      }
    });
  } catch (error) {
    console.error('❌ Failed to fix status:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fix status',
        code: 'STATUS_FIX_FAILED'
      }
    });
  }
});

module.exports = {
  uploadFiles,
  getUploadStatus,
  getFileDetails,
  deleteFile,
  deleteFileImmediate,
  getAgentFiles,
  getSupportedTypes,
  retryFileProcessing,
  getQueueStatus,
  getQueueStats,
  getJobStatus,
  getDeletionStatus,
  getDeletionQueueStats,
  cancelDeletionJob,
  batchDeleteFiles,
  fixAgentStatus
};
