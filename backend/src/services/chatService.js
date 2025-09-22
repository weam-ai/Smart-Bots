const { ChatSession, ChatMessage, Agent } = require('../models');

// Create new chat session
const createSession = async (agentId, sessionName = null) => {
  try {
    const agent = await Agent.findById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get company context from agent
    const companyId = agent.companyId;
    const createdBy = agent.createdBy;

    if (!companyId || !createdBy) {
      throw new Error('Agent missing company context');
    }

    const session = new ChatSession({
      agent: agentId,
      // Multi-tenant fields (required for new records)
      companyId: companyId,
      createdBy: createdBy,
      
      sessionName: sessionName || `Session ${Date.now()}`,
      status: 'active'
    });

    await session.save();
    return session;
  } catch (error) {
    throw new Error(`Failed to create chat session: ${error.message}`);
  }
};

// Get session by ID
const getSession = async (sessionId) => {
  try {
    const session = await ChatSession.findById(sessionId).populate('agent');
    return session;
  } catch (error) {
    throw new Error(`Failed to fetch session: ${error.message}`);
  }
};

// Get session messages
const getSessionMessages = async (sessionId) => {
  try {
    const messages = await ChatMessage.find({ session: sessionId })
      .sort({ createdAt: 1 })
      .populate('referencedChunks.chunk');
    return messages;
  } catch (error) {
    throw new Error(`Failed to fetch session messages: ${error.message}`);
  }
};

// Process message (RAG pipeline)
const processMessage = async (agentId, message, sessionId) => {
  try {
    // Get or create session
    let session;
    if (sessionId) {
      session = await ChatSession.findById(sessionId);
    } else {
      session = await createSession(agentId);
    }

    if (!session) {
      throw new Error('Session not found');
    }

    // Save user message
    const userMessage = new ChatMessage({
      session: session._id,
      agent: agentId,
      messageType: 'user',
      content: message,
      contentHash: require('crypto').createHash('md5').update(message).digest('hex')
    });
    await userMessage.save();

    // Get agent for system prompt
    const agent = await Agent.findById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get company context from agent
    const companyId = agent.companyId;
    const createdBy = agent.createdBy;

    if (!companyId || !createdBy) {
      throw new Error('Agent missing company context');
    }

    // Update user message with company context
    userMessage.companyId = companyId;
    userMessage.createdBy = createdBy;
    await userMessage.save();

    // ✅ RAG Pipeline Implementation
    console.log(`🤖 Starting RAG pipeline for agent ${agentId}: "${message}"`);
    const startTime = Date.now();
    
    let assistantContent;
    let tokensUsed = 0;
    let referencedChunks = [];
    let ragMetadata = {
      searchPerformed: false,
      chunksFound: 0,
      searchScore: null,
      fallbackUsed: false
    };

    try {
      // Step 1: Search for relevant document chunks
      const searchController = require('../controllers/searchController');
      console.log(`🔍 Searching for relevant chunks for query: "${message}"`);
      
      const searchResult = await searchController.searchDocuments({
        params: { agentId },
        body: { 
          query: message, 
          limit: 5, 
          threshold: 0.6  // Lower threshold for better recall
        }
      }, null, true); // true = return raw result, not HTTP response

      ragMetadata.searchPerformed = true;
      ragMetadata.chunksFound = searchResult.results?.length || 0;
      ragMetadata.searchScore = searchResult.results?.[0]?.score || null;

      console.log(`📊 Search completed: ${ragMetadata.chunksFound} chunks found`);

      // Step 2: Generate context-aware response
      if (searchResult.success && searchResult.results && searchResult.results.length > 0) {
        // Use RAG with retrieved context
        const openaiService = require('./openaiService');
        
        console.log(`🧠 Generating RAG response with ${searchResult.results.length} context chunks`);
        const ragResponse = await openaiService.generateChatCompletion(message, searchResult.results, {
          model: agent.model || 'gpt-4o',
          maxTokens: 2000,
          temperature: 0.7
        });

        assistantContent = ragResponse.response;
        tokensUsed = ragResponse.usage?.total_tokens || 0;
        
        // Track referenced chunks for metadata
        referencedChunks = searchResult.results.map(chunk => ({
          chunkId: chunk.id,
          fileId: chunk.metadata.fileId,
          chunkIndex: chunk.metadata.chunkIndex,
          score: chunk.score,
          content: chunk.content.substring(0, 200) + '...' // Store preview
        }));

        console.log(`✅ RAG response generated: ${tokensUsed} tokens used`);
        
      } else {
        // Fallback: No relevant chunks found
        console.log(`⚠️  No relevant chunks found, using fallback response`);
        ragMetadata.fallbackUsed = true;
        
        const openaiService = require('./openaiService');
        const fallbackResponse = await openaiService.generateChatCompletion(
          message, 
          [], // Empty context
          {
            model: agent.model || 'gpt-4o',
            maxTokens: 1000,
            temperature: 0.8
          }
        );

        assistantContent = `I don't have specific information about your question in the uploaded documents. However, I can provide a general response:\n\n${fallbackResponse.response}`;
        tokensUsed = fallbackResponse.usage?.total_tokens || 0;
      }

    } catch (ragError) {
      // RAG pipeline failed, use safe fallback
      console.error(`❌ RAG pipeline failed:`, ragError);
      ragMetadata.fallbackUsed = true;
      
      assistantContent = `I apologize, but I'm experiencing some technical difficulties accessing the document knowledge base. Here's a general response to your question: "${message}". Please try again in a moment, and if the issue persists, contact support.`;
      tokensUsed = 50; // Estimated tokens for fallback
    }

    const responseTimeMs = Date.now() - startTime;
    console.log(`⏱️  RAG pipeline completed in ${responseTimeMs}ms`);

    // Save assistant message with RAG metadata
    const assistantMessage = new ChatMessage({
      session: session._id,
      // Multi-tenant fields (required for new records)
      companyId: companyId,
      createdBy: createdBy,
      
      agent: agentId,
      messageType: 'assistant',
      content: assistantContent,
      contentHash: require('crypto').createHash('md5').update(assistantContent).digest('hex'),
      modelUsed: agent.model || 'gpt-4o',
      tokensUsed: tokensUsed,
      responseTimeMs: responseTimeMs,
      
      // RAG-specific metadata
      referencedChunks: referencedChunks,
      ragMetadata: ragMetadata
    });
    await assistantMessage.save();

    // Update session message count
    await ChatSession.findByIdAndUpdate(session._id, {
      $inc: { totalMessages: 2 },
      endedAt: new Date()
    });

    return {
      sessionId: session._id,
      userMessage,
      assistantMessage,
      agent: {
        id: agent._id,
        name: agent.name,
        model: agent.model
      }
    };
  } catch (error) {
    throw new Error(`Failed to process message: ${error.message}`);
  }
};

// End chat session
const endSession = async (sessionId) => {
  try {
    const session = await ChatSession.findByIdAndUpdate(
      sessionId,
      { 
        status: 'ended',
        endedAt: new Date()
      },
      { new: true }
    );
    return session;
  } catch (error) {
    throw new Error(`Failed to end session: ${error.message}`);
  }
};

// Get agent sessions
const getAgentSessions = async (agentId) => {
  try {
    const sessions = await ChatSession.find({ agent: agentId })
      .sort({ createdAt: -1 })
      .populate('agent');
    return sessions;
  } catch (error) {
    throw new Error(`Failed to fetch agent sessions: ${error.message}`);
  }
};

module.exports = {
  createSession,
  getSession,
  getSessionMessages,
  processMessage,
  endSession,
  getAgentSessions
};
