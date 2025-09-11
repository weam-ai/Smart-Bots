/**
 * Test script for Pinecone integration
 * Run with: node test-pinecone.js
 */

const pineconeService = require('./src/services/pineconeService');

async function testPineconeIntegration() {
  console.log('🧪 Testing Pinecone integration...\n');
  
  try {
    // Test 1: Initialize Pinecone client
    console.log('1️⃣ Testing Pinecone client initialization...');
    const client = pineconeService.initializePinecone();
    console.log('✅ Pinecone client initialized successfully\n');
    
    // Test 2: Test index creation (this will create if it doesn't exist)
    console.log('2️⃣ Testing index creation...');
    const testCompanyId = 'test-company-123';
    const testAgentId = 'test-agent-456';
    
    const indexName = await pineconeService.ensureIndex(testCompanyId);
    console.log(`✅ Index created/verified: ${indexName}\n`);
    
    // Test 3: Test storing embeddings
    console.log('3️⃣ Testing embedding storage...');
    const testChunks = [
      {
        content: 'This is a test document about artificial intelligence and machine learning.',
        chunkIndex: 0,
        contentHash: 'test-hash-1',
        metadata: {
          filename: 'test-doc.txt',
          mimeType: 'text/plain'
        },
        method: 'test',
        startIndex: 0,
        endIndex: 50
      },
      {
        content: 'Vector databases are essential for modern AI applications.',
        chunkIndex: 1,
        contentHash: 'test-hash-2',
        metadata: {
          filename: 'test-doc.txt',
          mimeType: 'text/plain'
        },
        method: 'test',
        startIndex: 51,
        endIndex: 100
      }
    ];
    
    // Generate dummy embeddings (1536 dimensions for text-embedding-3-small)
    const testEmbeddings = [
      {
        embedding: Array(1536).fill(0).map(() => Math.random() - 0.5),
        model: 'text-embedding-3-small',
        tokens: 20
      },
      {
        embedding: Array(1536).fill(0).map(() => Math.random() - 0.5),
        model: 'text-embedding-3-small',
        tokens: 15
      }
    ];
    
    const storageResult = await pineconeService.storeEmbeddings(
      testCompanyId,
      testAgentId,
      'test-file-789',
      testChunks,
      testEmbeddings,
      { userId: 'test-user' }
    );
    
    console.log('✅ Embeddings stored successfully:', {
      indexName: storageResult.indexName,
      vectorsStored: storageResult.vectorsStored
    });
    console.log('');
    
    // Test 4: Test search functionality
    console.log('4️⃣ Testing search functionality...');
    const queryEmbedding = Array(1536).fill(0).map(() => Math.random() - 0.5);
    
    const searchResult = await pineconeService.searchSimilar(
      testCompanyId,
      testAgentId,
      queryEmbedding,
      { limit: 5, threshold: 0.1 }
    );
    
    console.log('✅ Search completed successfully:', {
      resultsFound: searchResult.results.length,
      query: searchResult.query
    });
    console.log('');
    
    // Test 5: Test index stats
    console.log('5️⃣ Testing index statistics...');
    // Wait a moment for index to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    const statsResult = await pineconeService.getIndexStats(testCompanyId);
    console.log('✅ Index stats retrieved:', {
      indexName: statsResult.indexName,
      totalVectors: statsResult.stats.totalVectorCount || 'N/A (index may still be initializing)'
    });
    console.log('');
    
    // Test 6: Clean up - delete test data
    console.log('6️⃣ Cleaning up test data...');
    const deleteResult = await pineconeService.deleteFileChunks(
      testCompanyId,
      testAgentId,
      'test-file-789'
    );
    console.log('✅ Test data cleaned up successfully');
    console.log('');
    
    console.log('🎉 All Pinecone integration tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testPineconeIntegration();
