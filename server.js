/**
 * Studybo Instagram Intelligence — Main Server Entry Point
 * =========================================================
 * Start command: node server.js
 */

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

// ── CORS ──────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:5173']
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Root Route (Render pings GET/HEAD / for uptime checks by default) ─────────
// Without this, Render gets a 404, marks the service unhealthy, and restarts it
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Studybo Instagram Intelligence API' });
});

// ── Health Check (detailed) ───────────────────────────────────────────────────
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

const bootstrap = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      logger.info(`🚀 Studybo Intelligence API running on http://localhost:${PORT}`);
      logger.info(`📊 Health: http://localhost:${PORT}/health`);
      logger.info(`📡 API Base: http://localhost:${PORT}/api`);
    });
    startScheduler();
  } catch (err) {
    logger.error(`Failed to bootstrap server: ${err.message}`);
    process.exit(1);
  }
};

bootstrap();
