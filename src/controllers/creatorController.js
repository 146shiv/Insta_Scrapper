/**
 * Creator Controller
 * ─────────────────────────────────────────────────────────────────
 * Handles all creator-related API endpoints:
 *  GET /api/creators/top
 *  GET /api/creators/micro
 *  GET /api/creators/:username
 */

const Creator = require('../models/Creator');
const FilteredPost = require('../models/FilteredPost');
const { exportTopCreatorsToCSV } = require('../services/exportService');
const logger = require('../utils/logger');

/**
 * GET /api/creators/top
 * Returns top creators sorted by average content score.
 *
 * Query params:
 *  limit (default 20, max 100)
 *  page (default 1)
 *  priority (optional: high | medium | low)
 *  creatorType (optional: student | educational | micro_influencer | general)
 */
const getTopCreators = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.creatorType) query.creatorType = req.query.creatorType;

    const [creators, total] = await Promise.all([
      Creator.find(query)
        .sort({ averageContentScore: -1, totalPostsFound: -1 })
        .skip(skip)
        .limit(limit)
        .select('-hashtagsUsed -__v')
        .lean(),
      Creator.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: creators,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error(`getTopCreators error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/creators/micro
 * Returns micro-creators (1k–100k followers) sorted by score.
 */
const getMicroCreators = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

    const [creators, total] = await Promise.all([
      Creator.find({ isMicroCreator: true })
        .sort({ averageContentScore: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Creator.countDocuments({ isMicroCreator: true }),
    ]);

    return res.json({
      success: true,
      data: creators,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error(`getMicroCreators error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/creators/:username
 * Returns a single creator's profile with their recent posts.
 */
const getCreatorByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const [creator, recentPosts] = await Promise.all([
      Creator.findOne({ ownerUsername: username }).lean(),
      FilteredPost.find({ ownerUsername: username })
        .sort({ contentScore: -1 })
        .limit(10)
        .select('url caption contentScore isReel isCarousel likesCount hashtags postedAt')
        .lean(),
    ]);

    if (!creator) {
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }

    return res.json({
      success: true,
      data: { ...creator, recentPosts },
    });
  } catch (err) {
    logger.error(`getCreatorByUsername error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/creators/export
 * Export top creators as CSV.
 */
const exportCreators = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const csv = await exportTopCreatorsToCSV(limit);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="studybo_creators_${Date.now()}.csv"`);
    return res.send(csv);
  } catch (err) {
    logger.error(`exportCreators error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getTopCreators, getMicroCreators, getCreatorByUsername, exportCreators };
