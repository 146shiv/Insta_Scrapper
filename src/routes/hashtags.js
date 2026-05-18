/**
 * Hashtag Routes
 * GET /api/hashtags/trending          — trending hashtags sorted by score
 * GET /api/hashtags/:hashtag          — single hashtag stats
 * GET /api/hashtags/:hashtag/history  — time-series history
 */

const express = require('express');
const { getTrendingHashtags, getHashtagStats, getHashtagHistory } = require('../controllers/hashtagController');

const router = express.Router();

router.get('/trending', getTrendingHashtags);
router.get('/:hashtag/history', getHashtagHistory);
router.get('/:hashtag', getHashtagStats);

module.exports = router;
