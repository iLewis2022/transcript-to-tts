# Phase 1.1.2 - Dependencies & Environment Setup

## CURSOR INSTRUCTIONS
**CRITICAL**: Update README.md after completing this checkpoint:
- [x] 1_1_2 Dependencies & Environment - [timestamp]
- Update progress percentage to ~15%
- Note any dependency version issues

## Step 1: Additional Dependencies

We need a few more packages for file processing. Run:

```bash
npm install --save mammoth express-fileupload archiver
npm install --save-dev @types/node
```

Updated `package.json` dependencies section:

```json
"dependencies": {
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "multer": "^1.4.5-lts.1",
  "elevenlabs": "^0.4.0",
  "mammoth": "^1.6.0",
  "express-fileupload": "^1.4.1",
  "archiver": "^6.0.1"
}
```

## Step 2: Environment Configuration Module

Create `backend/config/environment.js`:

```javascript
const path = require('path');
require('dotenv').config();

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
  }
};
```

## Step 3: Create Config Directory

```bash
mkdir backend/config
touch backend/config/environment.js
```

## Step 4: Logger Setup

Create `backend/utils/logger.js`:

```javascript
const isDev = process.env.NODE_ENV === 'development';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const logger = {
  info: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`${colors.blue}[INFO]${colors.reset} ${timestamp}: ${message}`, ...args);
  },
  
  success: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${timestamp}: ${message}`, ...args);
  },
  
  warn: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.warn(`${colors.yellow}[WARN]${colors.reset} ${timestamp}: ${message}`, ...args);
  },
  
  error: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.error(`${colors.red}[ERROR]${colors.reset} ${timestamp}: ${message}`, ...args);
  },
  
  debug: (message, ...args) => {
    if (isDev) {
      const timestamp = new Date().toISOString();
      console.log(`${colors.magenta}[DEBUG]${colors.reset} ${timestamp}: ${message}`, ...args);
    }
  },
  
  processing: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`${colors.cyan}[PROCESSING]${colors.reset} ${timestamp}: ${message}`, ...args);
  }
};

module.exports = logger;
```

## Step 5: Create Directories on Startup

Create `backend/utils/setup.js`:

```javascript
const fs = require('fs').promises;
const path = require('path');
const config = require('../config/environment');
const logger = require('./logger');

async function ensureDirectories() {
  const directories = [
    config.files.uploadDir,
    config.files.outputDir,
    path.join(config.files.uploadDir, 'temp')
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
```

## Step 6: Update .env.example with New Variables

Update `.env.example`:

```
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_SUBSCRIPTION_QUOTA=1000000
ELEVENLABS_MODEL=eleven_monolingual_v1

# Voice Settings
VOICE_STABILITY=0.75
VOICE_SIMILARITY=0.75
VOICE_STYLE=0.5
VOICE_SPEAKER_BOOST=true

# Server Configuration
PORT=3000
NODE_ENV=development

# File Storage
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
OUTPUT_DIR=./outputs

# Processing Configuration
MAX_CHUNK_SIZE=1000
MIN_CHUNK_SIZE=700
RETRY_ATTEMPTS=3
RETRY_DELAY=1000

# Cost Configuration (per character)
COST_PER_CHARACTER=0.00003
WARNING_THRESHOLD_SOFT=100
WARNING_THRESHOLD_HARD=250
```

## Step 7: Test Environment Setup

Create `backend/test-env.js`:

```javascript
const config = require('./config/environment');
const logger = require('./utils/logger');

logger.info('Testing environment configuration...');
logger.info('=================================');
logger.info(`Port: ${config.port}`);
logger.info(`Environment: ${config.nodeEnv}`);
logger.info(`ElevenLabs API Key: ${config.elevenLabs.apiKey.substring(0, 7)}...`);
logger.info(`Subscription Quota: ${config.elevenLabs.subscriptionQuota.toLocaleString()} characters`);
logger.info(`Upload Directory: ${config.files.uploadDir}`);
logger.info(`Output Directory: ${config.files.outputDir}`);
logger.info(`Max File Size: ${(config.files.maxSize / 1024 / 1024).toFixed(2)}MB`);
logger.info('=================================');
logger.success('Environment configuration loaded successfully!');
```

Run test:
```bash
node backend/test-env.js
```

## Checkpoint 1.1.2 Complete! ✓

You've successfully:
1. Installed all required dependencies
2. Created comprehensive environment configuration
3. Set up logging system with color coding
4. Built application setup utilities
5. Created test script to verify environment

**NEXT**: Update README.md, then proceed to 1_1_3 Basic Server Setup.

**REMINDER FOR CURSOR**: 
- Update README checkpoint: `- [x] 1_1_2 Dependencies & Environment - [timestamp]`
- Progress: ~15%
- Note: Environment variables properly validated, directories auto-created