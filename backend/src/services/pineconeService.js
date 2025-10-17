/**
 * Pinecone Vector Database Service
 * Handles vector storage, search, and index management
 * Uses company-based indexes with agentId as metadata filter
 */

const { Pinecone } = require('@pinecone-database/pinecone');
const { v4: uuidv4 } = require('uuid');
const { createServiceError } = require('../utils/errorHelpers');
const { PINECONE_API_KEY } = require('../config/env');

// Initialize Pinecone client
let pineconeClient;

const initializePinecone = () => {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: PINECONE_API_KEY,
    });
    
  }
  return pineconeClient;
};

/**
 * Pinecone Configuration
 */
const PINECONE_CONFIG = {
  VECTOR_SIZE: 1536,
  DISTANCE: 'cosine',
  BATCH_SIZE: 100,
  SEARCH_LIMIT: 10,
  SIMILARITY_THRESHOLD: 0.7
};

/**
 * Generate index name for a company
 */
const generateIndexName = (companyId) => {
  return `company-${companyId}`;
};

/**
 * Create or get index for a company
 */
const ensureIndex = async (companyId) => {
  try {
    const client = initializePinecone();
    const indexName = generateIndexName(companyId);
    
    console.log(`🗂️  Ensuring Pinecone index: ${indexName}`);
    
    // Check if index exists
    try {
      const indexDescription = await client.describeIndex(indexName);
      console.log(`✅ Index ${indexName} already exists`);
      return indexName;
    } catch (error) {
      // Index doesn't exist, create it
      console.log(`📝 Creating new index: ${indexName}`);
    }
    
    // Create index with proper configuration
    await client.createIndex({
      name: indexName,
      dimension: PINECONE_CONFIG.VECTOR_SIZE,
      metric: PINECONE_CONFIG.DISTANCE,
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });
    
    console.log(`✅ Pinecone index created: ${indexName}`);
    return indexName;
    
  } catch (error) {
    console.error(`❌ Failed to ensure Pinecone index:`, error);
    throw createServiceError(`Pinecone index creation failed: ${error.message}`, 'PINECONE_INDEX');
  }
};

/**
 * Store embeddings in Pinecone
 */
const storeEmbeddings = async (companyId, agentId, fileId, chunks, embeddings, context = {}) => {
  try {
    console.log(`📦 Storing ${embeddings.length} embeddings in Pinecone for company ${companyId}, agent ${agentId}, file ${fileId}`);
    
    const client = initializePinecone();
    const indexName = await ensureIndex(companyId);
    const index = client.index(indexName);
    
    if (chunks.length !== embeddings.length) {
      throw createServiceError(
        `Chunk count (${chunks.length}) doesn't match embedding count (${embeddings.length})`,
        'PINECONE_DATA_MISMATCH'
      );
    }
    
    // Prepare vectors for Pinecone
    const vectors = embeddings.map((embedding, index) => {
      const chunk = chunks[index];
      const vectorId = uuidv4();
      
      return {
        id: vectorId,
        values: embedding.embedding || embedding,
        metadata: {
          // Core identifiers
          agentId: agentId,
          fileId: fileId.toString(),
          chunkIndex: chunk.chunkIndex || index,
          companyId: companyId,
          userId: context.userId || null,
          
          // Content
          content: chunk.content,
          contentHash: chunk.contentHash,
          
          // Metadata
          filename: chunk.metadata?.filename,
          mimeType: chunk.metadata?.mimeType,
          chunkLength: chunk.content.length,
          method: chunk.method,
          
          // Timestamps
          createdAt: new Date().toISOString(),
          
          // Chunking info
          strategy: chunk.metadata?.strategy,
          originalTextLength: chunk.metadata?.originalTextLength,
          
          // Location info
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          
          // OpenAI info
          embeddingModel: embedding.model || 'text-embedding-3-small',
          tokens: embedding.tokens
        }
      };
    });
    
    console.log(`🚀 Upserting ${vectors.length} vectors to index ${indexName}`);
    
    // Process in batches
    const batchSize = PINECONE_CONFIG.BATCH_SIZE;
    const batches = [];
    
    for (let i = 0; i < vectors.length; i += batchSize) {
      batches.push(vectors.slice(i, i + batchSize));
    }
    
    let totalStored = 0;
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      await index.upsert(batch);
      
      totalStored += batch.length;
      console.log(`✅ Batch ${batchIndex + 1}/${batches.length} stored: ${batch.length} vectors`);
    }
    
    // Get index stats after storing
    const indexStats = await index.describeIndexStats();
    
    const result = {
      success: true,
      indexName,
      vectorsStored: totalStored,
      totalVectorsInIndex: indexStats.totalVectorCount,
      batchesProcessed: batches.length,
      storedAt: new Date().toISOString()
    };
    
    console.log(`✅ Pinecone storage completed:`, result);
    return result;
    
  } catch (error) {
    console.error(`❌ Pinecone storage failed:`, error);
    throw createServiceError(`Pinecone storage failed: ${error.message}`, 'PINECONE_STORAGE');
  }
};

/**
 * Search similar vectors in Pinecone using embeddings
 */
const searchSimilar = async (companyId, agentId, queryEmbedding, options = {}) => {
  try {
    const client = initializePinecone();
    const indexName = generateIndexName(companyId);
    const index = client.index(indexName);
    
    const limit = options.limit || PINECONE_CONFIG.SEARCH_LIMIT;
    const threshold = options.threshold || PINECONE_CONFIG.SIMILARITY_THRESHOLD;
    
    console.log(`🔍 Searching ${indexName} for similar vectors (agentId: ${agentId}, limit: ${limit})`);
    
    const searchResult = await index.query({
      vector: queryEmbedding,
      topK: limit,
      filter: {
        agentId: { $eq: agentId }
      },
      includeMetadata: true,
      includeValues: false // Don't return vectors to save bandwidth
    });
    
    // Filter results by threshold and process
    const results = searchResult.matches
      .filter(match => match.score >= threshold)
      .map(match => ({
        id: match.id,
        score: match.score,
        content: match.metadata.content,
        metadata: {
          fileId: match.metadata.fileId,
          chunkIndex: match.metadata.chunkIndex,
          filename: match.metadata.filename,
          chunkLength: match.metadata.chunkLength,
          method: match.metadata.method,
          contentHash: match.metadata.contentHash,
          companyId: match.metadata.companyId,
          userId: match.metadata.userId
        }
      }));
    
    console.log(`✅ Pinecone search completed: ${results.length} results found`);
    
    return {
      results,
      query: {
        indexName,
        agentId,
        limit,
        threshold,
        resultsFound: results.length
      },
      searchedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Pinecone search failed:`, error);
    throw error.code ? error : createServiceError(`Pinecone search failed: ${error.message}`, 'PINECONE_SEARCH');
  }
};

/**
 * Search Pinecone using direct text query (using Pinecone's built-in text search)
 * This uses Pinecone's searchRecords method with text input
 */
const searchByText = async (companyId, agentId, queryText, options = {}) => {
  try {
    const client = initializePinecone();
    const indexName = generateIndexName(companyId);
    const index = client.index(indexName);
    
    const limit = options.limit || PINECONE_CONFIG.SEARCH_LIMIT;
    const threshold = options.threshold || 0.1; // Lower threshold for text search
    
    console.log(`🔍 Searching ${indexName} for text matches (agentId: ${agentId}, query: "${queryText}")`);
    
    // Use Pinecone's searchRecords with text input
    const searchResult = await index.searchRecords({
      query: {
        topK: limit,
        inputs: { text: queryText }
      },
      fields: ['content', 'filename', 'fileId', 'chunkIndex'],
      filter: {
        agentId: { $eq: agentId }
      }
    });
    
    // Process results
    const results = searchResult.matches
      .filter(match => match.score >= threshold)
      .map(match => ({
        id: match.id,
        score: match.score,
        content: match.values?.content || match.metadata?.content || '',
        metadata: {
          fileId: match.values?.fileId || match.metadata?.fileId,
          chunkIndex: match.values?.chunkIndex || match.metadata?.chunkIndex,
          filename: match.values?.filename || match.metadata?.filename,
          chunkLength: match.metadata?.chunkLength,
          method: match.metadata?.method,
          contentHash: match.metadata?.contentHash,
          companyId: match.metadata?.companyId,
          userId: match.metadata?.userId
        }
      }));
    
    console.log(`📊 Text search completed: ${results.length} results found`);
    
    return {
      results,
      query: {
        text: queryText,
        agentId: agentId,
        searchType: 'text'
      },
      stats: {
        totalMatches: searchResult.matches.length,
        filteredMatches: results.length,
        resultsFound: results.length
      },
      searchedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Pinecone text search failed:`, error);
    throw error.code ? error : createServiceError(`Pinecone text search failed: ${error.message}`, 'PINECONE_TEXT_SEARCH');
  }
};

/**
 * Delete file chunks from Pinecone
 */
const deleteFileChunks = async (companyId, agentId, fileId) => {
  try {
    const client = initializePinecone();
    const indexName = generateIndexName(companyId);
    const index = client.index(indexName);
    
    console.log(`🗑️  Deleting file chunks for company ${companyId}, agent ${agentId}, file ${fileId}`);
    
    // First, search for vectors to get their IDs
    const searchResult = await index.query({
      vector: Array(1536).fill(0), // Dummy vector for search
      topK: 10000, // Large number to get all matching vectors
      filter: {
        agentId: { $eq: agentId },
        fileId: { $eq: fileId.toString() }
      },
      includeMetadata: true,
      includeValues: false
    });
    
    if (searchResult.matches && searchResult.matches.length > 0) {
      const vectorIds = searchResult.matches.map(match => match.id);
      console.log(`Found ${vectorIds.length} vectors to delete`);
      
      // Delete vectors by ID
      await index.deleteMany(vectorIds);
      console.log(`✅ File chunks deleted successfully: ${vectorIds.length} vectors`);
    } else {
      console.log(`No vectors found to delete for file ${fileId}`);
    }
    
    return {
      success: true,
      indexName,
      deletedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Pinecone deletion failed:`, error);
    throw createServiceError(`Pinecone deletion failed: ${error.message}`, 'PINECONE_DELETION');
  }
};

/**
 * Delete all chunks for an agent
 */
const deleteAgentChunks = async (companyId, agentId) => {
  try {
    const client = initializePinecone();
    const indexName = generateIndexName(companyId);
    const index = client.index(indexName);
    
    console.log(`🗑️  Deleting all chunks for company ${companyId}, agent ${agentId}`);
    
    // First, search for vectors to get their IDs
    const searchResult = await index.query({
      vector: Array(1536).fill(0), // Dummy vector for search
      topK: 10000, // Large number to get all matching vectors
      filter: {
        agentId: { $eq: agentId }
      },
      includeMetadata: true,
      includeValues: false
    });
    
    if (searchResult.matches && searchResult.matches.length > 0) {
      const vectorIds = searchResult.matches.map(match => match.id);
      console.log(`Found ${vectorIds.length} vectors to delete`);
      
      // Delete vectors by ID
      await index.deleteMany(vectorIds);
      console.log(`✅ Agent chunks deleted successfully: ${vectorIds.length} vectors`);
    } else {
      console.log(`No vectors found to delete for agent ${agentId}`);
    }
    
    return {
      success: true,
      indexName,
      deletedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Pinecone agent deletion failed:`, error);
    throw createServiceError(`Pinecone agent deletion failed: ${error.message}`, 'PINECONE_AGENT_DELETION');
  }
};

/**
 * Get index statistics
 */
const getIndexStats = async (companyId) => {
  try {
    const client = initializePinecone();
    const indexName = generateIndexName(companyId);
    const index = client.index(indexName);
    
    const stats = await index.describeIndexStats();
    
    return {
      success: true,
      indexName,
      stats,
      retrievedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Pinecone stats retrieval failed:`, error);
    throw createServiceError(`Pinecone stats retrieval failed: ${error.message}`, 'PINECONE_STATS');
  }
};

module.exports = {
  initializePinecone,
  ensureIndex,
  storeEmbeddings,
  searchSimilar,
  searchByText,
  deleteFileChunks,
  deleteAgentChunks,
  getIndexStats,
  PINECONE_CONFIG
};
