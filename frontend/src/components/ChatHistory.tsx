'use client';

import React, { useState, useEffect } from 'react';
import { httpGet } from '../services/axios';
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
  XCircle
} from 'lucide-react';

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
    deploymentId: string;
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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
      }>(`/api/chat-history/agent/${agentId}?${params}`);

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
      setLoadingMessages(true);
      const response = await httpGet<{
        session: ChatSession;
        messages: ChatMessage[];
      }>(`/api/chat-history/session/${sessionId}`);

      setSessionMessages(response.messages);
    } catch (err) {
      console.error('Error fetching session messages:', err);
    } finally {
      setLoadingMessages(false);
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

      const response = await fetch(`/api/chat-history/agent/${agentId}/export?${params}`);
      
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
        setSessionMessages([]);
      }
    } else {
      newExpanded.add(sessionId);
      setSelectedSession(sessionId);
      fetchSessionMessages(sessionId);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chat History</h2>
          <p className="text-gray-600">View and manage chat conversations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by visitor name, email, or agent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="ended">Ended</option>
          <option value="paused">Paused</option>
        </select>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No chat sessions found</h3>
            <p className="text-gray-600">No conversations match your current filters.</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session._id} className="bg-white border border-gray-200 rounded-lg">
              {/* Session Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSession(session._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedSessions.has(session._id) ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                    <div className="flex items-center gap-2">
                      {getStatusIcon(session.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {session.visitor ? `${session.visitor.name} (${session.visitor.email})` : 'Anonymous User'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {session.agent.name} • {session.messageCount} messages
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {formatDate(session.startedAt)}
                    </p>
                    {session.endedAt && (
                      <p className="text-xs text-gray-500">
                        Ended: {formatDate(session.endedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Session Messages */}
              {expandedSessions.has(session._id) && (
                <div className="border-t border-gray-200 p-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {sessionMessages.map((message, index) => {
    console.log("🚀 ~ message:", message)
    return (<div key={index} className={`flex gap-3 ${message.messageType === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {message.messageType === 'assistant' && (<div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="h-4 w-4 text-blue-600"/>
                            </div>)}
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.messageType === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'}`}>
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${message.messageType === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                              {formatDate(message.createdAt)}
                            </p>
                          </div>
                          {message.messageType === 'user' && (<div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-green-600"/>
                            </div>)}
                        </div>);
})}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchSessions(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => fetchSessions(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;
