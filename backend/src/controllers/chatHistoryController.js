/**
 * Chat History Controller
 * Handles chat history management and retrieval
 */

const { ChatSession, ChatMessage, Visitor, Agent } = require('../models');
const { asyncHandler, createServiceError } = require('../utils/errorHelpers');

// ==================== GET CHAT HISTORIES BY AGENT ====================

const getChatHistoriesByAgent = asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  const { page = 1, limit = 20, search, visitorId, status, startDate, endDate } = req.query;

  console.log('📋 Fetching chat histories for agent:', agentId);

  try {
    // Build query
    const query = { agent: agentId };
    
    // Add filters
    if (visitorId) {
      query.visitor = visitorId;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) query.startedAt.$gte = new Date(startDate);
      if (endDate) query.startedAt.$lte = new Date(endDate);
    }

    // Get chat sessions with visitor data
    const sessions = await ChatSession.find(query)
      .populate('visitor', 'name email deploymentId')
      .populate('agent', 'name description')
      .sort({ startedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count
    const total = await ChatSession.countDocuments(query);

    // Get message counts for each session
    const sessionIds = sessions.map(session => session._id);
    const messageCounts = await ChatMessage.aggregate([
      { $match: { session: { $in: sessionIds } } },
      { $group: { _id: '$session', count: { $sum: 1 } } }
    ]);

    // Create message count map
    const messageCountMap = {};
    messageCounts.forEach(item => {
      messageCountMap[item._id.toString()] = item.count;
    });

    // Add message counts to sessions
    const sessionsWithCounts = sessions.map(session => ({
      ...session,
      messageCount: messageCountMap[session._id.toString()] || 0
    }));

    // Apply search filter if provided
    let filteredSessions = sessionsWithCounts;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSessions = sessionsWithCounts.filter(session => 
        session.visitor?.name?.toLowerCase().includes(searchLower) ||
        session.visitor?.email?.toLowerCase().includes(searchLower) ||
        session.agent?.name?.toLowerCase().includes(searchLower)
      );
    }

    console.log(`✅ Found ${filteredSessions.length} chat sessions`);

    res.json({
      success: true,
      data: {
        sessions: filteredSessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredSessions.length,
          pages: Math.ceil(filteredSessions.length / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch chat histories:', error);
    throw createServiceError(`Failed to fetch chat histories: ${error.message}`, 'CHAT_HISTORY_FETCH_FAILED');
  }
});

// ==================== GET CHAT HISTORIES BY VISITOR ====================

const getChatHistoriesByVisitor = asyncHandler(async (req, res) => {
  const { visitorId } = req.params;
  const { page = 1, limit = 20, agentId } = req.query;

  console.log('👤 Fetching chat histories for visitor:', visitorId);

  try {
    // Build query
    const query = { visitor: visitorId };
    if (agentId) {
      query.agent = agentId;
    }

    // Get chat sessions
    const sessions = await ChatSession.find(query)
      .populate('agent', 'name description')
      .sort({ startedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await ChatSession.countDocuments(query);

    // Get message counts
    const sessionIds = sessions.map(session => session._id);
    const messageCounts = await ChatMessage.aggregate([
      { $match: { session: { $in: sessionIds } } },
      { $group: { _id: '$session', count: { $sum: 1 } } }
    ]);

    const messageCountMap = {};
    messageCounts.forEach(item => {
      messageCountMap[item._id.toString()] = item.count;
    });

    const sessionsWithCounts = sessions.map(session => ({
      ...session,
      messageCount: messageCountMap[session._id.toString()] || 0
    }));

    console.log(`✅ Found ${sessionsWithCounts.length} chat sessions for visitor`);

    res.json({
      success: true,
      data: {
        sessions: sessionsWithCounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch visitor chat histories:', error);
    throw createServiceError(`Failed to fetch visitor chat histories: ${error.message}`, 'VISITOR_CHAT_HISTORY_FAILED');
  }
});

// ==================== GET CHAT SESSION DETAILS ====================

const getChatSessionDetails = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  console.log('💬 Fetching chat session details:', sessionId);

  try {
    // Get session with visitor and agent data
    const session = await ChatSession.findById(sessionId)
      .populate('visitor', 'name email deploymentId websiteUrl')
      .populate('agent', 'name description')
      .lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Chat session not found',
          code: 'SESSION_NOT_FOUND'
        }
      });
    }

    // Get all messages for this session
    const messages = await ChatMessage.find({ session: sessionId })
      .sort({ createdAt: 1 })
      .lean();

    console.log(`✅ Found ${messages.length} messages for session`);

    res.json({
      success: true,
      data: {
        session,
        messages
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch session details:', error);
    throw createServiceError(`Failed to fetch session details: ${error.message}`, 'SESSION_DETAILS_FAILED');
  }
});

// ==================== GET CHAT STATISTICS ====================

const getChatStatistics = asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  const { days = 30 } = req.query;

  console.log('📊 Fetching chat statistics for agent:', agentId, 'days:', days);

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get basic statistics
    const stats = await ChatSession.aggregate([
      { $match: { agent: agentId, startedAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          activeSessions: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          endedSessions: { $sum: { $cond: [{ $eq: ['$status', 'ended'] }, 1, 0] } },
          totalMessages: { $sum: '$totalMessages' },
          uniqueVisitors: { $addToSet: '$visitor' }
        }
      }
    ]);

    // Get message statistics
    const messageStats = await ChatMessage.aggregate([
      { $match: { agent: agentId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get daily session counts
    const dailyStats = await ChatSession.aggregate([
      { $match: { agent: agentId, startedAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$startedAt' },
            month: { $month: '$startedAt' },
            day: { $dayOfMonth: '$startedAt' }
          },
          sessions: { $sum: 1 },
          messages: { $sum: '$totalMessages' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const result = stats[0] || {
      totalSessions: 0,
      activeSessions: 0,
      endedSessions: 0,
      totalMessages: 0,
      uniqueVisitors: []
    };

    const messageBreakdown = {};
    messageStats.forEach(stat => {
      messageBreakdown[stat._id] = stat.count;
    });

    console.log('✅ Chat statistics retrieved');

    res.json({
      success: true,
      data: {
        ...result,
        uniqueVisitors: result.uniqueVisitors.length,
        messageBreakdown,
        dailyStats,
        period: `${days} days`
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch chat statistics:', error);
    throw createServiceError(`Failed to fetch chat statistics: ${error.message}`, 'CHAT_STATS_FAILED');
  }
});

// ==================== EXPORT CHAT DATA ====================

const exportChatData = asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  const { format = 'json', startDate, endDate, visitorId } = req.query;

  console.log('📤 Exporting chat data for agent:', agentId, 'format:', format);

  try {
    // Build query
    const query = { agent: agentId };
    
    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) query.startedAt.$gte = new Date(startDate);
      if (endDate) query.startedAt.$lte = new Date(endDate);
    }
    
    if (visitorId) {
      query.visitor = visitorId;
    }

    // Get sessions with visitor and agent data
    const sessions = await ChatSession.find(query)
      .populate('visitor', 'name email deploymentId websiteUrl')
      .populate('agent', 'name description')
      .sort({ startedAt: -1 })
      .lean();

    // Get all messages for these sessions
    const sessionIds = sessions.map(session => session._id);
    const messages = await ChatMessage.find({ session: { $in: sessionIds } })
      .sort({ createdAt: 1 })
      .lean();

    // Group messages by session
    const messagesBySession = {};
    messages.forEach(message => {
      const sessionId = message.session.toString();
      if (!messagesBySession[sessionId]) {
        messagesBySession[sessionId] = [];
      }
      messagesBySession[sessionId].push(message);
    });

    // Combine sessions with their messages
    const exportData = sessions.map(session => ({
      session: {
        _id: session._id,
        sessionId: session.sessionId,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        totalMessages: session.totalMessages,
        visitor: session.visitor,
        agent: session.agent
      },
      messages: messagesBySession[session._id.toString()] || []
    }));

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="chat-data-${agentId}-${Date.now()}.csv"`);
      return res.send(csvData);
    } else {
      // Return JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="chat-data-${agentId}-${Date.now()}.json"`);
      return res.json({
        success: true,
        data: exportData,
        exportedAt: new Date().toISOString(),
        totalSessions: exportData.length,
        totalMessages: messages.length
      });
    }

  } catch (error) {
    console.error('❌ Failed to export chat data:', error);
    throw createServiceError(`Failed to export chat data: ${error.message}`, 'CHAT_EXPORT_FAILED');
  }
});

// ==================== HELPER FUNCTIONS ====================

function convertToCSV(data) {
  const headers = [
    'Session ID',
    'Visitor Name',
    'Visitor Email',
    'Agent Name',
    'Status',
    'Started At',
    'Ended At',
    'Total Messages',
    'Message Role',
    'Message Content',
    'Message Timestamp'
  ];

  const rows = [headers.join(',')];

  data.forEach(sessionData => {
    const { session, messages } = sessionData;
    
    if (messages.length === 0) {
      // Session with no messages
      rows.push([
        session.sessionId || '',
        session.visitor?.name || '',
        session.visitor?.email || '',
        session.agent?.name || '',
        session.status || '',
        session.startedAt || '',
        session.endedAt || '',
        session.totalMessages || 0,
        '',
        '',
        ''
      ].map(field => `"${field}"`).join(','));
    } else {
      // Session with messages
      messages.forEach(message => {
        rows.push([
          session.sessionId || '',
          session.visitor?.name || '',
          session.visitor?.email || '',
          session.agent?.name || '',
          session.status || '',
          session.startedAt || '',
          session.endedAt || '',
          session.totalMessages || 0,
          message.role || '',
          (message.content || '').replace(/"/g, '""'), // Escape quotes
          message.createdAt || ''
        ].map(field => `"${field}"`).join(','));
      });
    }
  });

  return rows.join('\n');
}

module.exports = {
  getChatHistoriesByAgent,
  getChatHistoriesByVisitor,
  getChatSessionDetails,
  getChatStatistics,
  exportChatData
};
