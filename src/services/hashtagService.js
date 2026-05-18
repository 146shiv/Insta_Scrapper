/**
 * Hashtag Analytics Service
 * ─────────────────────────────────────────────────────────────────
 * Tracks hashtag performance over time and computes trend scores.
 * Extracts trending hook phrases from captions (bonus feature).
 */

const Hashtag = require('../models/Hashtag');
const logger = require('../utils/logger');

/**
 * Extract the opening hook phrase from a caption (first ~80 chars).
 * @param {string} caption
 * @returns {string|null}
 */
const extractHook = (caption) => {
  if (!caption) return null;
  const firstLine = caption.split('\n')[0].trim();
  return firstLine.length > 5 && firstLine.length <= 120 ? firstLine : null;
};

/**
 * Extract top recurring words from an array of captions.
 * Removes common stop words and short words.
 * @param {string[]} captions
 * @param {number} topN
 * @returns {string[]}
 */
const extractTopKeywords = (captions, topN = 10) => {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'is', 'was', 'are', 'i', 'my', 'me', 'you', 'your',
    'this', 'that', 'it', 'be', 'as', 'if', 'by', 'from', 'so', 'we',
  ]);

  const freq = {};

  for (const caption of captions) {
    if (!caption) continue;
    const words = caption
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    for (const word of words) {
      freq[word] = (freq[word] || 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
};

/**
 * Update hashtag analytics after a scrape run.
 *
 * @param {string} hashtag - The hashtag name (without #)
 * @param {Array<Object>} posts - Filtered posts for this hashtag
 */
const updateHashtagStats = async (hashtag, posts) => {
  try {
    if (!posts || posts.length === 0) return;

    const tag = hashtag.toLowerCase().replace(/^#/, '');

    const avgLikes = posts.reduce((s, p) => s + (p.likesCount || 0), 0) / posts.length;
    const avgComments = posts.reduce((s, p) => s + (p.commentsCount || 0), 0) / posts.length;
    const avgEngagementRate = posts.reduce((s, p) => s + (p.engagementRate || 0), 0) / posts.length;
    const avgContentScore = posts.reduce((s, p) => s + (p.contentScore || 0), 0) / posts.length;
    const reelsCount = posts.filter((p) => p.isReel).length;
    const carouselsCount = posts.filter((p) => p.isCarousel).length;

    const captions = posts.map((p) => p.caption || '');
    const topKeywords = extractTopKeywords(captions, 10);
    const hooks = captions
      .map(extractHook)
      .filter(Boolean)
      .slice(0, 5);

    // New data point for the history array
    const dataPoint = {
      scrapedAt: new Date(),
      postsFound: posts.length,
      avgLikes: Math.round(avgLikes),
      avgComments: Math.round(avgComments),
      avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      avgContentScore: Math.round(avgContentScore * 10) / 10,
      reelsCount,
      carouselsCount,
    };

    // Fetch existing doc to compute growth
    const existing = await Hashtag.findOne({ hashtag: tag });
    let engagementGrowth = 0;

    if (existing && existing.history.length > 0) {
      const prev = existing.history[existing.history.length - 1];
      if (prev.avgEngagementRate > 0) {
        engagementGrowth =
          ((avgEngagementRate - prev.avgEngagementRate) / prev.avgEngagementRate) * 100;
      }
    }

    // Simple trend score: avg content score + engagement growth bonus
    const trendScore = Math.round(avgContentScore + Math.max(0, engagementGrowth));

    await Hashtag.findOneAndUpdate(
      { hashtag: tag },
      {
        $set: {
          avgContentScore: Math.round(avgContentScore * 10) / 10,
          avgLikesPerPost: Math.round(avgLikes),
          avgCommentsPerPost: Math.round(avgComments),
          avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
          trendScore,
          engagementGrowth: Math.round(engagementGrowth * 10) / 10,
          topCaptionKeywords: topKeywords,
          trendingHooks: hooks,
          lastScrapedAt: new Date(),
        },
        $inc: {
          totalPostsScraped: posts.length,
          totalScrapeRuns: 1,
          totalReels: reelsCount,
          totalCarousels: carouselsCount,
        },
        $push: {
          history: { $each: [dataPoint], $slice: -50 }, // Keep last 50 data points
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    logger.info(`📈 Hashtag #${tag} updated — avgScore: ${avgContentScore.toFixed(1)}, trendScore: ${trendScore}`);
  } catch (err) {
    logger.error(`Error updating hashtag stats for #${hashtag}: ${err.message}`);
  }
};

/**
 * Update stats for multiple hashtags from a batch of posts.
 * Groups posts by their sourceHashtag field.
 *
 * @param {Array<Object>} allPosts - All filtered posts from a scrape run
 * @param {string[]} hashtags - List of hashtags scraped
 */
const updateBatchHashtagStats = async (allPosts, hashtags) => {
  try {
    for (const hashtag of hashtags) {
      // Group posts by source hashtag
      const posts = allPosts.filter(
        (p) =>
          p.sourceHashtag === hashtag ||
          (p.hashtags || []).map((h) => h.toLowerCase()).includes(hashtag.toLowerCase())
      );

      await updateHashtagStats(hashtag, posts);
    }
  } catch (err) {
    logger.error(`Batch hashtag update error: ${err.message}`);
  }
};

module.exports = { updateHashtagStats, updateBatchHashtagStats, extractTopKeywords, extractHook };
