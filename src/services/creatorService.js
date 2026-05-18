/**
 * Creator Analytics Service
 * ─────────────────────────────────────────────────────────────────
 * Aggregates and updates creator records in the creators collection.
 */

const Creator = require('../models/Creator');
const FilteredPost = require('../models/FilteredPost');
const logger = require('../utils/logger');

/**
 * Upsert a creator record from a filtered post.
 * @param {Object} post - Filtered post document
 */
const upsertCreatorFromPost = async (post) => {
  try {
    const username = post.ownerUsername;
    if (!username) return;

    const followers = post.ownerFollowersCount || 0;
    const micro = followers >= 1000 && followers <= 100000;

    const hashtagsUpdate =
      post.hashtags && post.hashtags.length > 0
        ? { $addToSet: { hashtagsUsed: { $each: post.hashtags } } }
        : {};

    await Creator.findOneAndUpdate(
      { ownerUsername: username },
      {
        $set: {
          ownerUsername: username,
          ownerId: post.ownerId,
          fullName: post.ownerFullName || '',
          followersCount: followers,
          isMicroCreator: micro,
          creatorType: post.creatorType || 'unknown',
          lastSeenAt: new Date(),
          lastUpdatedAt: new Date(),
          profileUrl: `https://www.instagram.com/${username}/`,
        },
        $inc: {
          totalPostsFound: 1,
          totalReels: post.isReel ? 1 : 0,
          totalCarousels: post.isCarousel ? 1 : 0,
          totalLikes: post.likesCount || 0,
          totalComments: post.commentsCount || 0,
          targetHashtagFrequency: (post.targetHashtagMatches || []).length,
        },
        ...hashtagsUpdate,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    logger.error(`Error upserting creator ${post.ownerUsername}: ${err.message}`);
  }
};

/**
 * Recalculate derived stats for a creator from their filtered posts.
 * @param {string} username - Creator username
 */
const recalculateCreatorStats = async (username) => {
  try {
    const stats = await FilteredPost.aggregate([
      { $match: { ownerUsername: username } },
      {
        $group: {
          _id: '$ownerUsername',
          avgContentScore: { $avg: '$contentScore' },
          highestContentScore: { $max: '$contentScore' },
          avgEngagementRate: { $avg: '$engagementRate' },
          totalPosts: { $sum: 1 },
          firstSeen: { $min: '$processedAt' },
          lastSeen: { $max: '$processedAt' },
        },
      },
    ]);

    if (stats.length === 0) return;
    const s = stats[0];

    const daysDiff = Math.max(
      1,
      (new Date(s.lastSeen) - new Date(s.firstSeen)) / (1000 * 60 * 60 * 24)
    );
    const postsPerWeek = (s.totalPosts / daysDiff) * 7;

    await Creator.findOneAndUpdate(
      { ownerUsername: username },
      {
        $set: {
          averageContentScore: Math.round(s.avgContentScore * 10) / 10,
          highestContentScore: s.highestContentScore,
          averageEngagementRate: Math.round(s.avgEngagementRate * 100) / 100,
          estimatedPostsPerWeek: Math.round(postsPerWeek * 10) / 10,
          firstSeenAt: s.firstSeen,
          lastSeenAt: s.lastSeen,
          lastUpdatedAt: new Date(),
        },
      }
    );
  } catch (err) {
    logger.error(`Error recalculating stats for ${username}: ${err.message}`);
  }
};

/**
 * Auto-prioritize creators based on score and micro-creator status.
 */
const autoAssignPriority = async () => {
  try {
    await Creator.updateMany(
      { isMicroCreator: true, averageContentScore: { $gte: 30 } },
      { $set: { priority: 'high' } }
    );
    await Creator.updateMany(
      {
        priority: { $ne: 'high' },
        $or: [{ isMicroCreator: true }, { averageContentScore: { $gte: 20 } }],
      },
      { $set: { priority: 'medium' } }
    );
    logger.info('✅ Creator priorities auto-assigned');
  } catch (err) {
    logger.error(`Error assigning creator priorities: ${err.message}`);
  }
};

/**
 * Process a batch of filtered posts and update all creator records.
 * @param {Array<Object>} filteredPosts - Saved FilteredPost documents
 */
const processCreatorBatch = async (filteredPosts) => {
  try {
    logger.info(`Processing creator analytics for ${filteredPosts.length} posts...`);

    await Promise.all(filteredPosts.map((post) => upsertCreatorFromPost(post)));

    const usernames = [...new Set(filteredPosts.map((p) => p.ownerUsername).filter(Boolean))];
    await Promise.all(usernames.map((u) => recalculateCreatorStats(u)));

    await autoAssignPriority();
    logger.success(`✅ Creator analytics updated for ${usernames.length} creators`);
  } catch (err) {
    logger.error(`Creator batch processing error: ${err.message}`);
  }
};

module.exports = { processCreatorBatch, upsertCreatorFromPost, recalculateCreatorStats };
