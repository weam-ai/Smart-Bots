const agentService = require('../services/agentService');

// Get all agents
const getAllAgents = async (req, res) => {
  try {
    const agents = await agentService.getAllAgents();
    res.json({ agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
};

// Get agent by ID
const getAgentById = async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await agentService.getAgentById(id);
    
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
    const agentData = req.body;
    const newAgent = await agentService.createAgent(agentData);
    
    res.status(201).json({ agent: newAgent });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
};

// Update agent
const updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedAgent = await agentService.updateAgent(id, updates);
    
    if (!updatedAgent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({ agent: updatedAgent });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
};

// Delete agent
const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAgent = await agentService.deleteAgent(id);
    
    if (!deletedAgent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({ message: 'Agent deleted successfully', agent: deletedAgent });
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
