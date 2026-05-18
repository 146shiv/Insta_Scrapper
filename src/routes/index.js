/**
 * Route Index
 * ─────────────────────────────────────────────────────────────────
 * Aggregates all route modules under the /api prefix.
 */

const express = require('express');
const scrapeRoutes = require('./scrape');
const postRoutes = require('./posts');
const creatorRoutes = require('./creators');
const hashtagRoutes = require('./hashtags');

const router = express.Router();

// ── Health check (also available at /api/health) ──────────────────────────────
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Studybo Instagram Intelligence API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Route Modules ─────────────────────────────────────────────────────────────
router.use('/scrape', scrapeRoutes);
router.use('/posts', postRoutes);
router.use('/creators', creatorRoutes);
router.use('/hashtags', hashtagRoutes);

module.exports = router;
