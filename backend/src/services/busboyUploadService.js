const busboy = require('busboy');
const { PassThrough } = require('stream');
const crypto = require('crypto');
const path = require('path');
const { File, Agent } = require('../models');
const s3Service = require('./s3Service');
const { 
  ALLOWED_MIME_TYPES, 
  UPLOAD_LIMITS, 
  UPLOAD_ERROR_CODES,
  FILE_STATUS
} = require('../constants/fileUpload');
const { 
  performComprehensiveValidation,
  validateUploadedFiles 
} = require('../validations/fileUploadValidation');
const { 
  createFileError, 
  createNotFoundError, 
  createValidationError,
  asyncHandler 
} = require('../utils/errorHelpers');

/**
 * Busboy Upload Service with Parallel Processing
 */

/**
 * Convert stream to buffer
 */
const streamToBuffer = async (stream) => {
  const chunks = [];
  
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

/**
 * Generate file hash from buffer
 */
const generateFileHash = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Process single file with parallel S3 upload and AI processing
 */
const processFileParallel = async (stream, filename, mimetype, agentId, getContext = () => ({})) => {
  try {
    console.log(`📁 Processing file: ${filename} for agent ${agentId}`);

    // Convert stream to buffer once (for parallel processing)
    const buffer = await streamToBuffer(stream);
    
    // Correct MIME type before validation
    const correctedMimeType = correctMimeType(filename, mimetype);
    console.log(`🔧 Using corrected MIME type for validation: ${correctedMimeType}`);
    
    // Validate file
    const fileInfo = {
      originalname: filename,
      mimetype: correctedMimeType,
      size: buffer.length,
      buffer: buffer
    };
    
    // Perform comprehensive validation
    performComprehensiveValidation(fileInfo);
    
    // Generate file hash and S3 key
    const fileHash = generateFileHash(buffer);
    const s3Key = s3Service.generateS3Key(agentId, filename, fileHash);
    
    // // Check for duplicate files
    // const existingFile = await File.findOne({
    //   agent: agentId,
    //   fileHash: fileHash
    // });
    
    // if (existingFile) {
    //   throw createValidationError(
    //     `Duplicate file already uploaded: ${filename}`,
    //     { filename, hash: fileHash.substring(0, 8) },
    //     UPLOAD_ERROR_CODES.DUPLICATE_FILE
    //   );
    // }

    // Get context for multi-tenant fields
    const context = getContext();
    
    // Prepare file document data (but don't save yet)
    const fileDocData = {
      agent: agentId,
      // Multi-tenant fields (required for new records)
      companyId: context.companyId,
      createdBy: context.userId,
      
      originalFilename: filename,
      s3Key: s3Key,
      s3Url: '', // Will be set after S3 upload
      fileSize: buffer.length,
      mimeType: correctedMimeType,
      fileHash: fileHash,
      status: FILE_STATUS.UPLOADING,
      metadata: {
        uploadedAt: new Date(),
        processing: {
          stage: 'uploading',
          progress: 0
        },
        uploadContext: {
          userAgent: context.userAgent,
          uploadedBy: context.userId,
          companyId: context.companyId
        }
      }
    };

    // Parallel execution: S3 upload + AI processing preparation
    console.log(`🔄 Starting parallel processing for ${filename}`);
    
    const [s3Result, processingResult] = await Promise.all([
      // Branch A: Upload to S3
      uploadToS3(buffer, s3Key, correctedMimeType, {
        agentId,
        filename
      }).catch(error => {
        console.error(`❌ S3 upload failed for ${filename}:`, error);
        throw error;
      }),
      
      // Branch B: Prepare for AI processing (extract text)
      prepareForAIProcessing(buffer, correctedMimeType, filename).catch(error => {
        console.error(`❌ AI processing failed for ${filename}:`, error);
        throw error;
      })
    ]);
    
    console.log(`✅ Parallel processing completed for ${filename}`);

    // Now create file document with S3 and chunking information
    fileDocData.s3Url = s3Result.s3Url;
    fileDocData.status = processingResult.processingReady ? FILE_STATUS.PROCESSING : FILE_STATUS.ERROR;
    fileDocData.metadata.s3 = {
      etag: s3Result.etag,
      uploadedAt: new Date()
    };
    fileDocData.metadata.processing = {
      stage: processingResult.processingReady ? 'chunking_completed' : 'text_extraction_failed',
      progress: processingResult.processingReady ? 50 : 25
    };
    fileDocData.metadata.extraction = {
      textLength: processingResult.textLength,
      extractedAt: new Date()
    };
    fileDocData.metadata.chunking = {
      totalChunks: processingResult.totalChunks || 0,
      chunkingStrategy: processingResult.chunkingStrategy || 'recursive',
      completed: !!processingResult.chunks,
      completedAt: processingResult.chunks ? new Date() : null,
      stats: processingResult.chunkingStats || null
    };
    
    const fileDoc = new File(fileDocData);
    await fileDoc.save();
    console.log(`💾 File document created: ${fileDoc._id}`);

    // Step 4: Store embeddings in Qdrant after file document is created
    if (processingResult.embeddings && processingResult.chunks) {
      try {
        console.log(`📦 Storing embeddings in Qdrant for file ${fileDoc._id}`);
        const pineconeService = require('./pineconeService');
        
        // Get context (form fields) when needed for Pinecone storage
        const context = getContext();
        
        const pineconeResult = await pineconeService.storeEmbeddings(
          context.companyId,
          agentId,
          fileDoc._id,
          processingResult.chunks,
          processingResult.embeddings.embeddings,
          context
        );
        
        // Update file document with Pinecone information
        fileDoc.metadata.pinecone = {
          vectorsCount: pineconeResult.vectorsStored,
          indexName: pineconeResult.indexName,
          indexedAt: new Date()
        };
        fileDoc.metadata.processing = {
          stage: 'completed',
          progress: 100
        };
        fileDoc.status = 'processed';
        fileDoc.processedAt = new Date();
        
        await fileDoc.save();
        
        console.log(`✅ Qdrant storage completed: ${qdrantResult.pointsStored} vectors stored`);
        
      } catch (qdrantError) {
        console.error(`❌ Qdrant storage failed for ${filename}:`, qdrantError);
        
        // Update file with error status
        fileDoc.metadata.processing.stage = 'qdrant_failed';
        fileDoc.errorMessage = `Qdrant storage failed: ${qdrantError.message}`;
        await fileDoc.save();
      }
    }

    console.log(`✅ File processed successfully: ${filename}`);

    return {
      success: true,
      fileId: fileDoc._id,
      filename: filename,
      s3Key: s3Key,
      s3Url: s3Result.s3Url,
      fileSize: buffer.length,
      fileHash: fileHash.substring(0, 8),
      status: fileDoc.status,
      textLength: processingResult.textLength,
      totalChunks: processingResult.totalChunks || 0,
      chunkingStrategy: processingResult.chunkingStrategy,
      processingStage: fileDoc.metadata.processing?.stage || 'completed',
      // Embeddings information
      embeddings: processingResult.embeddings ? {
        totalEmbeddings: processingResult.embeddings.totalEmbeddings,
        model: processingResult.embeddings.model,
        dimensions: processingResult.embeddings.dimensions,
        totalTokens: processingResult.embeddings.totalTokens
      } : null,
      // Qdrant information
      qdrant: fileDoc.metadata.qdrant ? {
        pointsStored: fileDoc.metadata.qdrant.pointsCount,
        collectionName: fileDoc.metadata.qdrant.collectionName,
        indexedAt: fileDoc.metadata.qdrant.indexedAt
      } : null,
      extractedText: processingResult.extractedText, // For immediate processing
      chunks: processingResult.chunks || [] // Include chunks for debugging/testing
    };

  } catch (error) {
    console.error(`❌ Error processing file ${filename}:`, error);
    console.error(`❌ Error details:`, {
      message: error?.message || 'No message',
      stack: error?.stack || 'No stack',
      name: error?.name || 'No name',
      code: error?.code || 'No code',
      toString: error?.toString() || 'Cannot convert to string'
    });
    throw error;
  }
};

/**
 * Upload buffer to S3
 */
const uploadToS3 = async (buffer, s3Key, mimetype, metadata) => {
  try {
    console.log(`☁️  Uploading to S3: ${s3Key}`);
    
    const result = await s3Service.uploadBuffer(buffer, s3Key, mimetype, metadata);
    
    console.log(`✅ S3 upload completed: ${s3Key}`);
    return result;
    
  } catch (error) {
    console.error(`❌ S3 upload failed: ${error.message}`);
    throw createFileError(`S3 upload failed: ${error.message}`);
  }
};

/**
 * Correct MIME type based on file extension
 */
const correctMimeType = (filename, originalMimeType) => {
  const ext = path.extname(filename).toLowerCase();
  
  // MIME type correction mapping
  const mimeTypeMap = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.markdown': 'text/markdown',
    '.json': 'application/json',
    '.csv': 'text/csv'
  };
  
  const correctedMimeType = mimeTypeMap[ext];
  
  if (correctedMimeType && originalMimeType === 'application/octet-stream') {
    console.log(`🔧 Corrected MIME type for ${filename}: ${originalMimeType} → ${correctedMimeType}`);
    return correctedMimeType;
  }
  
  return originalMimeType;
};

/**
 * Prepare file for AI processing (text extraction + chunking)
 */
const prepareForAIProcessing = async (buffer, mimetype, filename) => {
  try {
    console.log(`🧠 Preparing for AI processing: ${filename} (${mimetype})`);
    
    // Correct MIME type if needed
    const correctedMimeType = correctMimeType(filename, mimetype);
    console.log(`🎯 Using MIME type: ${correctedMimeType} for ${filename}`);
    
    // Step 1: Text extraction using document parser
    console.log(`🔍 Loading document parser for ${filename} (${correctedMimeType})`);
    const documentParser = require('./documentParser');
    console.log(`📋 Document parser loaded, calling extractTextFromBuffer`);
    const parseResult = await documentParser.extractTextFromBuffer(buffer, correctedMimeType, filename);
    console.log(`📊 Parse result:`, parseResult);
    
    const extractedText = parseResult.text;
    const extractionMetadata = parseResult.metadata;
    
    console.log(`✅ Text extraction completed: ${extractedText.length} characters`);
    
    // Check if extraction was successful
    const isExtractionSuccessful = extractedText.length > 0 && 
                                  !extractedText.includes('[Extraction Failed]') &&
                                  !extractedText.includes('[Unsupported Format]');
    
    if (!isExtractionSuccessful) {
      console.warn(`⚠️  Text extraction failed or produced no content for ${filename}`);
      return {
        extractedText,
        textLength: extractedText.length,
        processingReady: false,
        chunks: [],
        totalChunks: 0,
        metadata: {
          ...extractionMetadata,
          extractionSuccessful: false,
          chunkingSkipped: true
        }
      };
    }
    
    // Step 2: Text chunking
    console.log(`✂️  Starting text chunking for ${filename}`);
    const textChunkingService = require('./textChunkingService');
    
    const chunkingResult = await textChunkingService.chunkText(extractedText, {
      mimeType: correctedMimeType,
      metadata: {
        filename,
        fileSize: buffer.length,
        extractionMethod: extractionMetadata.extractionMethod
      }
    });
    
    console.log(`✅ Text chunking completed: ${chunkingResult.totalChunks} chunks`);
    
    // Step 3: Generate embeddings and store in Pinecone
    console.log(`🤖 Starting OpenAI embeddings generation for ${filename}`);
    const openaiService = require('./openaiService');
    const pineconeService = require('./pineconeService');
    
    let embeddings = null;
    let pineconeResult = null;
    
    try {
      // Generate embeddings for chunks
      const embeddingResult = await openaiService.generateEmbeddings(chunkingResult.chunks, {
        metadata: {
          filename,
          extractionMethod: extractionMetadata.extractionMethod
        }
      });
      
      embeddings = embeddingResult;
      console.log(`✅ Generated ${embeddingResult.totalEmbeddings} embeddings (${embeddingResult.totalTokens} tokens)`);
      
      // Store embeddings in Pinecone (will be called after file doc is created)
      // For now, we'll return the embeddings to be stored later
      
    } catch (embeddingError) {
      console.error(`❌ Embedding generation failed for ${filename}:`, embeddingError);
      // Continue processing even if embeddings fail
    }
    
    return {
      extractedText,
      textLength: extractedText.length,
      processingReady: true,
      chunks: chunkingResult.chunks,
      totalChunks: chunkingResult.totalChunks,
      chunkingStrategy: chunkingResult.strategy,
      chunkingStats: chunkingResult.stats,
      embeddings: embeddings,
      qdrantResult: qdrantResult,
      metadata: {
        ...extractionMetadata,
        extractionSuccessful: true,
        chunking: {
          strategy: chunkingResult.strategy,
          totalChunks: chunkingResult.totalChunks,
          completed: true,
          completedAt: new Date().toISOString(),
          stats: chunkingResult.stats
        },
        embeddings: embeddings ? {
          totalEmbeddings: embeddings.totalEmbeddings,
          model: embeddings.model,
          dimensions: embeddings.dimensions,
          totalTokens: embeddings.totalTokens,
          completed: true,
          completedAt: new Date().toISOString()
        } : {
          completed: false,
          error: 'Embedding generation failed'
        }
      }
    };
    
  } catch (error) {
    console.error(`❌ Text extraction failed:`, error);
    console.error(`❌ Text extraction error details:`, {
      message: error?.message || 'No message',
      stack: error?.stack || 'No stack',
      name: error?.name || 'No name',
      code: error?.code || 'No code',
      toString: error?.toString() || 'Cannot convert to string'
    });
    return {
      extractedText: `[Extraction Failed] - ${filename}\nError: ${error?.message || 'Unknown error'}`,
      textLength: 0,
      processingReady: false,
      error: error?.message || 'Unknown error',
      metadata: {
        filename,
        extractionError: error?.message || 'Unknown error',
        extractionSuccessful: false
      }
    };
  }
};

/**
 * Handle Busboy upload with parallel processing
 */
const handleBusboyUpload = (req, agentId) => {
  return new Promise((resolve, reject) => {
    try {
      // Validate agent first
      Agent.findById(agentId)
        .then(agent => {
          if (!agent) {
            throw createNotFoundError('Agent', agentId);
          }
          
          const busboyInstance = busboy({ 
            headers: req.headers,
            limits: {
              fileSize: UPLOAD_LIMITS.MAX_FILE_SIZE,
              files: UPLOAD_LIMITS.MAX_FILES_PER_UPLOAD,
              fieldSize: UPLOAD_LIMITS.MAX_FIELD_SIZE,
              fieldNameSize: UPLOAD_LIMITS.MAX_FIELD_NAME_SIZE
            }
          });

          const uploadPromises = [];
          const fileInfo = [];
          let fieldCount = 0;

          // Handle file uploads
          busboyInstance.on('file', (fieldname, stream, info) => {
            const { filename, encoding, mimeType } = info;
            console.log(`📤 Busboy file received: ${filename} (${mimeType})`);
            
            fileInfo.push({ filename, mimeType, size: 0 });
            
            // Process file with parallel S3 + AI processing
            const uploadPromise = processFileParallel(
              stream, 
              filename, 
              mimeType, 
              agentId,
              () => formFields  // Pass a function to get form fields when needed
            );
            
            uploadPromises.push(uploadPromise);
          });

          // Store form fields for context
          const formFields = {};
          
          // Handle form fields (if any)
          busboyInstance.on('field', (fieldname, value) => {
            fieldCount++;
            formFields[fieldname] = value;
            console.log(`📝 Form field: ${fieldname} = ${value}`);
          });

          // Handle upload completion
          busboyInstance.on('finish', async () => {
            try {
              console.log(`🏁 Busboy upload finished. Processing ${uploadPromises.length} files...`);
              
              if (uploadPromises.length === 0) {
                throw createValidationError('No files provided');
              }

              // Wait for all parallel processing to complete
              const results = await Promise.allSettled(uploadPromises);
              
              // Separate successful and failed uploads
              const successful = [];
              const failed = [];
              
                results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                  successful.push(result.value);
                } else {
                  failed.push({
                    filename: fileInfo[index]?.filename || `file_${index}`,
                    error: result.reason?.message || 'Unknown error',
                    code: result.reason?.errorCode || 'PROCESSING_FAILED'
                  });
                }
              });

              // Update agent status if any files were processed
              if (successful.length > 0) {
                await Agent.findByIdAndUpdate(agentId, {
                  status: 'training',
                  lastUsed: new Date()
                });
              }

              console.log(`✅ Upload processing completed: ${successful.length} successful, ${failed.length} failed`);

              resolve({
                processedFiles: successful,
                errors: failed,
                totalFiles: uploadPromises.length,
                successfulFiles: successful.length,
                failedFiles: failed.length
              });

            } catch (error) {
              console.error('❌ Error in busboy finish handler:', error);
              reject(error);
            }
          });

          // Handle busboy errors
          busboyInstance.on('error', (error) => {
            console.error('❌ Busboy error:', error);
            reject(createFileError(`Upload error: ${error.message}`));
          });

          // Pipe request to busboy
          req.pipe(busboyInstance);

        })
        .catch(reject);

    } catch (error) {
      console.error('❌ Error setting up busboy:', error);
      reject(error);
    }
  });
};

module.exports = {
  handleBusboyUpload,
  processFileParallel,
  streamToBuffer,
  generateFileHash
};
