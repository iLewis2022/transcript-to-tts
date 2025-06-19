# Campaign TTS Processor

Convert D&D campaign scripts to individual character audio files using ElevenLabs TTS.

## Project Status

### Current Phase: Phase 5 - Enhanced TTS Processing Engine Complete with Full Integration! 
**Progress**: ~70% (Phases 1-5 Complete with Full Workflow Integration, Phase 6 Next)

### Completed Checkpoints
- [x] 1_1_1 Initialize Project - 2024-12-19 15:47
- [x] 1_1_2 Dependencies & Environment - 2024-12-19 16:10
- [x] 1_1_3 Basic Server Setup - 2025-06-19 15:42
- [x] 1_2_1 Frontend Upload Interface - 2025-06-19 15:48
- [x] 1_2_2 File Processing Pipeline - 2025-06-19 15:53
- [x] 1_2_3 Initial File Preview - 2025-06-19 15:59
- [x] Phase 2: Script Parsing Engine ✅
- [x] Phase 3: Speaker-to-Voice Mapping ✅
- [x] 4_1_1 Enhanced Cost Calculator - Real-time tracking
- [x] 4_1_2 Quota vs Overage Calculator - Progressive warnings
- [x] 4_1_3 Cost Preview Display - Detailed breakdown
- [x] 4_2_1 Warning Thresholds - Soft warnings at $100+
- [x] 4_2_2 Progressive Warning Levels - Green/Yellow/Orange/Red
- [x] 4_2_3 Real-time Quota Tracking - Monthly projections
- [x] 4_3_1 Comprehensive CostDisplay Component - Professional UI/UX
- [x] 4_3_2 Real-time Updates Every 30 Seconds - Live quota monitoring
- [x] 4_3_3 Cost Confirmation Workflow - Acknowledgment system

### Phase Breakdown
- [x] Phase 1: Core Infrastructure ✅
- [x] Phase 2: Script Parsing Engine ✅
- [x] Phase 3: Speaker-to-Voice Mapping ✅
- [x] Phase 4: Comprehensive Cost Analysis & Warnings ✅
  - Real-time ElevenLabs API integration with quota tracking
  - Progressive warning system (Green $0-25, Yellow $25-100, Orange $100-250, Red $250+)
  - Professional CostDisplay component with 20+ methods
  - Speaker-level cost breakdown with percentage visualization
  - Monthly usage projections and overage predictions
  - Cost optimization suggestions with potential savings
  - Real-time updates every 30 seconds
  - Professional modal dialogs for detailed cost review
  - Cost confirmation workflow with acknowledgment system
- [x] Phase 5: Enhanced TTS Processing Engine with Full Integration ✅
  - Session-based processing management with processingSessions Map
  - Enhanced API routes with session validation and error handling  
  - Event listener management with proper cleanup and graceful shutdown
  - Dual UI system (Basic + Enhanced ProcessingUI components)
  - Real-time statistics grid with color-coded status cards
  - Enhanced processing log with collapsible detailed logging
  - Professional status indicators with animations and session-aware controls
  - Complete responsive design for mobile and desktop compatibility
  - Seamless workflow integration: Upload → Parse → Cost → **Processing** → Download
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
- File processing pipeline (1_2_2)

### Phase 1.2.1 - Frontend Upload Interface - 2025-06-19 15:48
- [x] Replaced server status page with comprehensive upload interface
- [x] Implemented drag-and-drop file upload with visual feedback
- [x] Added file validation for .md, .txt, .doc, .docx formats
- [x] Created file preview with content display (first 500 characters)
- [x] Enhanced CSS with modern dark theme and animations
- [x] Integrated server status monitoring in header
- [x] Built responsive upload zone with hover and drag states
- [x] Added file processing buttons and state management

**Upload Features:**
- Visual drag-and-drop interface with SVG icons
- Real-time file validation and error handling
- File size and type information display
- Content preview before processing
- Server connectivity status monitoring
- Modern dark theme with gradient effects

**Next Steps:**
- Initial file preview (1_2_3)

### Phase 1.2.2 - File Processing Pipeline - 2025-06-19 15:53
- [x] Created file converter utility supporting .md, .txt, .doc, .docx formats
- [x] Enhanced file manager with session-based processing
- [x] Implemented automatic episode detection from filename and content
- [x] Added text normalization and content extraction
- [x] Built session management with UUID-based tracking
- [x] Updated upload route with comprehensive file processing
- [x] Added preview and session management endpoints
- [x] Integrated crypto hashing for duplicate detection

**Processing Features:**
- Multi-format file conversion (MD/TXT/DOC/DOCX to text)
- Automatic episode number and title detection
- Text normalization (line endings, whitespace cleanup)
- Session-based file management with cleanup
- Content preview with truncation handling
- Duplicate detection using MD5 hashing
- Comprehensive error handling and logging

**API Endpoints:**
- `POST /api/upload` - Upload and process files
- `GET /api/upload/:sessionId/preview` - Get file content preview
- `GET /api/upload/:sessionId` - Get session information
- `DELETE /api/upload/:sessionId` - Cleanup session and files

**Testing Results:**
- ✅ File upload and processing working correctly
- ✅ Episode detection: "117A - The Mirror's Edge" extracted successfully
- ✅ Text conversion: 463 bytes → 452 characters processed
- ✅ Preview system functional with proper content display

**Next Steps:**
- [x] Phase 5: Processing Engine (COMPLETE)

### Phase 4.1.0 - Enhanced Cost Calculator - 2024-12-19
- [x] Integrated real-time ElevenLabs API quota tracking
- [x] Enhanced cost calculator with progressive warning thresholds
- [x] Accurate character counting with speaker breakdown
- [x] Monthly usage projections and optimization suggestions
- [x] Cost preview display with detailed breakdowns
- [x] Quota vs overage calculator with real-time updates

**Features Added:**
- Real-time quota status display with visual meter
- Episode cost estimation with speaker-level breakdown
- Progressive warning system (Green: $0-25, Yellow: $25-100, Orange: $100-250, Red: $250+)
- Monthly usage projections based on current consumption rate
- Cost optimization suggestions for high-cost episodes
- Visual cost warnings with action buttons (Review/Split/Cancel)
- Character count breakdown per speaker with estimated costs

**API Endpoints Added:**
- `GET /api/process/quota` - Current quota usage and projections
- `GET /api/process/cost/:sessionId` - Detailed cost breakdown for episode
- `GET /api/process/cost/:sessionId/warnings` - Cost warnings and recommendations

**Next Steps:**
- [x] Phase 5: Enhanced Processing Engine with professional UI (COMPLETE)
  - Session-based processing management
  - Dual UI system (Basic + Enhanced)
  - Real-time stats grid and processing log
  - Professional status indicators and completion workflow

### Phase 1.2.3 - Initial File Preview - 2025-06-19 15:59
- [x] Created enhanced file preview component (file-preview.js)
- [x] Implemented detailed content analysis with speaker detection
- [x] Added file statistics and processing time estimation
- [x] Built responsive preview grid with information cards
- [x] Enhanced CSS with preview-specific styling
- [x] Integrated syntax highlighting for speakers and stage directions
- [x] Added error handling and loading states
- [x] Updated main app to use new preview system
- [x] Created comprehensive Phase 1 completion documentation

**🎉 PHASE 1 COMPLETE! 🎉**

**Preview Features:**
- Comprehensive file analysis with episode detection
- Speaker detection from content preview
- Stage direction counting and highlighting
- Processing time estimation based on file size
- Responsive grid layout with information cards
- Interactive content preview with syntax highlighting
- Error handling with fallback UI
- Large file warnings for processing time

**Content Analysis:**
- Automatic speaker detection using regex patterns
- Stage direction identification and counting
- Dialogue line estimation
- Episode number and title extraction
- File metadata display with proper formatting

**Ready for Phase 2:**
All core infrastructure complete! File upload, processing, and preview systems fully functional. Ready to begin script parsing engine implementation.

---
*Last updated: 2025-06-19 15:59*
