/**
 * Logger Utility
 * ─────────────────────────────────────────────────────────────────
 * Provides a structured, consistent logging interface.
 * Uses timestamps and log levels for easy filtering in production.
 *
 * Levels: info | warn | error | debug | success
 */

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

/**
 * Format a log message with timestamp, level, and color.
 * @param {string} level - Log level label
 * @param {string} color - ANSI color code
 * @param {string} message - Log message
 */
const formatLog = (level, color, message) => {
  const timestamp = new Date().toISOString();
  const prefix = `${COLORS.gray}[${timestamp}]${COLORS.reset}`;
  const levelTag = `${color}${COLORS.bright}[${level.toUpperCase()}]${COLORS.reset}`;
  return `${prefix} ${levelTag} ${message}`;
};

const logger = {
  info: (message) => {
    console.log(formatLog('info', COLORS.cyan, message));
  },

  success: (message) => {
    console.log(formatLog('success', COLORS.green, message));
  },

  warn: (message) => {
    console.warn(formatLog('warn', COLORS.yellow, message));
  },

  error: (message) => {
    console.error(formatLog('error', COLORS.red, message));
  },

  debug: (message) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatLog('debug', COLORS.magenta, message));
    }
  },

  /**
   * Log the start of a scraping job with metadata.
   * @param {string[]} hashtags - Hashtags being scraped
   */
  scrapeStarted: (hashtags) => {
    console.log(formatLog('scrape', COLORS.cyan, `🔍 Scrape started for hashtags: [${hashtags.join(', ')}]`));
  },

  /**
   * Log scrape completion summary.
   * @param {number} raw - Number of raw posts fetched
   * @param {number} saved - Number of posts saved
   * @param {number} skipped - Number of duplicates skipped
   */
  scrapeCompleted: (raw, saved, skipped) => {
    console.log(formatLog('scrape', COLORS.green, `✅ Scrape completed — Raw: ${raw} | Saved: ${saved} | Duplicates skipped: ${skipped}`));
  },

  /**
   * Log when a duplicate post is skipped.
   * @param {string} shortCode - The duplicate post shortCode
   */
  duplicateSkipped: (shortCode) => {
    console.log(formatLog('dedup', COLORS.yellow, `⏭️  Duplicate skipped: ${shortCode}`));
  },

  /**
   * Log filtering summary.
   * @param {number} total - Total posts processed
   * @param {number} passed - Posts that passed the filter
   * @param {number} rejected - Posts that were rejected
   */
  filterSummary: (total, passed, rejected) => {
    console.log(formatLog('filter', COLORS.cyan, `🔎 Filter complete — Total: ${total} | Passed: ${passed} | Rejected: ${rejected}`));
  },
};

module.exports = logger;
