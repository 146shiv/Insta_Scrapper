/**
 * Filter Service
 * ─────────────────────────────────────────────────────────────────
 * Applies content-based filtering rules to raw scraped posts.
 *
 * Rules:
 *  REJECT  — posts with coaching/ad keywords in caption
 *  PREFER  — posts with student/study keywords in caption
 *  DETECT  — content type (reel, carousel) and creator type
 *
 * Returns a filtered array with enriched metadata attached.
 */

const logger = require('../utils/logger');

// ── Reject Keywords (case-insensitive) ───────────────────────────────────────
// Posts containing these are likely coaching ads — skip them
const REJECT_KEYWORDS = [
  'admissions open',
  'academy',
  'coaching institute',
  'coaching center',
  'register now',
  'call now',
  'enroll today',
  'enroll now',
  'batch starts',
  'limited seats',
  'join now',
  'fee structure',
  'demo class',
  'trial class',
  'scholarship test',
  'scholarship exam',
];

// ── Prefer Keywords (case-insensitive) ───────────────────────────────────────
// Posts with these keywords indicate authentic student content
const PREFER_KEYWORDS = [
  'pov',
  'exam',
  'revision',
  'burnout',
  'productivity',
  'study routine',
  'motivation',
  'night study',
  'discipline',
  'focus',
  'consistency',
  'study with me',
  'studywithme',
  'my study',
  'study tips',
  'study hack',
  'note taking',
  'notetaking',
  'self study',
  'study session',
  'library',
];

// ── Student/Educational Creator Bio Keywords ──────────────────────────────────
const STUDENT_BIO_KEYWORDS = [
  'student',
  'aspirant',
  'prep',
  'preparing',
  'neet',
  'jee',
  'upsc',
  'studying',
  'learner',
  'grade',
  'class 12',
  'class 11',
  'engineering student',
  'medical student',
];

const EDUCATIONAL_BIO_KEYWORDS = [
  'educator',
  'teacher',
  'mentor',
  'tutor',
  'education',
  'learning',
  'notes',
  'study tips',
  'academic',
];

/**
 * Check if a caption contains any of the given keywords.
 * Case-insensitive matching.
 *
 * @param {string} text - Caption or bio text
 * @param {string[]} keywords - Keywords to search for
 * @returns {string[]} Matched keywords
 */
const findMatchingKeywords = (text, keywords) => {
  if (!text) return [];
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase()));
};

/**
 * Determine if a post should be rejected based on caption content.
 *
 * @param {string} caption
 * @returns {boolean}
 */
const shouldReject = (caption) => {
  const matches = findMatchingKeywords(caption, REJECT_KEYWORDS);
  return matches.length > 0;
};

/**
 * Detect post type: reel, carousel (sidecar), or image.
 *
 * @param {Object} post - Raw post from Apify
 * @returns {Object} { isReel, isCarousel, isVideo }
 */
const detectPostType = (post) => {
  const type = post.type || post.__typename || '';
  const isVideo = post.isVideo || post.is_video || false;

  // Handle both old Graph-prefixed names and newer short-form names
  const isReel =
    type === 'GraphVideo' ||
    type === 'Video' ||
    type === 'Reel' ||
    post.productType === 'clips' ||
    (isVideo && post.videoViewCount > 0);

  const isCarousel =
    type === 'GraphSidecar' ||
    type === 'Sidecar' ||
    type === 'sidecar';

  return { isReel, isCarousel, isVideo };
};

/**
 * Classify creator type from bio and username.
 *
 * @param {string} bio - Creator bio text
 * @param {string} username - Creator username
 * @returns {string} creatorType
 */
const classifyCreatorType = (bio = '', username = '') => {
  const combined = `${bio} ${username}`.toLowerCase();

  if (findMatchingKeywords(combined, STUDENT_BIO_KEYWORDS).length > 0) {
    return 'student';
  }
  if (findMatchingKeywords(combined, EDUCATIONAL_BIO_KEYWORDS).length > 0) {
    return 'educational';
  }
  return 'general';
};

/**
 * Determine if a creator is a micro-creator.
 * Definition: 1,000 – 100,000 followers.
 *
 * @param {number} followers
 * @returns {boolean}
 */
const isMicroCreator = (followers) => {
  return followers >= 1000 && followers <= 100000;
};

/**
 * Run the full filter pipeline on an array of raw posts.
 *
 * @param {Array<Object>} rawPosts - Raw posts from Apify
 * @returns {Object} { passed: Array, rejected: Array }
 */
const filterPosts = (rawPosts) => {
  const passed = [];
  const rejected = [];

  for (const post of rawPosts) {
    const caption = post.caption || post.caption?.text || '';
    const bio = post.ownerBio || post.owner?.biography || '';
    const username = post.ownerUsername || post.owner?.username || '';
    const followers = post.ownerFollowersCount || post.owner?.followersCount || 0;

    // ── Step 1: Reject coaching ads ──────────────────────────────
    if (shouldReject(caption)) {
      rejected.push({ ...post, _rejectionReason: 'coaching_ad_detected' });
      continue;
    }

    // ── Step 2: Detect content type ──────────────────────────────
    const { isReel, isCarousel, isVideo } = detectPostType(post);

    // ── Step 3: Find preferred keywords ──────────────────────────
    const matchedPreferKeywords = findMatchingKeywords(caption, PREFER_KEYWORDS);
    const hasPovHook = caption.toLowerCase().includes('pov');
    const hasEmotionalHook = matchedPreferKeywords.length >= 2;

    // ── Step 4: Classify creator ──────────────────────────────────
    const creatorType = classifyCreatorType(bio, username);
    const micro = isMicroCreator(followers);

    // ── Step 5: Attach enrichment metadata ───────────────────────
    passed.push({
      ...post,
      _filter: {
        isReel,
        isCarousel,
        isVideo,
        captionKeywords: matchedPreferKeywords,
        hasPovHook,
        hasEmotionalHook,
        creatorType,
        isMicroCreator: micro,
      },
    });
  }

  logger.filterSummary(rawPosts.length, passed.length, rejected.length);

  return { passed, rejected };
};

module.exports = {
  filterPosts,
  shouldReject,
  detectPostType,
  classifyCreatorType,
  isMicroCreator,
  REJECT_KEYWORDS,
  PREFER_KEYWORDS,
};
