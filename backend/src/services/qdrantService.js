/**
 * Qdrant Vector Database Service
 * Handles vector storage, search, and collection management
 */

const { QdrantClient } = require('@qdrant/js-client-rest');
const { v4: uuidv4 } = require('uuid');
const { createServiceError } = require('../utils/errorHelpers');
const { QDRANT_URL, QDRANT_API_KEY } = require('../config/env');

// Initialize Qdrant client
let qdrantClient;

const initializeQdrant = () => {
  if (!qdrantClient) {
    const qdrantUrl = QDRANT_URL;
    const qdrantApiKey = QDRANT_API_KEY;
    
    qdrantClient = new QdrantClient({
      url: qdrantUrl,
      apiKey: qdrantApiKey
    });
    
    console.log(`🔗 Qdrant client initialized: ${qdrantUrl}`);
  }
  return qdrantClient;
};

/**
 * Qdrant Configuration
 */
const QDRANT_CONFIG = {
  VECTOR_SIZE: 1536, // OpenAI text-embedding-3-small dimensions
  DISTANCE: 'Cosine', // Cosine similarity for text embeddings
  DEFAULT_COLLECTION: 'document_chunks',
  BATCH_SIZE: 100,
  SEARCH_LIMIT: 10,
  SIMILARITY_THRESHOLD: 0.7
};

/**
 * Collection naming strategy
 */
const generateCollectionName = (agentId) => {
  return `agent_${agentId}_chunks`;
};

/**
 * Create or get collection for an agent
 */
const ensureCollection = async (agentId) => {
  try {
    const client = initializeQdrant();
    const collectionName = generateCollectionName(agentId);
    
    console.log(`🗂️  Ensuring Qdrant collection: ${collectionName}`);
    
    // Check if collection exists
    try {
      const collectionInfo = await client.getCollection(collectionName);
      console.log(`✅ Collection ${collectionName} already exists`);
      return collectionName;
    } catch (error) {
      // Collection doesn't exist, create it
      console.log(`📝 Creating new collection: ${collectionName}`);
    }
    
    // Create collection with proper configuration
    await client.createCollection(collectionName, {
      vectors: {
        size: QDRANT_CONFIG.VECTOR_SIZE,
        distance: QDRANT_CONFIG.DISTANCE
      },
      optimizers_config: {
        default_segment_number: 2,
        max_segment_size: 20000,
        memmap_threshold: 20000
      },
      replication_factor: 1,
      write_consistency_factor: 1
    });
    
    console.log(`✅ Qdrant collection created: ${collectionName}`);
    return collectionName;
    
  } catch (error) {
    console.error(`❌ Failed to ensure Qdrant collection:`, error);
    throw createServiceError(`Qdrant collection setup failed: ${error.message}`, 'QDRANT_COLLECTION');
  }
};

/**
 * Store embeddings in Qdrant
 */
const storeEmbeddings = async (agentId, fileId, chunks, embeddings, context = {}) => {
  try {
    console.log(`📦 Storing ${embeddings.length} embeddings in Qdrant for file ${fileId}`);
    
    const client = initializeQdrant();
    const collectionName = await ensureCollection(agentId);
    
    if (chunks.length !== embeddings.length) {
      throw createServiceError(
        `Chunk count (${chunks.length}) doesn't match embedding count (${embeddings.length})`,
        'QDRANT_DATA_MISMATCH'
      );
    }
    
    // Prepare points for Qdrant
    const points = embeddings.map((embedding, index) => {
      const chunk = chunks[index];
      const pointId = uuidv4();
      
      return {
        id: pointId,
        vector: embedding.embedding || embedding,
        payload: {
          // Core identifiers
          agentId: agentId,
          fileId: fileId.toString(),
          chunkIndex: chunk.chunkIndex || index,
          companyId: context.companyId || null,
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
    
    console.log(`🚀 Upserting ${points.length} points to collection ${collectionName}`);
    
    // Process in batches
    const batchSize = QDRANT_CONFIG.BATCH_SIZE;
    const batches = [];
    
    for (let i = 0; i < points.length; i += batchSize) {
      batches.push(points.slice(i, i + batchSize));
    }
    
    let totalStored = 0;
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      await client.upsert(collectionName, {
        wait: true,
        points: batch
      });
      
      totalStored += batch.length;
      console.log(`✅ Batch ${batchIndex + 1}/${batches.length} stored: ${batch.length} points`);
    }
    
    // Get collection info after storing
    const collectionInfo = await client.getCollection(collectionName);
    
    const result = {
      success: true,
      collectionName,
      pointsStored: totalStored,
      totalPointsInCollection: collectionInfo.points_count,
      batchesProcessed: batches.length,
      storedAt: new Date().toISOString()
    };
    
    console.log(`✅ Qdrant storage completed:`, result);
    return result;
    
  } catch (error) {
    console.error(`❌ Qdrant storage failed:`, error);
    throw error.code ? error : createServiceError(`Qdrant storage failed: ${error.message}`, 'QDRANT_STORAGE');
  }
};

/**
 * Search similar vectors in Qdrant
 */
const searchSimilar = async (agentId, queryEmbedding, options = {}) => {
  try {
    const client = initializeQdrant();
    const collectionName = generateCollectionName(agentId);
    
    const limit = options.limit || QDRANT_CONFIG.SEARCH_LIMIT;
    const threshold = options.threshold || QDRANT_CONFIG.SIMILARITY_THRESHOLD;
    
    console.log(`🔍 Searching ${collectionName} for similar vectors (limit: ${limit})`);
    
    const searchResult = await client.search(collectionName, {
      vector: queryEmbedding,
      limit: limit,
      score_threshold: threshold,
      with_payload: true,
      with_vector: false // Don't return vectors to save bandwidth
    });
    
    // Process results
    const results = searchResult.map(hit => ({
      id: hit.id,
      score: hit.score,
      content: hit.payload.content,
      metadata: {
        fileId: hit.payload.fileId,
        chunkIndex: hit.payload.chunkIndex,
        filename: hit.payload.filename,
        chunkLength: hit.payload.chunkLength,
        method: hit.payload.method,
        contentHash: hit.payload.contentHash,
        companyId: hit.payload.companyId,
        userId: hit.payload.userId
      }
    }));
    
    console.log(`✅ Qdrant search completed: ${results.length} results found`);
    
    return {
      results,
      query: {
        collectionName,
        limit,
        threshold,
        resultsFound: results.length
      },
      searchedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Qdrant search failed:`, error);
    throw error.code ? error : createServiceError(`Qdrant search failed: ${error.message}`, 'QDRANT_SEARCH');
  }
};



/**
 * Delete file chunks from Qdrant
 */
const deleteFileChunks = async (agentId, fileId) => {
  try {
    const client = initializeQdrant();
    const collectionName = generateCollectionName(agentId);
    
    console.log(`🗑️  Deleting chunks for file ${fileId} from ${collectionName}`);
    
    // Delete points with matching fileId
    const deleteResult = await client.delete(collectionName, {
      wait: true,
      filter: {
        must: [
          {
            key: 'fileId',
            match: {
              value: fileId.toString()
            }
          }
        ]
      }
    });
    
    console.log(`✅ Deleted chunks for file ${fileId}:`, deleteResult);
    return deleteResult;
    
  } catch (error) {
    console.error(`❌ Qdrant deletion failed:`, error);
    throw error.code ? error : createServiceError(`Qdrant deletion failed: ${error.message}`, 'QDRANT_DELETE');
  }
};

/**
 * Get collection statistics
 */
const getCollectionStats = async (agentId) => {
  try {
    const client = initializeQdrant();
    const collectionName = generateCollectionName(agentId);
    
    const collectionInfo = await client.getCollection(collectionName);
    
    return {
      collectionName,
      pointsCount: collectionInfo.points_count,
      vectorSize: collectionInfo.config.params.vectors.size,
      distance: collectionInfo.config.params.vectors.distance,
      status: collectionInfo.status
    };
    
  } catch (error) {
    if (error.message.includes('Not found')) {
      return {
        collectionName: generateCollectionName(agentId),
        pointsCount: 0,
        exists: false
      };
    }
    throw createServiceError(`Failed to get collection stats: ${error.message}`, 'QDRANT_STATS');
  }
};

/**
 * Test Qdrant connection
 */
const testConnection = async () => {
  try {
    const client = initializeQdrant();
    const collections = await client.getCollections();
    
    return {
      success: true,
      collections: collections.collections.map(c => c.name),
      qdrantVersion: collections.time || 'unknown'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  storeEmbeddings,
  searchSimilar,
  deleteFileChunks,
  getCollectionStats,
  testConnection,
  ensureCollection,
  QDRANT_CONFIG
};
