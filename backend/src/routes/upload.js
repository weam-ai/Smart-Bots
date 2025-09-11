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

// DELETE /api/upload/:agentId/files/:fileId - Delete uploaded file
router.delete('/:agentId/files/:fileId',
  validateAgentId,
  verifyAgentOwnership,
  jwtAuthMiddleware,
  uploadController.deleteFile
);

// POST /api/upload/:agentId/fix-status - Fix agent and file status (temporary)
router.post('/:agentId/fix-status',
  validateAgentId,
  verifyAgentOwnership,
  jwtAuthMiddleware,
  uploadController.fixAgentStatus
);

module.exports = router;
