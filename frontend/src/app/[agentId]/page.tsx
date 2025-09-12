'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { httpGet } from '@/services/axios'
import { Agent } from '@/types/agent'
import AgentUpload from '@/components/AgentUpload'
import AgentTraining from '@/components/AgentTraining'
import { PageLoader } from '@/components/ui/Loader'

export type AgentStep = 'upload' | 'training' | 'playground'

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
  const searchParams = useSearchParams()
  const agentId = params.agentId as string
  

  const [currentStep, setCurrentStep] = useState<AgentStep>('upload')
  const [hasNewUploads, setHasNewUploads] = useState(false)
  
  // Handle step parameter from query string - URL-based routing
  useEffect(() => {
    const step = searchParams.get('step')
    if (step) {
      const stepNumber = parseInt(step)
      switch (stepNumber) {
        case 1:
          setCurrentStep('upload') // Upload documents (Step 1)
          break
        case 2:
          setCurrentStep('training') // Train data page (Step 2)
          break
        case 3:
          // Navigate to playground page for step 3
          router.push(`/${agentId}/playground?step=3`)
          break
        case 4:
          // Navigate to deploy page for step 4
          router.push(`/${agentId}/deploy?step=4`)
          break
        default:
          setCurrentStep('upload')
      }
    } else {
      // Default to step 1 if no step parameter
      setCurrentStep('upload')
    }
  }, [searchParams, agentId, router])
  
  // Debug step changes
  useEffect(() => {
    // Step change tracking removed for cleaner code
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
          setAgentData(prev => ({
            ...prev,
            name: getDemoAgentName(agentId),
            status: 'trained',
            trainingProgress: 100,
            files: getDemoFiles(agentId)
          }))
          setCurrentStep('playground')
          setLoading(false)
          return
        }

        // Fetch real agent data
        const agentResponse = await httpGet<Agent | {agent: Agent}>(`/agents/${agentId}`)
        
        // Handle both direct agent response and wrapped response
        const agent = (agentResponse as any).agent || agentResponse
        
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
          const filesResponse = await httpGet<{files: AgentFile[], pagination: any}>(`/upload/${agentId}/files`)
          files = filesResponse.files || []
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

        // Always start at step 1 (upload) when opening an agent
        setCurrentStep('upload')

      } catch (error: any) {
        console.error('Error fetching agent data:', error)
        
        // Handle rate limiting with retry
        if (error?.response?.status === 429 && retryCount < 2) {
          const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff: 1s, 2s, 4s
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
    // Mark that new files were uploaded
    setHasNewUploads(true)
    // After files are uploaded, go to training step
    setCurrentStep('training')
    // Update URL to show step=2
    router.push(`/${agentId}?step=2`)
    toast.success(`${files.length} file${files.length !== 1 ? 's' : ''} uploaded successfully!`)
  }

  const handleTrainingComplete = () => {
    setAgentData(prev => ({
      ...prev,
      status: 'trained',
      trainingProgress: 100
    }))
    toast.success('🎉 Training completed! Your agent is ready to deploy.')
    // Navigate to playground page with step=3
    router.push(`/${agentId}/playground?step=3`)
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
    router.push('/?step=1')
  }

  const handleStartTraining = () => {
    setCurrentStep('training')
    // Update URL to show step=2
    router.push(`/${agentId}?step=2`)
  }

  if (loading) {
    return (
      <PageLoader 
        text="Loading agent details..." 
        showRefresh={true}
        onRefresh={() => window.location.reload()}
      />
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
          hasNewUploads={hasNewUploads}
        />
      )}

      {currentStep === 'training' && (
        <AgentTraining
          agentData={agentData}
          onTrainingComplete={handleTrainingComplete}
          onBack={handleBackToUpload}
        />
      )}

      {/* Step 3 (Playground) and Step 4 (Deploy) are handled by dedicated pages */}
    </div>
  )
}
