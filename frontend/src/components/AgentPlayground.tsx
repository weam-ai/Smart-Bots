'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Send, 
  FileText,
  Settings,
  Save,
  Bot,
  User,
  RotateCcw,
  Download,
  Globe
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { InlineLoader } from '@/components/ui/Loader'
import { AgentData, AgentFile } from '@/app/[agentId]/page'
import { useChat } from '@/hooks/useChat'
import toast from 'react-hot-toast'
import AgentHeader from './AgentHeader'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isTyping?: boolean
}

interface AgentPlaygroundProps {
  agentData: AgentData
  onAgentUpdate: (updates: Partial<AgentData>) => void
  onBack: () => void
}

const models = [
  { id: 'gpt-5', name: 'GPT-5', description: 'Most advanced model with latest capabilities (fixed temperature)' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Cost-effective GPT-5 model (fixed temperature)' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Compact GPT-5 model (fixed temperature)' },
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Enhanced GPT-4 with improved performance' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Latest GPT-4 model with multimodal capabilities' },
  { id: 'o3', name: 'O3', description: 'OpenAI\'s most advanced reasoning model (fixed temperature)' }
]

export default function AgentPlayground({ agentData, onAgentUpdate, onBack }: AgentPlaygroundProps) {
  const router = useRouter()
  const [localAgentData, setLocalAgentData] = useState(agentData)
  
  // Use real chat hooks
  const {
    messages,
    message,
    updateMessage,
    sendMessage,
    handleKeyPress,
    isSending,
    isTyping,
    messagesEndRef,
    containerRef,
    textareaRef,
    isMessageValid,
    clearMessages,
    startNewSession,
  } = useChat(
    agentData.id,
    localAgentData.model,
    localAgentData.temperature,
    localAgentData.systemPrompt
  )

  const clearChat = () => {
    clearMessages()
    startNewSession()
  }

  const saveAgent = () => {
    onAgentUpdate(localAgentData)
    toast.success('Agent saved successfully!')
  }

  const handleDeploy = () => {
    // Save agent first, then navigate to deploy page
    onAgentUpdate(localAgentData)
    router.push(`/${agentData.id}/deploy?step=4&tab=deploy`)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <AgentHeader
        title="Playground"
        subtitle="Step 3 of 4"
        currentStep={3}
        totalSteps={4}
        stepName="Playground"
        onBack={onBack}
        agentName={localAgentData.name}
        showDeployButton={true}
        onDeploy={handleDeploy}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-64px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Left Panel - Configuration */}
          <div className="space-y-6 overflow-y-auto">
            {/* Agent Configuration */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Configure & test agents</h2>
              </div>

              <div className="space-y-6">
                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Model</label>
                  <select
                    value={localAgentData.model}
                    onChange={(e) => setLocalAgentData({...localAgentData, model: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500 text-sm"
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperature
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Reserved</span>
                      <span className="font-medium">{localAgentData.temperature}</span>
                      <span>Creative</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={localAgentData.temperature}
                      onChange={(e) => setLocalAgentData({...localAgentData, temperature: parseFloat(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider text-sm"
                    />
                  </div>
                </div>

                {/* System Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions
                  </label>
                  <textarea
                    value={localAgentData.systemPrompt}
                    onChange={(e) => setLocalAgentData({...localAgentData, systemPrompt: e.target.value})}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500 text-sm resize-none"
                    placeholder="Define your AI assistant's role and behavior..."
                  />
                </div>


              </div>
            </div>

            {/* Sources */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Sources</h2>
                </div>
                {/* <button className="text-sm text-gray-600 hover:text-gray-700">
                  <RotateCcw className="h-4 w-4" />
                </button> */}
              </div>

              <div className="space-y-3">
                {localAgentData.files.map((file: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{file.originalFilename || 'Unknown file'}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.fileSize || 0)}</p>
                      </div>
                    </div>
                    {/* <button className="text-gray-400 hover:text-gray-600">
                      <Download className="h-4 w-4" />
                    </button> */}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total: {localAgentData.files.length} files</span>
                  <span>{formatFileSize(localAgentData.files.reduce((acc: number, file: AgentFile) => acc + file.fileSize, 0))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Chat Interface */}
          <div className="card flex flex-col h-[calc(100vh-120px)]">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Bot className="h-6 w-6 text-black" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{localAgentData.name}</h3>
                  <p className="text-xs text-gray-500">Powered by Weam AI</p>
                </div>
              </div>
              <button
                onClick={clearChat}
                className="border px-3 py-1 rounded-md text-sm text-gray-500 hover:bg-black hover:text-white"
              >
                Clear
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        className="prose prose-sm max-w-none text-sm"
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
              
              {(isSending || isTyping) && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="bg-gray-100 px-4 py-2 rounded-lg">
                    <InlineLoader 
                      variant="wave" 
                      size="sm" 
                      text="Thinking..." 
                      className="text-gray-600"
                    />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2 items-center">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => updateMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Message..."
                    className="border px-4 py-2 text-sm rounded-md outline-none w-full resize-none"
                    rows={1}
                  />                
                <button
                  onClick={sendMessage}
                  disabled={!isMessageValid || isSending}
                  className="p-2 bg-black text-white rounded-lg hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                🙋‍♀️ Hi! I am Weam AI, ask me anything about Weam!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
