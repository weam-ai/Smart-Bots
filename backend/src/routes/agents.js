const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const deploymentController = require('../controllers/deploymentController');
const { jwtAuthMiddleware } = require('../middleware/cookieAuth');
const {
  validateAgentCreate,
  validateAgentUpdate,
  validateObjectId,
  validateAgentId,
  validateCreateDeployment,
  validateUpdateDeployment,
  validatePagination,
  agentCreationLimiter,
  generalLimiter
} = require('../middleware');

// Apply general rate limiting to all agent routes
router.use(generalLimiter);

// GET /api/agents - Get all agents for user's company
router.get('/', 
  validatePagination,
  jwtAuthMiddleware,
  agentController.getAllAgents
);

// GET /api/agents/:id - Get specific agent (must belong to user's company)
router.get('/:id', 
  validateObjectId,
  jwtAuthMiddleware,
  agentController.getAgentById
);

// POST /api/agents - Create new agent
router.post('/', 
  agentCreationLimiter,
  validateAgentCreate,
  jwtAuthMiddleware,
  agentController.createAgent
);

// PUT /api/agents/:id - Update agent (must belong to user's company)
router.put('/:id', 
  validateObjectId,
  validateAgentUpdate,
  jwtAuthMiddleware,
  agentController.updateAgent
);

// DELETE /api/agents/:id - Delete agent (must belong to user's company)
router.delete('/:id', 
  validateObjectId,
  jwtAuthMiddleware,
  agentController.deleteAgent
);

// ==================== DEPLOYMENT ROUTES ====================

// POST /api/agents/:agentId/deployments - Create new deployment
router.post('/:agentId/deployments',
  validateAgentId,
  validateCreateDeployment,
  jwtAuthMiddleware,
  deploymentController.createDeployment
);

// GET /api/agents/:agentId/deployments - List all deployments for agent
router.get('/:agentId/deployments',
  validateAgentId,
  jwtAuthMiddleware,
  deploymentController.getDeployments
);

// GET /api/agents/:agentId/deployments/:_id - Get specific deployment
router.get('/:agentId/deployments/:_id',
  validateAgentId,
  jwtAuthMiddleware,
  deploymentController.getDeployment
);

// PUT /api/agents/:agentId/deployments/:_id - Update deployment
router.put('/:agentId/deployments/:_id',
  validateAgentId,
  validateUpdateDeployment,
  jwtAuthMiddleware,
  deploymentController.updateDeployment
);

// DELETE /api/agents/:agentId/deployments/:_id - Delete deployment
router.delete('/:agentId/deployments/:_id',
  validateAgentId,
  jwtAuthMiddleware,
  deploymentController.deleteDeployment
);

module.exports = router;
