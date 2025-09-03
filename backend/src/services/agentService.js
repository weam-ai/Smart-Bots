const { Agent } = require('../models');

// Get all agents
const getAllAgents = async () => {
  try {
    const agents = await Agent.find({}).sort({ createdAt: -1 });
    return agents;
  } catch (error) {
    throw new Error(`Failed to fetch agents: ${error.message}`);
  }
};

// Get agent by ID
const getAgentById = async (id) => {
  try {
    const agent = await Agent.findById(id);
    return agent;
  } catch (error) {
    throw new Error(`Failed to fetch agent: ${error.message}`);
  }
};

// Create new agent
const createAgent = async (agentData) => {
  try {
    console.log('🆔 Creating agent with provided ID:', agentData._id);
    
    const newAgent = new Agent({
      _id: agentData._id, // Use the provided ID from frontend
      name: agentData.name || `New Agent ${Date.now()}`,
      description: agentData.description || 'A new AI chatbot agent',
      status: 'uploading',
      avatar: agentData.avatar || '🤖',
      systemPrompt: agentData.systemPrompt || 'You are a helpful AI assistant.',
      temperature: agentData.temperature || 0.7,
      model: agentData.model || 'gpt-3.5-turbo',
      maxTokens: agentData.maxTokens || 1000,
      topP: agentData.topP || 1.0,
      frequencyPenalty: agentData.frequencyPenalty || 0.0,
      presencePenalty: agentData.presencePenalty || 0.0,
      tags: agentData.tags || [],
      isPublic: true
    });

    const savedAgent = await newAgent.save();
    console.log('✅ Agent created with ID:', savedAgent._id);
    return savedAgent;
  } catch (error) {
    console.error('❌ Failed to create agent:', error);
    throw new Error(`Failed to create agent: ${error.message}`);
  }
};

// Update agent
const updateAgent = async (id, updates) => {
  try {
    const updatedAgent = await Agent.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );
    return updatedAgent;
  } catch (error) {
    throw new Error(`Failed to update agent: ${error.message}`);
  }
};

// Delete agent
const deleteAgent = async (id) => {
  try {
    const deletedAgent = await Agent.findByIdAndDelete(id);
    return deletedAgent;
  } catch (error) {
    throw new Error(`Failed to delete agent: ${error.message}`);
  }
};

// Update agent status
const updateAgentStatus = async (id, status) => {
  try {
    const updatedAgent = await Agent.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    return updatedAgent;
  } catch (error) {
    throw new Error(`Failed to update agent status: ${error.message}`);
  }
};

// Get agents by status
const getAgentsByStatus = async (status) => {
  try {
    const agents = await Agent.find({ status }).sort({ createdAt: -1 });
    return agents;
  } catch (error) {
    throw new Error(`Failed to fetch agents by status: ${error.message}`);
  }
};

// Get public agents
const getPublicAgents = async () => {
  try {
    const agents = await Agent.find({ isPublic: true, status: 'trained' }).sort({ createdAt: -1 });
    return agents;
  } catch (error) {
    throw new Error(`Failed to fetch public agents: ${error.message}`);
  }
};

module.exports = {
  getAllAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  updateAgentStatus,
  getAgentsByStatus,
  getPublicAgents
};
