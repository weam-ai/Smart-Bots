/**
 * Visitor Controller
 * Handles visitor identity capture and management
 */

const { Visitor, ScriptTag } = require('../models');
const { asyncHandler, createServiceError } = require('../utils/errorHelpers');

// ==================== CREATE/UPDATE VISITOR ====================

const createOrUpdateVisitor = asyncHandler(async (req, res) => {
  const { deploymentId, name, email, websiteUrl } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  console.log('👤 Creating/updating visitor:', { deploymentId, name, email, websiteUrl });

  // Validate required fields
  if (!deploymentId || !name || !email || !websiteUrl) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Missing required fields: deploymentId, name, email, websiteUrl',
        code: 'MISSING_FIELDS'
      }
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid email format',
        code: 'INVALID_EMAIL'
      }
    });
  }

  try {
    // Get deployment info to get agentId
    const deployment = await ScriptTag.findOne({ deploymentId });
    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Deployment not found',
          code: 'DEPLOYMENT_NOT_FOUND'
        }
      });
    }

    // Check if visitor already exists
    let visitor = await Visitor.findOne({ 
      email: email.toLowerCase(), 
      deploymentId 
    });

    if (visitor) {
      // Update existing visitor
      visitor.name = name;
      visitor.lastVisit = new Date();
      visitor.totalSessions += 1;
      visitor.ipAddress = ipAddress;
      visitor.userAgent = userAgent;
      await visitor.save();

      console.log('✅ Updated existing visitor:', visitor._id);
    } else {
      // Create new visitor
      visitor = new Visitor({
        email: email.toLowerCase(),
        name,
        deploymentId,
        agentId: deployment.agent,
        websiteUrl,
        ipAddress,
        userAgent,
        firstVisit: new Date(),
        lastVisit: new Date(),
        totalSessions: 1
      });

      await visitor.save();
      console.log('✅ Created new visitor:', visitor._id);
    }

    res.json({
      success: true,
      data: {
        visitorId: visitor._id,
        name: visitor.name,
        email: visitor.email,
        isNewVisitor: !visitor.totalSessions || visitor.totalSessions === 1
      }
    });

  } catch (error) {
    console.error('❌ Failed to create/update visitor:', error);
    throw createServiceError(`Failed to create/update visitor: ${error.message}`, 'VISITOR_CREATE_FAILED');
  }
});

// ==================== GET VISITORS BY DEPLOYMENT ====================

const getVisitorsByDeployment = asyncHandler(async (req, res) => {
  const { deploymentId } = req.params;
  const { page = 1, limit = 20, search } = req.query;

  console.log('📋 Fetching visitors for deployment:', deploymentId);

  try {
    const query = { deploymentId };
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const visitors = await Visitor.find(query)
      .sort({ lastVisit: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-ipAddress -userAgent'); // Exclude sensitive data

    const total = await Visitor.countDocuments(query);

    console.log(`✅ Found ${visitors.length} visitors`);

    res.json({
      success: true,
      data: {
        visitors,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch visitors:', error);
    throw createServiceError(`Failed to fetch visitors: ${error.message}`, 'VISITOR_FETCH_FAILED');
  }
});

// ==================== GET VISITOR DETAILS ====================

const getVisitorDetails = asyncHandler(async (req, res) => {
  const { visitorId } = req.params;

  console.log('👤 Fetching visitor details:', visitorId);

  try {
    const visitor = await Visitor.findById(visitorId)
      .populate('agentId', 'name description')
      .select('-ipAddress -userAgent'); // Exclude sensitive data

    if (!visitor) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Visitor not found',
          code: 'VISITOR_NOT_FOUND'
        }
      });
    }

    console.log('✅ Visitor details retrieved');

    res.json({
      success: true,
      data: visitor
    });

  } catch (error) {
    console.error('❌ Failed to fetch visitor details:', error);
    throw createServiceError(`Failed to fetch visitor details: ${error.message}`, 'VISITOR_DETAILS_FAILED');
  }
});

// ==================== GET VISITOR STATS ====================

const getVisitorStats = asyncHandler(async (req, res) => {
  const { deploymentId } = req.params;
  const { days = 30 } = req.query;

  console.log('📊 Fetching visitor stats for deployment:', deploymentId, 'days:', days);

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await Visitor.aggregate([
      { $match: { deploymentId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalVisitors: { $sum: 1 },
          newVisitors: { $sum: { $cond: [{ $eq: ['$totalSessions', 1] }, 1, 0] } },
          returningVisitors: { $sum: { $cond: [{ $gt: ['$totalSessions', 1] }, 1, 0] } },
          totalSessions: { $sum: '$totalSessions' }
        }
      }
    ]);

    const result = stats[0] || {
      totalVisitors: 0,
      newVisitors: 0,
      returningVisitors: 0,
      totalSessions: 0
    };

    console.log('✅ Visitor stats retrieved:', result);

    res.json({
      success: true,
      data: {
        ...result,
        period: `${days} days`
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch visitor stats:', error);
    throw createServiceError(`Failed to fetch visitor stats: ${error.message}`, 'VISITOR_STATS_FAILED');
  }
});

module.exports = {
  createOrUpdateVisitor,
  getVisitorsByDeployment,
  getVisitorDetails,
  getVisitorStats
};
