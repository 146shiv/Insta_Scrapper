/**
 * Export Service
 * ─────────────────────────────────────────────────────────────────
 * Exports top-ranked posts and creator data to CSV format.
 * Uses json2csv for reliable field mapping and escaping.
 */

const { Parser } = require('json2csv');
const FilteredPost = require('../models/FilteredPost');
const Creator = require('../models/Creator');
const logger = require('../utils/logger');

// Fields to include in the posts CSV export
const POST_FIELDS = [
  { label: 'Instagram URL', value: 'url' },
  { label: 'Creator', value: 'ownerUsername' },
  { label: 'Content Score', value: 'contentScore' },
  { label: 'Type', value: 'type' },
  { label: 'Is Reel', value: 'isReel' },
  { label: 'Is Carousel', value: 'isCarousel' },
  { label: 'Likes', value: 'likesCount' },
  { label: 'Comments', value: 'commentsCount' },
  { label: 'Followers', value: 'ownerFollowersCount' },
  { label: 'Engagement Rate', value: 'engagementRate' },
  { label: 'Caption Keywords', value: (row) => (row.captionKeywords || []).join(', ') },
  { label: 'Hashtags', value: (row) => (row.hashtags || []).slice(0, 10).join(', ') },
  { label: 'Caption', value: (row) => (row.caption || '').slice(0, 200) },
  { label: 'Posted At', value: 'postedAt' },
  { label: 'Review Status', value: 'reviewStatus' },
];

// Fields for creator CSV export
const CREATOR_FIELDS = [
  { label: 'Username', value: 'ownerUsername' },
  { label: 'Full Name', value: 'fullName' },
  { label: 'Profile URL', value: 'profileUrl' },
  { label: 'Creator Type', value: 'creatorType' },
  { label: 'Followers', value: 'followersCount' },
  { label: 'Is Micro Creator', value: 'isMicroCreator' },
  { label: 'Avg Content Score', value: 'averageContentScore' },
  { label: 'Total Posts', value: 'totalPostsFound' },
  { label: 'Total Reels', value: 'totalReels' },
  { label: 'Avg Engagement Rate', value: 'averageEngagementRate' },
  { label: 'Priority', value: 'priority' },
  { label: 'Outreach Status', value: 'outreachStatus' },
  { label: 'First Seen', value: 'firstSeenAt' },
  { label: 'Last Seen', value: 'lastSeenAt' },
];

/**
 * Export top-ranked filtered posts to CSV string.
 *
 * @param {number} limit - Max posts to export (default 100)
 * @param {Object} filters - Optional query filters
 * @returns {Promise<string>} CSV string
 */
const exportTopPostsToCSV = async (limit = 100, filters = {}) => {
  try {
    const posts = await FilteredPost.find(filters)
      .sort({ contentScore: -1 })
      .limit(limit)
      .lean();

    if (posts.length === 0) {
      return 'No posts found';
    }

    const parser = new Parser({ fields: POST_FIELDS });
    const csv = parser.parse(posts);

    logger.info(`📄 Exported ${posts.length} posts to CSV`);
    return csv;
  } catch (err) {
    logger.error(`CSV export error: ${err.message}`);
    throw err;
  }
};

/**
 * Export top creators to CSV string.
 *
 * @param {number} limit - Max creators to export (default 50)
 * @returns {Promise<string>} CSV string
 */
const exportTopCreatorsToCSV = async (limit = 50) => {
  try {
    const creators = await Creator.find({})
      .sort({ averageContentScore: -1 })
      .limit(limit)
      .lean();

    if (creators.length === 0) {
      return 'No creators found';
    }

    const parser = new Parser({ fields: CREATOR_FIELDS });
    const csv = parser.parse(creators);

    logger.info(`📄 Exported ${creators.length} creators to CSV`);
    return csv;
  } catch (err) {
    logger.error(`Creator CSV export error: ${err.message}`);
    throw err;
  }
};

module.exports = { exportTopPostsToCSV, exportTopCreatorsToCSV };
