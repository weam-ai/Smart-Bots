/**
 * Chat Types
 * All types related to chat functionality
 */

// Message Role
export type MessageRole = 'user' | 'assistant'

// Chat Message
export type ChatMessage = {
  _id: string
  sessionId: string
  agentId: string
  role: MessageRole
  content: string
  referencedChunks?: ReferencedChunk[]
  ragMetadata?: RagMetadata
  createdAt: string
  isTyping?: boolean
}

// Referenced Chunk (from RAG)
export type ReferencedChunk = {
  chunkId: string
  fileId: string
  chunkIndex: number
  score: number
  content: string
  filename?: string
}

// RAG Metadata
export type RagMetadata = {
  searchPerformed: boolean
  chunksFound: number
  searchScore?: number
  fallbackUsed: boolean
  processingTime?: number
}

// Chat Session
export type ChatSession = {
  _id: string
  agentId: string
  name?: string
  messageCount: number
  createdAt: string
  updatedAt: string
  lastMessageAt?: string
}

// Send Message Payload
export type SendMessagePayload = {
  message: string
  sessionId?: string
  model?: string
  temperature?: number
  instructions?: string
}

// Chat Statistics
export type ChatStats = {
  totalSessions: number
  totalMessages: number
  averageSessionLength: number
  popularQueries: string[]
  responseTime: {
    average: number
    median: number
  }
}

// Typing Indicator
export type TypingIndicator = {
  isTyping: boolean
  userId?: string
  timestamp: number
}
