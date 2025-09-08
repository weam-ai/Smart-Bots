const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');
const {
  generalLimiter,
  jwtAuthMiddleware
} = require('../middleware');

// Apply general rate limiting to all visitor routes
router.use(generalLimiter);

// ==================== PUBLIC ROUTES (for widget) ====================

// POST /api/visitors - Create or update visitor (used by widget)
router.post('/',
  visitorController.createOrUpdateVisitor
);

// ==================== DEPLOYMENT-SPECIFIC ROUTES ====================

// GET /api/visitors/deployment/:_id - Get visitors for a deployment
router.get('/deployment/:_id',
  jwtAuthMiddleware,
  visitorController.getVisitorsByDeployment
);

// GET /api/visitors/deployment/:_id/stats - Get visitor statistics
router.get('/deployment/:_id/stats',
  jwtAuthMiddleware,
  visitorController.getVisitorStats
);

// ==================== VISITOR-SPECIFIC ROUTES ====================

// GET /api/visitors/:visitorId - Get visitor details
router.get('/:visitorId',
  jwtAuthMiddleware,
  visitorController.getVisitorDetails
);

module.exports = router;
