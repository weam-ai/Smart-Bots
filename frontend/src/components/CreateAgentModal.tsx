'use client'

import { useState } from 'react'
import { X, Brain, Zap, Settings } from 'lucide-react'
import type { CreateAgentPayload, AgentModel } from '@/types/agent'

interface CreateAgentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateAgentPayload) => void
  isLoading: boolean
}

export default function CreateAgentModal({ isOpen, onClose, onSubmit, isLoading }: CreateAgentModalProps) {
  const [formData, setFormData] = useState<CreateAgentPayload>({
    name: '',
    systemPrompt: 'You are a helpful AI assistant. Answer questions based on the provided documents.',
    temperature: 0.7,
    model: 'gpt-3.5-turbo' as AgentModel
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const models = [
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' },
    { id: 'gpt-4', name: 'GPT-4', description: 'More capable and accurate' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Latest model with improved performance' }
  ]

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Agent name must be at least 3 characters'
    }

    if (!formData.systemPrompt.trim()) {
      newErrors.systemPrompt = 'System prompt is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      systemPrompt: 'You are a helpful AI assistant. Answer questions based on the provided documents.',
      temperature: 0.7,
      model: 'gpt-3.5-turbo'
    })
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create New AI Agent</h2>
              <p className="text-sm text-gray-500">Configure your chatbot's personality and behavior</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Agent Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Agent Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`input-field ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="e.g., Customer Support Bot, Documentation Assistant"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              AI Model
            </label>
            <div className="grid grid-cols-1 gap-3">
              {models.map((model) => (
                <label
                  key={model.id}
                  className={`relative flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.model === model.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="model"
                    value={model.id}
                    checked={formData.model === model.id}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value as AgentModel })}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full border-2 ${
                      formData.model === model.id
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {formData.model === model.id && (
                        <div className="h-2 w-2 bg-white rounded-full m-0.5" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{model.name}</div>
                      <div className="text-sm text-gray-500">{model.description}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Creativity Level (Temperature)
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Conservative (0.1)</span>
                <span className="font-medium">{formData.temperature}</span>
                <span>Creative (1.0)</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>More focused</span>
                <span>More creative</span>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700 mb-2">
              System Prompt *
            </label>
            <textarea
              id="systemPrompt"
              rows={4}
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              className={`input-field resize-none ${errors.systemPrompt ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Define your AI assistant's personality and behavior..."
            />
            {errors.systemPrompt && (
              <p className="mt-1 text-sm text-red-600">{errors.systemPrompt}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              This prompt defines how your AI assistant will behave and respond to users.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary flex-1"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 inline-flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Create Agent
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
