/**
 * Chat Controller
 * Handles chat messages and implements RAG pipeline
 */

const agentService = require('../services/agentService')
const openaiService = require('../services/openaiService')
const pineconeService = require('../services/pineconeService')
const { ChatSession, ChatMessage, Visitor } = require('../models')
const { v4: uuidv4 } = require('uuid')

// ==================== SEND MESSAGE ====================

const sendMessage = async (req, res) => {
  try {
    const { agentId } = req.params
    const { message, sessionId, model, temperature, instructions, visitorId, _id } = req.body

    console.log('💬 Chat message received:', { 
      agentId, 
      message: message?.substring(0, 100), 
      sessionId,
      visitorId,
      _id,
      model,
      temperature,
      instructions: instructions?.substring(0, 50)
    })

    // Validate input
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Message is required',
          code: 'MISSING_MESSAGE'
        }
      })
    }

    // 1. Get agent data
    console.log('🔍 Fetching agent data for:', agentId)
    const agent = await agentService.getAgentById(agentId)
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Agent not found',
          code: 'AGENT_NOT_FOUND'
        }
      })
    }

    // Get company context from agent
    const companyId = agent.companyId;
    const createdBy = agent.createdBy;

    if (!companyId || !createdBy) {
      console.warn('⚠️ Agent missing company context:', { agentId, companyId, createdBy });
      return res.status(500).json({
        success: false,
        error: {
          message: 'Agent configuration error',
          code: 'AGENT_CONFIG_ERROR'
        }
      });
    }

    console.log('✅ Agent found:', agent.name, 'Status:', agent.status)

    // Track performance
    const perfStart = Date.now()
    const perfTimings = {}

    // 2. OPTIMIZED: Parallelize embedding generation and session preparation
    const finalSessionId = sessionId || uuidv4()
    
    const embeddingStart = Date.now()
    const [embeddingResult, existingSession] = await Promise.all([
      openaiService.generateEmbeddings([message.trim()]),
      ChatSession.findOne({ sessionId: finalSessionId })
    ])
    perfTimings.embedding = Date.now() - embeddingStart
    
    const queryEmbedding = embeddingResult.embeddings[0].embedding

    // 3. Search similar chunks
    const searchStart = Date.now()
    const searchResult = await pineconeService.searchSimilar(
      companyId,
      agentId,
      queryEmbedding,
      {
        limit: 10,
        threshold: 0.3
      }
    )
    perfTimings.search = Date.now() - searchStart

    const similarChunks = searchResult.results || []
    console.log(`📊 Found ${similarChunks.length} chunks (${perfTimings.search}ms)`)

    // 4. Build context from chunks
    let context = ''
    let referencedChunks = []
    
    if (similarChunks.length > 0) {
      context = similarChunks.map(chunk => chunk.content).join('\n\n')
      referencedChunks = similarChunks.map(chunk => ({
        id: chunk.id,
        content: chunk.content.substring(0, 200) + '...',
        score: chunk.score,
        metadata: chunk.metadata
      }))
      console.log('📝 Context built, length:', context.length)
    } else {
      console.log('⚠️ No similar chunks found, using general response')
    }

    // 5. Generate AI response
    console.log('🤖 Generating AI response...')
    
    // Use frontend parameters if provided, otherwise fall back to agent defaults
    const finalModel = model || agent.model || 'gpt-4o'
    const finalTemperature = temperature !== undefined ? temperature : (agent.temperature || 0.7)
    const finalInstructions = instructions || agent.systemPrompt || 'You are a helpful AI assistant. Answer questions based on the provided context.'
    
    console.log('🔧 Using parameters:', { finalModel, finalTemperature, finalInstructions: finalInstructions.substring(0, 50) })
    
    // GPT-5 needs higher token limits due to reasoning tokens
    const maxTokens = finalModel.includes('gpt-5') 
      ? Math.max(agent.maxTokens || 4000, 4000)
      : (agent.maxTokens || 1000);
    
    console.log(`🔧 Using maxTokens: ${maxTokens} for model: ${finalModel}`);
    
    const aiStart = Date.now()
    const aiResponse = await openaiService.generateChatCompletion(
      message.trim(), // userMessage
      similarChunks,  // context chunks
      {
        model: finalModel,
        temperature: finalTemperature,
        systemPrompt: finalInstructions
      }
    )
    perfTimings.aiResponse = Date.now() - aiStart

    console.log(`✅ AI response generated (${perfTimings.aiResponse}ms), length:`, aiResponse.response.length)

    // 6. OPTIMIZED: Handle session and save messages in parallel
    try {
      const dbStart = Date.now()
      
      // Prepare or create session
      let session = existingSession
      if (!session) {
        console.log('🆕 Creating new chat session:', finalSessionId)
        session = new ChatSession({
          sessionId: finalSessionId,
          // Multi-tenant fields (required for new records)
          companyId: companyId,
          createdBy: createdBy,
          
          agent: agentId,
          visitor: visitorId || null,
          status: 'active',
          totalMessages: 0
        })
      } else {
        console.log('♻️  Using existing session:', session._id)
        // Update session with visitor data if provided
        if (visitorId && !session.visitor) {
          session.visitor = visitorId
        }
      }

      session.totalMessages += 1
      session.lastMessageAt = new Date()

      // Prepare user message
      const userMessage = new ChatMessage({
        session: session._id || null, // Will be updated after session save if new
        // Multi-tenant fields (required for new records)
        companyId: companyId,
        createdBy: createdBy,
        
        agent: agentId,
        messageType: 'user',
        content: message.trim(),
        contentHash: require('crypto').createHash('md5').update(message.trim()).digest('hex'),
        createdAt: new Date()
      })

      // Prepare AI message
      const aiMessage = new ChatMessage({
        session: session._id || null, // Will be updated after session save if new
        companyId: companyId,
        createdBy: createdBy,
        
        agent: agentId,
        messageType: 'assistant',
        content: aiResponse.response,
        contentHash: require('crypto').createHash('md5').update(aiResponse.response).digest('hex'),
        referencedChunks: referencedChunks,
        ragMetadata: {
          chunksFound: similarChunks.length,
          contextLength: context.length,
          query: message.trim(),
          timestamp: new Date().toISOString()
        },
        createdAt: new Date()
      })

      // Save session first if new, then save messages in parallel
      if (!existingSession) {
        await session.save()
        console.log('✅ New chat session created:', session._id, '(sessionId:', finalSessionId + ')')
        // Update message session references
        userMessage.session = session._id
        aiMessage.session = session._id
        
        // Save messages in parallel
        await Promise.all([
          userMessage.save(),
          aiMessage.save()
        ])
      } else {
        // Save everything in parallel
        await Promise.all([
          session.save(),
          userMessage.save(),
          aiMessage.save()
        ])
      }
      
      perfTimings.database = Date.now() - dbStart
      
      console.log('🔍 AI Message saved:', { messageType: aiMessage.messageType, _id: aiMessage._id })
      console.log(`✅ Chat messages stored (${perfTimings.database}ms):`, { 
        userMessage: userMessage._id, 
        aiMessage: aiMessage._id 
      })
    } catch (sessionError) {
      console.warn('⚠️ Failed to update chat session:', sessionError.message)
      // Don't fail the entire request if session update fails
    }
    
    // Log total performance
    perfTimings.total = Date.now() - perfStart
    console.log('📊 Performance breakdown:', {
      embedding: `${perfTimings.embedding}ms`,
      search: `${perfTimings.search}ms`,
      aiResponse: `${perfTimings.aiResponse}ms`,
      database: `${perfTimings.database}ms`,
      total: `${perfTimings.total}ms`
    })

    // 8. Return response
    const response = {
      success: true,
      data: {
        _id: uuidv4(),
        sessionId: finalSessionId,
        agentId: agentId,
        role: 'assistant',
        content: aiResponse.response,
        referencedChunks: referencedChunks,
        ragMetadata: {
          chunksFound: similarChunks.length,
          contextLength: context.length,
          query: message.trim(),
          timestamp: new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      }
    }

    console.log('🎉 Chat response ready, sessionId:', finalSessionId)
    res.json(response)

  } catch (error) {
    console.error('❌ Chat error:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to process chat message',
        code: 'CHAT_ERROR',
        details: error.message
      }
    })
  }
}

// ==================== GET SESSIONS ====================

const getSessions = async (req, res) => {
  try {
    const { agentId } = req.params
    console.log('📋 Fetching sessions for agent:', agentId)

    // For now, return empty sessions array
    // In a full implementation, you'd fetch from database
    const sessions = []

    res.json({
      success: true,
      data: sessions
    })

  } catch (error) {
    console.error('❌ Get sessions error:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch sessions',
        code: 'SESSIONS_ERROR',
        details: error.message
      }
    })
  }
}

// ==================== GET SESSION MESSAGES ====================

const getSessionMessages = async (req, res) => {
  try {
    const { agentId, sessionId } = req.params
    console.log('💬 Fetching messages for session:', sessionId, 'agent:', agentId)

    // For now, return empty messages array
    // In a full implementation, you'd fetch from database
    const messages = []

    res.json({
      success: true,
      data: messages
    })

  } catch (error) {
    console.error('❌ Get messages error:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch messages',
        code: 'MESSAGES_ERROR',
        details: error.message
      }
    })
  }
}

// ==================== HEALTH CHECK ====================

const healthCheck = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Chat service is healthy',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Chat service health check failed',
        details: error.message
      }
    })
  }
}

module.exports = {
  sendMessage,
  getSessions,
  getSessionMessages,
  healthCheck
}