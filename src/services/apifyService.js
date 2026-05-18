/**
 * Apify Service
 * ─────────────────────────────────────────────────────────────────
 * Handles all communication with the Apify Instagram Scraper API.
 *
 * Flow:
 *  1. Build input object (hashtag URLs + config)
 *  2. Start an actor run via Apify API
 *  3. Poll for run completion
 *  4. Fetch dataset items
 *  5. Return raw post array
 *
 * NOTE: Uses apify/instagram-scraper actor.
 *       Change APIFY_ACTOR_ID in .env to switch actors.
 */

const axios = require('axios');
const logger = require('../utils/logger');

// ── Constants ─────────────────────────────────────────────────────────────────
const APIFY_BASE_URL = 'https://api.apify.com/v2';

// Poll interval in milliseconds (5 seconds)
const POLL_INTERVAL_MS = 5000;

// Maximum wait time for a run to complete (10 minutes)
const MAX_WAIT_MS = 600000;

/**
 * Build the Apify actor input object.
 * Generates Instagram hashtag explore URLs from raw hashtag names.
 *
 * @param {string[]} hashtags - Array of hashtag names (without #)
 * @param {Object} options - Optional overrides
 * @returns {Object} Apify actor input payload
 */
const buildActorInput = (hashtags, options = {}) => {
  const resultsType = options.resultsType || process.env.SCRAPE_RESULTS_TYPE || 'posts';
  const resultsLimit = parseInt(options.resultsLimit || process.env.SCRAPE_RESULTS_LIMIT || '50', 10);

  // Generate Instagram hashtag explore URLs
  const directUrls = hashtags.map(
    (tag) => `https://www.instagram.com/explore/tags/${tag.toLowerCase().replace(/^#/, '')}/`
  );

  return {
    directUrls,
    resultsType,       // "posts" | "reels" | "stories" — change in .env
    resultsLimit,
    proxy: {
      useApifyProxy: true,
      apifyProxyGroups: ['RESIDENTIAL'],
    },
    ...options.extraInput, // Allow caller to inject extra actor-specific params
  };
};

/**
 * Start an Apify actor run.
 *
 * @param {Object} input - Actor input payload
 * @returns {Promise<Object>} Run object with runId and defaultDatasetId
 */
const startActorRun = async (input) => {
  const actorId = (process.env.APIFY_ACTOR_ID || 'apify~instagram-scraper').replace('/', '~');
  const url = `${APIFY_BASE_URL}/acts/${actorId}/runs?token=${process.env.APIFY_TOKEN}`;

  logger.info(`Starting Apify actor run: ${actorId}`);

  const response = await axios.post(url, input, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  const run = response.data.data;
  logger.info(`Actor run started — Run ID: ${run.id}`);

  return run;
};

/**
 * Poll an actor run until it reaches a terminal status.
 *
 * @param {string} runId - Apify run ID
 * @returns {Promise<Object>} Completed run object
 */
const waitForRunToComplete = async (runId) => {
  const startTime = Date.now();
  let dotCount = 0;

  while (Date.now() - startTime < MAX_WAIT_MS) {
    const url = `${APIFY_BASE_URL}/actor-runs/${runId}?token=${process.env.APIFY_TOKEN}`;
    const response = await axios.get(url, { timeout: 15000 });
    const run = response.data.data;

    const { status } = run;

    if (status === 'SUCCEEDED') {
      logger.info(`✅ Actor run ${runId} SUCCEEDED`);
      return run;
    }

    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      throw new Error(`Apify actor run ${runId} ended with status: ${status}`);
    }

    // Still running — log progress dots
    dotCount++;
    if (dotCount % 6 === 0) {
      // Every ~30 seconds
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      logger.info(`⏳ Waiting for run ${runId}... (${elapsed}s elapsed, status: ${status})`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Apify run ${runId} timed out after ${MAX_WAIT_MS / 1000}s`);
};

/**
 * Fetch all items from an Apify dataset.
 *
 * @param {string} datasetId - Apify dataset ID from the run
 * @returns {Promise<Array>} Array of scraped post objects
 */
const fetchDatasetItems = async (datasetId) => {
  const url = `${APIFY_BASE_URL}/datasets/${datasetId}/items`;

  const response = await axios.get(url, {
    params: {
      token: process.env.APIFY_TOKEN,
      format: 'json',
      clean: true,
    },
    timeout: 60000,
  });

  const items = response.data;
  logger.info(`📦 Fetched ${items.length} items from dataset ${datasetId}`);

  return items;
};

/**
 * Main entry point: run a full scrape for given hashtags.
 *
 * @param {string[]} hashtags - Hashtag names to scrape
 * @param {Object} options - Optional configuration overrides
 * @returns {Promise<Array>} Raw scraped posts from Apify
 */
const scrapeHashtags = async (hashtags, options = {}) => {
  if (!hashtags || hashtags.length === 0) {
    throw new Error('At least one hashtag must be provided');
  }

  logger.scrapeStarted(hashtags);

  // 1. Build input
  const input = buildActorInput(hashtags, options);
  logger.debug(`Apify input: ${JSON.stringify(input, null, 2)}`);

  // 2. Start the run
  const run = await startActorRun(input);

  // 3. Wait for completion
  const completedRun = await waitForRunToComplete(run.id);

  // 4. Fetch results
  const items = await fetchDatasetItems(completedRun.defaultDatasetId);

  // 5. Attach run metadata to each item for traceability
  const enrichedItems = items.map((item) => ({
    ...item,
    _scrapeRunId: run.id,
    _scrapedAt: new Date().toISOString(),
  }));

  return enrichedItems;
};

/**
 * Helper: sleep for given milliseconds.
 * @param {number} ms
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { scrapeHashtags, buildActorInput };
