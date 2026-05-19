/**
 * Trending Detection Service
 * ─────────────────────────────────────────────────────────────────
 * Detects posts that appear across multiple hashtags (cross-hashtag
 * virality signal) and computes recency bonuses based on how recently
 * the content was posted.
 *
 * Cross-hashtag logic:
 *  A reel that surfaces under "productivity", "discipline", AND
 *  "deepwork" is more likely trending than one appearing under
 *  just one tag. We track this during a single pipeline run.
 *
 * Recency logic:
 *  Posts within the last 24h get a full bonus; 24-72h get partial;
 *  older content gets none.
 */

const logger = require('../utils/logger');

// ── Cross-hashtag Scoring Thresholds ──────────────────────────────────────────
// Points awarded per additional hashtag the post appears in
const CROSS_HASHTAG_SCORES = {
  TWO_HASHTAGS: 10,   // appears in ≥2 target hashtags
  THREE_HASHTAGS: 20, // appears in ≥3 target hashtags
  FOUR_PLUS: 30,      // appears in ≥4 target hashtags
};

// ── Recency Bonus ──────────────────────────────────────────────────────────────
const RECENCY_SCORES = {
  WITHIN_6H: 25,   // posted in the last 6 hours — very hot
  WITHIN_24H: 15,  // posted in the last 24 hours
  WITHIN_72H: 8,   // posted in the last 3 days
  OLDER: 0,        // no recency bonus
};

// ── Productivity Hashtag Set (for cross-hashtag check) ────────────────────────
const PRODUCTIVITY_HASHTAGS = new Set([
  'productivity',
  'studymotivation',
  'discipline',
  'deepwork',
  'selfimprovement',
  'focus',
  'consistency',
  'grindmindset',
  'nightstudy',
  'dopaminedetox',
  'monkmode',
  'studentlife',
  'studygram',
  'studywithme',
  'studylife',
  'neetprep',
  'jee2026',
  'jee2025',
  'upsc',
  'notetaking',
  'examprep',
  'selfstudy',
]);

/**
 * Build a frequency map: postShortCode → set of matched productivity hashtags.
 * Processes all posts from a single pipeline run to detect cross-hashtag
 * appearances before the posts are individually saved.
 *
 * @param {Array<Object>} rawPosts - Raw posts (with .hashtags and .shortCode fields)
 * @returns {Map<string, Set<string>>} shortCode → Set of matched productivity hashtags
 */
const buildCrossHashtagMap = (rawPosts) => {
  const crossMap = new Map();

  for (const post of rawPosts) {
    const shortCode = post.shortCode || post.shortcode;
    if (!shortCode) continue;

    const postTags = (post.hashtags || []).map((h) =>
      h.toLowerCase().replace(/^#/, '')
    );

    const matchedProductivityTags = postTags.filter((t) =>
      PRODUCTIVITY_HASHTAGS.has(t)
    );

    if (matchedProductivityTags.length > 0) {
      if (!crossMap.has(shortCode)) {
        crossMap.set(shortCode, new Set());
      }
      matchedProductivityTags.forEach((t) => crossMap.get(shortCode).add(t));
    }
  }

  logger.info(
    `📊 Cross-hashtag map built — ${crossMap.size} posts matched productivity hashtags`
  );

  return crossMap;
};

/**
 * Compute the cross-hashtag bonus score for a post.
 *
 * @param {string} shortCode - Post shortCode
 * @param {Map<string, Set<string>>} crossHashtagMap - Built by buildCrossHashtagMap()
 * @returns {{ crossHashtagBonus: number, crossHashtagCount: number, crossHashtagTags: string[] }}
 */
const computeCrossHashtagBonus = (shortCode, crossHashtagMap) => {
  if (!crossHashtagMap || !shortCode) {
    return { crossHashtagBonus: 0, crossHashtagCount: 0, crossHashtagTags: [] };
  }

  const tagSet = crossHashtagMap.get(shortCode);
  if (!tagSet || tagSet.size === 0) {
    return { crossHashtagBonus: 0, crossHashtagCount: 0, crossHashtagTags: [] };
  }

  const count = tagSet.size;
  let crossHashtagBonus = 0;

  if (count >= 4) {
    crossHashtagBonus = CROSS_HASHTAG_SCORES.FOUR_PLUS;
  } else if (count >= 3) {
    crossHashtagBonus = CROSS_HASHTAG_SCORES.THREE_HASHTAGS;
  } else if (count >= 2) {
    crossHashtagBonus = CROSS_HASHTAG_SCORES.TWO_HASHTAGS;
  }

  return {
    crossHashtagBonus,
    crossHashtagCount: count,
    crossHashtagTags: [...tagSet],
  };
};

/**
 * Compute the recency bonus for a post based on its postedAt timestamp.
 *
 * @param {Date|string|null} postedAt - When the post was published on Instagram
 * @returns {{ recencyBonus: number, recencyLabel: string }}
 */
const computeRecencyBonus = (postedAt) => {
  if (!postedAt) {
    return { recencyBonus: RECENCY_SCORES.OLDER, recencyLabel: 'unknown' };
  }

  const now = Date.now();
  const postTime = new Date(postedAt).getTime();
  const ageMs = now - postTime;

  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const THREE_DAYS = 72 * 60 * 60 * 1000;

  if (ageMs <= SIX_HOURS) {
    return { recencyBonus: RECENCY_SCORES.WITHIN_6H, recencyLabel: 'very_fresh' };
  }
  if (ageMs <= ONE_DAY) {
    return { recencyBonus: RECENCY_SCORES.WITHIN_24H, recencyLabel: 'fresh' };
  }
  if (ageMs <= THREE_DAYS) {
    return { recencyBonus: RECENCY_SCORES.WITHIN_72H, recencyLabel: 'recent' };
  }

  return { recencyBonus: RECENCY_SCORES.OLDER, recencyLabel: 'older' };
};

module.exports = {
  buildCrossHashtagMap,
  computeCrossHashtagBonus,
  computeRecencyBonus,
  PRODUCTIVITY_HASHTAGS,
  CROSS_HASHTAG_SCORES,
  RECENCY_SCORES,
};
