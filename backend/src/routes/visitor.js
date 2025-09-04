const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');
const {
  validateDeploymentId,
  generalLimiter
} = require('../middleware');

// Apply general rate limiting to all visitor routes
router.use(generalLimiter);

// ==================== PUBLIC ROUTES (for widget) ====================

// POST /api/visitors - Create or update visitor (used by widget)
router.post('/',
  visitorController.createOrUpdateVisitor
);

// ==================== DEPLOYMENT-SPECIFIC ROUTES ====================

// GET /api/visitors/deployment/:deploymentId - Get visitors for a deployment
router.get('/deployment/:deploymentId',
  validateDeploymentId,
  visitorController.getVisitorsByDeployment
);

// GET /api/visitors/deployment/:deploymentId/stats - Get visitor statistics
router.get('/deployment/:deploymentId/stats',
  validateDeploymentId,
  visitorController.getVisitorStats
);

// ==================== VISITOR-SPECIFIC ROUTES ====================

// GET /api/visitors/:visitorId - Get visitor details
router.get('/:visitorId',
  visitorController.getVisitorDetails
);

module.exports = router;
