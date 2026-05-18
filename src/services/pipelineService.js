/**
 * Pipeline Service
 * ─────────────────────────────────────────────────────────────────
 * Orchestrates the full scrape → filter → rank → save pipeline.
 *
 * This is the main entry point called by:
 *  - The cron scheduler (every 2 hours)
 *  - The POST /scrape API endpoint (manual trigger)
 *
 * Steps:
 *  1. Scrape hashtags via Apify
 *  2. Deduplicate raw posts
 *  3. Save new raw posts to MongoDB
 *  4. Filter posts (reject coaching ads, classify content)
 *  5. Rank posts (compute contentScore)
 *  6. Save filtered/ranked posts to MongoDB
 *  7. Update creator analytics
 *  8. Update hashtag performance stats
 */

const { scrapeHashtags } = require('./apifyService');
const { filterPosts } = require('./filterService');
const { rankPosts } = require('./rankingService');
const { processCreatorBatch } = require('./creatorService');
const { updateBatchHashtagStats } = require('./hashtagService');
const { filterNewPosts } = require('../utils/duplicateCheck');
const RawPost = require('../models/RawPost');
const FilteredPost = require('../models/FilteredPost');
const logger = require('../utils/logger');

/**
 * Normalize a raw Apify post into a RawPost-compatible object.
 * Handles field name variations between Apify actor versions.
 *
 * @param {Object} item - Raw item from Apify dataset
 * @param {string} sourceHashtag - Which hashtag triggered this scrape
 * @param {string} scrapeJobId - Apify run ID
 * @returns {Object} Normalized post object
 */
const normalizeRawPost = (item, sourceHashtag, scrapeJobId) => {
  const owner = item.owner || item.ownerProfile || {};

  return {
    postId: item.id || item.postId,
    shortCode: item.shortCode || item.shortcode,
    url: item.url || item.postUrl || `https://www.instagram.com/p/${item.shortCode || item.shortcode}/`,
    caption: item.caption || (item.caption && item.caption.text) || '',
    displayUrl: item.displayUrl || item.thumbnailUrl || item.previewUrl,
    type: item.type || item.__typename || 'Unknown',
    isVideo: item.isVideo || item.is_video || false,
    likesCount: item.likesCount || item.likes || 0,
    commentsCount: item.commentsCount || item.comments || 0,
    videoViewCount: item.videoViewCount || item.videoViews || 0,
    videoPlayCount: item.videoPlayCount || 0,
    ownerUsername: item.ownerUsername || owner.username,
    ownerId: item.ownerId || owner.id,
    ownerFullName: item.ownerFullName || owner.fullName,
    ownerIsVerified: item.ownerIsVerified || owner.verified || false,
    ownerFollowersCount: item.ownerFollowersCount || owner.followersCount || 0,
    ownerBio: item.ownerBio || owner.biography || '',
    hashtags: item.hashtags || [],
    mentions: item.mentions || [],
    locationName: item.locationName,
    postedAt: item.timestamp ? new Date(item.timestamp) : undefined,
    scrapedAt: new Date(),
    scrapeJobId,
    sourceHashtag,
    rawData: item,
  };
};

/**
 * Save a filtered+ranked post to the filtered_posts collection.
 *
 * @param {Object} post - Post with _filter and _score metadata
 * @param {string} rawPostId - MongoDB ID of the corresponding RawPost
 * @returns {Promise<Object|null>} Saved FilteredPost document
 */
const saveFilteredPost = async (post, rawPostId) => {
  try {
    const meta = post._filter || {};
    const score = post._score || {};
    const followers = post.ownerFollowersCount || 0;
    const engagementRate =
      followers > 0
        ? ((post.likesCount + post.commentsCount) / followers) * 100
        : 0;

    const doc = new FilteredPost({
      rawPostId,
      shortCode: post.shortCode || post.shortcode,
      url: post.url,
      caption: post.caption,
      displayUrl: post.displayUrl,
      ownerUsername: post.ownerUsername,
      ownerId: post.ownerId,
      ownerFollowersCount: followers,
      type: post.type,
      isReel: meta.isReel || false,
      isCarousel: meta.isCarousel || false,
      isVideo: meta.isVideo || false,
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      videoViewCount: post.videoViewCount || 0,
      engagementRate: Math.round(engagementRate * 100) / 100,
      hashtags: post.hashtags || [],
      targetHashtagMatches: score.targetHashtagMatches || [],
      contentScore: score.contentScore || 0,
      scoreBreakdown: score.scoreBreakdown || {},
      captionKeywords: meta.captionKeywords || [],
      hasEmotionalHook: meta.hasEmotionalHook || false,
      hasPovHook: meta.hasPovHook || false,
      creatorType: meta.creatorType || 'unknown',
      isMicroCreator: meta.isMicroCreator || false,
      postedAt: post.postedAt,
      processedAt: new Date(),
    });

    return await doc.save();
  } catch (err) {
    // Catch unique constraint errors silently (race condition duplicate)
    if (err.code === 11000) {
      logger.duplicateSkipped(post.shortCode || 'unknown');
      return null;
    }
    logger.error(`Error saving filtered post: ${err.message}`);
    return null;
  }
};

/**
 * Run the full scraping pipeline for a list of hashtags.
 *
 * @param {string[]} hashtags - Hashtags to scrape
 * @param {Object} options - Optional overrides (resultsType, resultsLimit)
 * @returns {Promise<Object>} Pipeline result summary
 */
const runPipeline = async (hashtags, options = {}) => {
  const result = {
    hashtags,
    rawFetched: 0,
    newRawSaved: 0,
    duplicatesSkipped: 0,
    filtered: 0,
    rejected: 0,
    ranked: 0,
    saved: 0,
    startedAt: new Date(),
    completedAt: null,
    error: null,
  };

  try {
    logger.info(`🚀 Pipeline started for ${hashtags.length} hashtags`);

    // ── Step 1: Scrape ────────────────────────────────────────────
    const rawItems = await scrapeHashtags(hashtags, options);
    result.rawFetched = rawItems.length;

    // ── Step 2: Deduplicate ───────────────────────────────────────
    const { newPosts, skippedCount } = await filterNewPosts(rawItems);
    result.duplicatesSkipped = skippedCount;

    // ── Step 3: Save raw posts ────────────────────────────────────
    const scrapeJobId = rawItems[0]?._scrapeRunId || 'manual';
    // Map shortCode → MongoDB _id for linking filtered posts
    const rawIdByShortCode = new Map();

    for (const item of newPosts) {
      try {
        const shortCode = item.shortCode || item.shortcode;
        const normalized = normalizeRawPost(item, item._sourceHashtag || 'unknown', scrapeJobId);
        const saved = await RawPost.create(normalized);
        if (shortCode) rawIdByShortCode.set(shortCode, saved._id);
        result.newRawSaved++;
      } catch (err) {
        if (err.code === 11000) {
          logger.duplicateSkipped(item.shortCode || item.shortcode || 'unknown');
        } else {
          logger.error(`Raw post save error: ${err.message}`);
        }
      }
    }

    // ── Step 4: Filter ────────────────────────────────────────────
    const { passed, rejected } = filterPosts(newPosts);
    result.filtered = passed.length;
    result.rejected = rejected.length;

    // ── Step 5: Rank ──────────────────────────────────────────────
    const ranked = rankPosts(passed);
    result.ranked = ranked.length;

    // ── Step 6: Save filtered posts ───────────────────────────────
    // NOTE: rawPostId is optional — filtered posts are saved even if raw save failed
    const savedFilteredPosts = [];

    for (const post of ranked) {
      const shortCode = post.shortCode || post.shortcode;
      const rawPostId = rawIdByShortCode.get(shortCode) || undefined;

      const saved = await saveFilteredPost(post, rawPostId);
      if (saved) {
        savedFilteredPosts.push(saved);
        result.saved++;
      }
    }

    // ── Step 7: Update creator analytics ─────────────────────────
    if (savedFilteredPosts.length > 0) {
      await processCreatorBatch(savedFilteredPosts);
    }

    // ── Step 8: Update hashtag stats ──────────────────────────────
    await updateBatchHashtagStats(savedFilteredPosts, hashtags);

    result.completedAt = new Date();
    logger.scrapeCompleted(result.rawFetched, result.saved, result.duplicatesSkipped);

    return result;
  } catch (err) {
    result.error = err.message;
    result.completedAt = new Date();
    logger.error(`Pipeline error: ${err.message}`);
    throw err;
  }
};

module.exports = { runPipeline };
