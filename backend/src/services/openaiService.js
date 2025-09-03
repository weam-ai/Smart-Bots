/**
 * OpenAI Service
 * Handles embeddings generation and chat completion using OpenAI API
 */

const OpenAI = require('openai');
const { createServiceError } = require('../utils/errorHelpers');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * OpenAI Configuration
 */
const OPENAI_CONFIG = {
  EMBEDDING_MODEL: 'text-embedding-3-small', // Latest embedding model (1536 dimensions)
  CHAT_MODEL: 'gpt-4o-mini', // Cost-effective GPT-4 model
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.1, // Low temperature for consistent responses
  MAX_BATCH_SIZE: 100, // Maximum chunks to process in one batch
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 second
};

/**
 * Sleep utility for retries
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate embeddings for text chunks
 */
const generateEmbeddings = async (chunks, options = {}) => {
  try {
    console.log(`🤖 Generating OpenAI embeddings for ${chunks.length} chunks`);
    
    if (!process.env.OPENAI_API_KEY) {
      throw createServiceError('OpenAI API key not configured', 'OPENAI_CONFIG');
    }
    
    if (!chunks || chunks.length === 0) {
      throw createServiceError('No chunks provided for embedding generation', 'OPENAI_INPUT');
    }
    
    // Extract text content from chunks
    const texts = chunks.map(chunk => {
      // Handle both chunk objects and plain text
      return typeof chunk === 'string' ? chunk : chunk.content || chunk.text || '';
    }).filter(text => text.trim().length > 0);
    
    if (texts.length === 0) {
      throw createServiceError('No valid text content found in chunks', 'OPENAI_INPUT');
    }
    
    console.log(`📝 Processing ${texts.length} text chunks for embeddings`);
    
    // Process in batches to avoid rate limits
    const batchSize = Math.min(OPENAI_CONFIG.MAX_BATCH_SIZE, texts.length);
    const batches = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize));
    }
    
    console.log(`🔄 Processing ${batches.length} batches of embeddings`);
    
    let allEmbeddings = [];
    let totalTokens = 0;
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`🚀 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} chunks)`);
      
      let attempt = 0;
      while (attempt < OPENAI_CONFIG.RETRY_ATTEMPTS) {
        try {
          const response = await openai.embeddings.create({
            model: options.model || OPENAI_CONFIG.EMBEDDING_MODEL,
            input: batch,
            encoding_format: 'float'
          });
          
          // Extract embeddings and add metadata
          const batchEmbeddings = response.data.map((item, index) => ({
            embedding: item.embedding,
            index: batchIndex * batchSize + index,
            text: batch[index],
            tokens: response.usage ? Math.ceil(response.usage.total_tokens / batch.length) : null
          }));
          
          allEmbeddings.push(...batchEmbeddings);
          totalTokens += response.usage?.total_tokens || 0;
          
          console.log(`✅ Batch ${batchIndex + 1} completed: ${batchEmbeddings.length} embeddings`);
          break; // Success, exit retry loop
          
        } catch (error) {
          attempt++;
          console.error(`❌ Batch ${batchIndex + 1} attempt ${attempt} failed:`, error.message);
          
          if (attempt >= OPENAI_CONFIG.RETRY_ATTEMPTS) {
            throw createServiceError(
              `Failed to generate embeddings after ${OPENAI_CONFIG.RETRY_ATTEMPTS} attempts: ${error.message}`,
              'OPENAI_API_ERROR'
            );
          }
          
          // Wait before retry
          await sleep(OPENAI_CONFIG.RETRY_DELAY * attempt);
        }
      }
      
      // Small delay between batches to be respectful to API
      if (batchIndex < batches.length - 1) {
        await sleep(100);
      }
    }
    
    // Validate embeddings
    const validEmbeddings = allEmbeddings.filter(item => 
      item.embedding && 
      Array.isArray(item.embedding) && 
      item.embedding.length > 0
    );
    
    if (validEmbeddings.length === 0) {
      throw createServiceError('No valid embeddings generated', 'OPENAI_PROCESSING');
    }
    
    const result = {
      embeddings: validEmbeddings,
      totalEmbeddings: validEmbeddings.length,
      totalTokens,
      model: options.model || OPENAI_CONFIG.EMBEDDING_MODEL,
      dimensions: validEmbeddings[0]?.embedding?.length || 0,
      processedAt: new Date().toISOString(),
      stats: {
        successfulBatches: batches.length,
        averageTokensPerChunk: Math.round(totalTokens / validEmbeddings.length),
        processingTimeMs: Date.now() - Date.now() // Will be calculated by caller
      }
    };
    
    console.log(`✅ OpenAI embeddings completed:`, {
      totalEmbeddings: result.totalEmbeddings,
      dimensions: result.dimensions,
      totalTokens: result.totalTokens
    });
    
    return result;
    
  } catch (error) {
    console.error(`❌ OpenAI embedding generation failed:`, error);
    throw error.code ? error : createServiceError(`Embedding generation failed: ${error.message}`, 'OPENAI_SERVICE');
  }
};

/**
 * Generate chat completion using RAG context
 */
const generateChatCompletion = async (userMessage, context = [], options = {}) => {
  try {
    console.log(`💬 Generating chat completion with ${context.length} context chunks`);
    
    if (!process.env.OPENAI_API_KEY) {
      throw createServiceError('OpenAI API key not configured', 'OPENAI_CONFIG');
    }
    
    // Build context from retrieved chunks
    const contextText = context.length > 0 
      ? context.map(chunk => chunk.content || chunk.text || chunk).join('\n\n')
      : '';
    
    // Build system prompt with context
    const systemPrompt = `You are a helpful AI assistant. Use the following context to answer the user's question accurately and helpfully.

Context:
${contextText}

Instructions:
- Answer based primarily on the provided context
- If the context doesn't contain enough information, say so clearly
- Be concise but comprehensive
- Cite specific information from the context when possible
- If no context is provided, provide a helpful general response`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];
    
    console.log(`🤖 Sending request to ${options.model || OPENAI_CONFIG.CHAT_MODEL}`);
    
    const response = await openai.chat.completions.create({
      model: options.model || OPENAI_CONFIG.CHAT_MODEL,
      messages,
      max_tokens: options.maxTokens || OPENAI_CONFIG.MAX_TOKENS,
      temperature: options.temperature || OPENAI_CONFIG.TEMPERATURE,
      stream: false
    });
    
    const completion = response.choices[0]?.message?.content;
    
    if (!completion) {
      throw createServiceError('No completion generated by OpenAI', 'OPENAI_RESPONSE');
    }
    
    const result = {
      response: completion,
      model: response.model,
      usage: response.usage,
      contextChunks: context.length,
      finishReason: response.choices[0]?.finish_reason,
      createdAt: new Date().toISOString()
    };
    
    console.log(`✅ Chat completion generated:`, {
      model: result.model,
      responseLength: completion.length,
      tokensUsed: response.usage?.total_tokens,
      contextChunks: context.length
    });
    
    return result;
    
  } catch (error) {
    console.error(`❌ OpenAI chat completion failed:`, error);
    throw error.code ? error : createServiceError(`Chat completion failed: ${error.message}`, 'OPENAI_SERVICE');
  }
};

/**
 * Get OpenAI model information
 */
const getModelInfo = () => {
  return {
    embedding: {
      model: OPENAI_CONFIG.EMBEDDING_MODEL,
      dimensions: 1536,
      maxTokens: 8191
    },
    chat: {
      model: OPENAI_CONFIG.CHAT_MODEL,
      maxTokens: OPENAI_CONFIG.MAX_TOKENS,
      temperature: OPENAI_CONFIG.TEMPERATURE
    },
    config: OPENAI_CONFIG
  };
};

/**
 * Test OpenAI connection
 */
const testConnection = async () => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    
    // Test with a simple embedding
    const response = await openai.embeddings.create({
      model: OPENAI_CONFIG.EMBEDDING_MODEL,
      input: 'Test connection to OpenAI API'
    });
    
    return {
      success: true,
      model: response.model,
      dimensions: response.data[0].embedding.length,
      usage: response.usage
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  generateEmbeddings,
  generateChatCompletion,
  getModelInfo,
  testConnection,
  OPENAI_CONFIG
};
