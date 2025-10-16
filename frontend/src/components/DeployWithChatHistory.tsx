'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { httpGet } from '../services/axios';
import AgentDeploy from './AgentDeploy';
import { 
  MessageSquare, 
  User, 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  Eye,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Settings,
  Code,
  Globe,
  BarChart3
} from 'lucide-react';
import AgentHeader from './AgentHeader';
import { NEXT_PUBLIC_API_PREFIX } from '@/config/env';

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

interface DeployWithChatHistoryProps {
  agentId: string;
}

const DeployWithChatHistory: React.FC<DeployWithChatHistoryProps> = ({ agentId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get active tab from URL, default to 'deploy'
  const activeTab = (searchParams.get('tab') as 'deploy' | 'chat-history') || 'deploy';
  
  // Agent Data State
  const [agentData, setAgentData] = useState<{ name: string } | null>(null);
  
  // Chat History State
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
  
  // Get current step from query string
  const currentStep = parseInt(searchParams.get('step') || '4');

  // Navigation step definitions with query strings
  const navigationSteps = {
    1: `/${agentId}?step=1`, // Main agent page
    2: `/${agentId}?step=2`, // Agent detail page
    3: `/${agentId}/playground?step=3`, // Playground page
    4: `/${agentId}/deploy?step=4&tab=deploy`, // Deploy page with chat history
  };

  // Handle back navigation
  const handleBackNavigation = () => {
    if (currentStep > 1) {
      const previousStep = currentStep - 1;
      const previousPath = navigationSteps[previousStep as keyof typeof navigationSteps];
      router.push(previousPath);
    } else {
      router.push(`${NEXT_PUBLIC_API_PREFIX}?step=1`);
    }
  };

  // Get current step description
  const getCurrentStepDescription = () => {
    switch (currentStep) {
      case 1: return 'Main Agent Page';
      case 2: return 'Agent Detail Page';
      case 3: return 'Playground Page';
      case 4: return 'Deploy Page with Chat History';
      default: return 'Unknown Step';
    }
  };

  // Fetch agent data
  const fetchAgentData = async () => {
    try {
      const response = await httpGet<{ name: string }>(`/agents/${agentId}`);
      setAgentData(response);
    } catch (err) {
      console.error('Error fetching agent data:', err);
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
        return <Clock className="h-4 w-4 text-gray-500" />;
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
        return 'bg-gray-100 text-gray-800';
      case 'ended':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    fetchAgentData();
  }, [agentId]);

  useEffect(() => {
    if (activeTab === 'chat-history') {
      fetchSessions();
    }
  }, [agentId, searchTerm, statusFilter, activeTab]);

  // Function to handle tab changes and update URL
  const handleTabChange = (tab: 'deploy' | 'chat-history') => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', tab);
    router.push(`?${newSearchParams.toString()}`, { scroll: false });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <AgentHeader
        title="Deploy Agent"
        subtitle="Step 4 of 4"
        currentStep={4}
        totalSteps={4}
        stepName="Deploy"
        onBack={handleBackNavigation}
        agentName={agentData?.name || 'Loading...'}
      />

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 px-6 flex justify-around">
        <div className="flex space-around space-x-8">
          <button
            onClick={() => handleTabChange('deploy')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'deploy'
                ? 'border-gray-500 text-gray-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Deploy Agent
            </div>
          </button>
          <button
            onClick={() => handleTabChange('chat-history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'chat-history'
                ? 'border-gray-500 text-gray-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat History
            </div>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex md:overflow-hidden">
        {activeTab === 'deploy' ? (
          /* Deploy Tab Content - Use AgentDeploy Component */
          <div className="flex-1">
            <AgentDeploy 
              agentId={agentId}
              agentName={agentData?.name || 'Loading...'}
              onBack={handleBackNavigation}
              onViewHistory={() => handleTabChange('chat-history')}
            />
          </div>
        ) : (
          /* Chat History Tab Content */
          <div className="flex-1 flex md:overflow-hidden flex-col md:flex-row">
            {/* Left Sidebar - Sessions List */}
            <div className="md:w-1/3 bg-white border-r border-gray-200 flex flex-col">
              {/* Filters */}
              <div className="p-4 border-b border-gray-200 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                {/* <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="ended">Ended</option>
                  <option value="paused">Paused</option>
                </select> */}
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : sessions.length === 0 ? (
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
                          selectedSession === session._id ? 'bg-gray-50 border-r-2 border-gray-500' : ''
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
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
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <MessageSquare className="h-4 w-4 text-gray-600"/>
                                </div>
                              )}
                              <div className={`max-w-md px-4 py-3 rounded-lg ${
                                message.messageType === 'user'
                                  ? 'bg-gray-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                <p className={`text-xs mt-2 ${
                                  message.messageType === 'user' ? 'text-gray-100' : 'text-gray-500'
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
        )}
      </div>
    </div>
  );
};

export default DeployWithChatHistory;
