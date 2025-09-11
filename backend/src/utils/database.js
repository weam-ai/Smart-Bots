// In-memory database (replace with real database in production)
let agents = [
  {
    id: 'demo-agent-1',
    name: 'Customer Support Bot',
    description: 'Helps answer common customer questions and support issues',
    status: 'trained',
    fileCount: 5,
    totalSessions: 127,
    totalMessages: 584,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    avatar: '🤖',
    systemPrompt: 'You are a helpful customer support assistant.',
    temperature: 0.7,
    model: 'gpt-3.5-turbo'
  },
  {
    id: 'demo-agent-2',
    name: 'Documentation Assistant',
    description: 'Answers questions about product documentation and guides',
    status: 'trained',
    fileCount: 12,
    totalSessions: 89,
    totalMessages: 342,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    avatar: '📚',
    systemPrompt: 'You are a helpful documentation assistant.',
    temperature: 0.7,
    model: 'gpt-3.5-turbo'
  },
  {
    id: 'demo-agent-3',
    name: 'Sales Assistant',
    description: 'Provides information about products and pricing',
    status: 'trained',
    fileCount: 8,
    totalSessions: 156,
    totalMessages: 721,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    avatar: '💼',
    systemPrompt: 'You are a helpful sales assistant.',
    temperature: 0.7,
    model: 'gpt-3.5-turbo'
  }
];

const db = {
  // Agent operations
  getAgents: () => agents,
  
  getAgent: (id) => agents.find(agent => agent.id === id),
  
  createAgent: (agentData) => {
    const newAgent = {
      id: agentData.id,
      name: agentData.name || `New Agent ${Date.now()}`,
      description: agentData.description || 'A new AI chatbot agent',
      status: 'uploading',
      fileCount: 0,
      totalSessions: 0,
      totalMessages: 0,
      createdAt: new Date().toISOString(),
      avatar: '🤖',
      systemPrompt: agentData.systemPrompt || 'You are a helpful AI assistant.',
      temperature: agentData.temperature || 0.7,
      model: agentData.model || 'gpt-3.5-turbo'
    };
    
    agents.push(newAgent);
    return newAgent;
  },
  
  updateAgent: (id, updates) => {
    const index = agents.findIndex(agent => agent.id === id);
    if (index === -1) return null;
    
    agents[index] = { ...agents[index], ...updates };
    return agents[index];
  },
  
  deleteAgent: (id) => {
    const index = agents.findIndex(agent => agent.id === id);
    if (index === -1) return null;
    
    const deletedAgent = agents.splice(index, 1)[0];
    return deletedAgent;
  },
  
  // Chat operations
  incrementMessages: (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      agent.totalMessages += 1;
    }
  },
  
  incrementSessions: (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      agent.totalSessions += 1;
    }
  }
};

module.exports = db;
