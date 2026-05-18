/**
 * Hashtag Controller
 * ─────────────────────────────────────────────────────────────────
 * Handles all hashtag-related API endpoints:
 *  GET /api/hashtags/trending
 *  GET /api/hashtags/:hashtag
 *  GET /api/hashtags/:hashtag/analytics
 */

const Hashtag = require('../models/Hashtag');
const logger = require('../utils/logger');

/**
 * GET /api/hashtags/trending
 * Returns hashtags sorted by trend score (most viral first).
 *
 * Query params:
 *  limit (default 10, max 50)
 */
const getTrendingHashtags = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);

    const hashtags = await Hashtag.find({})
      .sort({ trendScore: -1, avgContentScore: -1 })
      .limit(limit)
      .select('hashtag trendScore avgContentScore avgLikesPerPost totalPostsScraped totalReels trendingHooks topCaptionKeywords lastScrapedAt engagementGrowth')
      .lean();

    return res.json({
      success: true,
      data: hashtags,
      total: hashtags.length,
    });
  } catch (err) {
    logger.error(`getTrendingHashtags error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/hashtags/:hashtag
 * Returns detailed stats for a single hashtag.
 */
const getHashtagStats = async (req, res) => {
  try {
    const { hashtag } = req.params;
    const tag = hashtag.toLowerCase().replace(/^#/, '');

    const doc = await Hashtag.findOne({ hashtag: tag }).lean();

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: `Hashtag #${tag} not found. It may not have been scraped yet.`,
      });
    }

    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error(`getHashtagStats error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/hashtags/:hashtag/history
 * Returns the time-series history for a hashtag (for trend charts).
 */
const getHashtagHistory = async (req, res) => {
  try {
    const { hashtag } = req.params;
    const tag = hashtag.toLowerCase().replace(/^#/, '');
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);

    const doc = await Hashtag.findOne({ hashtag: tag })
      .select('hashtag history')
      .lean();

    if (!doc) {
      return res.status(404).json({ success: false, error: `Hashtag #${tag} not found` });
    }

    // Return last N data points
    const history = (doc.history || []).slice(-limit);

    return res.json({ success: true, data: { hashtag: tag, history } });
  } catch (err) {
    logger.error(`getHashtagHistory error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getTrendingHashtags, getHashtagStats, getHashtagHistory };
