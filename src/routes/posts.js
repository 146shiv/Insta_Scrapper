/**
 * Post Routes
 * GET /api/posts/top              — top ranked posts
 * GET /api/posts/reels            — reel posts only
 * GET /api/posts/trending-reels   — trending productivity/discipline reels (with recency + cross-hashtag filters)
 * GET /api/posts/carousels        — carousel posts only
 * GET /api/posts/export           — CSV download
 */

const express = require('express');
const { getTopPosts, getReels, getCarousels, exportPosts, getTrendingReels } = require('../controllers/postController');

const router = express.Router();

router.get('/top', getTopPosts);
router.get('/trending-reels', getTrendingReels);
router.get('/reels', getReels);
router.get('/carousels', getCarousels);
router.get('/export', exportPosts);

module.exports = router;
