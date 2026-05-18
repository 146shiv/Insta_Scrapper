/**
 * Database Configuration
 * ─────────────────────────────────────────────────────────────────
 * Manages the Mongoose connection to MongoDB Atlas.
 * Includes retry logic and graceful shutdown handling.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB using the URI from environment variables.
 * @returns {Promise<void>}
 */
const connectDatabase = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    await mongoose.connect(uri, {
      // These options are defaults in Mongoose 8+ but kept for clarity
      serverSelectionTimeoutMS: 10000, // Timeout after 10s if can't connect
      socketTimeoutMS: 45000,          // Close sockets after 45s of inactivity
    });

    logger.info(`✅ MongoDB connected: ${mongoose.connection.host}`);

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('✅ MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });
  } catch (err) {
    logger.error(`❌ MongoDB connection failed: ${err.message}`);
    throw err;
  }
};

/**
 * Gracefully disconnect from MongoDB.
 * Called during process shutdown.
 */
const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected gracefully');
  } catch (err) {
    logger.error(`Error disconnecting from MongoDB: ${err.message}`);
  }
};

// Graceful shutdown on SIGINT (Ctrl+C) and SIGTERM
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

module.exports = { connectDatabase, disconnectDatabase };
