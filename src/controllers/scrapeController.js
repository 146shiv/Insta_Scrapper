/**
 * Scrape Controller
 * ─────────────────────────────────────────────────────────────────
 * Handles POST /api/scrape — triggers the full scraping pipeline.
 * Accepts a list of hashtags in the request body.
 */

const { runPipeline } = require('../services/pipelineService');
const logger = require('../utils/logger');

// Default hashtags from environment variable (comma-separated)
const getDefaultHashtags = () => {
  const raw = process.env.DEFAULT_HASHTAGS || 'studygram,studywithme,neetprep,jee2026,upsc,productivity,deepwork,notetaking';
  return raw.split(',').map((h) => h.trim()).filter(Boolean);
};

/**
 * POST /api/scrape
 * Trigger a manual scraping run.
 *
 * Body:
 *  {
 *    hashtags: string[]   // Required: at least 1
 *    resultsType: string  // Optional: "posts" | "reels" | "stories"
 *    resultsLimit: number // Optional: max results per hashtag
 *  }
 */
const triggerScrape = async (req, res) => {
  try {
    let { hashtags, resultsType, resultsLimit } = req.body;

    // Fall back to default hashtags if none provided
    if (!hashtags || !Array.isArray(hashtags) || hashtags.length === 0) {
      hashtags = getDefaultHashtags();
      logger.info('No hashtags provided — using defaults');
    }

    // Sanitize hashtags (remove # prefix if present)
    hashtags = hashtags.map((h) => h.replace(/^#/, '').trim().toLowerCase());

    logger.info(`Manual scrape triggered for: [${hashtags.join(', ')}]`);

    // Run the pipeline (this will take several minutes)
    const result = await runPipeline(hashtags, {
      resultsType: resultsType || process.env.SCRAPE_RESULTS_TYPE || 'posts',
      resultsLimit: resultsLimit || parseInt(process.env.SCRAPE_RESULTS_LIMIT || '50', 10),
    });

    return res.status(200).json({
      success: true,
      message: 'Scraping pipeline completed successfully',
      data: result,
    });
  } catch (err) {
    logger.error(`Scrape controller error: ${err.message}`);
    return res.status(500).json({
      success: false,
      error: 'Scraping pipeline failed',
      message: err.message,
    });
  }
};

module.exports = { triggerScrape };
