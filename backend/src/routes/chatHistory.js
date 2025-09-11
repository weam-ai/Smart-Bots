const express = require('express');
const router = express.Router();
const chatHistoryController = require('../controllers/chatHistoryController');
const {
  validateObjectId,
  validateAgentId,
  validateSessionId,
  generalLimiter,
  jwtAuthMiddleware
} = require('../middleware');

// Apply general rate limiting to all chat history routes
router.use(generalLimiter);

// ==================== AGENT-SPECIFIC ROUTES ====================

// GET /api/chat-history/agent/:agentId - Get chat histories for an agent
router.get('/agent/:agentId',
  validateAgentId,
  jwtAuthMiddleware,
  chatHistoryController.getChatHistoriesByAgent
);

// GET /api/chat-history/agent/:agentId/stats - Get chat statistics for an agent
router.get('/agent/:agentId/stats',
  validateAgentId,
  jwtAuthMiddleware,
  chatHistoryController.getChatStatistics
);

// GET /api/chat-history/agent/:agentId/export - Export chat data for an agent
router.get('/agent/:agentId/export',
  validateAgentId,
  jwtAuthMiddleware,
  chatHistoryController.exportChatData
);

// ==================== VISITOR-SPECIFIC ROUTES ====================

// GET /api/chat-history/visitor/:visitorId - Get chat histories for a visitor
router.get('/visitor/:visitorId',
  validateObjectId,
  jwtAuthMiddleware,
  chatHistoryController.getChatHistoriesByVisitor
);

// ==================== SESSION-SPECIFIC ROUTES ====================

// GET /api/chat-history/session/:sessionId - Get detailed chat session
router.get('/session/:sessionId',
  validateSessionId,
  jwtAuthMiddleware,
  chatHistoryController.getChatSessionDetails
);

module.exports = router;
