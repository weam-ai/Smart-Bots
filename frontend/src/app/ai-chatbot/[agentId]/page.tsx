'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { httpGet } from '@/services/axios'
import { Agent } from '@/types/agent'
import AgentUpload from '@/components/AgentUpload'
import AgentTraining from '@/components/AgentTraining'
import AgentPlayground from '@/components/AgentPlayground'
import AgentDeploy from '@/components/AgentDeploy'

export type AgentStep = 'upload' | 'training' | 'playground' | 'deploy'

export interface AgentFile {
  _id: string
  originalFilename: string
  fileSize: number
  mimeType: string
  status: string
  processing: {
    status: string
    completedAt?: string
  }
  createdAt: string
}

export interface AgentData {
  id: string
  name: string
  systemPrompt: string
  temperature: number
  model: string
  files: AgentFile[]
  status: 'uploading' | 'training' | 'trained' | 'error'
  trainingProgress: number
}

export default function AgentPage() {
  const router = useRouter()
  const params = useParams()
  const agentId = params.agentId as string
  
  console.log('🔍 Agent page params:', params)
  console.log('🆔 Agent ID from params:', agentId)

  const [currentStep, setCurrentStep] = useState<AgentStep>('upload')
  
  // Debug step changes
  useEffect(() => {
    console.log('🎯 Current step changed to:', currentStep)
  }, [currentStep])
  const [loading, setLoading] = useState(true)
  const [agentData, setAgentData] = useState<AgentData>({
    id: agentId,
    name: 'Loading...',
    systemPrompt: 'You are a helpful AI assistant. Answer questions based on the provided documents.',
    temperature: 0.7,
    model: 'gpt-3.5-turbo',
    files: [],
    status: 'uploading',
    trainingProgress: 0
  })

  // Fetch real agent data with retry logic
  useEffect(() => {
    const fetchAgentData = async (retryCount = 0) => {
      try {
        setLoading(true)
        
        // Check if agentId is valid
        if (!agentId || agentId === 'undefined') {
          console.error('❌ Invalid agentId:', agentId)
          setLoading(false)
          return
        }
        
        // Check if this is a demo agent first
        const demoAgents = ['demo-agent-1', 'demo-agent-2', 'demo-agent-3']
        if (demoAgents.includes(agentId)) {
          console.log('🎭 Demo agent detected:', agentId)
          setAgentData(prev => ({
            ...prev,
            name: getDemoAgentName(agentId),
            status: 'trained',
            trainingProgress: 100,
            files: getDemoFiles(agentId)
          }))
          console.log('🎭 Demo agent - setting step to playground')
          setCurrentStep('playground')
          setLoading(false)
          return
        }

        // Fetch real agent data
        console.log('🔍 Fetching agent data for ID:', agentId)
        const agentResponse = await httpGet<Agent | {agent: Agent}>(`/api/agents/${agentId}`)
        console.log('📊 Agent response:', agentResponse)
        
        // Handle both direct agent response and wrapped response
        const agent = (agentResponse as any).agent || agentResponse
        console.log('📝 Extracted agent:', agent)
        
        if (!agent) {
          console.error('❌ No agent found in response')
          throw new Error('Agent not found')
        }
        
        if (!agent._id) {
          console.error('❌ Agent missing _id field')
          console.error('📊 Agent object:', agent)
          throw new Error('Agent missing ID field')
        }

        // Fetch agent files with error handling
        let files: AgentFile[] = []
        try {
          console.log('📁 Fetching files for agent:', agentId)
          const filesResponse = await httpGet<{files: AgentFile[], pagination: any}>(`/api/upload/${agentId}/files`)
          console.log('📊 Files response:', filesResponse)
          console.log('📊 Files response.files:', filesResponse.files)
          console.log('📊 Files response.pagination:', filesResponse.pagination)
          
          files = filesResponse.files || []
          console.log('📁 Extracted files:', files)
          console.log('📁 Number of files:', files.length)
        } catch (fileError: any) {
          console.error('❌ Error fetching files:', fileError)
          console.error('❌ File error details:', {
            message: fileError.message,
            status: fileError.status,
            data: fileError.data
          })
          // Don't show error for files, just use empty array
          files = []
        }

        // Update agent data
        console.log('📝 Setting agent data with:', {
          id: agent._id,
          name: agent.name,
          systemPrompt: agent.systemPrompt,
          temperature: agent.temperature,
          model: agent.model,
          files: files
        })
        
        setAgentData({
          id: agent._id,
          name: agent.name,
          systemPrompt: agent.systemPrompt,
          temperature: agent.temperature,
          model: agent.model,
          files: files,
          status: mapAgentStatus(agent.status),
          trainingProgress: calculateTrainingProgress(agent.status, files)
        })

        // Determine the appropriate step based on agent status and files
        const mappedStatus = mapAgentStatus(agent.status)
        console.log('🎯 Determining step - Agent status:', agent.status, 'Mapped status:', mappedStatus, 'Files count:', files.length)
        
        if (files.length === 0) {
          console.log('📁 No files found, showing upload step')
          setCurrentStep('upload')
        } else if (mappedStatus === 'training' || mappedStatus === 'error') {
          console.log('🔄 Agent in training/error state, showing training step')
          setCurrentStep('training')
        } else if (mappedStatus === 'trained') {
          console.log('✅ Agent is trained, showing deploy step')
          setCurrentStep('deploy')
        } else {
          console.log('📤 Agent has files but not trained, showing upload step')
          setCurrentStep('upload')
        }

      } catch (error: any) {
        console.error('Error fetching agent data:', error)
        
        // Handle rate limiting with retry
        if (error?.response?.status === 429 && retryCount < 2) {
          const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff: 1s, 2s, 4s
          console.log(`Rate limited, retrying in ${delay}ms...`)
          setTimeout(() => {
            fetchAgentData(retryCount + 1)
          }, delay)
          return
        }
        
        // Show user-friendly error message
        if (error?.response?.status === 429) {
          toast.error('Too many requests - Please wait a moment and refresh the page')
        } else {
          toast.error('Failed to load agent data')
        }
      } finally {
        setLoading(false)
      }
    }

    // Add a small delay to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      fetchAgentData()
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [agentId])

  // Helper function to map backend status to frontend status
  const mapAgentStatus = (backendStatus: string): 'uploading' | 'training' | 'trained' | 'error' => {
    switch (backendStatus) {
      case 'ready': return 'trained'
      case 'completed': return 'trained'  // Map completed to trained
      case 'creating': return 'training'
      case 'error': return 'error'
      default: return 'uploading'
    }
  }

  // Helper function to calculate training progress
  const calculateTrainingProgress = (status: string, files: AgentFile[]): number => {
    if (status === 'ready' || status === 'completed') return 100
    if (files.length === 0) return 0
    
    const completedFiles = files.filter(f => f.processing.status === 'completed').length
    return Math.round((completedFiles / files.length) * 100)
  }

  const getDemoAgentName = (id: string) => {
    switch (id) {
      case 'demo-agent-1': return 'Customer Support Bot'
      case 'demo-agent-2': return 'Documentation Assistant'
      case 'demo-agent-3': return 'Sales Assistant'
      default: return `Agent ${id.slice(-6)}`
    }
  }

  const getDemoFiles = (id: string): AgentFile[] => {
    // Create mock files for demo agents
    const mockFiles: AgentFile[] = []
    switch (id) {
      case 'demo-agent-1':
        mockFiles.push(
          {
            _id: 'demo-file-1',
            originalFilename: 'support-guidelines.pdf',
            fileSize: 125000,
            mimeType: 'application/pdf',
            status: 'completed',
            processing: { status: 'completed', completedAt: new Date().toISOString() },
            createdAt: new Date().toISOString()
          },
          {
            _id: 'demo-file-2', 
            originalFilename: 'faq.txt',
            fileSize: 45000,
            mimeType: 'text/plain',
            status: 'completed',
            processing: { status: 'completed', completedAt: new Date().toISOString() },
            createdAt: new Date().toISOString()
          }
        )
        break
      case 'demo-agent-2':
        mockFiles.push(
          {
            _id: 'demo-file-3',
            originalFilename: 'api-docs.pdf',
            fileSize: 230000,
            mimeType: 'application/pdf',
            status: 'completed',
            processing: { status: 'completed', completedAt: new Date().toISOString() },
            createdAt: new Date().toISOString()
          }
        )
        break
      case 'demo-agent-3':
        mockFiles.push(
          {
            _id: 'demo-file-4',
            originalFilename: 'products.pdf',
            fileSize: 180000,
            mimeType: 'application/pdf',
            status: 'completed',
            processing: { status: 'completed', completedAt: new Date().toISOString() },
            createdAt: new Date().toISOString()
          }
        )
        break
    }
    return mockFiles
  }

  const handleFilesUploaded = (files: File[]) => {
    // After files are uploaded, refetch the agent data to get the updated files
    setTimeout(() => {
      window.location.reload() // Simple reload to get fresh data
    }, 1000)
    
    setCurrentStep('training')
    toast.success(`${files.length} file${files.length !== 1 ? 's' : ''} uploaded successfully!`)
  }

  const handleTrainingComplete = () => {
    setAgentData(prev => ({
      ...prev,
      status: 'trained',
      trainingProgress: 100
    }))
    setCurrentStep('deploy')
    toast.success('🎉 Training completed! Your agent is ready to deploy.')
  }

  const handleBackToUpload = () => {
    setCurrentStep('upload')
    setAgentData(prev => ({
      ...prev,
      status: 'uploading',
      trainingProgress: 0
    }))
  }

  const handleBackToAgents = () => {
    router.push('/ai-chatbot')
  }

  const handleStartTraining = () => {
    console.log('🚀 Starting training process')
    setCurrentStep('training')
  }

  const handleStartPlayground = () => {
    console.log('🎮 Starting playground')
    setCurrentStep('playground')
  }

  const handleBackToDeploy = () => {
    setCurrentStep('deploy')
  }

  const handleAgentUpdate = (updates: Partial<AgentData>) => {
    setAgentData(prev => ({ ...prev, ...updates }))
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading agent...</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 text-sm text-primary-600 hover:text-primary-700 underline"
          >
            Refresh if stuck
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {currentStep === 'upload' && (
        <AgentUpload
          agentData={agentData}
          onFilesUploaded={handleFilesUploaded}
          onBack={handleBackToAgents}
          onStartTraining={handleStartTraining}
        />
      )}

      {currentStep === 'training' && (
        <AgentTraining
          agentData={agentData}
          onTrainingComplete={handleTrainingComplete}
          onBack={handleBackToUpload}
        />
      )}

      {currentStep === 'deploy' && (
        <AgentDeploy
          agentId={agentId}
          agentName={agentData.name}
          onBack={handleStartPlayground}
        />
      )}

      {currentStep === 'playground' && (
        <AgentPlayground
          agentData={agentData}
          onAgentUpdate={handleAgentUpdate}
          onBack={handleBackToDeploy}
        />
      )}
    </div>
  )
}
