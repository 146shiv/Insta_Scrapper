/**
 * Environment Variable Validation
 * ─────────────────────────────────────────────────────────────────
 * Validates required environment variables at startup.
 * Fails fast with clear error messages if anything is missing.
 */

const logger = require('../utils/logger');

/**
 * List of required environment variables.
 * Add to this list as the system grows.
 */
const REQUIRED_VARS = [
  'MONGODB_URI',
  'APIFY_TOKEN',
];

/**
 * Validate all required environment variables are present.
 * Throws an error and exits if any are missing.
 */
const validateEnv = () => {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Please copy .env.example to .env and fill in all required values.');
    process.exit(1);
  }

  logger.info('✅ Environment variables validated');
};

/**
 * Get environment variable with optional default value.
 * @param {string} key - Environment variable name
 * @param {*} defaultValue - Default value if not set
 * @returns {string|undefined}
 */
const getEnv = (key, defaultValue = undefined) => {
  return process.env[key] || defaultValue;
};

module.exports = { validateEnv, getEnv };
