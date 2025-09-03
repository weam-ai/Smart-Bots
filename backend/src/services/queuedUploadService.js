/**
 * Queued Upload Service
 * Handles file uploads and queues them for background processing
 */

const Busboy = require('busboy');
const crypto = require('crypto');
const { File } = require('../models');
const s3Service = require('./s3Service');
const documentQueueService = require('./documentQueueService');
const fileUploadValidation = require('../validations/fileUploadValidation');
const { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, UPLOAD_ERRORS } = require('../constants/fileUpload');
const { JOB_PRIORITIES } = require('../config/queue');
const { createServiceError, createValidationError } = require('../utils/errorHelpers');

/**
 * Handle queued file upload with Busboy
 */
const handleQueuedUpload = async (req, agentId, context = {}) => {
  return new Promise((resolve, reject) => {
    const files = [];
    const fields = {};
    const uploadResults = [];
    const pendingFiles = new Set(); // Track pending file processing
    
    const busboy = Busboy({ 
      headers: req.headers,
      limits: {
        fileSize: MAX_FILE_SIZE,
        files: 10,
        fields: 20
      }
    });

    // Handle form fields
    busboy.on('field', (fieldname, value) => {
      fields[fieldname] = value;
      console.log(`📝 Form field: ${fieldname} = ${value}`);
    });

    // Handle file uploads
    busboy.on('file', (fieldname, file, info) => {
      const { filename, mimeType } = info;
      console.log(`📁 Processing file: ${filename} (${mimeType})`);
      
      // Track this file as pending
      pendingFiles.add(filename);
      
      const chunks = [];
      let fileSize = 0;
      
      file.on('data', (chunk) => {
        chunks.push(chunk);
        fileSize += chunk.length;
        
        // Check file size limit
        if (fileSize > MAX_FILE_SIZE) {
          file.destroy();
          pendingFiles.delete(filename); // Remove from pending
          return reject(createValidationError(`File ${filename} exceeds maximum size limit`));
        }
      });
      
      file.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          console.log(`📊 File ${filename} uploaded: ${fileSize} bytes`);
          
          // Process this file asynchronously
          const result = await processFileForQueue(buffer, mimeType, filename, agentId, {
            ...context,
            ...fields,
            fileSize
          });
          
          uploadResults.push(result);
          pendingFiles.delete(filename); // Mark as completed
          
          // Check if all files are processed and busboy has finished
          checkForCompletion();
          
        } catch (error) {
          console.error(`❌ Error processing file ${filename}:`, error);
          uploadResults.push({
            success: false,
            filename,
            error: {
              message: error.message,
              code: error.code || 'FILE_PROCESSING_ERROR'
            }
          });
          pendingFiles.delete(filename); // Mark as completed (with error)
          
          // Check if all files are processed and busboy has finished
          checkForCompletion();
        }
      });
      
      file.on('error', (error) => {
        console.error(`❌ File stream error for ${filename}:`, error);
        uploadResults.push({
          success: false,
          filename,
          error: {
            message: `File stream error: ${error.message}`,
            code: 'FILE_STREAM_ERROR'
          }
        });
        pendingFiles.delete(filename); // Mark as completed (with error)
        checkForCompletion();
      });
    });

    // Track when busboy has finished receiving files
    let busboyFinished = false;
    
    // Function to check if all processing is complete
    const checkForCompletion = () => {
      if (busboyFinished && pendingFiles.size === 0) {
        console.log(`✅ All processing completed: ${uploadResults.length} files processed`);
        
        const successfulFiles = uploadResults.filter(r => r.success);
        const failedFiles = uploadResults.filter(r => !r.success);
        
        resolve({
          success: true,
          results: {
            successfulFiles,
            failedFiles,
            totalFiles: uploadResults.length,
            successCount: successfulFiles.length,
            failureCount: failedFiles.length
          },
          queueInfo: {
            jobsQueued: successfulFiles.map(f => f.jobInfo),
            estimatedProcessingTime: successfulFiles.reduce((total, f) => total + f.estimatedTime, 0)
          }
        });
      }
    };

    // Handle upload completion
    busboy.on('finish', () => {
      console.log(`✅ Upload stream finished, waiting for ${pendingFiles.size} files to complete processing`);
      busboyFinished = true;
      checkForCompletion();
    });

    busboy.on('error', (error) => {
      console.error('❌ Busboy error:', error);
      reject(createServiceError(`Upload failed: ${error.message}`, 'UPLOAD_ERROR'));
    });

    // Start processing the request
    req.pipe(busboy);
  });
};

/**
 * Process individual file for queue-based processing
 */
const processFileForQueue = async (buffer, mimetype, filename, agentId, context) => {
  try {
    console.log(`🔄 Processing file for queue: ${filename} (${mimetype})`);
    
    // Step 1: Correct MIME type if needed
    const correctedMimeType = correctMimeType(mimetype, filename);
    
    // Step 2: Comprehensive validation
    const validationResult = performComprehensiveValidation(buffer, correctedMimeType, filename);
    if (!validationResult.isValid) {
      throw createValidationError(validationResult.error);
    }
    
    // Step 3: Upload to S3
    console.log(`☁️  Uploading ${filename} to S3...`);
    const s3Key = `uploads/${agentId}/${Date.now()}-${filename}`;
    const s3Result = await s3Service.uploadBuffer(buffer, s3Key, correctedMimeType);
    
    console.log(`✅ S3 upload successful: ${s3Result.s3Url}`);
    
    // Step 4: Create file document in MongoDB
    const contentHash = generateContentHash(buffer);
    
    const fileDoc = new File({
      agent: agentId,
      originalFilename: filename,    // ✅ Match schema field name
      fileSize: buffer.length,       // ✅ Match schema field name  
      fileHash: contentHash,         // ✅ Match schema field name
      mimeType: correctedMimeType,
      s3Key: s3Result.s3Key,
      s3Url: s3Result.s3Url,
      
      // Processing status (will be updated by queue workers)
      processing: {
        status: 'queued',
        queuedAt: new Date(),
        
        textExtraction: { status: 'pending' },
        chunking: { status: 'pending' },
        embeddings: { status: 'pending' },
        qdrant: { status: 'pending' }
      },
      
      metadata: {
        uploadedAt: new Date(),
        uploadContext: {
          userAgent: context.userAgent,
          uploadedBy: context.userId,
          companyId: context.companyId
        }
      }
    });
    
    await fileDoc.save();
    console.log(`💾 File document saved to MongoDB: ${fileDoc._id}`);
    
    // Step 5: Queue for background processing
    const jobInfo = await documentQueueService.queueFileProcessing(
      fileDoc._id,
      {
        agentId,
        filename,
        s3Key: s3Result.s3Key,
        s3Url: s3Result.s3Url,
        mimeType: correctedMimeType,
        fileSize: buffer.length,
        userId: context.userId,
        companyId: context.companyId,
        
        // Processing configuration
        chunkingStrategy: context.chunkingStrategy || 'recursive',
        chunkSize: parseInt(context.chunkSize) || 1000,
        chunkOverlap: parseInt(context.chunkOverlap) || 200,
        embeddingModel: context.embeddingModel || 'text-embedding-3-small'
      },
      {
        priority: getPriorityValue(context.priority || 'high')
      }
    );
    
    console.log(`🎯 File queued for processing: job ${jobInfo.jobId}`);
    
    return {
      success: true,
      file: {
        id: fileDoc._id,
        filename: fileDoc.originalFilename,  // ✅ Use correct field name
        size: fileDoc.fileSize,             // ✅ Use correct field name
        mimeType: fileDoc.mimeType,
        s3Url: fileDoc.s3Url,
        status: 'queued'
      },
      jobInfo: {
        jobId: jobInfo.jobId,
        queueName: jobInfo.queueName,
        estimatedTime: jobInfo.estimatedProcessingTime.estimated.total,
        status: 'queued'
      },
      estimatedTime: jobInfo.estimatedProcessingTime.estimated.total
    };
    
  } catch (error) {
    console.error(`❌ File processing failed for ${filename}:`, error);
    throw error;
  }
};

/**
 * Correct MIME type based on file extension
 */
const correctMimeType = (mimeType, filename) => {
  if (mimeType === 'application/octet-stream') {
    const extension = filename.toLowerCase().split('.').pop();
    
    const extensionMimeMap = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'txt': 'text/plain',
      'md': 'text/markdown',
      'csv': 'text/csv',
      'json': 'application/json'
    };
    
    return extensionMimeMap[extension] || mimeType;
  }
  
  return mimeType;
};

/**
 * Perform comprehensive file validation
 */
const performComprehensiveValidation = (buffer, mimeType, filename) => {
  try {
    // File size validation
    if (buffer.length === 0) {
      return { isValid: false, error: 'File is empty' };
    }
    
    if (buffer.length > MAX_FILE_SIZE) {
      return { isValid: false, error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` };
    }
    
    // MIME type validation
    const allowedMimeType = ALLOWED_MIME_TYPES[mimeType];
    if (!allowedMimeType) {
      return { isValid: false, error: `File type ${mimeType} is not supported` };
    }
    
    // File extension validation
    const extension = '.' + filename.toLowerCase().split('.').pop();
    
    // Handle both old format (direct extension) and new format (object with ext property)
    let expectedExtensions;
    if (typeof allowedMimeType === 'object' && allowedMimeType.ext) {
      expectedExtensions = Array.isArray(allowedMimeType.ext) ? allowedMimeType.ext : [allowedMimeType.ext];
    } else {
      expectedExtensions = Array.isArray(allowedMimeType) ? allowedMimeType : [allowedMimeType];
    }
    
    if (!expectedExtensions.includes(extension)) {
      return { 
        isValid: false, 
        error: `File extension ${extension} doesn't match MIME type ${mimeType}. Expected: ${expectedExtensions.join(', ')}` 
      };
    }
    
    // Additional validation using the validation service
    try {
      fileUploadValidation.validateFileTypeExtension({
        mimetype: mimeType,
        originalname: filename
      });
    } catch (validationError) {
      return { 
        isValid: false, 
        error: validationError.message || 'File validation failed'
      };
    }
    
    return { isValid: true };
    
  } catch (error) {
    return { isValid: false, error: `Validation error: ${error.message}` };
  }
};

/**
 * Generate content hash for duplicate detection
 */
const generateContentHash = (buffer) => {
  return crypto.createHash('md5').update(buffer).digest('hex').substring(0, 8);
};

/**
 * Map priority string to numeric value for BullMQ
 */
const getPriorityValue = (priorityString) => {
  const priorityMap = {
    'urgent': JOB_PRIORITIES.URGENT,
    'high': JOB_PRIORITIES.HIGH,
    'normal': JOB_PRIORITIES.NORMAL,
    'low': JOB_PRIORITIES.LOW,
    'background': JOB_PRIORITIES.BACKGROUND
  };
  
  return priorityMap[priorityString.toLowerCase()] || JOB_PRIORITIES.NORMAL;
};

/**
 * Get upload progress/status
 */
const getUploadStatus = async (fileId) => {
  try {
    const file = await File.findById(fileId).lean();
    if (!file) {
      return { exists: false };
    }
    
    // Get job status if file is being processed
    let jobStatus = null;
    if (file.processing?.status === 'queued' || file.processing?.status === 'processing') {
      // Here we would get the actual job status from the queue
      // For now, return the file processing status
      jobStatus = {
        status: file.processing.status,
        progress: calculateProgress(file.processing),
        currentStep: getCurrentStep(file.processing)
      };
    }
    
    return {
      exists: true,
      file: {
        id: file._id,
        filename: file.originalFilename,  // ✅ Use correct field name
        size: file.fileSize,             // ✅ Use correct field name
        mimeType: file.mimeType,
        uploadedAt: file.createdAt
      },
      processing: file.processing,
      jobStatus
    };
    
  } catch (error) {
    console.error(`❌ Failed to get upload status for ${fileId}:`, error);
    throw createServiceError(`Failed to get upload status: ${error.message}`, 'STATUS_ERROR');
  }
};

/**
 * Calculate overall processing progress
 */
const calculateProgress = (processing) => {
  const steps = ['textExtraction', 'chunking', 'embeddings', 'qdrant'];
  let completedSteps = 0;
  
  steps.forEach(step => {
    if (processing[step]?.status === 'completed') {
      completedSteps++;
    }
  });
  
  return Math.round((completedSteps / steps.length) * 100);
};

/**
 * Get current processing step
 */
const getCurrentStep = (processing) => {
  if (processing.textExtraction?.status === 'processing') return 'Extracting text';
  if (processing.chunking?.status === 'processing') return 'Chunking text';
  if (processing.embeddings?.status === 'processing') return 'Generating embeddings';
  if (processing.qdrant?.status === 'processing') return 'Storing in vector database';
  
  if (processing.status === 'completed') return 'Complete';
  if (processing.status === 'failed') return 'Failed';
  
  return 'Queued';
};

module.exports = {
  handleQueuedUpload,
  getUploadStatus,
  processFileForQueue
};
