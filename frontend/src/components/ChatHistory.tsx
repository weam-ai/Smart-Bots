'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { httpGet } from '../services/axios';
import { 
  MessageSquare, 
  User, 
  Search,  
  Download, 
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft
} from 'lucide-react';
import { PageLoader } from '@/components/ui/Loader';

interface ChatSession {
  _id: string;
  sessionId: string;
  status: 'active' | 'paused' | 'ended';
  startedAt: string;
  endedAt?: string;
  totalMessages: number;
  messageCount: number;
  visitor?: {
    _id: string;
    name: string;
    email: string;
  };
  agent: {
    _id: string;
    name: string;
    description: string;
  };
}

interface ChatMessage {
  _id: string;
  messageType: 'user' | 'assistant';
  content: string;
  createdAt: string;
  referencedChunks?: any[];
  ragMetadata?: any;
}

interface ChatHistoryProps {
  agentId: string;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ agentId }) => {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Record<string, ChatMessage[]>>({});
  const [loadingMessages, setLoadingMessages] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Navigation step management
  const [currentStep, setCurrentStep] = useState(1);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

  // Navigation step definitions
  const navigationSteps = {
    1: '/ai-chatbot', // Main agent page
    2: `/ai-chatbot/${agentId}`, // Agent detail page
    3: `/ai-chatbot/${agentId}/playground`, // Playground page
    4: `/ai-chatbot/${agentId}/deploy`, // Deploy page
    5: `/ai-chatbot/${agentId}/chat-history` // Chat history page (current)
  };

  // Initialize navigation history on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(`navHistory_${agentId}`);
    if (savedHistory) {
      const history = JSON.parse(savedHistory);
      setNavigationHistory(history);
      setCurrentStep(history.length);
    } else {
      // Initialize with current page
      const initialHistory = [navigationSteps[5]];
      setNavigationHistory(initialHistory);
      setCurrentStep(5);
      localStorage.setItem(`navHistory_${agentId}`, JSON.stringify(initialHistory));
    }
  }, [agentId]);

  // Handle back navigation
  const handleBackNavigation = () => {
    if (currentStep > 1) {
      const previousStep = currentStep - 1;
      const previousPath = navigationSteps[previousStep as keyof typeof navigationSteps];
      
      // Update navigation history
      const newHistory = navigationHistory.slice(0, -1);
      setNavigationHistory(newHistory);
      setCurrentStep(previousStep);
      
      // Save to localStorage
      localStorage.setItem(`navHistory_${agentId}`, JSON.stringify(newHistory));
      
      // Navigate to previous step
      router.push(previousPath);
    } else {
      // If at step 1, go to main page
      router.push('/ai-chatbot');
    }
  };

  // Get current step description
  const getCurrentStepDescription = () => {
    switch (currentStep) {
      case 1: return 'Main Agent Page';
      case 2: return 'Agent Detail Page';
      case 3: return 'Deploy Page';
      case 4: return 'Playground Page';
      case 5: return 'Chat History Page';
      default: return 'Unknown Step';
    }
  };

  // Fetch chat sessions
  const fetchSessions = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await httpGet<{
        sessions: ChatSession[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>(`/chat-history/agent/${agentId}?${params}`);

      setSessions(response.sessions);
      setTotalPages(response.pagination.pages);
      setCurrentPage(response.pagination.page);
    } catch (err) {
      setError('Failed to fetch chat sessions');
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch session messages
  const fetchSessionMessages = async (sessionId: string) => {
    try {
      setLoadingMessages(prev => ({ ...prev, [sessionId]: true }));
      const response = await httpGet<{
        session: ChatSession;
        messages: ChatMessage[];
      }>(`/chat-history/session/${sessionId}`);

      setSessionMessages(prev => ({ ...prev, [sessionId]: response.messages }));
    } catch (err) {
      console.error('Error fetching session messages:', err);
    } finally {
      setLoadingMessages(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  // Export chat data
  const handleExport = async (format: 'json' | 'csv' = 'json') => {
    try {
      const params = new URLSearchParams({
        format,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`/chat-history/agent/${agentId}/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-data-${agentId}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Toggle session expansion
  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
      if (selectedSession === sessionId) {
        setSelectedSession(null);
      }
    } else {
      newExpanded.add(sessionId);
      setSelectedSession(sessionId);
      // Only fetch messages if we don't already have them
      if (!sessionMessages[sessionId]) {
        fetchSessionMessages(sessionId);
      }
    }
    setExpandedSessions(newExpanded);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'ended':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'paused':
        return <XCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'ended':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [agentId, searchTerm, statusFilter]);

  if (loading) {
    return (
      <PageLoader text="Loading chat history..." />
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={() => fetchSessions()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackNavigation}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Step {currentStep > 1 ? currentStep - 1 : 1}
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Chat History</h2>
              <p className="text-gray-600">
                View and manage chat conversations • Step {currentStep}: {getCurrentStepDescription()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('json')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Navigation Flow:</span>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === currentStep 
                      ? 'bg-blue-600 text-white' 
                      : step < currentStep 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  <span className={`ml-2 text-xs ${
                    step === currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'
                  }`}>
                    {step === 1 ? 'Main' : step === 2 ? 'Detail' : step === 3 ? 'Playground' : step === 4 ? 'Deploy' : 'History'}
                  </span>
                  {step < 5 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Current: Step {currentStep} of 5
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Sessions List */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
                <p className="text-gray-600 text-sm">No conversations match your current filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {sessions.map((session) => (
                  <div
                    key={session._id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedSession === session._id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                    onClick={() => toggleSession(session._id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {getStatusIcon(session.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">
                            {session.visitor ? session.visitor.name : 'Local Testing'}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                            {session.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {session.visitor?.email || 'No email provided'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {session.agent.name} • {session.messageCount} messages
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(session.startedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => fetchSessions(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => fetchSessions(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Chat Messages */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedSession ? (
            <>
              {/* Selected Session Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                {(() => {
                  const session = sessions.find(s => s._id === selectedSession);
                  return session ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {getStatusIcon(session.status)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {session.visitor ? session.visitor.name : 'Local Testing'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {session.visitor?.email || 'No email provided'} • {session.messageCount} messages
                        </p>
                        <p className="text-xs text-gray-500">
                          Started: {formatDate(session.startedAt)}
                          {session.endedAt && ` • Ended: ${formatDate(session.endedAt)}`}
                        </p>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingMessages[selectedSession] ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(sessionMessages[selectedSession] || []).length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                        <p className="text-gray-600">This conversation doesn't have any messages.</p>
                      </div>
                    ) : (
                      (sessionMessages[selectedSession] || []).map((message, index) => (
                        <div key={index} className={`flex gap-3 ${message.messageType === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {message.messageType === 'assistant' && (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="h-4 w-4 text-blue-600"/>
                            </div>
                          )}
                          <div className={`max-w-md px-4 py-3 rounded-lg ${
                            message.messageType === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p className={`text-xs mt-2 ${
                              message.messageType === 'user' ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {formatDate(message.createdAt)}
                            </p>
                          </div>
                          {message.messageType === 'user' && (
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-green-600"/>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-600">Choose a conversation from the left to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHistory;
