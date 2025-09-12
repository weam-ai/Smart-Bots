const { Agent, File, ChatSession } = require('../models');

// Get all agents (deprecated - use getAgentsByCompany instead)
const getAllAgents = async () => {
  try {
    const agents = await Agent.find({}).sort({ createdAt: -1 });
    return agents;
  } catch (error) {
    throw new Error(`Failed to fetch agents: ${error.message}`);
  }
};

// Get agents by company ID
const getAgentsByCompany = async (companyId) => {
  try {
    const agents = await Agent.find({ companyId }).sort({ createdAt: -1 });
    
    // Add file count and session count for each agent
    const agentsWithCounts = await Promise.all(
      agents.map(async (agent) => {
        try {
          // Get file count for this agent
          const fileCount = await File.countDocuments({ 
            agent: agent._id, 
            companyId: companyId,
            status: { $in: ['completed', 'processing'] } // Only count successfully uploaded files
          });
          
          // Get session count for this agent
          const sessionCount = await ChatSession.countDocuments({ 
            agent: agent._id, 
            companyId: companyId 
          });
          
          // Get total messages for this agent
          const totalMessages = await ChatSession.aggregate([
            { $match: { agent: agent._id, companyId: companyId } },
            { $group: { _id: null, totalMessages: { $sum: '$totalMessages' } } }
          ]);
          
          const messageCount = totalMessages.length > 0 ? totalMessages[0].totalMessages : 0;
          
          return {
            ...agent.toObject(),
            metadata: {
              ...agent.metadata,
              totalFiles: fileCount,
              totalSessions: sessionCount,
              totalMessages: messageCount
            }
          };
        } catch (error) {
          console.error(`Error getting counts for agent ${agent._id}:`, error);
          // Return agent with zero counts if there's an error
          return {
            ...agent.toObject(),
            metadata: {
              ...agent.metadata,
              totalFiles: 0,
              totalSessions: 0,
              totalMessages: 0
            }
          };
        }
      })
    );
    
    return agentsWithCounts;
  } catch (error) {
    throw new Error(`Failed to fetch agents for company: ${error.message}`);
  }
};

// All agents now have companyId for proper multi-tenant support

// Get agent by ID (deprecated - use getAgentByIdAndCompany instead)
const getAgentById = async (id) => {
  try {
    const agent = await Agent.findById(id);
    return agent;
  } catch (error) {
    throw new Error(`Failed to fetch agent: ${error.message}`);
  }
};

// Get agent by ID and company ID
const getAgentByIdAndCompany = async (id, companyId) => {
  try {
    const agent = await Agent.findOne({ _id: id, companyId });
    
    if (!agent) {
      return null;
    }
    
    try {
      // Get file count for this agent
      const fileCount = await File.countDocuments({ 
        agent: agent._id, 
        companyId: companyId,
        status: { $in: ['completed', 'processing'] } // Only count successfully uploaded files
      });
      
      // Get session count for this agent
      const sessionCount = await ChatSession.countDocuments({ 
        agent: agent._id, 
        companyId: companyId 
      });
      
      // Get total messages for this agent
      const totalMessages = await ChatSession.aggregate([
        { $match: { agent: agent._id, companyId: companyId } },
        { $group: { _id: null, totalMessages: { $sum: '$totalMessages' } } }
      ]);
      
      const messageCount = totalMessages.length > 0 ? totalMessages[0].totalMessages : 0;
      
      return {
        ...agent.toObject(),
        metadata: {
          ...agent.metadata,
          totalFiles: fileCount,
          totalSessions: sessionCount,
          totalMessages: messageCount
        }
      };
    } catch (error) {
      console.error(`Error getting counts for agent ${agent._id}:`, error);
      // Return agent with zero counts if there's an error
      return {
        ...agent.toObject(),
        metadata: {
          ...agent.metadata,
          totalFiles: 0,
          totalSessions: 0,
          totalMessages: 0
        }
      };
    }
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
      companyId: agentData.companyId,
      createdBy: agentData.createdBy,
      createdByEmail: agentData.createdByEmail,
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

// Update agent (deprecated - use updateAgentByIdAndCompany instead)
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

// Update agent by ID and company ID
const updateAgentByIdAndCompany = async (id, companyId, updates) => {
  try {
    const updatedAgent = await Agent.findOneAndUpdate(
      { _id: id, companyId },
      updates,
      { new: true, runValidators: true }
    );
    return updatedAgent;
  } catch (error) {
    throw new Error(`Failed to update agent: ${error.message}`);
  }
};

// Delete agent (deprecated - use deleteAgentByIdAndCompany instead)
const deleteAgent = async (id) => {
  try {
    const deletedAgent = await Agent.findByIdAndDelete(id);
    return deletedAgent;
  } catch (error) {
    throw new Error(`Failed to delete agent: ${error.message}`);
  }
};

// Delete agent by ID and company ID
const deleteAgentByIdAndCompany = async (id, companyId) => {
  try {
    const deletedAgent = await Agent.findOneAndDelete({ _id: id, companyId });
    return deletedAgent;
  } catch (error) {
    throw new Error(`Failed to delete agent: ${error.message}`);
  }
};

// Update agent status (deprecated - use updateAgentByIdAndCompany instead)
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

// Get agents by status (deprecated - use getAgentsByCompany with status filter instead)
const getAgentsByStatus = async (status) => {
  try {
    const agents = await Agent.find({ status }).sort({ createdAt: -1 });
    return agents;
  } catch (error) {
    throw new Error(`Failed to fetch agents by status: ${error.message}`);
  }
};

// Get public agents (deprecated - use getAgentsByCompany with isPublic filter instead)
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
  getAgentsByCompany,
  getAgentById,
  getAgentByIdAndCompany,
  createAgent,
  updateAgent,
  updateAgentByIdAndCompany,
  deleteAgent,
  deleteAgentByIdAndCompany,
  updateAgentStatus,
  getAgentsByStatus,
  getPublicAgents
};
