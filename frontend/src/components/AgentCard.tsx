'use client'

import { useState } from 'react'
import { 
  MessageSquare, 
  Settings, 
  Trash2, 
  FileText, 
  Users, 
  Calendar,
  Play,
  Code
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Agent {
  id: string
  name: string
  status: 'uploading' | 'training' | 'trained' | 'error'
  files: File[]
  systemPrompt: string
  temperature: number
  model: string
  createdAt: string
  totalSessions?: number
  totalMessages?: number
}

interface AgentCardProps {
  agent: Agent
  onDelete: () => void
}

export default function AgentCard({ agent, onDelete }: AgentCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const getStatusIcon = () => {
    switch (agent.status) {
      case 'uploading':
        return <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      case 'training':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
      case 'trained':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />
    }
  }

  const getStatusText = () => {
    switch (agent.status) {
      case 'uploading':
        return 'Uploading'
      case 'training':
        return 'Training'
      case 'trained':
        return 'Ready'
      case 'error':
        return 'Error'
      default:
        return 'Unknown'
    }
  }

  const getStatusClass = () => {
    switch (agent.status) {
      case 'uploading':
        return 'status-uploading'
      case 'training':
        return 'status-training'
      case 'trained':
        return 'status-trained'
      case 'error':
        return 'status-error'
      default:
        return 'status-badge bg-gray-100 text-gray-800'
    }
  }

  const handleDelete = () => {
    setShowDeleteConfirm(false)
    onDelete()
  }

  return (
    <div className="card-hover group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
            {agent.name}
          </h3>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <Settings className="h-4 w-4" />
          </button>
          <button 
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`${getStatusClass()}`}>
            {getStatusText()}
          </span>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(agent.createdAt), { addSuffix: true })}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{agent.files.length} files</span>
          </div>
          {agent.totalSessions !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{agent.totalSessions} sessions</span>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          <div>Model: {agent.model}</div>
          <div>Temperature: {agent.temperature}</div>
        </div>

        <div className="flex gap-2 pt-2">
          <button 
            className="btn-primary flex-1 text-sm"
            disabled={agent.status !== 'trained'}
          >
            <Play className="h-4 w-4 mr-1" />
            Playground
          </button>
          <button 
            className="btn-secondary text-sm"
            disabled={agent.status !== 'trained'}
          >
            <Code className="h-4 w-4 mr-1" />
            Embed
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Agent</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{agent.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
