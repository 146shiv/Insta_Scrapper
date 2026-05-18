/**
 * Ranking Service
 * ─────────────────────────────────────────────────────────────────
 * Computes a contentScore for each filtered post.
 *
 * Scoring Matrix:
 *  +20  — Is a Reel (highest engagement format)
 *  +10  — Is a Carousel (multi-image, swipeable)
 *  +15  — Has POV hook in caption ("POV: ...")
 *  +10  — Has emotional/motivational keywords (≥2 matched)
 *  +20  — Creator identified as student or educational type
 *  +15  — High hashtag relevance (≥3 target hashtags in post)
 *  -50  — Coaching/ad detected (should not reach here, safety net)
 *
 * All scores are non-negative (clamped at 0 minimum).
 */

const logger = require('../utils/logger');
const { REJECT_KEYWORDS } = require('./filterService');

// ── Target Hashtags for Relevance Scoring ─────────────────────────────────────
const TARGET_HASHTAGS = [
  'studygram',
  'studywithme',
  'neetprep',
  'jee2026',
  'jee2025',
  'upsc',
  'productivity',
  'deepwork',
  'notetaking',
  'studymotivation',
  'studylife',
  'studentlife',
  'examprep',
  'selfstudy',
];

// ── Scoring Constants ─────────────────────────────────────────────────────────
const SCORES = {
  IS_REEL: 20,
  IS_CAROUSEL: 10,
  POV_HOOK: 15,
  EMOTIONAL_CAPTION: 10,
  STUDY_CREATOR: 20,
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
 *
 * @param {Object} filteredPost - Post with _filter metadata attached by filterService
 * @returns {Object} { contentScore, scoreBreakdown, targetHashtagMatches }
 */
const computeScore = (filteredPost) => {
  const meta = filteredPost._filter || {};
  const caption = filteredPost.caption || filteredPost.caption?.text || '';
  const hashtags = filteredPost.hashtags || [];

  const breakdown = {
    isReel: 0,
    isCarousel: 0,
    povHook: 0,
    emotionalCaption: 0,
    studyCreator: 0,
    hashtagRelevance: 0,
    coachingPenalty: 0,
  };

  // +20 Reel
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

  // +10 Emotional/motivational caption
  if (meta.hasEmotionalHook) {
    breakdown.emotionalCaption = SCORES.EMOTIONAL_CAPTION;
  }

  // +20 Student or educational creator
  if (meta.creatorType === 'student' || meta.creatorType === 'educational') {
    breakdown.studyCreator = SCORES.STUDY_CREATOR;
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

  return { contentScore, scoreBreakdown: breakdown, targetHashtagMatches: matched };
};

/**
 * Apply scoring to an array of filtered posts.
 *
 * @param {Array<Object>} filteredPosts - Posts with _filter metadata
 * @returns {Array<Object>} Posts enriched with _score metadata, sorted desc
 */
const rankPosts = (filteredPosts) => {
  const scored = filteredPosts.map((post) => {
    const { contentScore, scoreBreakdown, targetHashtagMatches } = computeScore(post);
    return {
      ...post,
      _score: {
        contentScore,
        scoreBreakdown,
        targetHashtagMatches,
      },
    };
  });

  // Sort by contentScore descending
  scored.sort((a, b) => b._score.contentScore - a._score.contentScore);

  logger.info(`📊 Ranking complete — ${scored.length} posts scored`);

  return scored;
};

module.exports = { rankPosts, computeScore, countTargetHashtagMatches, TARGET_HASHTAGS, SCORES };
