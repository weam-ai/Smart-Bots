const express = require('express');
const router = express.Router();
const chatHistoryController = require('../controllers/chatHistoryController');
const {
  validateObjectId,
  validateAgentId,
  validateSessionId,
  generalLimiter
} = require('../middleware');

// Apply general rate limiting to all chat history routes
router.use(generalLimiter);

// ==================== AGENT-SPECIFIC ROUTES ====================

// GET /api/chat-history/agent/:agentId - Get chat histories for an agent
router.get('/agent/:agentId',
  validateAgentId,
  chatHistoryController.getChatHistoriesByAgent
);

// GET /api/chat-history/agent/:agentId/stats - Get chat statistics for an agent
router.get('/agent/:agentId/stats',
  validateAgentId,
  chatHistoryController.getChatStatistics
);

// GET /api/chat-history/agent/:agentId/export - Export chat data for an agent
router.get('/agent/:agentId/export',
  validateAgentId,
  chatHistoryController.exportChatData
);

// ==================== VISITOR-SPECIFIC ROUTES ====================

// GET /api/chat-history/visitor/:visitorId - Get chat histories for a visitor
router.get('/visitor/:visitorId',
  validateObjectId,
  chatHistoryController.getChatHistoriesByVisitor
);

// ==================== SESSION-SPECIFIC ROUTES ====================

// GET /api/chat-history/session/:sessionId - Get detailed chat session
router.get('/session/:sessionId',
  validateSessionId,
  chatHistoryController.getChatSessionDetails
);

module.exports = router;
