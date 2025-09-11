# Pinecone Migration Guide

## Overview
This document outlines the migration from Qdrant to Pinecone for vector storage in the AI Chatbot Generator.

## Architecture Changes

### Before (Qdrant)
- One collection per agent: `agent_{agentId}_chunks`
- Self-hosted Qdrant instance via Docker
- Direct URL + API key authentication

### After (Pinecone)
- One index per company: `company_{companyId}`
- Agent data separated using `agentId` as metadata filter
- Cloud-hosted Pinecone service
- API key + environment authentication

## Benefits of Pinecone Migration

1. **Cost Efficiency**: One index per company instead of one collection per agent
2. **Scalability**: Fully managed cloud service with automatic scaling
3. **Performance**: Better query performance and lower latency
4. **Maintenance**: No infrastructure to maintain
5. **Reliability**: Enterprise-grade uptime and backup

## Environment Variables

Add these to your `.env` file:

```bash
# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
```

Remove these Qdrant variables:
```bash
# Remove these
QDRANT_URL=
QDRANT_API_KEY=
```

## Setup Instructions

### 1. Create Pinecone Account
1. Go to [https://www.pinecone.io/](https://www.pinecone.io/)
2. Sign up for a free account
3. Create a new project
4. Note your API key and environment

### 2. Update Environment Variables
1. Add `PINECONE_API_KEY` to your `.env` file
2. Remove Qdrant-related environment variables

### 3. Install Dependencies
```bash
cd backend
npm install @pinecone-database/pinecone
```

### 4. Test the Integration
```bash
cd backend
node test-pinecone.js
```

## Code Changes Summary

### New Files
- `backend/src/services/pineconeService.js` - Pinecone service implementation

### Modified Files
- `backend/package.json` - Updated dependencies
- `backend/src/config/env.js` - Updated environment configuration
- `backend/src/controllers/chatController.js` - Updated to use Pinecone
- `backend/src/controllers/searchController.js` - Updated to use Pinecone
- `backend/src/workers/documentWorker.js` - Updated to use Pinecone
- `backend/src/services/busboyUploadService.js` - Updated to use Pinecone
- `docker-compose.yml` - Removed Qdrant service

### Removed Files
- `backend/src/services/qdrantService.js` - Replaced by Pinecone service

## API Changes

### Pinecone Service Methods

```javascript
// Store embeddings
await pineconeService.storeEmbeddings(companyId, agentId, fileId, chunks, embeddings, context)

// Search similar vectors
await pineconeService.searchSimilar(companyId, agentId, queryEmbedding, options)

// Delete file chunks
await pineconeService.deleteFileChunks(companyId, agentId, fileId)

// Delete all agent chunks
await pineconeService.deleteAgentChunks(companyId, agentId)

// Get index statistics
await pineconeService.getIndexStats(companyId)
```

## Data Structure

### Index Structure
- **Index Name**: `company_{companyId}`
- **Dimensions**: 1536 (OpenAI text-embedding-3-small)
- **Metric**: cosine
- **Cloud**: AWS (serverless)

### Vector Metadata
```javascript
{
  agentId: "agent_123",
  fileId: "file_456",
  chunkIndex: 0,
  companyId: "company_789",
  userId: "user_101",
  content: "chunk content...",
  contentHash: "hash_value",
  filename: "document.pdf",
  mimeType: "application/pdf",
  chunkLength: 500,
  method: "recursive",
  createdAt: "2024-01-01T00:00:00.000Z",
  // ... other metadata
}
```

## Migration Notes

1. **Company Context**: All operations now require `companyId` as the first parameter
2. **Agent Filtering**: Agent-specific data is filtered using `agentId` in metadata
3. **Index Management**: Indexes are created automatically when needed
4. **Error Handling**: Improved error handling with specific Pinecone error codes

## Testing

Run the test script to verify the integration:

```bash
cd backend
node test-pinecone.js
```

This will test:
- Client initialization
- Index creation
- Embedding storage
- Search functionality
- Index statistics
- Data cleanup

## Troubleshooting

### Common Issues

1. **API Key Issues**: Ensure `PINECONE_API_KEY` is correctly set
3. **Index Creation**: First operation may take a few minutes to create the index
4. **Rate Limits**: Pinecone has rate limits; implement retry logic if needed

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=pinecone:*
```

## Performance Considerations

1. **Batch Size**: Default batch size is 100 vectors per upsert
2. **Search Limits**: Default search limit is 10 results
3. **Similarity Threshold**: Default threshold is 0.7
4. **Index Warmup**: New indexes may take time to warm up

## Security

1. **API Key**: Store securely and never commit to version control
2. **Environment**: Use different environments for dev/staging/prod
3. **Access Control**: Implement proper company-level access controls
4. **Data Isolation**: Each company's data is isolated in separate indexes
