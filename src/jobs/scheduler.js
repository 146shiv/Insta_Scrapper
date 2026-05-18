/**
 * Cron Scheduler
 * ─────────────────────────────────────────────────────────────────
 * Runs the full scraping pipeline automatically on a schedule.
 * Default: every 2 hours (configurable via CRON_SCHEDULE env var).
 *
 * Pipeline: scrape → filter → rank → save → analytics
 *
 * Uses node-cron for scheduling.
 * Docs: https://github.com/node-cron/node-cron
 */

const cron = require('node-cron');
const { runPipeline } = require('../services/pipelineService');
const logger = require('../utils/logger');

// Whether a pipeline run is currently in progress (prevents overlapping runs)
let isRunning = false;

/**
 * Parse the default hashtags from environment variable.
 * @returns {string[]}
 */
const getDefaultHashtags = () => {
  const raw =
    process.env.DEFAULT_HASHTAGS ||
    'studygram,studywithme,neetprep,jee2026,upsc,productivity,deepwork,notetaking';
  return raw
    .split(',')
    .map((h) => h.trim().toLowerCase().replace(/^#/, ''))
    .filter(Boolean);
};

/**
 * Execute one full pipeline run.
 * Guards against concurrent runs using the isRunning flag.
 */
const runScheduledPipeline = async () => {
  if (isRunning) {
    logger.warn('⏭️  Skipping scheduled run — previous run still in progress');
    return;
  }

  isRunning = true;
  logger.info('⏰ Cron triggered: starting scheduled scraping pipeline...');

  try {
    const hashtags = getDefaultHashtags();
    const result = await runPipeline(hashtags);

    logger.info(
      `✅ Scheduled run complete — Fetched: ${result.rawFetched}, Saved: ${result.saved}, Skipped: ${result.duplicatesSkipped}`
    );
  } catch (err) {
    logger.error(`❌ Scheduled pipeline error: ${err.message}`);
  } finally {
    isRunning = false;
  }
};

/**
 * Start the cron scheduler.
 * Schedule is read from CRON_SCHEDULE env var.
 * Default: '0 * /2 * * *' (every 2 hours at minute 0)
 */
const startScheduler = () => {
  const schedule = process.env.CRON_SCHEDULE || '0 */2 * * *';

  // Validate the cron expression before registering
  if (!cron.validate(schedule)) {
    logger.error(`❌ Invalid CRON_SCHEDULE: "${schedule}". Scheduler not started.`);
    return;
  }

  cron.schedule(schedule, runScheduledPipeline, {
    scheduled: true,
    timezone: 'Asia/Kolkata', // IST timezone
  });

  logger.info(`⏰ Cron scheduler started — Schedule: "${schedule}" (IST)`);
  logger.info('   Next runs will appear in logs automatically.');
};

module.exports = { startScheduler, runScheduledPipeline };
