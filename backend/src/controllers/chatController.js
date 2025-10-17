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

    // 2. Generate query embedding
    console.log('🧠 Generating query embedding...')
    const embeddingResult = await openaiService.generateEmbeddings([message.trim()])
    const queryEmbedding = embeddingResult.embeddings[0].embedding
    console.log('✅ Query embedding generated, dimensions:', queryEmbedding.length)

    // 3. Search similar chunks
    console.log('🔍 Searching for similar chunks...')
    const searchResult = await pineconeService.searchSimilar(
      companyId,
      agentId,
      queryEmbedding,
      {
        limit: 10,
        threshold: 0.3
      }
    )

    const similarChunks = searchResult.results || []
    console.log('📊 Found similar chunks:', similarChunks.length)

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
    
    const aiResponse = await openaiService.generateChatCompletion(
      message.trim(), // userMessage
      similarChunks,  // context chunks
      {
        model: finalModel,
        temperature: finalTemperature,
        systemPrompt: finalInstructions
      }
    )

    console.log('✅ AI response generated, length:', aiResponse.response.length)

    // 6. Generate session ID if not provided
    const finalSessionId = sessionId || uuidv4()

    // 7. Create or update chat session with visitor data
    try {
      console.log('🔍 Looking for session with sessionId:', finalSessionId)
      let session = await ChatSession.findOne({ sessionId: finalSessionId })
      
      if (!session) {
        console.log('❌ Session not found, creating new one')
        // Create new session with the provided sessionId
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
        await session.save()
        console.log('✅ New chat session created:', session._id, 'with sessionId:', finalSessionId)
      } else {
        console.log('✅ Found existing session:', session._id, 'with sessionId:', finalSessionId)
      }

      // Update session with visitor data if provided
      if (visitorId && !session.visitor) {
        session.visitor = visitorId
      }

      session.totalMessages += 1
      session.lastMessageAt = new Date()
      await session.save()

      console.log('✅ Chat session updated:', session._id)

      // Store user message
      const userMessage = new ChatMessage({
        session: session._id,
        // Multi-tenant fields (required for new records)
        companyId: companyId,
        createdBy: createdBy,
        
        agent: agentId,
        messageType: 'user',
        content: message.trim(),
        contentHash: require('crypto').createHash('md5').update(message.trim()).digest('hex'),
        createdAt: new Date()
      })
      await userMessage.save()

      // Store AI response
      const aiMessage = new ChatMessage({
        session: session._id,
        // Multi-tenant fields (required for new records)
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
      
      console.log('🔍 AI Message before save:', { messageType: aiMessage.messageType, content: aiMessage.content.substring(0, 50) })
      await aiMessage.save()
      console.log('🔍 AI Message after save:', { messageType: aiMessage.messageType, _id: aiMessage._id })

      console.log('✅ Chat messages stored:', { userMessage: userMessage._id, aiMessage: aiMessage._id })
    } catch (sessionError) {
      console.warn('⚠️ Failed to update chat session:', sessionError.message)
      // Don't fail the entire request if session update fails
    }

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