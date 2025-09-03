const express = require('express');
const router = express.Router();
const deploymentController = require('../controllers/deploymentController');
const {
  validateAgentId,
  validateDeploymentId,
  validateCreateDeployment,
  validateUpdateDeployment,
  validateTrackAnalytics,
  optionalAuth,
  verifyAgentOwnership
} = require('../middleware');

// ==================== PUBLIC EMBED ROUTES ====================

// GET /api/deployments/:deploymentId/embed - Get embed code (public)
router.get('/:deploymentId/embed',
  validateDeploymentId,
  deploymentController.getEmbedCode
);

// POST /api/deployments/:deploymentId/analytics - Track analytics (public)
router.post('/:deploymentId/analytics',
  validateDeploymentId,
  validateTrackAnalytics,
  deploymentController.trackAnalytics
);

module.exports = router;
