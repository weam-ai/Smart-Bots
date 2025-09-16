const agentService = require('../services/agentService');

// Get all agents for the user's company
const getAllAgents = async (req, res) => {
  try {
    const { companyId } = req.user;
    
    // Get agents for the user's company only
    const agents = await agentService.getAgentsByCompany(companyId);
    
    res.json({ agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
};

// Get agent by ID (must belong to user's company)
const getAgentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    const agent = await agentService.getAgentByIdAndCompany(id, companyId);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({ agent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
};

// Create new agent
const createAgent = async (req, res) => {
  try {
    const { userId, userEmail, companyId } = req.user;
    const agentData = {
      ...req.body,
      companyId,
      createdBy: userId,
      createdByEmail: userEmail
    };
    const newAgent = await agentService.createAgent(agentData);
    
    res.status(201).json({ agent: newAgent });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
};

// Update agent (must belong to user's company)
const updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    const updates = req.body;
    
    const updatedAgent = await agentService.updateAgentByIdAndCompany(id, companyId, updates);
    
    if (!updatedAgent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({ agent: updatedAgent });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
};

// Delete agent (must belong to user's company)
const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    
    console.log(`🗑️ Deleting agent ${id} for company ${companyId}`);
    
    // Use comprehensive cleanup method that handles all related data
    const result = await agentService.deleteAgentCompletely(id, companyId);
    
    if (!result.success) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    console.log(`✅ Agent ${id} deleted successfully with cleanup results:`, result.results);
    
    res.json({ 
      message: 'Agent deleted successfully', 
      agent: result.results.agent,
      cleanup: {
        deployments: result.results.deployments.deletedCount,
        files: result.results.files.deletedCount,
        chatSessions: result.results.chatSessions.deletedCount,
        chatMessages: result.results.chatMessages.deletedCount
      }
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
};

module.exports = {
  getAllAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent
};
