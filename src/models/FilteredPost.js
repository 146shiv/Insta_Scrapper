/**
 * FilteredPost Model — filtered_posts Collection
 * ─────────────────────────────────────────────────────────────────
 * Stores posts that have passed the filtering engine, enriched
 * with a computed contentScore and quality classification.
 * These are the posts served to the dashboard and used for
 * creator outreach decisions.
 */

const mongoose = require('mongoose');

const filteredPostSchema = new mongoose.Schema(
  {
    // ── Reference to Source ───────────────────────────────────────
    // Reference to source RawPost (optional — if raw save failed we still keep the filtered post)
    rawPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawPost',
      required: false,
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

    // ── Snapshot of Key Fields (denormalized for fast queries) ────
    caption: {
      type: String,
      default: '',
    },
    displayUrl: {
      type: String,
    },
    ownerUsername: {
      type: String,
    },
    ownerId: {
      type: String,
    },
    ownerFollowersCount: {
      type: Number,
      default: 0,
    },

    // ── Content Classification ────────────────────────────────────
    type: {
      type: String,
      // Newer Apify actor uses short names: 'Image', 'Video', 'Sidecar'
      // Older actor uses Graph-prefixed names: 'GraphImage', 'GraphVideo', 'GraphSidecar'
      enum: ['GraphImage', 'GraphVideo', 'GraphSidecar', 'Reel', 'Image', 'Video', 'Sidecar', 'Unknown'],
      default: 'Unknown',
    },
    productType: {
      type: String, // Raw productType from Apify (e.g. 'clips', 'feed', 'igtv')
      default: '',
    },
    isReel: {
      type: Boolean,
      default: false,
    },
    isCarousel: {
      type: Boolean,
      default: false,
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
    engagementRate: {
      type: Number,
      default: 0, // (likes + comments) / followers * 100
    },

    // ── Hashtags ──────────────────────────────────────────────────
    hashtags: {
      type: [String],
      default: [],
    },
    targetHashtagMatches: {
      type: [String], // Which of our target hashtags this post uses
      default: [],
    },

    // ── Scoring ───────────────────────────────────────────────────
    contentScore: {
      type: Number,
      default: 0,
      index: true,
    },
    scoreBreakdown: {
      isReel: { type: Number, default: 0 },
      isCarousel: { type: Number, default: 0 },
      povHook: { type: Number, default: 0 },
      emotionalHook: { type: Number, default: 0 },
      motivationalLanguage: { type: Number, default: 0 },
      studyCreator: { type: Number, default: 0 },
      productivityCreator: { type: Number, default: 0 },
      hashtagRelevance: { type: Number, default: 0 },
      recencyBonus: { type: Number, default: 0 },
      crossHashtagBonus: { type: Number, default: 0 },
      coachingPenalty: { type: Number, default: 0 },
    },

    // ── Trending Intelligence ─────────────────────────────────────
    crossHashtagCount: {
      type: Number,
      default: 0, // How many productivity hashtags this post appeared under
      index: true,
    },
    crossHashtagTags: {
      type: [String],
      default: [], // Which productivity hashtags this post appeared under
    },
    recencyLabel: {
      type: String,
      enum: ['very_fresh', 'fresh', 'recent', 'older', 'unknown'],
      default: 'unknown',
    },
    motivationalScore: {
      type: Number,
      default: 0, // Count of motivational keywords matched in caption
    },

    // ── Caption Analysis ──────────────────────────────────────────
    captionKeywords: {
      type: [String], // Matched keywords from preference list
      default: [],
    },
    hasEmotionalHook: {
      type: Boolean,
      default: false,
    },
    hookPhrase: {
      type: String, // The actual hook phrase detected (e.g. 'pov:', 'how i study')
      default: null,
    },
    hasPovHook: {
      type: Boolean,
      default: false,
    },

    // ── Creator Classification ─────────────────────────────────────
    creatorType: {
      type: String,
      enum: ['student', 'educational', 'productivity_creator', 'micro_influencer', 'general', 'unknown'],
      default: 'unknown',
    },
    isMicroCreator: {
      type: Boolean,
      default: false, // followers between 1k–50k
    },

    // ── Review Status ─────────────────────────────────────────────
    reviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'outreach_sent'],
      default: 'pending',
      index: true,
    },
    reviewNotes: {
      type: String,
    },

    // ── Timestamps ────────────────────────────────────────────────
    postedAt: {
      type: Date,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'filtered_posts',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
filteredPostSchema.index({ contentScore: -1 });
filteredPostSchema.index({ isReel: 1, contentScore: -1 });
filteredPostSchema.index({ isCarousel: 1, contentScore: -1 });
filteredPostSchema.index({ ownerUsername: 1 });
filteredPostSchema.index({ reviewStatus: 1, contentScore: -1 });
filteredPostSchema.index({ processedAt: -1 });
// Trending intelligence indexes
filteredPostSchema.index({ isReel: 1, postedAt: -1, contentScore: -1 }); // trending reels
filteredPostSchema.index({ crossHashtagCount: -1, contentScore: -1 });   // cross-hashtag viral posts
filteredPostSchema.index({ recencyLabel: 1, isReel: 1, contentScore: -1 }); // fresh reels

const FilteredPost = mongoose.model('FilteredPost', filteredPostSchema);

module.exports = FilteredPost;
