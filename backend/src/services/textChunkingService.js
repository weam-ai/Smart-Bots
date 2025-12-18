/**
 * LangChain Text Chunking Service
 * Uses LangChain's battle-tested text splitters for better chunking
 */

const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { MarkdownTextSplitter } = require('langchain/text_splitter');
const { TokenTextSplitter } = require('langchain/text_splitter');
const crypto = require('crypto');
const { createServiceError } = require('../utils/errorHelpers');

/**
 * Generate a hash for chunk content
 */
const generateChunkHash = (content) => {
  return crypto.createHash('md5').update(content).digest('hex');
};

/**
 * LangChain chunking strategies
 */
const LANGCHAIN_STRATEGIES = {
  RECURSIVE: 'recursive',      // Recursive character splitting (default)
  MARKDOWN: 'markdown',        // Markdown-aware splitting
  TOKEN: 'token',             // Token-based splitting
  FIXED: 'fixed'              // Simple character splitting
};

/**
 * Default chunking parameters
 */
const CHUNKING_DEFAULTS = {
  CHUNK_SIZE: 3000,
  CHUNK_OVERLAP: 50,
  MIN_CHUNK_SIZE: 20,     // Reduced from 100 to allow small documents
  MAX_CHUNK_SIZE: 4000
};

/**
 * File type to strategy mapping
 */
const FILE_TYPE_STRATEGIES = {
  'text/markdown': LANGCHAIN_STRATEGIES.MARKDOWN,
  'text/plain': LANGCHAIN_STRATEGIES.RECURSIVE,
  'application/pdf': LANGCHAIN_STRATEGIES.RECURSIVE,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': LANGCHAIN_STRATEGIES.RECURSIVE,
  'application/msword': LANGCHAIN_STRATEGIES.RECURSIVE,
  'application/json': LANGCHAIN_STRATEGIES.FIXED,
  'text/csv': LANGCHAIN_STRATEGIES.FIXED
};

/**
 * Create appropriate LangChain text splitter based on strategy
 */
const createTextSplitter = (strategy, options = {}) => {
  const chunkSize = options.chunkSize || CHUNKING_DEFAULTS.CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap || CHUNKING_DEFAULTS.CHUNK_OVERLAP;

  switch (strategy) {
    case LANGCHAIN_STRATEGIES.MARKDOWN:
      return new MarkdownTextSplitter({
        chunkSize,
        chunkOverlap
      });

    case LANGCHAIN_STRATEGIES.TOKEN:
      return new TokenTextSplitter({
        chunkSize,
        chunkOverlap,
        encodingName: options.encodingName || 'gpt2'
      });

    case LANGCHAIN_STRATEGIES.FIXED:
      return new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
        separators: ["\n\n", "\n", " ", ""] // Simple separators for fixed splitting
      });

    case LANGCHAIN_STRATEGIES.RECURSIVE:
    default:
      return new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
        separators: [
          "\n\n",      // Paragraphs
          "\n",        // Lines
          ". ",        // Sentences
          "! ",        // Exclamations
          "? ",        // Questions
          "; ",        // Semicolons
          ", ",        // Commas
          " ",         // Words
          ""           // Characters
        ]
      });
  }
};

/**
 * Validate and filter chunks
 */
const validateChunks = (chunks) => {
  return chunks.filter(chunk => {
    const content = chunk.pageContent || chunk.content;
    const contentLength = content.trim().length;
    
    // Check minimum size
    if (contentLength < CHUNKING_DEFAULTS.MIN_CHUNK_SIZE) {
      console.warn(`⚠️  Chunk too small (${contentLength} chars), skipping`);
      return false;
    }
    
    // Check maximum size
    if (contentLength > CHUNKING_DEFAULTS.MAX_CHUNK_SIZE) {
      console.warn(`⚠️  Chunk too large (${contentLength} chars), keeping but may need further splitting`);
    }
    
    return true;
  });
};

/**
 * Main chunking function using LangChain
 */
const chunkText = async (text, options = {}) => {
  try {
    console.log(`📄 Starting LangChain text chunking: ${text.length} characters`);
    
    // Determine strategy
    const strategy = options.strategy || 
                    FILE_TYPE_STRATEGIES[options.mimeType] ||
                    LANGCHAIN_STRATEGIES.RECURSIVE;
    
    console.log(`🔧 Using LangChain strategy: ${strategy}`);
    
    // Create appropriate text splitter
    const textSplitter = createTextSplitter(strategy, options);
    
    // Create documents with metadata
    const metadata = {
      filename: options.filename,
      mimeType: options.mimeType,
      fileSize: options.fileSize,
      extractionMethod: options.extractionMethod,
      strategy: strategy,
      chunkingTimestamp: new Date().toISOString()
    };
    
    // Split text using LangChain
    const docs = await textSplitter.createDocuments([text], [metadata]);
    console.log(`✂️  LangChain splitting complete: ${docs.length} initial chunks`);
    
    // Validate chunks
    const validatedDocs = validateChunks(docs);
    console.log(`✅ Validated chunks: ${validatedDocs.length} chunks`);
    
    // Convert to our format with additional metadata
    const finalChunks = validatedDocs.map((doc, index) => {
      const content = doc.pageContent;
      return {
        content: content,
        chunkIndex: index,
        contentHash: generateChunkHash(content),
        startIndex: index * (options.chunkSize || CHUNKING_DEFAULTS.CHUNK_SIZE), // Approximate
        endIndex: Math.min((index + 1) * (options.chunkSize || CHUNKING_DEFAULTS.CHUNK_SIZE), text.length),
        method: `langchain-${strategy}`,
        metadata: {
          ...doc.metadata,
          chunkLength: content.length,
          originalTextLength: text.length
        }
      };
    });
    
    // Calculate statistics
    const stats = {
      originalLength: text.length,
      totalChunkLength: finalChunks.reduce((sum, chunk) => sum + chunk.content.length, 0),
      averageChunkLength: Math.round(finalChunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / finalChunks.length),
      minChunkLength: Math.min(...finalChunks.map(chunk => chunk.content.length)),
      maxChunkLength: Math.max(...finalChunks.map(chunk => chunk.content.length)),
      strategy: strategy,
      chunkingMethod: 'langchain'
    };
    
    const result = {
      chunks: finalChunks,
      totalChunks: finalChunks.length,
      strategy: strategy,
      stats: stats
    };
    
    console.log(`✅ LangChain text chunking completed:`, stats);
    return result;
    
  } catch (error) {
    console.error(`❌ LangChain text chunking failed:`, error);
    throw createServiceError(`Text chunking failed: ${error.message}`, 'LANGCHAIN_CHUNKING');
  }
};

/**
 * Get optimal chunking strategy for a file type
 */
const getOptimalStrategy = (mimeType, textLength) => {
  // Start with file type strategy
  let strategy = FILE_TYPE_STRATEGIES[mimeType] || LANGCHAIN_STRATEGIES.RECURSIVE;
  
  // Adjust based on text length
  if (textLength < 2000) {
    // Small texts - use simpler strategy
    strategy = LANGCHAIN_STRATEGIES.FIXED;
  } else if (textLength > 50000) {
    // Large texts - use token-based for better control
    strategy = LANGCHAIN_STRATEGIES.TOKEN;
  }
  
  return strategy;
};

/**
 * Get available LangChain strategies
 */
const getAvailableStrategies = () => {
  return {
    strategies: LANGCHAIN_STRATEGIES,
    fileTypeMapping: FILE_TYPE_STRATEGIES,
    defaults: CHUNKING_DEFAULTS
  };
};

module.exports = {
  chunkText,
  getOptimalStrategy,
  getAvailableStrategies,
  generateChunkHash,
  createTextSplitter,
  LANGCHAIN_STRATEGIES,
  CHUNKING_DEFAULTS
};