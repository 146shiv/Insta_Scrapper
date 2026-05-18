/**
 * Duplicate Detection Utility
 * ─────────────────────────────────────────────────────────────────
 * Checks whether a post already exists in the database using
 * shortCode, postId, or URL before inserting.
 * Prevents wasted storage and processing of already-seen content.
 */

const RawPost = require('../models/RawPost');
const logger = require('./logger');

/**
 * Check if a post already exists in the raw_posts collection.
 * Uses shortCode as primary dedup key, falls back to postId.
 *
 * @param {string} shortCode - Instagram post shortCode
 * @param {string} postId - Instagram post internal ID
 * @returns {Promise<boolean>} true if duplicate exists
 */
const isDuplicate = async (shortCode, postId) => {
  try {
    const query = {};

    if (shortCode) query.shortCode = shortCode;
    else if (postId) query.postId = postId;
    else return false; // Cannot determine without identifiers

    const existing = await RawPost.findOne(query).lean();
    return !!existing;
  } catch (err) {
    logger.error(`Duplicate check error: ${err.message}`);
    return false; // Fail open — allow insert if check fails
  }
};

/**
 * Filter an array of scraped posts down to only new (non-duplicate) ones.
 * Logs skipped duplicates.
 *
 * @param {Array<Object>} posts - Array of scraped post objects
 * @returns {Promise<Object>} { newPosts, skippedCount }
 */
const filterNewPosts = async (posts) => {
  const newPosts = [];
  let skippedCount = 0;

  for (const post of posts) {
    const shortCode = post.shortCode || post.shortcode;
    const postId = post.id || post.postId;

    const duplicate = await isDuplicate(shortCode, postId);

    if (duplicate) {
      logger.duplicateSkipped(shortCode || postId || 'unknown');
      skippedCount++;
    } else {
      newPosts.push(post);
    }
  }

  return { newPosts, skippedCount };
};

module.exports = { isDuplicate, filterNewPosts };
