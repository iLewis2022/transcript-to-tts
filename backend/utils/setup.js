const fs = require('fs').promises;
const path = require('path');
const config = require('../config/environment');
const logger = require('./logger');

async function ensureDirectories() {
  const directories = [
    config.files.uploadDir,
    config.files.outputDir,
    config.paths.temp
  ];
  
  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
      logger.debug(`Ensured directory exists: ${dir}`);
    } catch (error) {
      logger.error(`Failed to create directory ${dir}:`, error.message);
      throw error;
    }
  }
}

async function setupApplication() {
  logger.info('Starting application setup...');
  
  try {
    // Ensure required directories exist
    await ensureDirectories();
    
    // Validate ElevenLabs API key format
    if (!config.elevenLabs.apiKey.startsWith('sk_')) {
      logger.warn('ElevenLabs API key might be invalid (should start with "sk_")');
    }
    
    logger.success('Application setup completed');
  } catch (error) {
    logger.error('Application setup failed:', error);
    process.exit(1);
  }
}

module.exports = { setupApplication }; 