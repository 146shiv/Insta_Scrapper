/**
 * Filter Service
 * ─────────────────────────────────────────────────────────────────
 * Applies content-based filtering rules to raw scraped posts.
 *
 * Rules:
 *  REJECT  — posts with coaching/ad keywords in caption
 *  PREFER  — posts with student/productivity/discipline keywords
 *  DETECT  — content type (reel, carousel) and creator type
 *  SIGNAL  — emotional hook phrases, motivational language
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
  'paid batch',
  'register today',
  'batch starts',
  'limited seats',
  'join now',
  'fee structure',
  'demo class',
  'trial class',
  'scholarship test',
  'scholarship exam',
  'contact for admission',
  'offline batch',
  'online batch starting',
  'course available',
  'buy now',
  'link in bio for course',
];

// ── Motivational / Productivity Positive Signals ──────────────────────────────
// Tier-1: High-value productivity & discipline hooks (stronger signal)
const MOTIVATIONAL_KEYWORDS = [
  'pov',
  'discipline',
  'consistency',
  'study routine',
  'deep work',
  'deepwork',
  'locked in',
  'grind',
  'focus',
  'academic comeback',
  'exam prep',
  'no excuses',
  'self improvement',
  'selfimprovement',
  'dopamine detox',
  'dopaminedetox',
  'productive day',
  'study motivation',
  'studymotivation',
  'late night study',
  'night study',
  'monk mode',
  'monkmode',
  'wake up early',
  'morning routine',
  'study session',
  'grind mindset',
  'grindmindset',
  'silent grind',
  'no phone study',
  'focused study',
  'mental toughness',
  'hard work pays',
  'academic goals',
  'study hard',
  'win the day',
  'back to study',
  'get back on track',
  'accountability',
  'student grind',
  'student mindset',
];

// ── Prefer Keywords (case-insensitive) ───────────────────────────────────────
// Posts with these keywords indicate authentic student/productivity content
const PREFER_KEYWORDS = [
  ...MOTIVATIONAL_KEYWORDS,
  'exam',
  'revision',
  'burnout',
  'productivity',
  'motivation',
  'study with me',
  'studywithme',
  'my study',
  'study tips',
  'study hack',
  'note taking',
  'notetaking',
  'self study',
  'library',
  'topper',
  'rank',
  'syllabus',
  'study plan',
  'time management',
  'pomodoro',
  'flashcards',
  'revision strategy',
];

// ── Emotional Hook Phrases ────────────────────────────────────────────────────
// Phrases that indicate strong narrative / POV emotional hook
const EMOTIONAL_HOOK_PHRASES = [
  'pov:',
  'pov i',
  'day in my life',
  'study with me',
  'come study',
  'come grind',
  'watch me study',
  'real student',
  'honest study',
  'my honest',
  'the truth about',
  'no one told me',
  'i wish i knew',
  'changed my life',
  'transformed my',
  'before after study',
  'how i study',
  'my secret',
  'this is why',
  'stop doing this',
  'do this instead',
  'why i failed',
  'how i went from',
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
  'ias aspirant',
  'ca student',
  'law student',
  'mba student',
  'college student',
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
  'productivity coach',
  'motivation creator',
  'content creator',
  'student creator',
];

// ── Productivity/Self-Improvement Creator Bio Keywords ───────────────────────
const PRODUCTIVITY_BIO_KEYWORDS = [
  'productivity',
  'self improvement',
  'selfimprovement',
  'discipline',
  'focus',
  'deep work',
  'deepwork',
  'mindset',
  'grind',
  'monk mode',
  'monkmode',
  'consistency',
  'self development',
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
 * Detect if a caption has a strong emotional/POV hook.
 * Checks opening lines for hook patterns.
 *
 * @param {string} caption
 * @returns {{ hasEmotionalHook: boolean, hookPhrase: string|null }}
 */
const detectEmotionalHook = (caption) => {
  if (!caption) return { hasEmotionalHook: false, hookPhrase: null };

  const lower = caption.toLowerCase().trimStart();

  // Check for explicit hook phrases
  for (const phrase of EMOTIONAL_HOOK_PHRASES) {
    if (lower.includes(phrase)) {
      return { hasEmotionalHook: true, hookPhrase: phrase };
    }
  }

  // Fallback: 2+ motivational keywords = emotional hook
  const motMatches = findMatchingKeywords(caption, MOTIVATIONAL_KEYWORDS);
  if (motMatches.length >= 2) {
    return { hasEmotionalHook: true, hookPhrase: null };
  }

  return { hasEmotionalHook: false, hookPhrase: null };
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
  const productType = (post.productType || '').toLowerCase();

  // Handle both old Graph-prefixed names and newer short-form names
  // productType === 'clips' is the definitive reel indicator from Apify
  const isReel =
    type === 'GraphVideo' ||
    type === 'Video' ||
    type === 'Reel' ||
    productType === 'clips' ||
    productType === 'reel' ||
    (isVideo && post.videoViewCount > 0);

  const isCarousel =
    type === 'GraphSidecar' ||
    type === 'Sidecar' ||
    type === 'sidecar';

  return { isReel, isCarousel, isVideo };
};

/**
 * Classify creator type from bio and username.
 * Now recognizes productivity/self-improvement creators as a distinct type.
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
  if (findMatchingKeywords(combined, PRODUCTIVITY_BIO_KEYWORDS).length > 0) {
    return 'productivity_creator';
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
 * Count how many motivational keywords appear in a caption.
 * Used to score trending reel language quality.
 *
 * @param {string} caption
 * @returns {{ count: number, matched: string[] }}
 */
const scoreMotivationalLanguage = (caption) => {
  const matched = findMatchingKeywords(caption, MOTIVATIONAL_KEYWORDS);
  return { count: matched.length, matched };
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

    // ── Step 4: Detect emotional/motivational hooks ───────────────
    const { hasEmotionalHook, hookPhrase } = detectEmotionalHook(caption);

    // ── Step 5: Score motivational language ──────────────────────
    const { count: motivationalScore, matched: motivationalKeywords } =
      scoreMotivationalLanguage(caption);

    // ── Step 6: Classify creator ──────────────────────────────────
    const creatorType = classifyCreatorType(bio, username);
    const micro = isMicroCreator(followers);

    // ── Step 7: Attach enrichment metadata ───────────────────────
    passed.push({
      ...post,
      _filter: {
        isReel,
        isCarousel,
        isVideo,
        captionKeywords: matchedPreferKeywords,
        hasPovHook,
        hasEmotionalHook,
        hookPhrase: hookPhrase || null,
        motivationalScore,
        motivationalKeywords,
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
  detectEmotionalHook,
  classifyCreatorType,
  isMicroCreator,
  scoreMotivationalLanguage,
  REJECT_KEYWORDS,
  PREFER_KEYWORDS,
  MOTIVATIONAL_KEYWORDS,
  EMOTIONAL_HOOK_PHRASES,
};
