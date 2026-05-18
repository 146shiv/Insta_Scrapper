/**
 * Studybo Instagram Intelligence — Main Server Entry Point
 * =========================================================
 * Bootstraps Express, connects to MongoDB, registers routes,
 * and starts the cron scheduler for automated scraping.
 *
 * Entry point: src/server.js
 * Start command: node src/server.js
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Paths are relative to src/ now
const { connectDatabase } = require('./config/database');
const { validateEnv } = require('./config/env');
const routes = require('./routes/index');
const logger = require('./utils/logger');
const { startScheduler } = require('./jobs/scheduler');

// ── Validate environment variables before anything else ──────────────────────
validateEnv();

const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS Configuration ────────────────────────────────────────────────────────
// In production: set FRONTEND_URL env var to your Vercel URL
// e.g. FRONTEND_URL=https://studybo-dashboard.vercel.app
const corsOptions = {
  origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:5173']
    : '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Use 'combined' in production (includes IP for Render logs), 'dev' locally
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Health Check (top-level, no /api prefix) ──────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Studybo Instagram Intelligence API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const bootstrap = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDatabase();

    // 2. Start HTTP server
    app.listen(PORT, () => {
      logger.info(`🚀 Studybo Intelligence API running on http://localhost:${PORT}`);
      logger.info(`📊 Health: http://localhost:${PORT}/health`);
      logger.info(`📡 API Base: http://localhost:${PORT}/api`);
    });

    // 3. Start cron scheduler (runs every 2 hours by default)
    startScheduler();
  } catch (err) {
    logger.error(`Failed to bootstrap server: ${err.message}`);
    process.exit(1);
  }
};

bootstrap();
