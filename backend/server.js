const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/environment');
const logger = require('./utils/logger');
const { setupApplication } = require('./utils/setup');

// Import routes
const uploadRoutes = require('./routes/upload');
const processRoutes = require('./routes/process');
const elevenLabsRoutes = require('./routes/elevenlabs');
const processingRoutes = require('./routes/processing');
const downloadRoutes = require('./routes/download');
// Phase 7 routes
const editRoutes = require('./routes/edit');
const templatesRoutes = require('./routes/templates');
const ttsEnhancedRoutes = require('./routes/tts-enhanced');
// SFX Module routes
const sfxRoutes = require('./routes/sfx-routes');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files - serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/process', processRoutes);
app.use('/api/elevenlabs', elevenLabsRoutes);
app.use('/api/processing', processingRoutes);
app.use('/api/download', downloadRoutes);
// Phase 7 routes
app.use('/api/edit', editRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/tts', ttsEnhancedRoutes);
// SFX Module routes
app.use(sfxRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: '1.0.0'
  });
});

// API status endpoint
app.get('/api/status', async (req, res) => {
  try {
    res.json({
      server: 'running',
      elevenLabs: {
        configured: !!config.elevenLabs.apiKey,
        quota: config.elevenLabs.subscriptionQuota
      },
      directories: {
        upload: config.files.uploadDir,
        output: config.files.outputDir
      }
    });
  } catch (error) {
    logger.error('Status check failed:', error);
    res.status(500).json({ error: 'Status check failed' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
  try {
    // Run setup tasks
    await setupApplication();
    
    // Start listening
    app.listen(config.port, () => {
      logger.success(`Server running on http://localhost:${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info('Press Ctrl+C to stop');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer(); 