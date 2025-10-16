# Smart Bots

Create and deploy intelligent AI chatbots from your documents using RAG (Retrieval Augmented Generation) technology.

## Features

- 📄 **Document Upload**: Support for PDF, DOCX, and TXT files
- 🤖 **AI Training**: Automatic document processing and vectorization
- 💬 **Smart Chat**: Intelligent responses based on your content
- 🌐 **Easy Embed**: One-line script to embed on any website
- 📊 **Analytics**: Track usage and performance
- 🔒 **Secure**: User isolation and data privacy

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB (user data), PineCone (vector database)
- **Queue**: Redis + BullMQ
- **AI**: OpenAI API (GPT models + embeddings)
- **Deployment**: Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenAI API key
- Node.js 18+ (for development)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd AI-chatbot-generator
```

### 2. Environment Configuration

```bash
cp env.example .env
```

Edit `.env` and add your OpenAI API key:
```env
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_jwt_secret_here
```

### 3. Start the Application

```bash
docker compose up --build
```

This will start:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- MongoDB: localhost:27017
- Redis: localhost:6379

### 4. Access the Application

Open http://localhost:3000 in your browser to start creating AI agents!

## Usage Guide

### Creating an AI Agent

1. **Create Agent**: Click "Create New AI Agent" and configure:
   - Agent name and personality
   - AI model (GPT-3.5, GPT-4, etc.)
   - Temperature (creativity level)
   - System prompt

2. **Upload Documents**: 
   - Drag & drop PDF, DOCX, or TXT files
   - Maximum 10 files, 5MB each, 50MB total
   - Automatic validation and progress tracking

3. **Training**: 
   - Documents are automatically processed
   - Text is chunked and vectorized
   - Stored in Pinecone for fast retrieval

4. **Test in Playground**:
   - Chat with your AI agent
   - Test responses based on uploaded documents
   - Adjust settings in real-time

5. **Deploy**:
   - Generate embed code
   - Add to any website with one line
   - Track usage and conversations

### Embedding on Websites

1. Copy the generated script tag:
```html
<script src="http://localhost:8000/embed/agent_id.js"></script>
```

2. Add to your website's HTML

3. The chatbot will appear as a floating widget

## Development

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Backend Development

```bash
cd backend
npm install
npm run dev
```

### Database Access

- **MongoDB**: Use MongoDB Compass or mongo shell
- **Redis**: Use redis-cli or RedisInsight

## API Endpoints

### Agents
- `POST /api/agents` - Create agent
- `GET /api/agents` - List agents
- `GET /api/agents/:id` - Get agent details
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

### Files
- `POST /api/agents/:id/files` - Upload files
- `GET /api/agents/:id/files` - List files
- `DELETE /api/agents/:id/files/:fileId` - Delete file

### Training
- `POST /api/agents/:id/train` - Start training
- `GET /api/agents/:id/training-status` - Get training status

### Chat
- `POST /api/chat/:agentId` - Send message
- `GET /api/chat/:agentId/history` - Get chat history

### Embed
- `GET /api/embed/:agentId.js` - Get embed script
- `POST /api/embed/session` - Create embed session

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Databases     │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│                 │
│                 │    │                 │    │ ┌─────────────┐ │
│ - Agent Mgmt    │    │ - API Routes    │    │ │  MongoDB    │ │
│ - File Upload   │    │ - File Process  │    │ │  (Users,    │ │
│ - Chat UI       │    │ - AI Training   │    │ │  Agents,    │ │
│ - Embed Widget  │    │ - RAG Pipeline  │    │ │  Sessions)  │ │
└─────────────────┘    └─────────────────┘    │ └─────────────┘ │
                                              │ ┌─────────────┐ │
                                              │ │  Pinecone   │ │
                                              │ │ (Vectors)   │ │
                                              │ └─────────────┘ │
                                              │ ┌─────────────┐ │
                                              │ │    Redis    │ │
                                              │ │ (Job Queue) │ │
                                              │ └─────────────┘ │
                                              └─────────────────┘
```

## Data Flow

1. **Document Upload**: Files → Backend → MongoDB (metadata) + Disk (content)
2. **Training**: Parse → Chunk → Embed → Pinecone (vectors)
3. **Chat**: Query → PineCone Search → Context → LLM → Response
4. **Embed**: Script → iframe → Backend API → Chat Interface

## Security Features

- JWT authentication for API access
- User data isolation
- File type and size validation
- Rate limiting on API endpoints
- CORS configuration for embed widgets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API reference

Built with ❤️ using WEAM

