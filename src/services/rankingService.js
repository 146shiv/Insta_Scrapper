/**
 * Ranking Service
 * ─────────────────────────────────────────────────────────────────
 * Computes a contentScore for each filtered post.
 *
 * Scoring Matrix (total max ≈ 175 points):
 *  +30  — Is a Reel / video (highest viral format)
 *  +10  — Is a Carousel (multi-image, swipeable)
 *  +15  — Has POV hook in caption ("POV: ...")
 *  +15  — Has a strong emotional hook phrase detected
 *  +5   — Per motivational keyword (capped at +20 from this source)
 *  +20  — Creator identified as student or educational
 *  +25  — Creator identified as productivity/discipline creator
 *  +15  — High hashtag relevance (≥3 target hashtags in post)
 *  +25  — Recency bonus (injected by pipeline via trendingService)
 *  +30  — Cross-hashtag bonus (injected by pipeline via trendingService)
 *  -50  — Coaching/ad detected (safety net — should not reach here)
 *
 * All scores are non-negative (clamped at 0 minimum).
 *
 * NOTE: recencyBonus and crossHashtagBonus are NOT computed here —
 *       they are pre-computed by trendingService and injected into
 *       _score by the pipeline before rankPosts() is called.
 */

const logger = require('../utils/logger');
const { REJECT_KEYWORDS } = require('./filterService');

// ── Target Hashtags for Relevance Scoring ─────────────────────────────────────
const TARGET_HASHTAGS = [
  // Core productivity & discipline
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
  // Legacy study tags
  'neetprep',
  'jee2026',
  'jee2025',
  'upsc',
  'notetaking',
  'studylife',
  'examprep',
  'selfstudy',
];

// ── Scoring Constants ─────────────────────────────────────────────────────────
const SCORES = {
  IS_REEL: 30,               // Reels are the primary discovery format
  IS_CAROUSEL: 10,
  POV_HOOK: 15,
  EMOTIONAL_HOOK: 15,        // Strong hook phrase (beyond just "pov")
  MOTIVATIONAL_KW_PER_MATCH: 5,  // Per motivational keyword, capped
  MOTIVATIONAL_KW_CAP: 20,  // Max from this source
  STUDY_CREATOR: 20,         // student / educational creator
  PRODUCTIVITY_CREATOR: 25,  // productivity/discipline-focused creator (new tier)
  HIGH_HASHTAG_RELEVANCE: 15,
  COACHING_PENALTY: -50,
};

// Minimum hashtag matches to qualify for relevance bonus
const HASHTAG_RELEVANCE_THRESHOLD = 3;

/**
 * Count how many target hashtags appear in a post's hashtag list.
 *
 * @param {string[]} postHashtags - Hashtags from the post
 * @returns {{ count: number, matched: string[] }}
 */
const countTargetHashtagMatches = (postHashtags = []) => {
  const lower = postHashtags.map((h) => h.toLowerCase().replace(/^#/, ''));
  const matched = TARGET_HASHTAGS.filter((t) => lower.includes(t));
  return { count: matched.length, matched };
};

/**
 * Check if the caption contains a coaching/ad keyword (safety net).
 *
 * @param {string} caption
 * @returns {boolean}
 */
const hasCoachingKeyword = (caption = '') => {
  const lower = caption.toLowerCase();
  return REJECT_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
};

/**
 * Compute the content score and breakdown for a single filtered post.
 * Recency and cross-hashtag bonuses are injected from outside (trendingService).
 *
 * @param {Object} filteredPost - Post with _filter metadata attached by filterService
 * @param {Object} [trendingMeta] - Optional trending metadata from trendingService
 * @param {number} [trendingMeta.recencyBonus]
 * @param {number} [trendingMeta.crossHashtagBonus]
 * @param {number} [trendingMeta.crossHashtagCount]
 * @param {string[]} [trendingMeta.crossHashtagTags]
 * @returns {Object} { contentScore, scoreBreakdown, targetHashtagMatches }
 */
const computeScore = (filteredPost, trendingMeta = {}) => {
  const meta = filteredPost._filter || {};
  const caption = filteredPost.caption || filteredPost.caption?.text || '';
  const hashtags = filteredPost.hashtags || [];

  const breakdown = {
    isReel: 0,
    isCarousel: 0,
    povHook: 0,
    emotionalHook: 0,
    motivationalLanguage: 0,
    studyCreator: 0,
    productivityCreator: 0,
    hashtagRelevance: 0,
    recencyBonus: trendingMeta.recencyBonus || 0,
    crossHashtagBonus: trendingMeta.crossHashtagBonus || 0,
    coachingPenalty: 0,
  };

  // +30 Reel (upgraded from +20)
  if (meta.isReel) {
    breakdown.isReel = SCORES.IS_REEL;
  }

  // +10 Carousel
  if (meta.isCarousel) {
    breakdown.isCarousel = SCORES.IS_CAROUSEL;
  }

  // +15 POV hook
  if (meta.hasPovHook) {
    breakdown.povHook = SCORES.POV_HOOK;
  }

  // +15 Emotional hook phrase (additive with POV if both present)
  if (meta.hasEmotionalHook) {
    breakdown.emotionalHook = SCORES.EMOTIONAL_HOOK;
  }

  // +5 per motivational keyword (capped at +20)
  const motScore = Math.min(
    (meta.motivationalScore || 0) * SCORES.MOTIVATIONAL_KW_PER_MATCH,
    SCORES.MOTIVATIONAL_KW_CAP
  );
  breakdown.motivationalLanguage = motScore;

  // +20 Student or educational creator
  if (meta.creatorType === 'student' || meta.creatorType === 'educational') {
    breakdown.studyCreator = SCORES.STUDY_CREATOR;
  }

  // +25 Productivity/discipline creator (new higher tier)
  if (meta.creatorType === 'productivity_creator') {
    breakdown.productivityCreator = SCORES.PRODUCTIVITY_CREATOR;
  }

  // +15 High hashtag relevance
  const { count: matchCount, matched } = countTargetHashtagMatches(hashtags);
  if (matchCount >= HASHTAG_RELEVANCE_THRESHOLD) {
    breakdown.hashtagRelevance = SCORES.HIGH_HASHTAG_RELEVANCE;
  }

  // -50 Coaching penalty (safety net — should have been filtered already)
  if (hasCoachingKeyword(caption)) {
    breakdown.coachingPenalty = SCORES.COACHING_PENALTY;
  }

  // Sum all breakdown values
  const rawScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  // Clamp at 0 minimum
  const contentScore = Math.max(0, rawScore);

  return {
    contentScore,
    scoreBreakdown: breakdown,
    targetHashtagMatches: matched,
    crossHashtagCount: trendingMeta.crossHashtagCount || 0,
    crossHashtagTags: trendingMeta.crossHashtagTags || [],
    recencyLabel: trendingMeta.recencyLabel || 'unknown',
  };
};

/**
 * Apply scoring to an array of filtered posts.
 * Each post may optionally carry a _trending field injected by the pipeline.
 *
 * @param {Array<Object>} filteredPosts - Posts with _filter (and optionally _trending) metadata
 * @returns {Array<Object>} Posts enriched with _score metadata, sorted desc
 */
const rankPosts = (filteredPosts) => {
  const scored = filteredPosts.map((post) => {
    const trendingMeta = post._trending || {};
    const { contentScore, scoreBreakdown, targetHashtagMatches, crossHashtagCount, crossHashtagTags, recencyLabel } =
      computeScore(post, trendingMeta);

    return {
      ...post,
      _score: {
        contentScore,
        scoreBreakdown,
        targetHashtagMatches,
        crossHashtagCount,
        crossHashtagTags,
        recencyLabel,
      },
    };
  });

  // Sort by contentScore descending
  scored.sort((a, b) => b._score.contentScore - a._score.contentScore);

  logger.info(`📊 Ranking complete — ${scored.length} posts scored`);

  return scored;
};

module.exports = { rankPosts, computeScore, countTargetHashtagMatches, TARGET_HASHTAGS, SCORES };
