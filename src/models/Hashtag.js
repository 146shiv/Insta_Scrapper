/**
 * Hashtag Model — hashtags Collection
 * ─────────────────────────────────────────────────────────────────
 * Tracks performance metrics for each hashtag over time.
 * Enables trending analysis and hashtag effectiveness scoring.
 */

const mongoose = require('mongoose');

// Sub-schema for each scrape run's data point
const dataPointSchema = new mongoose.Schema(
  {
    scrapedAt: { type: Date, default: Date.now },
    postsFound: { type: Number, default: 0 },
    avgLikes: { type: Number, default: 0 },
    avgComments: { type: Number, default: 0 },
    avgEngagementRate: { type: Number, default: 0 },
    avgContentScore: { type: Number, default: 0 },
    reelsCount: { type: Number, default: 0 },
    carouselsCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const hashtagSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────
    hashtag: {
      type: String,
      unique: true,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    // ── Overall Metrics ───────────────────────────────────────────
    totalPostsScraped: {
      type: Number,
      default: 0,
    },
    totalScrapeRuns: {
      type: Number,
      default: 0,
    },
    avgContentScore: {
      type: Number,
      default: 0,
    },
    avgLikesPerPost: {
      type: Number,
      default: 0,
    },
    avgCommentsPerPost: {
      type: Number,
      default: 0,
    },
    avgEngagementRate: {
      type: Number,
      default: 0,
    },

    // ── Trend Metrics ─────────────────────────────────────────────
    trendScore: {
      type: Number,
      default: 0,
      index: true,
    },
    // Percentage change in avg engagement from previous run
    engagementGrowth: {
      type: Number,
      default: 0,
    },

    // ── Content Breakdown ─────────────────────────────────────────
    totalReels: {
      type: Number,
      default: 0,
    },
    totalCarousels: {
      type: Number,
      default: 0,
    },

    // ── Top Keywords Found ────────────────────────────────────────
    topCaptionKeywords: {
      type: [String],
      default: [],
    },

    // ── Trending Hook Phrases (bonus feature) ─────────────────────
    trendingHooks: {
      type: [String], // Most-used opening phrases in captions
      default: [],
    },

    // ── History (time-series data points) ─────────────────────────
    history: {
      type: [dataPointSchema],
      default: [],
    },

    // ── Timestamps ────────────────────────────────────────────────
    firstScrapedAt: {
      type: Date,
      default: Date.now,
    },
    lastScrapedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'hashtags',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
hashtagSchema.index({ trendScore: -1 });
hashtagSchema.index({ avgContentScore: -1 });
hashtagSchema.index({ lastScrapedAt: -1 });

const Hashtag = mongoose.model('Hashtag', hashtagSchema);

module.exports = Hashtag;
