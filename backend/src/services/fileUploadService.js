const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const { File, Agent } = require('../models');
const { 
  UPLOAD_ERROR_CODES,
  MULTER_CONFIG
} = require('../constants/fileUpload');
const { 
  createFileError, 
  createNotFoundError, 
  asyncHandler 
} = require('../utils/errorHelpers');

/**
 * File Upload Service
 */

/**
 * File Upload Service
 * Note: This service is used for database operations only.
 * File uploads are handled by busboyUploadService and queuedUploadService.
 */

/**
 * Generate file hash for deduplication
 */
const generateFileHash = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Generate unique filename
 */
const generateUniqueFilename = (originalName, hash) => {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${randomStr}_${hash.substring(0, 8)}${ext}`;
};

/**
 * Save file to disk
 */
const saveFileToDisk = async (agentId, buffer, filename) => {
  const uploadDir = path.join(process.cwd(), 'uploads', agentId);
  
  // Create directory if it doesn't exist
  await fs.mkdir(uploadDir, { recursive: true });
  
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);
  
  return filePath;
};

/**
 * Save file metadata to database
 */
const saveFileToDatabase = async (agentId, file, fileHash, storedFilename, context = {}) => {
  const fileDoc = new File({
    agent: agentId,
    // Multi-tenant fields (required for new records)
    companyId: context.companyId,
    createdBy: context.userId,
    
    originalFilename: file.originalname,
    storedFilename: storedFilename,
    filePath: `/uploads/${agentId}/${storedFilename}`,
    fileSize: file.size,
    mimeType: file.mimetype,
    fileHash: fileHash,
    status: 'processing',
    processingProgress: 0,
    metadata: {
      uploadedAt: new Date(),
      encoding: file.encoding || 'binary',
      fieldname: file.fieldname || MULTER_CONFIG.FIELD_NAME,
      uploadContext: {
        userAgent: context.userAgent,
        uploadedBy: context.userId,
        companyId: context.companyId
      }
    }
  });

  await fileDoc.save();
  return fileDoc;
};

/**
 * Check for duplicate files
 */
const checkDuplicateFile = async (agentId, fileHash) => {
  return await File.findOne({
    agent: agentId,
    fileHash: fileHash
  });
};

/**
 * Process uploaded files
 */
const processUploadedFiles = asyncHandler(async (agentId, files, context = {}) => {
  console.log(`📁 Processing ${files.length} files for agent ${agentId}`);

  // Validate agent exists
  const agent = await Agent.findById(agentId);
  if (!agent) {
    throw createNotFoundError('Agent', agentId);
  }

  // Validate files
  validateUploadedFiles(files);

  const processedFiles = [];
  const errors = [];

  for (const file of files) {
    try {
      console.log(`📄 Processing file: ${file.originalname} (${file.size} bytes)`);

      // Comprehensive validation
      performComprehensiveValidation(file);

      // Generate file hash for deduplication
      const fileHash = generateFileHash(file.buffer);

      // Check for duplicates
      const existingFile = await checkDuplicateFile(agentId, fileHash);
      if (existingFile) {
        console.log(`⚠️  Duplicate file detected: ${file.originalname}`);
        errors.push({
          filename: file.originalname,
          error: 'Duplicate file already uploaded',
          code: UPLOAD_ERROR_CODES.DUPLICATE_FILE,
          hash: fileHash.substring(0, 8)
        });
        continue;
      }

      // Generate unique filename
      const storedFilename = generateUniqueFilename(file.originalname, fileHash);

      // Save file to disk
      await saveFileToDisk(agentId, file.buffer, storedFilename);

      // Save file metadata to database
      const fileDoc = await saveFileToDatabase(agentId, file, fileHash, storedFilename, context);

      processedFiles.push({
        id: fileDoc._id,
        originalName: file.originalname,
        storedName: storedFilename,
        size: file.size,
        type: file.mimetype,
        hash: fileHash.substring(0, 8),
        status: 'processing',
        uploadedAt: fileDoc.createdAt
      });

      console.log(`✅ File processed successfully: ${file.originalname}`);

    } catch (error) {
      console.error(`❌ Error processing file ${file.originalname}:`, error.message);
      errors.push({
        filename: file.originalname,
        error: error.message,
        code: error.errorCode || UPLOAD_ERROR_CODES.PROCESSING_FAILED
      });
    }
  }

  // Update agent status if files were processed
  if (processedFiles.length > 0) {
    await Agent.findByIdAndUpdate(agentId, {
      status: 'training',
      lastUsed: new Date()
    });
  }

  return {
    processedFiles,
    errors,
    totalFiles: files.length,
    successfulFiles: processedFiles.length,
    failedFiles: errors.length
  };
});

/**
 * Get upload status for agent
 */
const getUploadStatus = asyncHandler(async (agentId) => {
  const agent = await Agent.findById(agentId);
  if (!agent) {
    throw createNotFoundError('Agent', agentId);
  }

  const files = await File.find({ agent: agentId })
    .select('originalFilename fileSize status processingProgress createdAt')
    .sort({ createdAt: -1 });

  const totalFiles = files.length;
  const processingFiles = files.filter(f => f.status === 'processing').length;
  const processedFiles = files.filter(f => f.status === 'processed').length;
  const errorFiles = files.filter(f => f.status === 'error').length;

  return {
    agent: {
      id: agent._id,
      name: agent.name,
      status: agent.status
    },
    files: {
      total: totalFiles,
      processing: processingFiles,
      processed: processedFiles,
      errors: errorFiles,
      list: files
    },
    progress: totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0
  };
});

/**
 * Delete uploaded file from database only
 * Note: S3 and Pinecone deletion should be handled by the calling controller
 */
const deleteUploadedFile = asyncHandler(async (agentId, fileId) => {
  const file = await File.findOne({ _id: fileId, agent: agentId });
  console.log(`🗑️  Preparing to delete file:`, {
    id: file?._id,
    originalName: file?.originalFilename,
    size: file?.fileSize
  });
  
  if (!file) {
    throw createNotFoundError('File', fileId);
  }

  // Delete file from database
  await File.findByIdAndDelete(fileId);
  console.log(`✅ File deleted from database successfully: ${file.originalFilename}`);

  return file;
});

module.exports = {
  processUploadedFiles,
  getUploadStatus,
  deleteUploadedFile,
  generateFileHash,
  generateUniqueFilename
};
