const { Agent, ChatSession, ChatMessage } = require('./index');

// Demo agents data
const demoAgents = [
  {
    _id: '6752b8f0a1b2c3d4e5f60001', // demo-agent-1 equivalent
    name: 'Customer Support Bot',
    description: 'Helps answer common customer questions and support issues',
    status: 'trained',
    avatar: '🤖',
    systemPrompt: 'You are a helpful customer support AI assistant. Answer questions about our products and services professionally and helpfully.',
    temperature: 0.7,
    model: 'gpt-3.5-turbo',
    isPublic: true,
    tags: ['customer-support', 'help-desk', 'faq'],
    metadata: {
      totalSessions: 127,
      totalMessages: 584,
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    trainedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    _id: '6752b8f0a1b2c3d4e5f60002', // demo-agent-2 equivalent
    name: 'Documentation Assistant',
    description: 'Answers questions about product documentation and guides',
    status: 'trained',
    avatar: '📚',
    systemPrompt: 'You are a documentation AI assistant. Help users understand technical documentation, guides, and API references.',
    temperature: 0.5,
    model: 'gpt-4',
    isPublic: true,
    tags: ['documentation', 'api-help', 'guides'],
    metadata: {
      totalSessions: 89,
      totalMessages: 342,
      lastUsed: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
    },
    trainedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    lastUsed: new Date(Date.now() - 5 * 60 * 60 * 1000)
  },
  {
    _id: '6752b8f0a1b2c3d4e5f60003', // demo-agent-3 equivalent
    name: 'Sales Assistant',
    description: 'Provides information about products and pricing',
    status: 'trained',
    avatar: '💼',
    systemPrompt: 'You are a sales AI assistant. Help potential customers learn about our products, pricing, and make informed purchasing decisions.',
    temperature: 0.8,
    model: 'gpt-4-turbo',
    isPublic: true,
    tags: ['sales', 'products', 'pricing'],
    metadata: {
      totalSessions: 156,
      totalMessages: 721,
      lastUsed: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
    },
    trainedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    lastUsed: new Date(Date.now() - 1 * 60 * 60 * 1000)
  }
];

// Seed database with demo data
const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database with demo data...');
    
    // Check if demo agents already exist
    const existingAgents = await Agent.find({
      _id: { $in: demoAgents.map(agent => agent._id) }
    });
    
    if (existingAgents.length === 0) {
      // Insert demo agents
      await Agent.insertMany(demoAgents);
      console.log('✅ Demo agents created successfully');
      
      // Create some sample chat sessions
      await createSampleSessions();
      console.log('✅ Sample chat sessions created');
    } else {
      console.log('ℹ️  Demo agents already exist, skipping seed');
    }
    
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    throw error;
  }
};

// Create sample chat sessions
const createSampleSessions = async () => {
  try {
    const sampleSessions = [
      {
        agent: '6752b8f0a1b2c3d4e5f60001', // Customer Support Bot
        sessionName: 'Product Question Session',
        status: 'ended',
        totalMessages: 6,
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        endedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000)
      },
      {
        agent: '6752b8f0a1b2c3d4e5f60002', // Documentation Assistant
        sessionName: 'API Documentation Help',
        status: 'ended',
        totalMessages: 4,
        startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        endedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000)
      }
    ];
    
    const sessions = await ChatSession.insertMany(sampleSessions);
    
    // Create sample messages for the first session
    const sampleMessages = [
      {
        session: sessions[0]._id,
        agent: '6752b8f0a1b2c3d4e5f60001',
        messageType: 'assistant',
        content: 'Hello! How can I help you with our products today?',
        contentHash: 'hash1'
      },
      {
        session: sessions[0]._id,
        agent: '6752b8f0a1b2c3d4e5f60001',
        messageType: 'user',
        content: 'I have a question about your pricing plans',
        contentHash: 'hash2'
      },
      {
        session: sessions[0]._id,
        agent: '6752b8f0a1b2c3d4e5f60001',
        messageType: 'assistant',
        content: 'I\'d be happy to help you understand our pricing! We offer several plans to fit different needs...',
        contentHash: 'hash3',
        tokensUsed: 45,
        modelUsed: 'gpt-3.5-turbo',
        responseTimeMs: 650
      }
    ];
    
    await ChatMessage.insertMany(sampleMessages);
    
  } catch (error) {
    console.error('Error creating sample sessions:', error);
  }
};

// Clear demo data (for testing)
const clearDemoData = async () => {
  try {
    console.log('🗑️  Clearing demo data...');
    
    // Delete demo agents and related data
    await Agent.deleteMany({
      _id: { $in: demoAgents.map(agent => agent._id) }
    });
    
    // Delete related chat sessions and messages
    await ChatSession.deleteMany({
      agent: { $in: demoAgents.map(agent => agent._id) }
    });
    
    await ChatMessage.deleteMany({
      agent: { $in: demoAgents.map(agent => agent._id) }
    });
    
    console.log('✅ Demo data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing demo data:', error);
    throw error;
  }
};

module.exports = {
  seedDatabase,
  clearDemoData,
  demoAgents
};