# Phase 1.1.3 - Basic Server Setup

## CURSOR INSTRUCTIONS
**CRITICAL**: Update README.md after completing this checkpoint:
- [x] 1_1_3 Basic Server Setup - [timestamp]
- Update progress percentage to ~20%
- Note server running successfully on configured port

## Step 1: Main Server File

Update `backend/server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/environment');
const logger = require('./utils/logger');
const { setupApplication } = require('./utils/setup');

// Import routes (we'll create these next)
const uploadRoutes = require('./routes/upload');
const processRoutes = require('./routes/process');
const elevenLabsRoutes = require('./routes/elevenlabs');

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
```

## Step 2: Create Route Stubs

Create `backend/routes/upload.js`:

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config/environment');
const logger = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(config.files.uploadDir, 'temp');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: config.files.maxSize
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.txt', '.md', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`));
    }
  }
});

// Upload endpoint
router.post('/', upload.single('script'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    logger.info(`File uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
    
    // Return file info
    res.json({
      success: true,
      file: {
        id: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: req.file.path
      }
    });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get uploaded file info
router.get('/:fileId', async (req, res) => {
  try {
    const filePath = path.join(config.files.uploadDir, 'temp', req.params.fileId);
    const stats = await fs.stat(filePath);
    
    res.json({
      id: req.params.fileId,
      size: stats.size,
      uploaded: stats.birthtime
    });
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

module.exports = router;
```

Create `backend/routes/process.js`:

```javascript
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Process script endpoint (stub for now)
router.post('/parse', async (req, res) => {
  try {
    const { fileId } = req.body;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID required' });
    }
    
    logger.info(`Processing parse request for file: ${fileId}`);
    
    // TODO: Implement actual parsing in Phase 2
    res.json({
      success: true,
      message: 'Parser not yet implemented',
      fileId: fileId
    });
  } catch (error) {
    logger.error('Parse error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get processing status
router.get('/status/:sessionId', async (req, res) => {
  try {
    // TODO: Implement status tracking
    res.json({
      sessionId: req.params.sessionId,
      status: 'pending',
      progress: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

Create `backend/routes/elevenlabs.js`:

```javascript
const express = require('express');
const router = express.Router();
const config = require('../config/environment');
const logger = require('../utils/logger');

// Get available voices (stub for now)
router.get('/voices', async (req, res) => {
  try {
    logger.info('Fetching ElevenLabs voices');
    
    // TODO: Implement actual ElevenLabs API call
    res.json({
      voices: [
        { id: 'demo1', name: 'Demo Voice 1' },
        { id: 'demo2', name: 'Demo Voice 2' }
      ]
    });
  } catch (error) {
    logger.error('Failed to fetch voices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get subscription usage
router.get('/usage', async (req, res) => {
  try {
    // TODO: Implement actual usage tracking
    res.json({
      quota: config.elevenLabs.subscriptionQuota,
      used: 0,
      remaining: config.elevenLabs.subscriptionQuota
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test voice preview
router.post('/preview', async (req, res) => {
  try {
    const { voiceId, text } = req.body;
    
    if (!voiceId || !text) {
      return res.status(400).json({ error: 'Voice ID and text required' });
    }
    
    // TODO: Implement actual preview generation
    res.json({
      success: true,
      message: 'Preview generation not yet implemented'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

## Step 3: Create Simple Frontend Test

Update `frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Campaign TTS Processor</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>Campaign TTS Processor</h1>
            <p>Convert D&D scripts to character audio files</p>
        </header>
        
        <main>
            <div class="status-card">
                <h2>Server Status</h2>
                <div id="server-status">Checking...</div>
            </div>
            
            <div class="info-card">
                <h2>System Info</h2>
                <div id="system-info">Loading...</div>
            </div>
        </main>
    </div>
    
    <script>
        // Test server connection
        async function checkStatus() {
            try {
                const response = await fetch('/api/health');
                const data = await response.json();
                
                document.getElementById('server-status').innerHTML = `
                    <span class="status-ok">✓ Server Running</span>
                    <br>Environment: ${data.environment}
                    <br>Version: ${data.version}
                `;
                
                // Get detailed status
                const statusResponse = await fetch('/api/status');
                const status = await statusResponse.json();
                
                document.getElementById('system-info').innerHTML = `
                    ElevenLabs: ${status.elevenLabs.configured ? '✓ Configured' : '✗ Not configured'}
                    <br>Quota: ${status.elevenLabs.quota.toLocaleString()} characters
                    <br>Upload Dir: ${status.directories.upload}
                `;
            } catch (error) {
                document.getElementById('server-status').innerHTML = 
                    '<span class="status-error">✗ Server Not Responding</span>';
            }
        }
        
        // Check status on load
        checkStatus();
        
        // Refresh every 5 seconds
        setInterval(checkStatus, 5000);
    </script>
</body>
</html>
```

Update `frontend/css/styles.css`:

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #0a0a0a;
    color: #e0e0e0;
    line-height: 1.6;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header {
    text-align: center;
    margin-bottom: 40px;
    padding: 40px 0;
    border-bottom: 1px solid #333;
}

header h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

header p {
    color: #999;
    font-size: 1.1rem;
}

main {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
}

.status-card, .info-card {
    background: #1a1a1a;
    border-radius: 8px;
    padding: 20px;
    border: 1px solid #333;
}

.status-card h2, .info-card h2 {
    margin-bottom: 15px;
    color: #667eea;
}

.status-ok {
    color: #4ade80;
    font-weight: bold;
}

.status-error {
    color: #f87171;
    font-weight: bold;
}

#server-status, #system-info {
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    line-height: 1.8;
}
```

## Step 4: Test the Server

1. Make sure you have created a `.env` file from `.env.example`
2. Add your ElevenLabs API key to `.env`
3. Run the server:

```bash
npm run dev
```

4. Open browser to `http://localhost:3000`
5. You should see the status page with server info

## Step 5: Test API Endpoints

Test with curl or your API client:

```bash
# Health check
curl http://localhost:3000/api/health

# Status check
curl http://localhost:3000/api/status

# Voices list (stub)
curl http://localhost:3000/api/elevenlabs/voices
```

## Checkpoint 1.1.3 Complete! ✓

You've successfully:
1. Created Express server with proper middleware
2. Set up API route structure
3. Implemented health check and status endpoints
4. Created basic frontend status page
5. Server runs with hot reload via nodemon

**NEXT**: Update README.md, then proceed to 1_2_1 Frontend Upload Interface.

**REMINDER FOR CURSOR**: 
- Update README: `- [x] 1_1_3 Basic Server Setup - [timestamp]`
- Progress: ~20%
- Note: Server running successfully, all routes responding