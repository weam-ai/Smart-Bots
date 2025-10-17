/**
 * OpenAI Service
 * Handles embeddings generation and chat completion using OpenAI API
 */

const OpenAI = require("openai");
const { createServiceError } = require("../utils/errorHelpers");
const { OPENAI_API_KEY } = require("../config/env");

// Initialize OpenAI client with extended timeout for GPT-5 models
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  timeout: 120000, // 2 minutes timeout for GPT-5 reasoning
});

/**
 * OpenAI Configuration
 */
const OPENAI_CONFIG = {
  EMBEDDING_MODEL: "text-embedding-3-small", // Latest embedding model (1536 dimensions)
  CHAT_MODEL: "gpt-4o", // Latest GPT-4 model with multimodal capabilities
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.1, // Low temperature for consistent responses
  MAX_BATCH_SIZE: 100, // Maximum chunks to process in one batch
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

/**
 * Sleep utility for retries
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate embeddings for text chunks
 */
const generateEmbeddings = async (chunks, options = {}) => {
  try {
    console.log(`🤖 Generating OpenAI embeddings for ${chunks.length} chunks`);

    if (!OPENAI_API_KEY) {
      throw createServiceError(
        "OpenAI API key not configured",
        "OPENAI_CONFIG"
      );
    }

    if (!chunks || chunks.length === 0) {
      throw createServiceError(
        "No chunks provided for embedding generation",
        "OPENAI_INPUT"
      );
    }

    // Extract text content from chunks
    const texts = chunks
      .map((chunk) => {
        // Handle both chunk objects and plain text
        return typeof chunk === "string"
          ? chunk
          : chunk.content || chunk.text || "";
      })
      .filter((text) => text.trim().length > 0);

    if (texts.length === 0) {
      throw createServiceError(
        "No valid text content found in chunks",
        "OPENAI_INPUT"
      );
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
      console.log(
        `🚀 Processing batch ${batchIndex + 1}/${batches.length} (${
          batch.length
        } chunks)`
      );

      let attempt = 0;
      while (attempt < OPENAI_CONFIG.RETRY_ATTEMPTS) {
        try {
          const response = await openai.embeddings.create({
            model: options.model || OPENAI_CONFIG.EMBEDDING_MODEL,
            input: batch,
            encoding_format: "float",
          });

          // Extract embeddings and add metadata
          const batchEmbeddings = response.data.map((item, index) => ({
            embedding: item.embedding,
            index: batchIndex * batchSize + index,
            text: batch[index],
            tokens: response.usage
              ? Math.ceil(response.usage.total_tokens / batch.length)
              : null,
          }));

          allEmbeddings.push(...batchEmbeddings);
          totalTokens += response.usage?.total_tokens || 0;

          console.log(
            `✅ Batch ${batchIndex + 1} completed: ${
              batchEmbeddings.length
            } embeddings`
          );
          break; // Success, exit retry loop
        } catch (error) {
          attempt++;
          console.error(
            `❌ Batch ${batchIndex + 1} attempt ${attempt} failed:`,
            error.message
          );

          if (attempt >= OPENAI_CONFIG.RETRY_ATTEMPTS) {
            throw createServiceError(
              `Failed to generate embeddings after ${OPENAI_CONFIG.RETRY_ATTEMPTS} attempts: ${error.message}`,
              "OPENAI_API_ERROR"
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
    const validEmbeddings = allEmbeddings.filter(
      (item) =>
        item.embedding &&
        Array.isArray(item.embedding) &&
        item.embedding.length > 0
    );

    if (validEmbeddings.length === 0) {
      throw createServiceError(
        "No valid embeddings generated",
        "OPENAI_PROCESSING"
      );
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
        processingTimeMs: Date.now() - Date.now(), // Will be calculated by caller
      },
    };

    console.log(`✅ OpenAI embeddings completed:`, {
      totalEmbeddings: result.totalEmbeddings,
      dimensions: result.dimensions,
      totalTokens: result.totalTokens,
    });

    return result;
  } catch (error) {
    console.error(`❌ OpenAI embedding generation failed:`, error);
    throw error.code
      ? error
      : createServiceError(
          `Embedding generation failed: ${error.message}`,
          "OPENAI_SERVICE"
        );
  }
};

/**
 * Generate chat completion using RAG context
 */
const generateChatCompletion = async (
  userMessage,
  context = [],
  options = {}
) => {
  try {
    console.log(
      `💬 Generating chat completion with ${context.length} context chunks`
    );

    if (!OPENAI_API_KEY) {
      throw createServiceError(
        "OpenAI API key not configured",
        "OPENAI_CONFIG"
      );
    }

    // Build context from retrieved chunks
    const contextText =
      context.length > 0
        ? context
            .map((chunk) => chunk.content || chunk.text || chunk)
            .join("\n\n")
        : "";

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
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    const model = options.model;
    console.log(`🤖 Sending request to ${model}`);

    // Models that don't support custom temperature (only support default value of 1)
    const modelsWithoutCustomTemperature = [
      "o3",
      "gpt-5",
      "gpt-5-mini",
      "gpt-5-nano",
    ];
    const supportsCustomTemperature =
      !modelsWithoutCustomTemperature.includes(model);

    // Build request parameters based on model capabilities
    const requestParams = {
      model,
      input:messages,
      stream: false,
    };

    // Only add temperature if the model supports custom values
    if (supportsCustomTemperature) {
      requestParams.temperature =
        options.temperature || OPENAI_CONFIG.TEMPERATURE;
    }

    console.log(
      `🔧 Model ${model} supports custom temperature: ${supportsCustomTemperature}`
    );

    // Add progress logging for GPT-5 models
    if (model.includes("gpt-5")) {
      console.log(
        `⏳ GPT-5 reasoning model detected - this may take 30-60 seconds...`
      );
      const startTime = Date.now();
     const response = await openai.responses.create(requestParams);
     console.log("🚀 ~ generateChatCompletion ~ response:", response)
     const endTime = Date.now();
     console.log(
       `✅ GPT-5 response received in ${(endTime - startTime) / 1000}s`
     );
     
     // GPT-5 returns different response structure - extract from output_text
     const completion = response.output_text || '';
     
     if (!completion) {
       console.error(`❌ GPT-5 returned empty completion`);
       console.error(`❌ Response structure:`, JSON.stringify(response, null, 2));
       throw createServiceError('No completion generated by GPT-5', 'OPENAI_RESPONSE');
     }
     
     const result = {
       response: completion,
       model: response.model,
       usage: response.usage,
       contextChunks: context.length,
       finishReason: 'stop', // GPT-5 doesn't have finish_reason in same format
       createdAt: new Date().toISOString()
     };
     
     console.log(`✅ GPT-5 completion generated:`, {
       model: result.model,
       responseLength: completion.length,
       tokensUsed: response.usage?.total_tokens,
       contextChunks: context.length
     });
     
     return result;
    }

    const response = await openai.responses.create(requestParams);
    console.log("🚀 ~ generateChatCompletion ~ response:", response)

    // Handle the new response format with output_text field
    const completion = response.output_text

    if (!completion) {
      console.error(`❌ OpenAI returned empty completion for model: ${model}`);
      console.error(
        `❌ Response structure:`,
        JSON.stringify(response, null, 2)
      );
      throw createServiceError(
        "No completion generated by OpenAI",
        "OPENAI_RESPONSE"
      );
    }

    const result = {
      response: completion,
      model: response.model,
      usage: response.usage,
      contextChunks: context.length,
      finishReason: 'stop',
      createdAt: new Date().toISOString(),
    };

    console.log(`✅ Chat completion generated:`, {
      model: result.model,
      responseLength: completion.length,
      tokensUsed: response.usage?.total_tokens,
      contextChunks: context.length,
    });

    return result;
  } catch (error) {
    console.error(`❌ OpenAI chat completion failed:`, error);
    console.error(`❌ Full error details:`, JSON.stringify(error, null, 2));
    throw error.code
      ? error
      : createServiceError(
          `Chat completion failed: ${error.message}`,
          "OPENAI_SERVICE"
        );
  }
};

module.exports = {
  generateEmbeddings,
  generateChatCompletion,
  OPENAI_CONFIG,
};
