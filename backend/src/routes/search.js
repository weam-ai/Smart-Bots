const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const {
  validateAgentId,
  generalLimiter,
  verifyAgentOwnership,
  jwtAuthMiddleware
} = require('../middleware');

// Apply general rate limiting
router.use(generalLimiter);

/**
 * Search Routes
 * Handles semantic similarity search across agent documents
 */

// POST /api/search/:agentId - Search for similar content in agent's knowledge base
router.post('/:agentId',
  validateAgentId,
  verifyAgentOwnership,
  jwtAuthMiddleware,
  searchController.searchSimilar
);

// GET /api/search/:agentId/stats - Get search statistics and capabilities
router.get('/:agentId/stats',
  validateAgentId,
  verifyAgentOwnership,
  jwtAuthMiddleware,
  searchController.getSearchStats
);

// POST /api/search/:agentId/test - Test search functionality with sample queries
router.post('/:agentId/test',
  validateAgentId,
  verifyAgentOwnership,
  jwtAuthMiddleware
);

module.exports = router;
