const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
require('dotenv').config();
const { PORT, NODE_ENV, BACKEND_API_PREFIX, CORS_ORIGIN_DEV  } = require('./config/env');
console.log("🚀 ~ CORS_ORIGIN_DEV:", CORS_ORIGIN_DEV)
const app = express();
// Add this to your server.js after line 10
app.set('trust proxy', true);


// Middleware
app.use(helmet());
// app.use(compression()); // Temporarily disabled

const corsOptions = {
  origin: CORS_ORIGIN_DEV ? CORS_ORIGIN_DEV.split(',') : [/weam\.ai$/],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin', 
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization',
    'X-Request-ID'
  ],
  exposedHeaders: ['X-Request-ID']
};

app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use(`${BACKEND_API_PREFIX}/agents`, require('./routes/agents'));
app.use(`${BACKEND_API_PREFIX}/chat`, require('./routes/chat'));
app.use(`${BACKEND_API_PREFIX}/search`, require('./routes/search'));
// app.use('/api/files', require('./routes/files')); // TODO: Create files route
app.use(`${BACKEND_API_PREFIX}/upload`, require('./routes/upload'));
app.use(`${BACKEND_API_PREFIX}/deployments`, require('./routes/deployment'));
app.use(`${BACKEND_API_PREFIX}/visitors`, require('./routes/visitor'));
app.use(`${BACKEND_API_PREFIX}/chat-history`, require('./routes/chatHistory'));

// Add error handling middleware imports
const { 
  globalErrorHandler, 
  notFoundHandler, 
  requestLogger,
  responseTimeLogger,
  initializeProcessHandlers,
  developmentErrorLogger
} = require('./middleware/errorHandler');

// Add request logging and timing
app.use(requestLogger);
app.use(responseTimeLogger);
app.use(developmentErrorLogger);

// Handle preflight requests explicitly (CORS middleware should handle this, but keeping as backup)
app.options('*', (req, res) => {
  res.sendStatus(200);
});

// API Health check
app.get(`${BACKEND_API_PREFIX}/health`, (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'AI Chatbot Generator API',
      version: '1.0.0',
      database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    }
  });
});

// 404 handler for unknown routes
app.use('*', notFoundHandler);

// Global error handling middleware
app.use(globalErrorHandler);

// Connect to database and start server
const startServer = async () => {
  try {
    console.log('🔄 Starting AI Chatbot Generator API...');
    
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Database connected successfully');
    
    // Initialize S3 service
    const s3Service = require('./services/s3Service');
    await s3Service.initializeBucket();
    console.log('✅ S3 service initialized');
    
    // Seed database with demo data
    // await seedDatabase();
    console.log('✅ Database seeded with demo data');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${NODE_ENV || ''}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Initialize workers and queue system
const initializeQueue = async () => {
  try {
    // Test Redis connection
    const { testRedisConnection } = require('./config/queue');
    const redisConnected = await testRedisConnection();
    
    if (!redisConnected) {
      console.log('⚠️  Redis not available - queue features disabled');
      return false;
    }
    
    // Start background workers
    const { startDocumentWorker, startEmbeddingWorker } = require('./workers/documentWorker');
    const { createDeletionWorker } = require('./workers/deletionWorker');
    
    const documentWorker = startDocumentWorker();
    const embeddingWorker = startEmbeddingWorker();
    const deletionWorker = createDeletionWorker();
    
    console.log('✅ Queue system and workers initialized');
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🔄 Shutting down workers...');
      await documentWorker.close();
      await embeddingWorker.close();
      await deletionWorker.close();
      console.log('✅ Workers shut down gracefully');
    });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize queue system:', error);
    return false;
  }
};

// Initialize error handlers, queue system, and start server
initializeProcessHandlers();
initializeQueue().then(() => {
  startServer();
});
