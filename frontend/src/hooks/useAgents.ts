/**
 * Agent API Hooks
 * Custom hooks for agent-related API operations
 */

import { useState, useEffect, useCallback } from 'react'
import { httpGet, httpPost, httpPut, httpDelete } from '@/services/axios'
import { API_ENDPOINTS } from '@/utils/constants'
import type { Agent, CreateAgentPayload, UpdateAgentPayload } from '@/types/agent'
import toast from 'react-hot-toast'

// ==================== GET ALL AGENTS ====================

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await httpGet<Agent[]>(API_ENDPOINTS.AGENTS.BASE)
      setAgents(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch agents'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const refetch = useCallback(() => {
    fetchAgents()
  }, [fetchAgents])

  return {
    agents,
    isLoading,
    error,
    refetch,
  }
}

// ==================== GET SINGLE AGENT ====================

export const useAgent = (agentId: string) => {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgent = useCallback(async () => {
    if (!agentId) return

    try {
      setIsLoading(true)
      setError(null)
      const data = await httpGet<Agent>(API_ENDPOINTS.AGENTS.BY_ID(agentId))
      setAgent(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch agent'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    fetchAgent()
  }, [fetchAgent])

  const refetch = useCallback(() => {
    fetchAgent()
  }, [fetchAgent])

  return {
    agent,
    isLoading,
    error,
    refetch,
  }
}

// ==================== CREATE AGENT ====================

export const useCreateAgent = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createAgent = useCallback(async (agentData: CreateAgentPayload): Promise<Agent | null> => {
    try {
      console.log('🚀 Starting agent creation process...')
      console.log('📝 Input agent data:', agentData)
      
      setIsLoading(true)
      setError(null)
      
      // Generate a random ID for the agent
      const agentId = Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
      
      // Add the generated ID to the agent data
      const agentDataWithId = {
        ...agentData,
        _id: agentId
      }
      
      console.log('🆔 Generated agent ID:', agentId)
      console.log('📤 Final agent data to send:', agentDataWithId)
      console.log('🌐 API endpoint:', API_ENDPOINTS.AGENTS.BASE)
      
      const newAgent = await httpPost<Agent>(API_ENDPOINTS.AGENTS.BASE, agentDataWithId)
      
      console.log('✅ Agent creation successful!')
      console.log('📊 Created agent response:', newAgent)
      console.log('🆔 Agent ID in response:', newAgent?._id)
      console.log('📝 Agent name:', newAgent?.name)
      
      toast.success(`Agent "${newAgent.name}" created successfully!`)
      return newAgent
    } catch (err) {
      console.error('❌ Agent creation failed!')
      console.error('🔍 Error details:', err)
      console.error('📊 Error type:', typeof err)
      console.error('📝 Error message:', err instanceof Error ? err.message : 'Unknown error')
      
      const message = err instanceof Error ? err.message : 'Failed to create agent'
      setError(message)
      toast.error(message)
      return null
    } finally {
      console.log('🏁 Agent creation process finished')
      setIsLoading(false)
    }
  }, [])

  return {
    createAgent,
    isLoading,
    error,
  }
}

// ==================== UPDATE AGENT ====================

export const useUpdateAgent = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateAgent = useCallback(async (
    agentId: string, 
    updates: UpdateAgentPayload
  ): Promise<Agent | null> => {
    try {
      setIsLoading(true)
      setError(null)
      
      const updatedAgent = await httpPut<Agent>(
        API_ENDPOINTS.AGENTS.BY_ID(agentId), 
        updates
      )
      
      toast.success(`Agent "${updatedAgent.name}" updated successfully!`)
      return updatedAgent
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update agent'
      setError(message)
      toast.error(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    updateAgent,
    isLoading,
    error,
  }
}

// ==================== DELETE AGENT ====================

export const useDeleteAgent = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteAgent = useCallback(async (agentId: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      
      await httpDelete(API_ENDPOINTS.AGENTS.BY_ID(agentId))
      
      toast.success('Agent deleted successfully!')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete agent'
      setError(message)
      toast.error(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    deleteAgent,
    isLoading,
    error,
  }
}

// ==================== COMBINED AGENT OPERATIONS ====================

export const useAgentOperations = () => {
  const { agents, isLoading: isLoadingAgents, error: agentsError, refetch } = useAgents()
  const { createAgent, isLoading: isCreating, error: createError } = useCreateAgent()
  const { updateAgent, isLoading: isUpdating, error: updateError } = useUpdateAgent()
  const { deleteAgent, isLoading: isDeleting, error: deleteError } = useDeleteAgent()

  const handleCreateAgent = useCallback(async (agentData: CreateAgentPayload): Promise<Agent | null> => {
    const newAgent = await createAgent(agentData)
    if (newAgent) {
      refetch() // Refresh the agents list
    }
    return newAgent
  }, [createAgent, refetch])

  const handleUpdateAgent = useCallback(async (
    agentId: string, 
    updates: UpdateAgentPayload
  ): Promise<Agent | null> => {
    const updatedAgent = await updateAgent(agentId, updates)
    if (updatedAgent) {
      refetch() // Refresh the agents list
    }
    return updatedAgent
  }, [updateAgent, refetch])

  const handleDeleteAgent = useCallback(async (agentId: string): Promise<boolean> => {
    const success = await deleteAgent(agentId)
    if (success) {
      refetch() // Refresh the agents list
    }
    return success
  }, [deleteAgent, refetch])

  return {
    // Data
    agents,
    
    // Loading states
    isLoadingAgents,
    isCreating,
    isUpdating,
    isDeleting,
    
    // Errors
    agentsError,
    createError,
    updateError,
    deleteError,
    
    // Operations
    createAgent: handleCreateAgent,
    updateAgent: handleUpdateAgent,
    deleteAgent: handleDeleteAgent,
    refetch,
  }
}
