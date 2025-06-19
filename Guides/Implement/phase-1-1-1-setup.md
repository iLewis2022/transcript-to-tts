# Phase 1.1.1 - Initialize Project Structure

## CURSOR INSTRUCTIONS
**CRITICAL**: You MUST update README.md after completing this checkpoint with:
- [x] 1_1_1 Initialize Project - [timestamp]
- Document any issues or deviations
- Update progress percentage

## Step 1: Create Project Directory Structure

Run these commands in your terminal:

```bash
mkdir campaign-tts-processor
cd campaign-tts-processor

# Create frontend directories
mkdir -p frontend/css frontend/js

# Create backend directories
mkdir -p backend/routes backend/utils

# Create output directory
mkdir outputs

# Create initial files
touch frontend/index.html
touch frontend/css/styles.css
touch frontend/js/app.js
touch frontend/js/parser.js
touch frontend/js/speaker-mapper.js
touch frontend/js/processor.js

touch backend/server.js
touch backend/routes/upload.js
touch backend/routes/process.js
touch backend/routes/elevenlabs.js
touch backend/utils/script-parser.js
touch backend/utils/cost-calculator.js
touch backend/utils/file-manager.js

touch .env.example
touch .gitignore
touch package.json
touch README.md
```

## Step 2: Initialize package.json

Create `package.json` with this content:

```json
{
  "name": "campaign-tts-processor",
  "version": "1.0.0",
  "description": "Convert D&D campaign scripts to character audio files using ElevenLabs TTS",
  "main": "backend/server.js",
  "scripts": {
    "start": "node backend/server.js",
    "dev": "nodemon backend/server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["tts", "elevenlabs", "dnd", "audio", "processing"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "multer": "^1.4.5-lts.1",
    "elevenlabs": "^0.4.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

## Step 3: Create .env.example

Create `.env.example`:

```
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_SUBSCRIPTION_QUOTA=1000000

# Server Configuration
PORT=3000
NODE_ENV=development

# File Storage
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
OUTPUT_DIR=./outputs
```

## Step 4: Create .gitignore

Create `.gitignore`:

```
# Dependencies
node_modules/
package-lock.json

# Environment
.env
.env.local
.env.production

# Uploads and outputs
uploads/
outputs/
*.mp3
*.wav

# OS Files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
logs/
*.log
npm-debug.log*

# Temporary files
tmp/
temp/
*.tmp
```

## Step 5: Create Initial README.md

Create `README.md`:

```markdown
# Campaign TTS Processor

Convert D&D campaign scripts to individual character audio files using ElevenLabs TTS.

## Project Status

### Current Phase: 1 - Core Infrastructure
**Progress**: 5%

### Completed Checkpoints
- [ ] 1_1_1 Initialize Project
- [ ] 1_1_2 Dependencies & Environment
- [ ] 1_1_3 Basic Server Setup
- [ ] 1_2_1 Frontend Upload Interface
- [ ] 1_2_2 File Processing Pipeline
- [ ] 1_2_3 Initial File Preview

### Phase Breakdown
- [ ] Phase 1: Core Infrastructure
- [ ] Phase 2: Script Parsing Engine
- [ ] Phase 3: Speaker-to-Voice Mapping
- [ ] Phase 4: Cost Calculation & Warnings
- [ ] Phase 5: Processing Engine
- [ ] Phase 6: File Management & Output
- [ ] Phase 7: Advanced Features
- [ ] Phase 8: Testing & Deployment

## Features
- Parse both `**NAME:**` and `NAME:` speaker formats
- Smart detection of stage directions (italics)
- Individual numbered audio files per character
- ElevenLabs subscription quota tracking
- Cost warnings (soft limits, no hard stops)
- Professional DAW-ready output

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and add your ElevenLabs API key
3. Run `npm install`
4. Run `npm run dev` for development

## Development Log

### Phase 1.1.1 - Initialize Project
- [ ] Created directory structure
- [ ] Initialized package.json
- [ ] Set up environment files
- [ ] Created initial README

---
*Last updated: [timestamp]*
```

## Step 6: Install Dependencies

Run in terminal:

```bash
npm install
```

## Checkpoint 1.1.1 Complete! ✓

You've successfully:
1. Created the complete directory structure
2. Initialized package.json with all dependencies
3. Set up environment configuration
4. Created .gitignore for clean repository
5. Started README with progress tracking

**NEXT**: Update README.md to mark this checkpoint complete with timestamp, then proceed to 1_1_2 Dependencies & Environment setup.

**REMINDER FOR CURSOR**: 
- Mark checkbox: `- [x] 1_1_1 Initialize Project - [timestamp]`
- Update progress percentage to ~10%
- Document any issues encountered