/**
 * Chat API Hooks
 * Custom hooks for chat operations
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { httpGet, httpPost } from '@/services/axios'
import { API_ENDPOINTS, CHAT } from '@/utils/constants'
import type { ChatMessage, ChatSession, SendMessagePayload } from '@/types/chat'
import toast from 'react-hot-toast'

// ==================== CHAT SESSIONS ====================

export const useChatSessions = (agentId: string) => {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!agentId) return

    try {
      setIsLoading(true)
      setError(null)
      const data = await httpGet<ChatSession[]>(API_ENDPOINTS.CHAT.SESSIONS(agentId))
      setSessions(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch chat sessions'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    fetchSessions()
  }, [agentId]) // Only depend on agentId, not fetchSessions

  const refetch = useCallback(() => {
    fetchSessions()
  }, [fetchSessions])

  return {
    sessions,
    isLoading,
    error,
    refetch,
  }
}

// ==================== CHAT MESSAGES ====================

export const useChatMessages = (agentId: string, sessionId?: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNewSession, setIsNewSession] = useState(false)
  const [isHandlingNewSession, setIsHandlingNewSession] = useState(false)

  const fetchMessages = useCallback(async () => {
    if (!agentId || !sessionId) return

    try {
      setIsLoading(true)
      setError(null)
      const data = await httpGet<ChatMessage[]>(
        API_ENDPOINTS.CHAT.SESSION_MESSAGES(agentId, sessionId)
      )
      setMessages(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch messages'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [agentId, sessionId])

  useEffect(() => {
    if (sessionId && !isHandlingNewSession) {
      // Only fetch messages if we're not handling a new session response
      fetchMessages()
    } else if (isNewSession) {
      // Reset the new session flag after a short delay
      // This prevents immediate fetching after setting session ID
      setTimeout(() => {
        setIsNewSession(false)
      }, 100)
    } else if (!sessionId) {
      setMessages([])
    }
  }, [sessionId, isNewSession, isHandlingNewSession]) // Added isHandlingNewSession to dependencies

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message])
  }, [])

  const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg._id === messageId ? { ...msg, ...updates } : msg
    ))
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const markAsNewSession = useCallback(() => {
    setIsNewSession(true)
  }, [])

  const markAsHandlingNewSession = useCallback(() => {
    setIsHandlingNewSession(true)
  }, [])

  const resetHandlingNewSession = useCallback(() => {
    setIsHandlingNewSession(false)
  }, [])

  return {
    messages,
    isLoading,
    error,
    addMessage,
    updateMessage,
    clearMessages,
    markAsNewSession,
    markAsHandlingNewSession,
    resetHandlingNewSession,
    refetch: fetchMessages,
  }
}

// ==================== SEND MESSAGE ====================

export const useSendMessage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (
    agentId: string,
    messageData: SendMessagePayload
  ): Promise<ChatMessage | null> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await httpPost<ChatMessage>(
        API_ENDPOINTS.CHAT.BY_AGENT(agentId),
        messageData
      )

      return response
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message'
      setError(message)
      toast.error(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    sendMessage,
    isLoading,
    error,
  }
}

// ==================== TYPING INDICATOR ====================

export const useTypingIndicator = () => {
  const [isTyping, setIsTyping] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const startTyping = useCallback(() => {
    setIsTyping(true)
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, CHAT.TYPING_INDICATOR_DELAY)
  }, [])

  const stopTyping = useCallback(() => {
    setIsTyping(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    isTyping,
    startTyping,
    stopTyping,
  }
}

// ==================== AUTO SCROLL ====================

export const useAutoScroll = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    })
  }, [])

  const isNearBottom = useCallback(() => {
    if (!containerRef.current) return true
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const threshold = CHAT.AUTO_SCROLL_THRESHOLD
    
    return scrollHeight - scrollTop - clientHeight < threshold
  }, [])

  const scrollToBottomIfNear = useCallback(() => {
    if (isNearBottom()) {
      scrollToBottom()
    }
  }, [isNearBottom, scrollToBottom])

  return {
    messagesEndRef,
    containerRef,
    scrollToBottom,
    scrollToBottomIfNear,
    isNearBottom,
  }
}

// ==================== MESSAGE INPUT ====================

export const useMessageInput = () => {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const updateMessage = useCallback((value: string) => {
    if (value.length <= CHAT.MAX_MESSAGE_LENGTH) {
      setMessage(value)
      
      // Auto-resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
      }
    }
  }, [])

  const clearMessage = useCallback(() => {
    setMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [])

  const focusInput = useCallback(() => {
    textareaRef.current?.focus()
  }, [])

  const isValid = message.trim().length > 0 && message.length <= CHAT.MAX_MESSAGE_LENGTH

  return {
    message,
    updateMessage,
    clearMessage,
    focusInput,
    textareaRef,
    isValid,
    remainingChars: CHAT.MAX_MESSAGE_LENGTH - message.length,
  }
}

// ==================== COMPLETE CHAT HOOK ====================

export const useChat = (agentId: string, model?: string, temperature?: number, instructions?: string) => {
  const [currentSessionId, setCurrentSessionId] = useState<string>()
  const { sessions, isLoading: isLoadingSessions, refetch: refetchSessions } = useChatSessions(agentId)
  const { 
    messages, 
    isLoading: isLoadingMessages, 
    addMessage, 
    updateMessage, 
    clearMessages,
    markAsNewSession,
    markAsHandlingNewSession,
    resetHandlingNewSession
  } = useChatMessages(agentId, currentSessionId)
  const { sendMessage, isLoading: isSending, error: sendError } = useSendMessage()
  const { isTyping, startTyping, stopTyping } = useTypingIndicator()
  const { messagesEndRef, containerRef, scrollToBottomIfNear } = useAutoScroll()
  const { 
    message, 
    updateMessage: updateInputMessage, 
    clearMessage, 
    textareaRef, 
    isValid: isMessageValid 
  } = useMessageInput()

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottomIfNear()
  }, [messages, scrollToBottomIfNear])

  // Start new session or switch session
  const startNewSession = useCallback(() => {
    setCurrentSessionId(undefined)
    clearMessages()
  }, [clearMessages])

  const switchToSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId)
    // Reset handling flag when switching to a different session
    resetHandlingNewSession()
  }, [resetHandlingNewSession])

  // Send message with typing indicator
  const handleSendMessage = useCallback(async (): Promise<boolean> => {
    if (!isMessageValid || isSending) return false

    const userMessage: ChatMessage = {
      _id: `temp_${Date.now()}`,
      sessionId: currentSessionId || 'new',
      agentId,
      role: 'user',
      content: message.trim(),
      createdAt: new Date().toISOString(),
    }

    // Add user message immediately
    addMessage(userMessage)
    clearMessage()

    // Show AI typing indicator
    startTyping()

    try {
      const response = await sendMessage(agentId, {
        message: userMessage.content,
        sessionId: currentSessionId,
        model,
        temperature,
        instructions
      })

      if (response) {
        // Update session ID if this was a new session
        if (!currentSessionId) {
          // Mark as handling new session to prevent fetching messages
          markAsHandlingNewSession()
          markAsNewSession()
          // Set session ID immediately since we have the response
          setCurrentSessionId(response.sessionId)
          // Don't reset the handling flag automatically
          // It will be reset when switching to a different session
        }

        // Update user message with real ID
        updateMessage(userMessage._id, {
          _id: response._id.replace(response._id.slice(-1), '0'), // Assume user message ID is response ID - 1
          sessionId: response.sessionId,
        })

        // Add AI response
        addMessage(response)
        
        return true
      }
    } catch (err) {
      // Remove user message on error
      updateMessage(userMessage._id, {
        content: userMessage.content + ' (Failed to send)',
      })
    } finally {
      stopTyping()
    }

    return false
  }, [
    isMessageValid,
    isSending,
    currentSessionId,
    agentId,
    message,
    addMessage,
    clearMessage,
    startTyping,
    sendMessage,
    updateMessage,
    stopTyping,
    refetchSessions,
  ])

  // Handle Enter key
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  return {
    // Session management
    sessions,
    currentSessionId,
    startNewSession,
    switchToSession,
    
    // Messages
    messages,
    addMessage,
    clearMessages,
    
    // Message input
    message,
    updateMessage: updateInputMessage,
    clearMessage,
    textareaRef,
    isMessageValid,
    
    // Actions
    sendMessage: handleSendMessage,
    handleKeyPress,
    
    // Status
    isLoadingSessions,
    isLoadingMessages,
    isSending,
    isTyping,
    sendError,
    
    // Refs for scrolling
    messagesEndRef,
    containerRef,
  }
}
