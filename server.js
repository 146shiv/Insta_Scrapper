/**
 * Studybo Instagram Intelligence — Main Server Entry Point
 * Start command: node server.js
 */

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message, err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
  process.exit(1);
});

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { connectDatabase } = require('./src/config/database');
const { validateEnv } = require('./src/config/env');
const routes = require('./src/routes/index');
const logger = require('./src/utils/logger');
const { startScheduler } = require('./src/jobs/scheduler');

validateEnv();

const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS ────────────────────────────────────────────────────────────────
// Allow all origins — this is an internal dashboard with no cookie/auth
// No credentials are used, so wildcard origin is safe and avoids
// CORS failures when the Vercel URL changes between deployments
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Root (Render health check pings GET / and HEAD /) ─────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Studybo Instagram Intelligence API' });
});

// ── Detailed Health Check ─────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Studybo Instagram Intelligence API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// ── Start server FIRST so Render health check gets an immediate 200 ───────────
// Then connect to MongoDB in the background.
// This prevents Render from killing the process because it thinks it's unhealthy
// during the ~1 second it takes for MongoDB Atlas to connect.
app.listen(PORT, () => {
  logger.info(`🚀 Studybo Intelligence API running on port ${PORT}`);
  logger.info(`📊 Health: http://localhost:${PORT}/health`);
  logger.info(`📡 API Base: http://localhost:${PORT}/api`);

  // Connect to MongoDB and start scheduler AFTER server is already listening
  connectDatabase()
    .then(() => {
      startScheduler();
    })
    .catch((err) => {
      logger.error(`Failed to connect to MongoDB: ${err.message}`);
      // Don't exit — server stays up for health checks, retries internally
    });
});
