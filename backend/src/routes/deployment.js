const express = require('express');
const router = express.Router();
const deploymentController = require('../controllers/deploymentController');
const {
  validateTrackAnalytics,
  jwtAuthMiddleware
} = require('../middleware');

// ==================== PUBLIC EMBED ROUTES ====================

// GET /api/deployments/:_id/embed - Get embed code (public)
router.get('/:_id/embed',
  deploymentController.getEmbedCode
);

// POST /api/deployments/:_id/analytics - Track analytics (public)
router.post('/:_id/analytics',
  validateTrackAnalytics,
  jwtAuthMiddleware,
  deploymentController.trackAnalytics
);

module.exports = router;
