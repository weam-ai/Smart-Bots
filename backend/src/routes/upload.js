const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const {
  validateAgentId,
  uploadLimiter,
  verifyAgentOwnership,
  jwtAuthMiddleware
} = require('../middleware');

// Apply upload rate limiting
router.use(uploadLimiter);

// GET /api/upload/supported-types - Get supported file types and limits
router.get('/supported-types', uploadController.getSupportedTypes);

// POST /api/upload/:agentId - Upload files for agent training (Busboy + Parallel Processing)
router.post('/:agentId', 
  validateAgentId,
  verifyAgentOwnership,
  jwtAuthMiddleware,
  uploadController.uploadFiles
);

// GET /api/upload/:agentId/status - Get upload/training status
router.get('/:agentId/status',
  validateAgentId,
  verifyAgentOwnership,
  jwtAuthMiddleware,
  uploadController.getUploadStatus
);

// GET /api/upload/:agentId/files - Get agent files list
router.get('/:agentId/files',
  validateAgentId,
  verifyAgentOwnership,
  jwtAuthMiddleware,
  uploadController.getAgentFiles
);

// GET /api/upload/:agentId/files/:fileId - Get file details
router.get('/:agentId/files/:fileId',
  validateAgentId,
  verifyAgentOwnership,
  jwtAuthMiddleware,
  uploadController.getFileDetails
);

// POST /api/upload/:agentId/files/:fileId/retry - Retry failed file processing
router.post('/:agentId/files/:fileId/retry',
  validateAgentId,
  verifyAgentOwnership,
  jwtAuthMiddleware,
  uploadController.retryFileProcessing
);

// DELETE /api/upload/:agentId/files/:fileId - Delete uploaded file (Background Processing)
router.delete('/:agentId/files/:fileId',
  // validateAgentId,
  verifyAgentOwnership,
  jwtAuthMiddleware,
  uploadController.deleteFile
);

// DELETE /api/upload/:agentId/files/:fileId/immediate - Delete uploaded file immediately
router.delete('/:agentId/files/:fileId/immediate',
  // validateAgentId,
  verifyAgentOwnership,
  jwtAuthMiddleware,
  uploadController.deleteFileImmediate
);

// DELETE /api/upload/:agentId/files/batch - Batch delete files (Background Processing)
router.delete('/:agentId/files/batch',
  validateAgentId,
  verifyAgentOwnership,
  jwtAuthMiddleware,
  uploadController.batchDeleteFiles
);

// GET /api/upload/deletion-status/:jobId - Get deletion job status
router.get('/deletion-status/:jobId',
  jwtAuthMiddleware,
  uploadController.getDeletionStatus
);

// GET /api/upload/deletion-queue-stats - Get deletion queue statistics
router.get('/deletion-queue-stats',
  jwtAuthMiddleware,
  uploadController.getDeletionQueueStats
);

// DELETE /api/upload/deletion-job/:jobId - Cancel deletion job
router.delete('/deletion-job/:jobId',
  jwtAuthMiddleware,
  uploadController.cancelDeletionJob
);

// POST /api/upload/:agentId/fix-status - Fix agent and file status (temporary)
router.post('/:agentId/fix-status',
  validateAgentId,
  verifyAgentOwnership,
  jwtAuthMiddleware,
  uploadController.fixAgentStatus
);

module.exports = router;
