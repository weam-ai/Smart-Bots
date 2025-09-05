const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
// const compression = require('compression'); // Temporarily disabled
const connectDB = require('./config/database');
const { seedDatabase } = require('./models/seed-data');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
// app.use(compression()); // Temporarily disabled
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all localhost ports in development
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost:') || 
          origin.startsWith('http://127.0.0.1:') ||
          origin.startsWith('http://frontend:')) {
        return callback(null, true);
      }
    }
    
    // Production origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://frontend:3000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
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
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400 // 24 hours
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/agents', require('./routes/agents'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/search', require('./routes/search'));
// app.use('/api/files', require('./routes/files')); // TODO: Create files route
app.use('/api/upload', require('./routes/upload'));
app.use('/api/deployments', require('./routes/deployment'));
app.use('/api/visitors', require('./routes/visitor'));
app.use('/api/chat-history', require('./routes/chatHistory'));

// Add error handling middleware imports
const { 
  globalErrorHandler, 
  notFoundHandler, 
  requestLogger,
  responseTimeLogger,
  initializeProcessHandlers,
  setupGracefulShutdown,
  developmentErrorLogger
} = require('./middleware/errorHandler');

// Add request logging and timing
app.use(requestLogger);
app.use(responseTimeLogger);
app.use(developmentErrorLogger);

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  
  // Allow all localhost and frontend container origins in development
  if (process.env.NODE_ENV !== 'production') {
    if (!origin || 
        origin.startsWith('http://localhost:') || 
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://frontend:')) {
      res.header('Access-Control-Allow-Origin', origin || '*');
    }
  } else {
    // Production - be more strict
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://frontend:3000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
    }
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'AI Chatbot Generator API',
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// API Health check
app.get('/api/health', (req, res) => {
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
    
    // Seed database with demo data
    // await seedDatabase();
    console.log('✅ Database seeded with demo data');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
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
    
    const documentWorker = startDocumentWorker();
    const embeddingWorker = startEmbeddingWorker();
    
    console.log('✅ Queue system and workers initialized');
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🔄 Shutting down workers...');
      await documentWorker.close();
      await embeddingWorker.close();
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
