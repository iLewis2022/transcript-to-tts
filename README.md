# Campaign TTS Processor

Convert D&D campaign scripts to individual character audio files using ElevenLabs TTS.

## Project Status

### Current Phase: 1 - Core Infrastructure
**Progress**: 20%

### Completed Checkpoints
- [x] 1_1_1 Initialize Project - 2024-12-19 15:47
- [x] 1_1_2 Dependencies & Environment - 2024-12-19 16:10
- [x] 1_1_3 Basic Server Setup - 2024-12-19 16:18
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

## Project Structure

```
campaign-tts-processor/
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js
│       ├── parser.js
│       ├── speaker-mapper.js
│       └── processor.js
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── upload.js
│   │   ├── process.js
│   │   └── elevenlabs.js
│   └── utils/
│       ├── script-parser.js
│       ├── cost-calculator.js
│       └── file-manager.js
├── outputs/
│   └── [episode_folders]/
├── .env.example
├── package.json
└── README.md
```

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and add your ElevenLabs API key
3. Run `npm install`
4. Run `npm run dev` for backend development
5. Run `npm run frontend:dev` for frontend development (Vite)

## Development Scripts

- `npm start` - Start production server
- `npm run dev` - Start backend in development mode (nodemon)
- `npm run frontend:dev` - Start frontend development server (Vite)
- `npm run frontend:build` - Build frontend for production
- `npm run lint` - Run ESLint

## Development Log

### Phase 1.1.1 - Initialize Project - 2024-12-19 15:47
- [x] Created directory structure (frontend/, backend/, outputs/)
- [x] Created all initial files (HTML, CSS, JS, server files)
- [x] Updated package.json with TTS processor dependencies
- [x] Set up environment configuration (.env.example)
- [x] Updated .gitignore for clean repository
- [x] Created initial README with progress tracking

**Issues Encountered:**
- Adapted existing React/Vite project structure instead of creating new project
- Maintained both frontend (Vite/React) and backend (Express) capabilities
- Changed package.json type from "module" to "commonjs" for Express compatibility

**Next Steps:**
- Install dependencies (1_1_2)
- Set up basic server functionality (1_1_3)

### Phase 1.1.2 - Dependencies & Environment - 2024-12-19 16:10
- [x] Installed additional dependencies (mammoth, express-fileupload, archiver, @types/node)
- [x] Created backend/config/environment.js with comprehensive configuration
- [x] Set up logger utility with color-coded output
- [x] Created application setup utility with directory creation
- [x] Updated .env.example with all required variables
- [x] Created and tested environment configuration

**Issues Encountered:**
- .env file encoding issue causing environment variables not to load
- Fixed by recreating .env file with proper UTF8 encoding using PowerShell
- Environment validation working correctly with color-coded logger output

**Next Steps:**
- Basic server setup (1_1_3)

### Phase 1.1.3 - Basic Server Setup - 2024-12-19 16:18
- [x] Updated main server.js with comprehensive configuration and middleware
- [x] Integrated config, logger, and setup utilities into server startup
- [x] Updated all route files to use config and logger properly
- [x] Implemented health check (/api/health) and status (/api/status) endpoints
- [x] Created working route stubs for upload, process, and elevenlabs
- [x] Built simple frontend status page with real-time server monitoring
- [x] Added dark theme CSS with modern design
- [x] Tested all API endpoints successfully

**Server Features:**
- Express server with CORS and proper error handling
- Automatic directory creation on startup
- Request logging with color-coded output
- Graceful shutdown handling
- Health monitoring and system status endpoints

**Frontend Features:**
- Real-time server status checking
- System information display
- Auto-refresh every 5 seconds
- Modern dark theme with gradient headers

**Next Steps:**
- Frontend upload interface (1_2_1)

---
*Last updated: 2024-12-19 16:18*
