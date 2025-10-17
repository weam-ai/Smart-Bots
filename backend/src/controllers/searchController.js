const openaiService = require('../services/openaiService');
const pineconeService = require('../services/pineconeService');
const agentService = require('../services/agentService');
const { asyncHandler, createValidationError } = require('../utils/errorHelpers');

/**
 * Search Controller
 * Handles semantic similarity search across agent documents
 */

/**
 * Core search function (can be called directly or via HTTP)
 */
const searchDocuments = async (reqOrParams, res = null, returnRaw = false) => {
  let agentId, query, limit, threshold, companyId, userId, searchType;
  
  // Handle both HTTP request and direct function call
  if (reqOrParams.params) {
    // HTTP request format
    ({ agentId } = reqOrParams.params);
    ({ query, limit, threshold, companyId, userId, searchType } = reqOrParams.body);
  } else {
    // Direct function call format
    ({ agentId, query, limit, threshold, companyId, userId, searchType } = reqOrParams);
  }

  // Validate required fields
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    const error = createValidationError('Query is required and must be a non-empty string');
    if (returnRaw) throw error;
    throw error;
  }

  if (query.length > 1000) {
    const error = createValidationError('Query must be less than 1000 characters');
    if (returnRaw) throw error;
    throw error;
  }

  console.log(`🔍 Search request for agent ${agentId}: "${query.substring(0, 100)}..."`);

  // If companyId is not provided, fetch it from agent data
  if (!companyId) {
    try {
      const agent = await agentService.getAgentById(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }
      companyId = agent.companyId;
      console.log(`📋 Retrieved companyId from agent: ${companyId}`);
    } catch (error) {
      console.error('❌ Failed to fetch agent data:', error);
      throw createValidationError('Agent not found or invalid');
    }
  }

  try {
    let searchResults;
    let queryEmbedding;
    
    // Choose search method based on searchType parameter
    if (searchType === 'text') {
      // Direct text search using Pinecone's searchRecords
      console.log(`🔍 Using direct text search for query: "${query}"`);
      const searchOptions = {
        limit: limit || 10,
        threshold: threshold || 0.1 // Lower threshold for text search
      };

      console.log(`📦 Searching Pinecone with text search options:`, searchOptions);
      searchResults = await pineconeService.searchByText(
        companyId,
        agentId,
        query,
        searchOptions
      );
    } else {
      // Default: Semantic search using embeddings
      console.log(`🤖 Generating embedding for semantic search...`);
      queryEmbedding = await openaiService.generateEmbeddings([query]);
      
      if (!queryEmbedding.embeddings || queryEmbedding.embeddings.length === 0) {
        throw new Error('Failed to generate query embedding');
      }

      // Step 2: Search for similar vectors in Pinecone
      const searchOptions = {
        limit: limit || 10,
        threshold: threshold || 0.7
      };

      console.log(`📦 Searching Pinecone with semantic search options:`, searchOptions);
      searchResults = await pineconeService.searchSimilar(
        companyId,
        agentId,
        queryEmbedding.embeddings[0].embedding,
        searchOptions
      );
    }

    // Step 3: Apply additional filtering if needed
    let filteredResults = searchResults.results;
    
    if (companyId || userId) {
      const originalCount = filteredResults.length;
      filteredResults = filteredResults.filter(result => {
        const matchesCompany = !companyId || result.metadata.companyId === companyId;
        const matchesUser = !userId || result.metadata.userId === userId;
        return matchesCompany && matchesUser;
      });
      
      console.log(`🔍 Filtered results: ${originalCount} → ${filteredResults.length} (company: ${companyId}, user: ${userId})`);
    }

    // Step 4: Prepare response
    const response = {
      success: true,
      query: {
        text: query,
        agentId: agentId,
        searchType: searchType || 'semantic',
        filters: {
          companyId: companyId || null,
          userId: userId || null
        }
      },
      results: filteredResults,
      summary: {
        totalResults: filteredResults.length,
        originalResults: searchResults.results.length,
        filtered: filteredResults.length !== searchResults.results.length,
        searchType: searchType || 'semantic',
        searchedAt: new Date().toISOString()
      }
    };
    
    // Add embedding info only for semantic search
    if (searchType !== 'text' && queryEmbedding) {
      response.query.embedding = {
        model: queryEmbedding.model,
        dimensions: queryEmbedding.embeddings[0].embedding.length,
        tokens: queryEmbedding.totalTokens
      };
    }

    console.log(`✅ Search completed: ${filteredResults.length} results returned`);

    // Return raw result for direct calls, or send HTTP response
    if (returnRaw) {
      return response;
    }
    
    if (res) {
      res.status(200).json(response);
      return;
    }
    
    return response;

  } catch (error) {
    console.error(`❌ Search failed:`, error);
    
    const errorResponse = {
      success: false,
      error: {
        message: error.message,
        code: error.code || 'SEARCH_ERROR',
        agentId: agentId,
        query: query?.substring(0, 100)
      }
    };

    if (returnRaw) {
      throw error;
    }
    
    if (res) {
      res.status(500).json(errorResponse);
      return;
    }
    
    throw error;
  }
};

/**
 * HTTP endpoint wrapper for search
 * POST /api/search/:agentId
 */
const searchSimilar = asyncHandler(async (req, res) => {
  return searchDocuments(req, res, false);
});

/**
 * Get search statistics for an agent
 * GET /api/search/:agentId/stats
 */
const getSearchStats = asyncHandler(async (req, res) => {
  const { agentId } = req.params;

  try {
    // Get collection info from Qdrant
    const collectionName = `agent_${agentId}_chunks`;
    const stats = await qdrantService.getCollectionStats(agentId);

    const response = {
      success: true,
      agentId: agentId,
      collection: {
        name: collectionName,
        pointsCount: stats.pointsCount,
        vectorSize: stats.vectorSize,
        indexedVectors: stats.indexedVectors
      },
      searchCapabilities: {
        similarityThreshold: 0.7,
        maxResults: 50,
        supportedFilters: ['companyId', 'userId', 'fileId']
      },
      statsGeneratedAt: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error(`❌ Failed to get search stats:`, error);
    throw error;
  }
});

module.exports = {
  searchDocuments,
  searchSimilar,
  getSearchStats
};
