const openaiService = require('../services/openaiService');
const qdrantService = require('../services/qdrantService');
const { asyncHandler, createValidationError } = require('../utils/errorHelpers');

/**
 * Search Controller
 * Handles semantic similarity search across agent documents
 */

/**
 * Core search function (can be called directly or via HTTP)
 */
const searchDocuments = async (reqOrParams, res = null, returnRaw = false) => {
  let agentId, query, limit, threshold, companyId, userId;
  
  // Handle both HTTP request and direct function call
  if (reqOrParams.params) {
    // HTTP request format
    ({ agentId } = reqOrParams.params);
    ({ query, limit, threshold, companyId, userId } = reqOrParams.body);
  } else {
    // Direct function call format
    ({ agentId, query, limit, threshold, companyId, userId } = reqOrParams);
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

  try {
    // Step 1: Generate embedding for the search query
    console.log(`🤖 Generating embedding for query...`);
    const queryEmbedding = await openaiService.generateEmbeddings([query]);
    
    if (!queryEmbedding.embeddings || queryEmbedding.embeddings.length === 0) {
      throw new Error('Failed to generate query embedding');
    }

    // Step 2: Search for similar vectors in Qdrant
    const searchOptions = {
      limit: limit || 10,
      threshold: threshold || 0.7
    };

    console.log(`📦 Searching Qdrant with options:`, searchOptions);
    const searchResults = await qdrantService.searchSimilar(
      agentId,
      queryEmbedding.embeddings[0].embedding,
      searchOptions
    );

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
        embedding: {
          model: queryEmbedding.model,
          dimensions: queryEmbedding.embeddings[0].embedding.length,
          tokens: queryEmbedding.totalTokens
        },
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
        searchOptions: searchOptions,
        searchedAt: new Date().toISOString()
      }
    };

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

/**
 * Test search endpoint with sample queries
 * POST /api/search/:agentId/test
 */
const testSearch = asyncHandler(async (req, res) => {
  const { agentId } = req.params;

  const testQueries = [
    "What are your services?",
    "How does AI work?",
    "Tell me about your company",
    "artificial intelligence solutions"
  ];

  try {
    const results = [];

    for (const query of testQueries) {
      console.log(`🧪 Testing search with query: "${query}"`);
      
      try {
        // Generate embedding for test query
        const queryEmbedding = await openaiService.generateEmbeddings([query]);
        
        // Search Qdrant
        const searchResults = await qdrantService.searchSimilar(
          agentId,
          queryEmbedding.embeddings[0].embedding,
          { limit: 3, threshold: 0.5 }
        );

        results.push({
          query: query,
          resultsFound: searchResults.results.length,
          topResult: searchResults.results[0] ? {
            score: searchResults.results[0].score,
            contentPreview: searchResults.results[0].content.substring(0, 100) + '...'
          } : null
        });

      } catch (queryError) {
        results.push({
          query: query,
          error: queryError.message
        });
      }
    }

    const response = {
      success: true,
      agentId: agentId,
      testResults: results,
      summary: {
        totalQueries: testQueries.length,
        successfulQueries: results.filter(r => !r.error).length,
        failedQueries: results.filter(r => r.error).length
      },
      testedAt: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error(`❌ Search test failed:`, error);
    throw error;
  }
});

module.exports = {
  searchDocuments,
  searchSimilar,
  getSearchStats,
  testSearch
};
