/**
 * Scrape Routes
 * POST /api/scrape — trigger manual scraping pipeline
 */

const express = require('express');
const { triggerScrape } = require('../controllers/scrapeController');

const router = express.Router();

// POST /api/scrape
router.post('/', triggerScrape);

module.exports = router;
