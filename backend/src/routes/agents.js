const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const deploymentController = require('../controllers/deploymentController');
const {
  validateAgentCreate,
  validateAgentUpdate,
  validateObjectId,
  validateAgentId,
  validateDeploymentId,
  validateCreateDeployment,
  validateUpdateDeployment,
  validatePagination,
  optionalAuth,
  verifyAgentOwnership,
  agentCreationLimiter,
  generalLimiter
} = require('../middleware');

// Apply general rate limiting to all agent routes
router.use(generalLimiter);

// GET /api/agents - Get all agents
router.get('/', 
  validatePagination,
  optionalAuth,
  agentController.getAllAgents
);

// GET /api/agents/:id - Get specific agent
router.get('/:id', 
  validateObjectId,
  optionalAuth,
  verifyAgentOwnership,
  agentController.getAgentById
);

// POST /api/agents - Create new agent
router.post('/', 
  agentCreationLimiter,
  validateAgentCreate,
  optionalAuth,
  agentController.createAgent
);

// PUT /api/agents/:id - Update agent
router.put('/:id', 
  validateObjectId,
  validateAgentUpdate,
  optionalAuth,
  verifyAgentOwnership,
  agentController.updateAgent
);

// DELETE /api/agents/:id - Delete agent
router.delete('/:id', 
  validateObjectId,
  optionalAuth,
  verifyAgentOwnership,
  agentController.deleteAgent
);

// ==================== DEPLOYMENT ROUTES ====================

// POST /api/agents/:agentId/deployments - Create new deployment
router.post('/:agentId/deployments',
  validateAgentId,
  validateCreateDeployment,
  optionalAuth,
  verifyAgentOwnership,
  deploymentController.createDeployment
);

// GET /api/agents/:agentId/deployments - List all deployments for agent
router.get('/:agentId/deployments',
  validateAgentId,
  optionalAuth,
  verifyAgentOwnership,
  deploymentController.getDeployments
);

// GET /api/agents/:agentId/deployments/:deploymentId - Get specific deployment
router.get('/:agentId/deployments/:deploymentId',
  validateAgentId,
  validateDeploymentId,
  optionalAuth,
  verifyAgentOwnership,
  deploymentController.getDeployment
);

// PUT /api/agents/:agentId/deployments/:deploymentId - Update deployment
router.put('/:agentId/deployments/:deploymentId',
  validateAgentId,
  validateDeploymentId,
  validateUpdateDeployment,
  optionalAuth,
  verifyAgentOwnership,
  deploymentController.updateDeployment
);

// DELETE /api/agents/:agentId/deployments/:deploymentId - Delete deployment
router.delete('/:agentId/deployments/:deploymentId',
  validateAgentId,
  validateDeploymentId,
  optionalAuth,
  verifyAgentOwnership,
  deploymentController.deleteDeployment
);

module.exports = router;
