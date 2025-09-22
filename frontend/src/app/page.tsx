'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Bot, FileText, Users, Calendar, Play, Loader2, ArrowLeft, Trash2, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAgentOperations, useDeleteAgent } from '@/hooks/useAgents'
import CreateAgentModal from '@/components/CreateAgentModal'
import type { Agent, CreateAgentPayload } from '@/types/agent'

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null)
  
  // Use real API hooks
  const {
    agents,
    isLoadingAgents,
    agentsError,
    createAgent,
    isCreating,
    refetch,
  } = useAgentOperations()

  // Delete agent hook
  const { deleteAgent, isLoading: isDeleting } = useDeleteAgent()

  // Ensure URL shows step=1 for main page
  useEffect(() => {
    const currentStep = searchParams.get('step')
    // if (!currentStep || currentStep !== '1') {
    //   // Replace current URL with step=1 parameter
    //   const newUrl = new URL(window.location.href)
    //   newUrl.searchParams.set('step', '1')
    //   window.history.replaceState({}, '', newUrl.toString())
    // }
  }, [searchParams])

  const handleCreateNewAgent = () => {
    setShowCreateModal(true)
  }

  const handleCreateSubmit = async (agentData: CreateAgentPayload) => {
    const newAgent = await createAgent(agentData)
    
    if (newAgent && newAgent._id) {
      setShowCreateModal(false)
      router.push(`/${newAgent._id}?step=1`)
    } else {
      console.error('❌ No agent ID available for navigation')
    }
  }

  const handleOpenAgent = (agentId: string) => {
    router.push(`/${agentId}?step=1`)
  }

  const handleDeleteClick = (e: React.MouseEvent, agent: Agent) => {
    e.stopPropagation()
    setAgentToDelete(agent)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!agentToDelete) return
    
    const success = await deleteAgent(agentToDelete._id)
    if (success) {
      setShowDeleteConfirm(false)
      setAgentToDelete(null)
      refetch() // Refresh the agents list
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
    setAgentToDelete(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Bot className="h-8 w-8 text-primary-600" />
              <h1 className="ml-2 text-xl font-semibold text-gray-900">Weam AI </h1>
            </div>
            <button
              onClick={() => {window.location.assign('/')}}
              className="btn-primary inline-flex items-center gap-2"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  Back to Weam
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="card text-center"> 
            <div className="text-3xl font-bold text-primary-600 mb-2">
              {isLoadingAgents ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              ) : (
                agents?.length || 0
              )}
            </div>
            <div className="text-sm text-gray-600">Company Agents</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">
              {isLoadingAgents ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              ) : (
                Array.isArray(agents) ? agents.reduce((acc, agent) => acc + (agent.metadata?.totalSessions || 0), 0) : 0
              )}
            </div>
            <div className="text-sm text-gray-600">Total Sessions</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">
              {isLoadingAgents ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              ) : (
                Array.isArray(agents) ? agents.reduce((acc, agent) => acc + (agent.metadata?.totalMessages || 0), 0) : 0
              )}
            </div>
            <div className="text-sm text-gray-600">Total Messages</div>
          </div>
        </div>

        {/* Agents Grid */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Company AI Agents</h2>
          
          {/* Loading State */}
          {isLoadingAgents && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-pulse">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {agentsError && !isLoadingAgents && (
            <div className="card text-center py-8">
              <p className="text-red-600 mb-4">Failed to load agents: {agentsError}</p>
              <button onClick={refetch} className="btn-primary">
                Try Again
              </button>
            </div>
          )}

          {/* Agents List */}
          {!isLoadingAgents && !agentsError && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(agents?.length || 0) === 0 ? (
                <div className="col-span-full card text-center py-8">
                  <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No agents yet</h3>
                  <p className="text-gray-600 mb-4">Create your first AI agent to get started.</p>
                  <button onClick={handleCreateNewAgent} className="btn-primary">
                    Create Your First Agent
                  </button>
                </div>
              ) : (
                <>
                  {/* Create New Agent Card - First in grid */}
                  <div className="card-hover border-2 border-dashed border-gray-300 hover:border-primary-400 transition-colors cursor-pointer">
                    <div 
                      className="flex flex-col items-center justify-center text-center py-8"
                      onClick={handleCreateNewAgent}
                    >
                      <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                        <Plus className="h-6 w-6 text-primary-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Agent</h3>
                      <p className="text-sm text-gray-600">
                        Upload documents and train a new AI chatbot
                      </p>
                      {isCreating ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                      ) : null}
                    </div>
                  </div>

                  {/* Existing Agents */}
                  {agents?.map((agent) => (
                  <div key={agent._id} className="card-hover group cursor-pointer" onClick={() => handleOpenAgent(agent._id)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl">
                          🤖
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {agent.name}
                          </h3>
                          <span className={`status-badge ${
                            agent.status === 'ready' ? 'status-trained' :
                            agent.status === 'completed' ? 'status-trained' :
                            agent.status === 'training' ? 'status-training' :
                            agent.status === 'creating' ? 'status-uploading' :
                            'status-error'
                          }`}>
                            {agent.status === 'ready' ? 'Ready' : 
                             agent.status === 'completed' ? 'Ready' :
                             agent.status === 'training' ? 'Training' :
                             agent.status === 'creating' ? 'Creating' :
                             'Not Ready'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 transition-opacity">
                        <button 
                          className="p-2 text-red-600 transition-colors"
                          onClick={(e) => handleDeleteClick(e, agent)}
                          title="Delete Agent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{agent.description || 'No description provided'}</p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">{agent.metadata?.totalFiles || 0} files</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">{agent.metadata?.totalSessions || 0} sessions</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(agent.createdAt), { addSuffix: true })}</span>
                        </div>
                        <span>{agent.metadata?.totalMessages || 0} messages</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenAgent(agent._id)
                        }}
                        className={`w-full text-sm mt-4 inline-flex items-center justify-center gap-2 ${
                          agent.status === 'ready' || agent.status === 'completed'
                            ? 'btn-primary' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 px-4 py-2 rounded-lg font-medium transition-colors'
                        }`}
                      >
                        <Play className="h-4 w-4" />
                        {agent.status === 'ready' || agent.status === 'completed' ? 'Train the Chatbot' : `Train the Chatbot (${agent.status})`}
                      </button>


                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/${agent._id}/deploy?step=4&tab=chat-history`)
                        }}
                        className="btn-secondary w-full font-medium rounded-lg text-sm"
                      >
                        See Chatbot Chat History
                      </button>
                    </div>
                  </div>
                  ))}
                </>
              )}
            </div>
          )}

        </div>

      </main>

      {/* Create Agent Modal */}
      <CreateAgentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        isLoading={isCreating}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && agentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Agent</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete <strong>"{agentToDelete.name}"</strong>? 
                This will permanently remove the agent and all its associated data.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </div>
                ) : (
                  'Delete Agent'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}