/**
 * Post Controller
 * ─────────────────────────────────────────────────────────────────
 * Handles all post-related API endpoints:
 *  GET /api/posts/top
 *  GET /api/posts/reels
 *  GET /api/posts/carousels
 *  GET /api/posts/export
 */

const FilteredPost = require('../models/FilteredPost');
const { exportTopPostsToCSV } = require('../services/exportService');
const logger = require('../utils/logger');

/**
 * Build common pagination params from query string.
 * @param {Object} query
 */
const getPagination = (query) => {
  const limit = Math.min(parseInt(query.limit || '20', 10), 100);
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
};

/**
 * GET /api/posts/top
 * Returns top-ranked filtered posts sorted by contentScore.
 *
 * Query params:
 *  limit (default 20, max 100)
 *  page (default 1)
 *  reviewStatus (optional filter)
 */
const getTopPosts = async (req, res) => {
  try {
    const { limit, page, skip } = getPagination(req.query);
    const query = {};

    if (req.query.reviewStatus) {
      query.reviewStatus = req.query.reviewStatus;
    }

    const [posts, total] = await Promise.all([
      FilteredPost.find(query)
        .sort({ contentScore: -1 })
        .skip(skip)
        .limit(limit)
        .select('-rawData -__v')
        .lean(),
      FilteredPost.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: posts,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error(`getTopPosts error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/posts/reels
 * Returns only reel posts sorted by contentScore.
 */
const getReels = async (req, res) => {
  try {
    const { limit, page, skip } = getPagination(req.query);

    const [posts, total] = await Promise.all([
      FilteredPost.find({ isReel: true })
        .sort({ contentScore: -1 })
        .skip(skip)
        .limit(limit)
        .select('-rawData -__v')
        .lean(),
      FilteredPost.countDocuments({ isReel: true }),
    ]);

    return res.json({
      success: true,
      data: posts,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error(`getReels error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/posts/carousels
 * Returns only carousel posts sorted by contentScore.
 */
const getCarousels = async (req, res) => {
  try {
    const { limit, page, skip } = getPagination(req.query);

    const [posts, total] = await Promise.all([
      FilteredPost.find({ isCarousel: true })
        .sort({ contentScore: -1 })
        .skip(skip)
        .limit(limit)
        .select('-rawData -__v')
        .lean(),
      FilteredPost.countDocuments({ isCarousel: true }),
    ]);

    return res.json({
      success: true,
      data: posts,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error(`getCarousels error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/posts/trending-reels
 * Returns trending reels — sorted by contentScore, preferring:
 *  - Reel format
 *  - Recent posts (fresh / very_fresh)
 *  - Cross-hashtag viral posts
 *
 * Query params:
 *  limit         (default 20, max 100)
 *  page          (default 1)
 *  recency       (optional: 'very_fresh' | 'fresh' | 'recent') — filter by recencyLabel
 *  minCrossHashtag (optional: number) — only include posts appearing in ≥N productivity hashtags
 *  creatorType   (optional: 'student' | 'productivity_creator' | 'educational')
 */
const getTrendingReels = async (req, res) => {
  try {
    const { limit, page, skip } = getPagination(req.query);
    const query = { isReel: true };

    // Optional: filter by recency label
    if (req.query.recency) {
      const validRecency = ['very_fresh', 'fresh', 'recent', 'older'];
      if (validRecency.includes(req.query.recency)) {
        query.recencyLabel = req.query.recency;
      }
    }

    // Optional: filter by cross-hashtag count
    const minCrossHashtag = parseInt(req.query.minCrossHashtag || '0', 10);
    if (minCrossHashtag > 0) {
      query.crossHashtagCount = { $gte: minCrossHashtag };
    }

    // Optional: filter by creator type
    if (req.query.creatorType) {
      const validTypes = ['student', 'productivity_creator', 'educational', 'general'];
      if (validTypes.includes(req.query.creatorType)) {
        query.creatorType = req.query.creatorType;
      }
    }

    const [posts, total] = await Promise.all([
      FilteredPost.find(query)
        .sort({ contentScore: -1 })
        .skip(skip)
        .limit(limit)
        .select('-rawData -__v')
        .lean(),
      FilteredPost.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: posts,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      meta: {
        filters: { recency: req.query.recency, minCrossHashtag, creatorType: req.query.creatorType },
        description: 'Trending reels ranked by contentScore (includes recency + cross-hashtag bonuses)',
      },
    });
  } catch (err) {
    logger.error(`getTrendingReels error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/posts/export
 * Export top posts as CSV file download.
 *
 * Query params:
 *  limit (default 100)
 *  isReel (optional: true/false)
 *  isCarousel (optional: true/false)
 */
const exportPosts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const filters = {};

    if (req.query.isReel === 'true') filters.isReel = true;
    if (req.query.isCarousel === 'true') filters.isCarousel = true;

    const csv = await exportTopPostsToCSV(limit, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="studybo_top_posts_${Date.now()}.csv"`);
    return res.send(csv);
  } catch (err) {
    logger.error(`exportPosts error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getTopPosts, getReels, getCarousels, exportPosts, getTrendingReels };
