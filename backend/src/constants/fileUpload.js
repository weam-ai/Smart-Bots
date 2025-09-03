/**
 * File Upload Constants
 */

// File type configuration with size limits
const ALLOWED_MIME_TYPES = {
  'application/pdf': { ext: '.pdf', maxSize: 10 * 1024 * 1024 }, // 10MB
  'text/plain': { ext: '.txt', maxSize: 5 * 1024 * 1024 }, // 5MB
  'application/msword': { ext: '.doc', maxSize: 10 * 1024 * 1024 }, // 10MB
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', maxSize: 10 * 1024 * 1024 }, // 10MB
  'text/markdown': { ext: '.md', maxSize: 5 * 1024 * 1024 }, // 5MB
  'application/json': { ext: '.json', maxSize: 2 * 1024 * 1024 }, // 2MB
  'text/csv': { ext: '.csv', maxSize: 5 * 1024 * 1024 }, // 5MB
  'application/rtf': { ext: '.rtf', maxSize: 5 * 1024 * 1024 }, // 5MB
  'application/octet-stream': { ext: ['.docx', '.doc', '.pdf'], maxSize: 10 * 1024 * 1024 } // Generic binary - detect by extension
};

// Upload limits
const UPLOAD_LIMITS = {
  MAX_FILES_PER_UPLOAD: 10,
  MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB total
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB per file
  MAX_FIELD_SIZE: 1024 * 1024, // 1MB field size
  MAX_FIELD_NAME_SIZE: 100, // 100 bytes field name size
  MAX_HEADER_PAIRS: 2000 // Max header pairs
};

// File processing status
const FILE_STATUS = {
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  ERROR: 'error',
  CANCELLED: 'cancelled'
};

// File processing stages
const PROCESSING_STAGES = {
  UPLOAD: 'upload',
  VIRUS_SCAN: 'virus_scan',
  TEXT_EXTRACTION: 'text_extraction',
  CHUNKING: 'chunking',
  EMBEDDING: 'embedding',
  INDEXING: 'indexing',
  VALIDATION: 'validation',
  COMPLETED: 'completed'
};

// Suspicious file patterns for security
const SUSPICIOUS_FILE_PATTERNS = [
  /\.exe$/i,
  /\.bat$/i,
  /\.cmd$/i,
  /\.scr$/i,
  /\.com$/i,
  /\.pif$/i,
  /\.vbs$/i,
  /\.js$/i,
  /\.jar$/i,
  /\.msi$/i,
  /\.dll$/i
];

// File signatures for validation
const FILE_SIGNATURES = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04], // ZIP
  'application/msword': [0xD0, 0xCF, 0x11, 0xE0], // OLE
  'text/plain': null // No specific signature
};

// Upload error codes
const UPLOAD_ERROR_CODES = {
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  TOO_MANY_FILES: 'TOO_MANY_FILES',
  TOTAL_SIZE_EXCEEDED: 'TOTAL_SIZE_EXCEEDED',
  SUSPICIOUS_FILE: 'SUSPICIOUS_FILE',
  // DUPLICATE_FILE: 'DUPLICATE_FILE',
  SIGNATURE_MISMATCH: 'SIGNATURE_MISMATCH',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  STORAGE_ERROR: 'STORAGE_ERROR'
};

// Multer field configuration
const MULTER_CONFIG = {
  FIELD_NAME: 'files',
  MAX_COUNT: UPLOAD_LIMITS.MAX_FILES_PER_UPLOAD
};

module.exports = {
  ALLOWED_MIME_TYPES,
  UPLOAD_LIMITS,
  FILE_STATUS,
  PROCESSING_STAGES,
  SUSPICIOUS_FILE_PATTERNS,
  FILE_SIGNATURES,
  UPLOAD_ERROR_CODES,
  MULTER_CONFIG
};
