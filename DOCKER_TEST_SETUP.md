# Docker Test Setup for Pinecone Integration

## Prerequisites

1. **Docker and Docker Compose** installed on your system
2. **Pinecone Account** with API key

## Quick Setup

### 1. Get Your Pinecone API Key

1. Go to [https://app.pinecone.io/](https://app.pinecone.io/)
2. Sign up or log in to your account
3. Create a new project (or use existing)
4. Copy your API key from the dashboard

### 2. Set Up Environment Variables

Create a `.env` file in the project root with the following content:

```bash
# Required for Pinecone
PINECONE_API_KEY=your_actual_pinecone_api_key_here

# Required for JWT authentication
JWT_SECRET=your_jwt_secret_key_here
IRON_SESSION_PASSWORD=your_iron_session_password_here

# Database (will use Docker containers)
DB_CONNECTION=mongodb://admin:password@mongodb:27017/ai-chatbot?authSource=admin
DB_HOST=mongodb
DB_DATABASE=ai-chatbot
DB_PORT=27017
DB_USERNAME=admin
DB_PASSWORD=password

# Redis (will use Docker container)
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# API Configuration
BACKEND_API_PREFIX=/api/v1
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN_DEV=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,http://frontend:3000

# Frontend
FRONTEND_URL=http://localhost:3001
FRONTEND_PORT=3001

# MinIO (S3-compatible storage)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_BUCKET_NAME=ai-chatbot-files
AWS_S3_REGION=us-east-1
USE_MINIO=true
MINIO_ENDPOINT=http://minio:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# Rate Limiting (development settings)
RATE_LIMIT_GENERAL_DEV=1000000000
RATE_LIMIT_UPLOAD_DEV=1000
RATE_LIMIT_CHAT_DEV=1000
RATE_LIMIT_SEARCH_DEV=1000
RATE_LIMIT_DEPLOYMENT_DEV=1000
RATE_LIMIT_API_USAGE_DEV=1000
RATE_LIMIT_VISITOR_DEV=1000

# MongoDB Express
MONGO_EXPRESS_PORT=8081
MONGO_EXPRESS_USERNAME=admin
MONGO_EXPRESS_PASSWORD=admin

# Widget
WIDGET_SCRIPT_URL=http://localhost:3001/widget/chat-widget.js
```

### 3. Run the Test

Execute the test script:

```bash
./test-docker-pinecone.sh
```

This will:
1. ✅ Check your environment configuration
2. 🔨 Build and start all Docker services
3. ⏳ Wait for services to be ready
4. 🔍 Verify backend health
5. 🧪 Run Pinecone integration tests
6. 🎉 Show you the results

## Manual Testing

If you prefer to test manually:

### 1. Start Services
```bash
docker-compose up --build -d
```

### 2. Check Service Status
```bash
docker-compose ps
```

### 3. Run Pinecone Test
```bash
docker-compose exec backend node test-pinecone.js
```

### 4. Check Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 5. Access Services
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5000/api/v1
- **MongoDB Express**: http://localhost:8081
- **MinIO Console**: http://localhost:9001

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Stop existing services
   docker-compose down
   
   # Or change ports in docker-compose.yml
   ```

2. **Pinecone API Key Issues**
   - Verify your API key is correct
   - Check that your Pinecone project is active
   - Ensure you have sufficient quota

3. **Services Not Starting**
   ```bash
   # Check logs
   docker-compose logs backend
   
   # Rebuild containers
   docker-compose up --build --force-recreate
   ```

4. **Database Connection Issues**
   ```bash
   # Check MongoDB logs
   docker-compose logs mongodb
   
   # Restart MongoDB
   docker-compose restart mongodb
   ```

### Clean Up

To stop and remove all containers:

```bash
docker-compose down -v
```

To remove all data volumes (WARNING: This will delete all data):

```bash
docker-compose down -v --remove-orphans
docker system prune -a
```

## Expected Test Results

When the test runs successfully, you should see:

```
🧪 Testing Pinecone integration...

1️⃣ Testing Pinecone client initialization...
✅ Pinecone client initialized successfully

2️⃣ Testing index creation...
✅ Index created/verified: company-test-company-123

3️⃣ Testing embedding storage...
✅ Embeddings stored successfully: { indexName: 'company-test-company-123', vectorsStored: 2 }

4️⃣ Testing search functionality...
✅ Search completed successfully: { resultsFound: 2, query: {...} }

5️⃣ Testing index statistics...
✅ Index stats retrieved: { indexName: 'company-test-company-123', totalVectors: 2 }

6️⃣ Cleaning up test data...
✅ Test data cleaned up successfully

🎉 All Pinecone integration tests passed!
```

## Next Steps

After successful testing:

1. **Create your first agent** through the frontend
2. **Upload documents** to train the agent
3. **Test chat functionality** with your trained agent
4. **Deploy the agent** for production use

The system is now ready for production use with Pinecone as your vector database!
