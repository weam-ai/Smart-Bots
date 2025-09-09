'use client'

import { useState, useEffect } from 'react'
import { 
  Brain, 
  ArrowLeft, 
  CheckCircle, 
  Loader2,
  FileText,
  Zap,
  Database,
  MessageSquare,
  ArrowRight
} from 'lucide-react'
import { AgentData } from '@/app/ai-chatbot/[agentId]/page'
import { InlineLoader } from '@/components/ui/Loader'

interface TrainingStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
}

interface AgentTrainingProps {
  agentData: AgentData
  onTrainingComplete: () => void
  onBack: () => void
}

export default function AgentTraining({ agentData, onTrainingComplete, onBack }: AgentTrainingProps) {
  const [trainingSteps, setTrainingSteps] = useState<TrainingStep[]>([
    {
      id: 'parsing',
      name: 'Document Parsing',
      description: 'Extracting text content from uploaded documents',
      status: 'pending',
      progress: 0
    },
    {
      id: 'chunking',
      name: 'Text Chunking',
      description: 'Breaking down content into optimal sized chunks',
      status: 'pending',
      progress: 0
    },
    {
      id: 'embedding',
      name: 'Vector Embedding',
      description: 'Converting text to vector representations using AI',
      status: 'pending',
      progress: 0
    },
    {
      id: 'indexing',
      name: 'Vector Indexing',
      description: 'Storing vectors in Qdrant database for fast retrieval',
      status: 'pending',
      progress: 0
    },
    {
      id: 'validation',
      name: 'Training Validation',
      description: 'Testing the RAG pipeline and quality checks',
      status: 'pending',
      progress: 0
    }
  ])

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [overallProgress, setOverallProgress] = useState(0)
  const [isTraining, setIsTraining] = useState(false)
  const [trainingLogs, setTrainingLogs] = useState<string[]>([])

  useEffect(() => {
    // Start training automatically when component mounts
    startTraining()
  }, [])

  const addLog = (message: string) => {
    setTrainingLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const startTraining = async () => {
    setIsTraining(true)
    addLog('Starting RAG training pipeline...')
    
    for (let i = 0; i < trainingSteps.length; i++) {
      // Update current step to processing
      setCurrentStepIndex(i)
      setTrainingSteps(prev => prev.map((step, index) => {
        if (index === i) {
          return { ...step, status: 'processing', progress: 0 }
        }
        return step
      }))

      addLog(`Starting ${trainingSteps[i].name.toLowerCase()}...`)

      // Simulate step progress
      await simulateStepProgress(i)

      // Mark step as completed
      setTrainingSteps(prev => prev.map((step, index) => {
        if (index === i) {
          return { ...step, status: 'completed', progress: 100 }
        }
        return step
      }))

      addLog(`✓ ${trainingSteps[i].name} completed successfully`)
      
      // Update overall progress
      setOverallProgress(Math.round(((i + 1) / trainingSteps.length) * 100))
    }

    addLog('🎉 RAG training completed! Agent is ready for chat.')
    setIsTraining(false)
  }

  const simulateStepProgress = (stepIndex: number): Promise<void> => {
    return new Promise((resolve) => {
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 15
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
          resolve()
        }
        
        setTrainingSteps(prev => prev.map((step, index) => {
          if (index === stepIndex) {
            return { ...step, progress: Math.round(progress) }
          }
          return step
        }))
      }, 200)
    })
  }

  const getStepIcon = (step: TrainingStep, index: number) => {
    if (step.status === 'completed') {
      return <CheckCircle className="h-6 w-6 text-green-500" />
    } else if (step.status === 'processing') {
      return <InlineLoader variant="spinner" size="md" className="text-primary-600" />
    } else {
      const icons = [FileText, Zap, Brain, Database, MessageSquare]
      const Icon = icons[index] || FileText
      return <Icon className="h-6 w-6 text-gray-400" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const totalSize = agentData.files.reduce((acc, file) => acc + file.fileSize, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isTraining}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Training AI Agent</h1>
                <p className="text-sm text-gray-500">Step 2 of 4 • Agent: {agentData.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-8 h-2 bg-green-500 rounded-full"></div>
                <div className="w-8 h-2 bg-primary-600 rounded-full"></div>
                <div className="w-8 h-2 bg-gray-200 rounded-full"></div>
                <div className="w-8 h-2 bg-gray-200 rounded-full"></div>
              </div>
              <span className="text-sm text-gray-500 ml-2">Training</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Training Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            {/* Progress Card */}
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Training Progress</h2>
                <span className="text-2xl font-bold text-primary-600">{overallProgress}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>

              <p className="text-sm text-gray-600">
                {isTraining ? 'Training your AI agent with RAG technology...' : 'Training completed successfully!'}
              </p>
            </div>

            {/* Training Steps */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Training Pipeline</h3>
              <div className="space-y-4">
                {trainingSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getStepIcon(step, index)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-medium ${
                          step.status === 'completed' ? 'text-green-700' :
                          step.status === 'processing' ? 'text-primary-700' :
                          'text-gray-700'
                        }`}>
                          {step.name}
                        </h4>
                        {step.status === 'processing' && (
                          <span className="text-sm text-gray-500">{step.progress}%</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                      {step.status === 'processing' && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${step.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Documents Info */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Files:</span>
                  <span className="font-medium">{agentData.files.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Size:</span>
                  <span className="font-medium">{formatFileSize(totalSize)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Model:</span>
                  <span className="font-medium">{agentData.model}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Temperature:</span>
                  <span className="font-medium">{agentData.temperature}</span>
                </div>
              </div>
            </div>

            {/* File List */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Files Being Processed</h3>
              <div className="space-y-2">
                {agentData.files.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.originalFilename}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</p>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                ))}
              </div>
            </div>

            {/* Training Info */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">RAG Technology</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Brain className="h-4 w-4 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Vector Embeddings</p>
                    <p className="text-gray-600">Converting text to semantic vectors</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Database className="h-4 w-4 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Qdrant Database</p>
                    <p className="text-gray-600">Fast vector similarity search</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Smart Retrieval</p>
                    <p className="text-gray-600">Context-aware responses</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Training Logs */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Training Logs</h3>
          <div className="bg-gray-900 rounded-lg p-4 h-32 overflow-y-auto">
            <div className="space-y-1 font-mono text-sm">
              {trainingLogs.map((log, index) => (
                <div key={index} className="text-green-400">
                  {log}
                </div>
              ))}
              {isTraining && (
                <div className="text-green-400 animate-pulse">
                  Processing...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={onBack}
            className="btn-secondary inline-flex items-center gap-2"
            disabled={isTraining}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Upload
          </button>
          
          {overallProgress === 100 && (
            <button
              onClick={onTrainingComplete}
              className="btn-primary inline-flex items-center gap-2 text-lg px-4 py-2"
            >
              Test Chatbot
              <ArrowRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
