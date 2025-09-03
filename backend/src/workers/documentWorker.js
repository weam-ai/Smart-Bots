/**
 * Document Processing Worker
 * Background worker that processes document-related jobs
 */

const { Worker } = require('bullmq');
const { 
  redisConnection, 
  QUEUE_NAMES, 
  JOB_TYPES, 
  WORKER_CONCURRENCY 
} = require('../config/queue');

// Import services
const documentParser = require('../services/documentParser');
const textChunkingService = require('../services/textChunkingService');
const openaiService = require('../services/openaiService');
const qdrantService = require('../services/qdrantService');
const s3Service = require('../services/s3Service');
const documentQueueService = require('../services/documentQueueService');
const { File } = require('../models');

/**
 * Process text extraction job
 */
const processTextExtraction = async (job) => {
  const { fileId, s3Key, mimeType, filename } = job.data;
  
  try {
    // Update progress
    await job.updateProgress(10);
    console.log(`🔍 Starting text extraction for file ${fileId}`);
    
    // Step 1: Download file from S3
    console.log(`📥 Downloading file from S3: ${s3Key}`);
    const fileBuffer = await s3Service.downloadBuffer(s3Key);
    await job.updateProgress(30);
    
    // Step 2: Extract text from file
    console.log(`📄 Extracting text from ${filename} (${mimeType})`);
    const extractionResult = await documentParser.extractTextFromBuffer(fileBuffer, mimeType, filename);
    await job.updateProgress(70);
    
    // Step 3: Update file document with extraction results
    await File.findByIdAndUpdate(fileId, {
      'processing.textExtraction.status': 'completed',
      'processing.textExtraction.extractedTextLength': extractionResult.text.length,
      'processing.textExtraction.method': extractionResult.metadata.extractionMethod,
      'processing.textExtraction.completedAt': new Date()
    });
    
    await job.updateProgress(90);
    
    // Step 4: Queue next job - text chunking
    const chunkingJob = await documentQueueService.queueTextChunking({
      ...job.data,
      extractedText: extractionResult.text,
      extractionMetadata: extractionResult.metadata
    }, job.id);
    
    await job.updateProgress(100);
    
    console.log(`✅ Text extraction completed for file ${fileId}, chunking job queued: ${chunkingJob.id}`);
    
    return {
      success: true,
      extractedTextLength: extractionResult.text.length,
      extractionMethod: extractionResult.metadata.extractionMethod,
      nextJobId: chunkingJob.id
    };
    
  } catch (error) {
    console.error(`❌ Text extraction failed for file ${fileId}:`, error);
    
    // Update file status
    await File.findByIdAndUpdate(fileId, {
      'processing.textExtraction.status': 'failed',
      'processing.textExtraction.error': error.message,
      'processing.textExtraction.failedAt': new Date()
    });
    
    throw error;
  }
};

/**
 * Process text chunking job
 */
const processTextChunking = async (job) => {
  const { fileId, extractedText, chunkingOptions, filename } = job.data;
  
  try {
    await job.updateProgress(10);
    console.log(`✂️  Starting text chunking for file ${fileId} (${extractedText.length} chars)`);
    
    // Perform text chunking
    const chunkingResult = await textChunkingService.chunkText(extractedText, {
      strategy: chunkingOptions.strategy,
      chunkSize: chunkingOptions.chunkSize,
      chunkOverlap: chunkingOptions.chunkOverlap,
      filename: filename,
      mimeType: job.data.mimeType
    });
    
    await job.updateProgress(70);
    
    // Update file document with chunking results
    await File.findByIdAndUpdate(fileId, {
      'processing.chunking.status': 'completed',
      'processing.chunking.totalChunks': chunkingResult.totalChunks,
      'processing.chunking.strategy': chunkingResult.strategy,
      'processing.chunking.avgChunkSize': chunkingResult.avgChunkSize,
      'processing.chunking.completedAt': new Date()
    });
    
    await job.updateProgress(90);
    
    // Queue next job - embedding generation
    const embeddingJob = await documentQueueService.queueEmbeddingGeneration({
      ...job.data,
      chunks: chunkingResult.chunks,
      chunkingStats: chunkingResult.stats
    }, job.id);
    
    await job.updateProgress(100);
    
    console.log(`✅ Text chunking completed for file ${fileId}: ${chunkingResult.totalChunks} chunks, embedding job queued: ${embeddingJob.id}`);
    
    return {
      success: true,
      totalChunks: chunkingResult.totalChunks,
      strategy: chunkingResult.strategy,
      nextJobId: embeddingJob.id
    };
    
  } catch (error) {
    console.error(`❌ Text chunking failed for file ${fileId}:`, error);
    
    await File.findByIdAndUpdate(fileId, {
      'processing.chunking.status': 'failed',
      'processing.chunking.error': error.message,
      'processing.chunking.failedAt': new Date()
    });
    
    throw error;
  }
};

/**
 * Process embedding generation job
 */
const processEmbeddingGeneration = async (job) => {
  const { fileId, chunks, embeddingOptions } = job.data;
  
  try {
    await job.updateProgress(10);
    console.log(`🤖 Starting embedding generation for file ${fileId} (${chunks.length} chunks)`);
    
    // Generate embeddings with progress tracking
    const embeddingResult = await openaiService.generateEmbeddings(chunks, {
      model: embeddingOptions.model,
      batchSize: embeddingOptions.batchSize,
      onProgress: async (progress) => {
        await job.updateProgress(10 + (progress * 0.7)); // 10% to 80%
      }
    });
    
    await job.updateProgress(85);
    
    // Update file document with embedding results
    await File.findByIdAndUpdate(fileId, {
      'processing.embeddings.status': 'completed',
      'processing.embeddings.totalEmbeddings': embeddingResult.totalEmbeddings,
      'processing.embeddings.model': embeddingResult.model,
      'processing.embeddings.totalTokens': embeddingResult.totalTokens,
      'processing.embeddings.completedAt': new Date()
    });
    
    await job.updateProgress(90);
    
    // Queue final job - Qdrant storage
    const storageJob = await documentQueueService.queueQdrantStorage({
      ...job.data,
      embeddings: embeddingResult.embeddings,
      embeddingStats: embeddingResult.stats
    }, job.id);
    
    await job.updateProgress(100);
    
    console.log(`✅ Embedding generation completed for file ${fileId}: ${embeddingResult.totalEmbeddings} embeddings, storage job queued: ${storageJob.id}`);
    
    return {
      success: true,
      totalEmbeddings: embeddingResult.totalEmbeddings,
      totalTokens: embeddingResult.totalTokens,
      model: embeddingResult.model,
      nextJobId: storageJob.id
    };
    
  } catch (error) {
    console.error(`❌ Embedding generation failed for file ${fileId}:`, error);
    
    await File.findByIdAndUpdate(fileId, {
      'processing.embeddings.status': 'failed',
      'processing.embeddings.error': error.message,
      'processing.embeddings.failedAt': new Date()
    });
    
    throw error;
  }
};

/**
 * Process Qdrant storage job
 */
const processQdrantStorage = async (job) => {
  const { fileId, agentId, chunks, embeddings, userId, companyId } = job.data;
  
  try {
    await job.updateProgress(10);
    console.log(`📦 Starting Qdrant storage for file ${fileId}`);
    
    // Store embeddings in Qdrant
    const storageResult = await qdrantService.storeEmbeddings(
      agentId,
      fileId,
      chunks,
      embeddings,  // embeddings is already the array, not embeddings.embeddings
      { userId, companyId }
    );
    
    await job.updateProgress(80);
    
    // Update file document with Qdrant results
    await File.findByIdAndUpdate(fileId, {
      'processing.qdrant.status': 'completed',
      'processing.qdrant.collectionName': storageResult.collectionName,
      'processing.qdrant.pointsStored': storageResult.pointsStored,
      'processing.qdrant.completedAt': new Date(),
      
      // Mark overall processing as complete
      'processing.status': 'completed',
      'processing.completedAt': new Date(),
      
      // Update main file status to completed
      'status': 'completed'
    });
    
    // Update agent status to completed if this was the last file
    const Agent = require('../models').Agent;
    const completedFiles = await File.countDocuments({ 
      agent: agentId, 
      status: 'completed' 
    });
    const totalFiles = await File.countDocuments({ agent: agentId });
    
    if (completedFiles === totalFiles && totalFiles > 0) {
      await Agent.findByIdAndUpdate(agentId, {
        status: 'completed',
        updatedAt: new Date()
      });
      console.log(`✅ Agent ${agentId} status updated to completed (${completedFiles}/${totalFiles} files processed)`);
    }
    
    await job.updateProgress(95);
    
    // Send completion notification
    await documentQueueService.queueNotification({
      type: 'file_processing_complete',
      fileId,
      agentId,
      userId,
      filename: job.data.filename,
      results: {
        chunksProcessed: chunks.length,
        embeddingsGenerated: embeddings.length,  // embeddings is already the array
        pointsStored: storageResult.pointsStored
      }
    });
    
    await job.updateProgress(100);
    
    console.log(`✅ Complete file processing finished for file ${fileId}: ${storageResult.pointsStored} points stored in Qdrant`);
    
    return {
      success: true,
      collectionName: storageResult.collectionName,
      pointsStored: storageResult.pointsStored,
      processingComplete: true
    };
    
  } catch (error) {
    console.error(`❌ Qdrant storage failed for file ${fileId}:`, error);
    
    await File.findByIdAndUpdate(fileId, {
      'processing.qdrant.status': 'failed',
      'processing.qdrant.error': error.message,
      'processing.qdrant.failedAt': new Date(),
      'processing.status': 'failed',
      'processing.failedAt': new Date()
    });
    
    throw error;
  }
};

/**
 * Job processor function
 */
const processJob = async (job) => {
  console.log(`🔄 Processing job ${job.id}: ${job.name}`);
  
  try {
    let result;
    
    switch (job.name) {
      case JOB_TYPES.EXTRACT_TEXT:
        result = await processTextExtraction(job);
        break;
        
      case JOB_TYPES.CHUNK_TEXT:
        result = await processTextChunking(job);
        break;
        
      case JOB_TYPES.GENERATE_EMBEDDINGS:
        result = await processEmbeddingGeneration(job);
        break;
        
      case JOB_TYPES.STORE_EMBEDDINGS:
        result = await processQdrantStorage(job);
        break;
        
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
    
    console.log(`✅ Job ${job.id} completed successfully`);
    return result;
    
  } catch (error) {
    console.error(`❌ Job ${job.id} failed:`, error);
    throw error;
  }
};

/**
 * Initialize document processing worker
 */
const startDocumentWorker = () => {
  console.log('🚀 Starting document processing worker...');
  
  const worker = new Worker(
    QUEUE_NAMES.DOCUMENT_PROCESSING,
    processJob,
    {
      connection: redisConnection,
      concurrency: WORKER_CONCURRENCY[QUEUE_NAMES.DOCUMENT_PROCESSING] || 3,
      removeOnComplete: 100,
      removeOnFail: 50
    }
  );
  
  // Worker event handlers
  worker.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed:`, result);
  });
  
  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });
  
  worker.on('progress', (job, progress) => {
    console.log(`🔄 Job ${job.id} progress: ${progress}%`);
  });
  
  worker.on('error', (err) => {
    console.error('❌ Worker error:', err);
  });
  
  console.log(`✅ Document worker started with concurrency: ${WORKER_CONCURRENCY[QUEUE_NAMES.DOCUMENT_PROCESSING]}`);
  
  return worker;
};

/**
 * Initialize embedding generation worker
 */
const startEmbeddingWorker = () => {
  console.log('🚀 Starting embedding generation worker...');
  
  const worker = new Worker(
    QUEUE_NAMES.EMBEDDING_GENERATION,
    processJob,
    {
      connection: redisConnection,
      concurrency: WORKER_CONCURRENCY[QUEUE_NAMES.EMBEDDING_GENERATION] || 2,
      removeOnComplete: 50,
      removeOnFail: 25
    }
  );
  
  // Worker event handlers
  worker.on('completed', (job, result) => {
    console.log(`✅ Embedding job ${job.id} completed`);
  });
  
  worker.on('failed', (job, err) => {
    console.error(`❌ Embedding job ${job?.id} failed:`, err.message);
  });
  
  console.log(`✅ Embedding worker started with concurrency: ${WORKER_CONCURRENCY[QUEUE_NAMES.EMBEDDING_GENERATION]}`);
  
  return worker;
};

module.exports = {
  startDocumentWorker,
  startEmbeddingWorker,
  processJob
};
