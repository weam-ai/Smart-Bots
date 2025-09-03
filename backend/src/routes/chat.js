/**
 * Chat Routes
 * API endpoints for chat functionality
 */

const express = require('express')
const router = express.Router()
const chatController = require('../controllers/chatController')
const { chatLimiter } = require('../middleware/rateLimiting')

// ==================== CHAT MESSAGES ====================

// Send message to agent
router.post('/:agentId/message', chatLimiter, chatController.sendMessage)

// Get chat sessions for agent
router.get('/:agentId/sessions', chatController.getSessions)

// Get messages for specific session
router.get('/:agentId/sessions/:sessionId/messages', chatController.getSessionMessages)

// ==================== HEALTH CHECK ====================

// Chat service health check
router.get('/health', chatController.healthCheck)

module.exports = router