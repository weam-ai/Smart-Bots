# AI Chatbot Backend API

Express.js backend for the AI Chatbot Generator application.

## Features

- **Agent Management**: CRUD operations for AI agents
- **File Upload**: Document upload and processing for agent training
- **Chat Interface**: AI conversation handling with intelligent responses
- **Real-time Training**: Simulated training process with status updates

## API Endpoints

### Agents

- `GET /api/agents` - Get all agents
- `GET /api/agents/:id` - Get specific agent
- `POST /api/agents` - Create new agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

### Chat

- `POST /api/chat/:agentId` - Send message to agent

### File Upload

- `POST /api/upload/:agentId` - Upload files for agent training
- `GET /api/upload/:agentId/status` - Get training status

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create environment file:
```bash
cp env.example .env
```

3. Start development server:
```bash
pnpm dev
```

## Docker

Build and run with Docker:
```bash
docker build -t ai-chatbot-backend .
docker run -p 5000:5000 ai-chatbot-backend
```

## Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - Allowed CORS origin

## File Upload

Supported file types:
- PDF (.pdf)
- Text (.txt)
- Word documents (.doc, .docx)
- Markdown (.md)
- JSON (.json)
- CSV (.csv)

Maximum file size: 10MB
Maximum files per upload: 10

## Demo Agents

The API includes 3 pre-configured demo agents:
- Customer Support Bot
- Documentation Assistant
- Sales Assistant

Each agent has intelligent response generation based on their specialization.
