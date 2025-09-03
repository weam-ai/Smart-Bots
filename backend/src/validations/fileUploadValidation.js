const { 
  ALLOWED_MIME_TYPES, 
  UPLOAD_LIMITS, 
  SUSPICIOUS_FILE_PATTERNS,
  FILE_SIGNATURES,
  UPLOAD_ERROR_CODES 
} = require('../constants/fileUpload');
const { 
  createFileError, 
  createValidationError 
} = require('../utils/errorHelpers');

/**
 * File Upload Validation Functions
 */

/**
 * Validate uploaded files array
 */
const validateUploadedFiles = (files) => {
  if (!files || files.length === 0) {
    throw createValidationError('No files provided');
  }

  if (files.length > UPLOAD_LIMITS.MAX_FILES_PER_UPLOAD) {
    throw createValidationError(
      `Too many files. Maximum ${UPLOAD_LIMITS.MAX_FILES_PER_UPLOAD} files allowed`,
      null,
      UPLOAD_ERROR_CODES.TOO_MANY_FILES
    );
  }

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > UPLOAD_LIMITS.MAX_TOTAL_SIZE) {
    throw createValidationError(
      `Total file size exceeds limit. Maximum ${Math.round(UPLOAD_LIMITS.MAX_TOTAL_SIZE / 1024 / 1024)}MB allowed`,
      null,
      UPLOAD_ERROR_CODES.TOTAL_SIZE_EXCEEDED
    );
  }

  // Validate each individual file
  files.forEach(file => validateSingleFile(file));

  return true;
};

/**
 * Validate single file
 */
const validateSingleFile = (file) => {
  // Check file type
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    const allowedTypes = Object.keys(ALLOWED_MIME_TYPES).join(', ');
    throw createValidationError(
      `Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes}`,
      { allowedTypes: Object.keys(ALLOWED_MIME_TYPES) },
      UPLOAD_ERROR_CODES.INVALID_FILE_TYPE
    );
  }

  // Check individual file size
  const maxSize = ALLOWED_MIME_TYPES[file.mimetype]?.maxSize;
  if (maxSize && file.size > maxSize) {
    throw createValidationError(
      `File ${file.originalname} exceeds size limit of ${Math.round(maxSize / 1024 / 1024)}MB`,
      { 
        filename: file.originalname, 
        actualSize: file.size, 
        maxSize 
      },
      UPLOAD_ERROR_CODES.FILE_TOO_LARGE
    );
  }

  return true;
};

/**
 * Validate file type and extension match
 */
const validateFileTypeExtension = (file) => {
  const expectedExt = ALLOWED_MIME_TYPES[file.mimetype]?.ext;
  if (!expectedExt) return true;

  const actualExt = require('path').extname(file.originalname).toLowerCase();
  
  // Handle array of extensions (like for application/octet-stream)
  const isValidExtension = Array.isArray(expectedExt) 
    ? expectedExt.includes(actualExt)
    : actualExt === expectedExt;
  
  if (!isValidExtension) {
    throw createValidationError(
      `File extension ${actualExt} doesn't match MIME type ${file.mimetype}`,
      { 
        filename: file.originalname,
        expectedExtension: expectedExt,
        actualExtension: actualExt 
      }
    );
  }

  return true;
};

/**
 * Security validation for suspicious files
 */
const validateFileSecurity = (file) => {
  // Check for suspicious file patterns
  if (SUSPICIOUS_FILE_PATTERNS.some(pattern => pattern.test(file.originalname))) {
    throw createFileError(
      `Suspicious file type detected: ${file.originalname}`,
      file.originalname,
      UPLOAD_ERROR_CODES.SUSPICIOUS_FILE
    );
  }

  // Check for null bytes (potential security issue)
  if (file.buffer && file.buffer.includes(0x00)) {
    console.warn(`⚠️  Null bytes detected in file: ${file.originalname}`);
  }

  return true;
};

/**
 * Validate file signature
 */
const validateFileSignature = (file) => {
  if (!file.buffer) return true;

  const expectedSignature = FILE_SIGNATURES[file.mimetype];
  if (!expectedSignature) return true; // No signature to check

  const actualSignature = Array.from(file.buffer.slice(0, expectedSignature.length));
  
  if (!expectedSignature.every((byte, index) => byte === actualSignature[index])) {
    console.warn(`⚠️  File signature mismatch for: ${file.originalname}`);
    // Log but don't throw error - some files might have variations
    return false;
  }

  return true;
};

/**
 * Validate file name
 */
const validateFileName = (filename) => {
  // Check for dangerous characters
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(filename)) {
    throw createValidationError(
      `Filename contains invalid characters: ${filename}`,
      { filename, invalidChars: 'Special characters not allowed' }
    );
  }

  // Check filename length
  if (filename.length > 255) {
    throw createValidationError(
      `Filename too long. Maximum 255 characters allowed`,
      { filename, length: filename.length }
    );
  }

  // Check for reserved names (Windows)
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
  if (reservedNames.test(filename)) {
    throw createValidationError(
      `Filename uses reserved name: ${filename}`,
      { filename }
    );
  }

  return true;
};

/**
 * Comprehensive file validation
 */
const performComprehensiveValidation = (file) => {
  validateFileName(file.originalname);
  validateSingleFile(file);
  validateFileTypeExtension(file);
  validateFileSecurity(file);
  validateFileSignature(file);
  
  return true;
};

/**
 * Validate file for processing
 */
const validateFileForProcessing = (fileDoc) => {
  if (!fileDoc) {
    throw createValidationError('File document is required');
  }

  if (!fileDoc.agent) {
    throw createValidationError('File must be associated with an agent');
  }

  if (fileDoc.status === 'processed') {
    throw createValidationError('File is already processed');
  }

  return true;
};

/**
 * Validate pagination parameters
 */
const validatePaginationParams = (page, limit) => {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    throw createValidationError('Page must be a positive integer');
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    throw createValidationError('Limit must be between 1 and 100');
  }

  return { page: pageNum, limit: limitNum };
};

module.exports = {
  validateUploadedFiles,
  validateSingleFile,
  validateFileTypeExtension,
  validateFileSecurity,
  validateFileSignature,
  validateFileName,
  performComprehensiveValidation,
  validateFileForProcessing,
  validatePaginationParams
};
