// MongoDB Schema for AI Chatbot Generator using Mongoose
// This is an alternative to the SQL schema for NoSQL approach

const mongoose = require('mongoose');

// Agent Schema
const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  status: {
    type: String,
    enum: ['draft', 'uploading', 'training', 'trained', 'error', 'archived'],
    default: 'draft'
  },
  avatar: {
    type: String,
    default: '🤖'
  },
  systemPrompt: {
    type: String,
    required: true
  },
  temperature: {
    type: Number,
    default: 0.7,
    min: 0.0,
    max: 2.0
  },
  model: {
    type: String,
    default: 'gpt-3.5-turbo'
  },
  maxTokens: {
    type: Number,
    default: 1000
  },
  topP: {
    type: Number,
    default: 1.0
  },
  frequencyPenalty: {
    type: Number,
    default: 0.0
  },
  presencePenalty: {
    type: Number,
    default: 0.0
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed,
  trainedAt: Date,
  lastUsed: Date
}, {
  timestamps: true
});

// File Schema (updated for S3 + Qdrant architecture)
const fileSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  s3Key: {
    type: String,
    required: true,
    unique: true
  },
  s3Url: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileHash: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['uploading', 'queued', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'uploading'
  },
  
  // Queue-based processing status
  processing: {
    status: {
      type: String,
      enum: ['pending', 'queued', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    queuedAt: Date,
    startedAt: Date,
    completedAt: Date,
    failedAt: Date,
    
    // Individual processing stages
    textExtraction: {
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
      },
      startedAt: Date,
      completedAt: Date,
      failedAt: Date,
      extractedTextLength: Number,
      method: String,
      error: String
    },
    
    chunking: {
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
      },
      startedAt: Date,
      completedAt: Date,
      failedAt: Date,
      totalChunks: Number,
      strategy: String,
      avgChunkSize: Number,
      error: String
    },
    
    embeddings: {
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
      },
      startedAt: Date,
      completedAt: Date,
      failedAt: Date,
      totalEmbeddings: Number,
      model: String,
      totalTokens: Number,
      error: String
    },
    
    qdrant: {
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
      },
      startedAt: Date,
      completedAt: Date,
      failedAt: Date,
      collectionName: String,
      pointsStored: Number,
      error: String
    }
  },
  
  metadata: {
    uploadedAt: Date,
    processing: {
      stage: String, // uploading, text_extraction, chunking, embedding, completed
      progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      startedAt: Date,
      completedAt: Date
    },
    s3: {
      etag: String,
      uploadedAt: Date
    },
    extraction: {
      textLength: Number,
      extractedAt: Date
    },
    qdrant: {
      pointsCount: Number,
      indexedAt: Date,
      collectionName: String
    },
    chunking: {
      totalChunks: { type: Number, default: 0 },
      chunkingStrategy: { type: String, enum: ['recursive', 'markdown', 'token', 'fixed'], default: 'recursive' },
      chunkSize: { type: Number, default: 1000 },
      chunkOverlap: { type: Number, default: 200 },
      qdrantPoints: { type: Number, default: 0 }, // Number of points stored in Qdrant
      chunkingMethod: { type: String, default: 'langchain' },
      chunkingCompletedAt: Date
    }
  },
  processedAt: Date,
  errorMessage: String
}, {
  timestamps: true
});

// Note: File chunks are stored in Qdrant, not MongoDB
// Only metadata tracking is stored in the file document

// Chat Session Schema
const chatSessionSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  sessionName: String,
  status: {
    type: String,
    enum: ['active', 'paused', 'ended'],
    default: 'active'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date,
  totalMessages: {
    type: Number,
    default: 0
  },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatSession',
    required: true
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  messageType: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    default: 'user'
  },
  content: {
    type: String,
    required: true
  },
  contentHash: {
    type: String,
    required: true
  },
  tokensUsed: Number,
  modelUsed: String,
  responseTimeMs: Number,
  referencedChunks: [{
    chunkId: String,      // Qdrant point ID
    fileId: String,       // MongoDB file ID
    chunkIndex: Number,   // Chunk position in file
    score: Number,        // Similarity score
    content: String       // Chunk content preview
  }],
  ragMetadata: {
    searchPerformed: { type: Boolean, default: false },
    chunksFound: { type: Number, default: 0 },
    searchScore: Number,  // Highest similarity score
    fallbackUsed: { type: Boolean, default: false }
  },
  feedback: {
    type: String,
    enum: ['helpful', 'not_helpful', 'neutral'],
    default: 'neutral'
  }
}, {
  timestamps: true
});

// API Usage Schema
const apiUsageSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  },
  endpoint: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true
  },
  tokensUsed: {
    type: Number,
    default: 0
  },
  costUsd: {
    type: Number,
    default: 0.0
  },
  responseTimeMs: Number,
  statusCode: Number,
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Script Tag Deployment Schema
const scriptTagSchema = new mongoose.Schema({
  deploymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  scriptCode: {
    type: String,
    required: true
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deploymentUrl: String, // URL where the script is deployed
  embedCode: String, // HTML embed code for users
  settings: {
    theme: {
      type: String,
      default: 'light'
    },
    position: {
      type: String,
      enum: ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'],
      default: 'bottom-right'
    },
    size: {
      width: {
        type: String,
        default: '400px'
      },
      height: {
        type: String,
        default: '600px'
      }
    },
    customCSS: String,
    customJS: String
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    interactions: {
      type: Number,
      default: 0
    },
    lastViewed: Date
  },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});


// Create indexes for performance
agentSchema.index({ status: 1 });
agentSchema.index({ tags: 1 });
agentSchema.index({ isPublic: 1 });

fileSchema.index({ agent: 1 });
fileSchema.index({ status: 1 });
fileSchema.index({ fileHash: 1 });

// File chunk indexes removed - chunks now stored in Qdrant

chatSessionSchema.index({ agent: 1 });
chatSessionSchema.index({ status: 1 });

chatMessageSchema.index({ session: 1 });
chatMessageSchema.index({ agent: 1 });
chatMessageSchema.index({ createdAt: 1 });

apiUsageSchema.index({ agent: 1 });
apiUsageSchema.index({ createdAt: 1 });

scriptTagSchema.index({ agent: 1 });
scriptTagSchema.index({ isActive: 1 });
scriptTagSchema.index({ version: 1 });

// Create models
const Agent = mongoose.model('Agent', agentSchema);
const File = mongoose.model('File', fileSchema);
const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
const ApiUsage = mongoose.model('ApiUsage', apiUsageSchema);
const ScriptTag = mongoose.model('ScriptTag', scriptTagSchema);

module.exports = {
  Agent,
  File,
  ChatSession,
  ChatMessage,
  ApiUsage,
  ScriptTag
};
