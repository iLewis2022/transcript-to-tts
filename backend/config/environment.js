const path = require('path');
console.log('Loading environment config...');
const envPath = path.resolve(__dirname, '../../.env');
console.log('Looking for .env at:', envPath);
require('dotenv').config();
console.log('API Key from env:', process.env.ELEVENLABS_API_KEY ? 'Found' : 'NOT FOUND');

// Validate required environment variables
const requiredEnvVars = [
  'ELEVENLABS_API_KEY',
  'ELEVENLABS_SUBSCRIPTION_QUOTA'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please check your .env file');
  process.exit(1);
}

module.exports = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // ElevenLabs Configuration
  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    subscriptionQuota: parseInt(process.env.ELEVENLABS_SUBSCRIPTION_QUOTA) || 1000000,
    model: process.env.ELEVENLABS_MODEL || 'eleven_monolingual_v1',
    voiceSettings: {
      stability: parseFloat(process.env.VOICE_STABILITY) || 0.75,
      similarity_boost: parseFloat(process.env.VOICE_SIMILARITY) || 0.75,
      style: parseFloat(process.env.VOICE_STYLE) || 0.5,
      use_speaker_boost: process.env.VOICE_SPEAKER_BOOST !== 'false'
    }
  },
  
  // File Configuration
  files: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
    outputDir: path.resolve(process.env.OUTPUT_DIR || './outputs'),
    allowedTypes: ['text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
  },
  
  // Path Configuration - Phase 6
  paths: {
    uploads: path.resolve(process.env.UPLOAD_DIR || './uploads'),
    outputs: path.resolve(process.env.OUTPUT_DIR || './outputs'),
    temp: path.resolve(process.env.TEMP_DIR || './temp')
  },
  
  // Processing Configuration
  processing: {
    maxChunkSize: parseInt(process.env.MAX_CHUNK_SIZE) || 1000,
    minChunkSize: parseInt(process.env.MIN_CHUNK_SIZE) || 700,
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY) || 1000
  },
  
  // Cost Configuration
  costs: {
    perCharacter: parseFloat(process.env.COST_PER_CHARACTER) || 0.00003, // $30 per 1M chars
    warningThresholds: {
      soft: parseFloat(process.env.WARNING_THRESHOLD_SOFT) || 100,
      hard: parseFloat(process.env.WARNING_THRESHOLD_HARD) || 250
    }
  },

  // Session Configuration
  session: {
    cleanupHours: parseInt(process.env.SESSION_CLEANUP_HOURS) || 24
  }
}; 