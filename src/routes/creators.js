/**
 * Creator Routes
 * GET /api/creators/top         — top creators by score
 * GET /api/creators/micro       — micro-creators only
 * GET /api/creators/export      — CSV download
 * GET /api/creators/:username   — single creator profile
 */

const express = require('express');
const {
  getTopCreators,
  getMicroCreators,
  getCreatorByUsername,
  exportCreators,
} = require('../controllers/creatorController');

const router = express.Router();

// NOTE: Static routes must be defined BEFORE dynamic /:username routes
router.get('/top', getTopCreators);
router.get('/micro', getMicroCreators);
router.get('/export', exportCreators);
router.get('/:username', getCreatorByUsername);

module.exports = router;
