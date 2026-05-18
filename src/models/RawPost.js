/**
 * RawPost Model — raw_posts Collection
 * ─────────────────────────────────────────────────────────────────
 * Stores the original scraped data from Apify Instagram Scraper.
 * This is the source-of-truth record — never modified after insert.
 * All filtering and ranking happens on copies in filtered_posts.
 */

const mongoose = require('mongoose');

const rawPostSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────
    postId: {
      type: String,
      index: true,
    },
    shortCode: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    url: {
      type: String,
    },

    // ── Content ───────────────────────────────────────────────────
    caption: {
      type: String,
      default: '',
    },
    displayUrl: {
      type: String, // Thumbnail/preview image URL
    },

    // ── Post Type ─────────────────────────────────────────────────
    type: {
      type: String,
      // Newer Apify actor uses short names: 'Image', 'Video', 'Sidecar'
      // Older actor uses Graph-prefixed names: 'GraphImage', 'GraphVideo', 'GraphSidecar'
      enum: ['GraphImage', 'GraphVideo', 'GraphSidecar', 'Reel', 'Image', 'Video', 'Sidecar', 'Unknown'],
      default: 'Unknown',
    },
    isVideo: {
      type: Boolean,
      default: false,
    },

    // ── Engagement Metrics ────────────────────────────────────────
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    videoViewCount: {
      type: Number,
      default: 0,
    },
    videoPlayCount: {
      type: Number,
      default: 0,
    },

    // ── Creator Info ──────────────────────────────────────────────
    ownerUsername: {
      type: String,
      index: true,
    },
    ownerId: {
      type: String,
    },
    ownerFullName: {
      type: String,
    },
    ownerIsVerified: {
      type: Boolean,
      default: false,
    },
    ownerFollowersCount: {
      type: Number,
      default: 0,
    },
    ownerBio: {
      type: String,
      default: '',
    },

    // ── Hashtags & Location ───────────────────────────────────────
    hashtags: {
      type: [String],
      default: [],
    },
    mentions: {
      type: [String],
      default: [],
    },
    locationName: {
      type: String,
    },

    // ── Timestamps ────────────────────────────────────────────────
    postedAt: {
      type: Date, // Original post timestamp on Instagram
    },

    // ── Scraping Metadata ─────────────────────────────────────────
    scrapedAt: {
      type: Date,
      default: Date.now,
    },
    scrapeJobId: {
      type: String, // Apify run ID for traceability
    },
    sourceHashtag: {
      type: String, // Which hashtag triggered this scrape
    },
    rawData: {
      type: mongoose.Schema.Types.Mixed, // Store full original object for reference
    },
  },
  {
    timestamps: true,      // Adds createdAt and updatedAt
    collection: 'raw_posts',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
rawPostSchema.index({ ownerUsername: 1, postedAt: -1 });
rawPostSchema.index({ hashtags: 1 });
rawPostSchema.index({ scrapedAt: -1 });
rawPostSchema.index({ type: 1 });

const RawPost = mongoose.model('RawPost', rawPostSchema);

module.exports = RawPost;
