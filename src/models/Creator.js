/**
 * Creator Model — creators Collection
 * ─────────────────────────────────────────────────────────────────
 * Aggregated analytics per Instagram creator/account.
 * Updated each time their posts appear in the scrape pipeline.
 * Used to identify high-potential student micro-creators for outreach.
 */

const mongoose = require('mongoose');

const creatorSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────
    ownerUsername: {
      type: String,
      unique: true,
      required: true,
    },
    ownerId: {
      type: String,
      index: true,
    },
    fullName: {
      type: String,
    },
    bio: {
      type: String,
      default: '',
    },
    profileUrl: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    // ── Audience ──────────────────────────────────────────────────
    followersCount: {
      type: Number,
      default: 0,
    },
    isMicroCreator: {
      type: Boolean,
      default: false, // followers between 1k–50k
    },

    // ── Classification ────────────────────────────────────────────
    creatorType: {
      type: String,
      enum: ['student', 'educational', 'micro_influencer', 'general', 'unknown'],
      default: 'unknown',
    },
    detectedTopics: {
      type: [String], // e.g., ['neet', 'jee', 'productivity']
      default: [],
    },

    // ── Content Analytics ─────────────────────────────────────────
    totalPostsFound: {
      type: Number,
      default: 0,
    },
    totalReels: {
      type: Number,
      default: 0,
    },
    totalCarousels: {
      type: Number,
      default: 0,
    },
    averageContentScore: {
      type: Number,
      default: 0,
    },
    highestContentScore: {
      type: Number,
      default: 0,
    },
    totalLikes: {
      type: Number,
      default: 0,
    },
    totalComments: {
      type: Number,
      default: 0,
    },
    averageEngagementRate: {
      type: Number,
      default: 0,
    },

    // ── Hashtag Patterns ──────────────────────────────────────────
    hashtagsUsed: {
      type: [String], // All unique hashtags seen in their posts
      default: [],
    },
    targetHashtagFrequency: {
      type: Number, // How often they use our target hashtags
      default: 0,
    },

    // ── Posting Frequency ─────────────────────────────────────────
    firstSeenAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    estimatedPostsPerWeek: {
      type: Number,
      default: 0,
    },

    // ── Outreach Management ───────────────────────────────────────
    outreachStatus: {
      type: String,
      enum: ['not_contacted', 'identified', 'outreach_planned', 'contacted', 'responded', 'partnered', 'not_interested'],
      default: 'not_contacted',
    },
    outreachNotes: {
      type: String,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
      index: true,
    },

    // ── Last Update ───────────────────────────────────────────────
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'creators',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
creatorSchema.index({ averageContentScore: -1 });
creatorSchema.index({ followersCount: 1 });
creatorSchema.index({ isMicroCreator: 1, averageContentScore: -1 });
creatorSchema.index({ outreachStatus: 1 });
creatorSchema.index({ creatorType: 1 });

const Creator = mongoose.model('Creator', creatorSchema);

module.exports = Creator;
