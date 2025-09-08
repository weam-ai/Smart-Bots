/**
 * Chat Routes
 * API endpoints for chat functionality
 */

const express = require('express')
const router = express.Router()
const chatController = require('../controllers/chatController')
const { chatLimiter } = require('../middleware/rateLimiting')
const { jwtAuthMiddleware } = require('../middleware/cookieAuth')

// ==================== CHAT MESSAGES ====================

// Send message to agent
router.post('/:agentId/message', chatLimiter, chatController.sendMessage)

// Get chat sessions for agent
router.get('/:agentId/sessions', jwtAuthMiddleware, chatController.getSessions)

// Get messages for specific session
router.get('/:agentId/sessions/:sessionId/messages', jwtAuthMiddleware, chatController.getSessionMessages)

// ==================== HEALTH CHECK ====================

// Chat service health check
router.get('/health', jwtAuthMiddleware, chatController.healthCheck)

module.exports = router