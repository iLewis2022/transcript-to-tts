# Campaign TTS Processor

Convert D&D campaign scripts to individual character audio files using ElevenLabs TTS.

## Project Status: Phase 2 Script Parsing Complete! 🎉

### Progress Tracker

#### ✅ Phase 1: Core Infrastructure (COMPLETE)
- [x] 1_1_1 Initialize Project - Basic folder structure and files
- [x] 1_1_2 Dependencies & Environment - All packages installed, .env configured
- [x] 1_1_3 Basic Server Setup - Express server running on port 3001
- [x] 1_2_1 Frontend Upload Interface - Drag-and-drop file upload working
- [x] 1_2_2 File Processing Pipeline - File conversion system ready
- [x] 1_2_3 Initial File Preview - Shows file info and first 500 chars

#### ✅ Phase 2: Script Parsing Engine (COMPLETE) 
- [x] 2_1_1 Core Parser Logic - Smart speaker detection for both formats
- [x] 2_1_2 Dialogue Extraction - Extracts all dialogue with line tracking
- [x] 2_1_3 Stage Direction Removal - Removes italics, tracks what was removed
- [x] 2_2_1 Visual Parse Preview - Shows speakers, dialogue counts, costs
- [x] 2_2_2 Removed Content Preview - Collapsible view of all removed stage directions
- [x] 2_2_3 Parse Validation - Checks for issues and warnings

#### 🚀 Phase 3: Speaker-to-Voice Mapping (NEXT)
- [ ] 3_1_1 ElevenLabs Voice Fetching
- [ ] 3_1_2 Speaker Mapping UI
- [ ] 3_1_3 Voice Preview System
- [ ] 3_2_1 Per-Voice Settings
- [ ] 3_2_2 Mapping Persistence
- [ ] 3_2_3 Validation & Warnings

### Current Features Working

1. **File Upload**: Drag-and-drop or browse for .md, .txt, .doc, .docx files
2. **File Preview**: Shows file info and content preview
3. **Script Parsing**: 
   - Detects speakers in both `**SPEAKER**:` and `SPEAKER:` formats
   - Extracts all dialogue lines
   - Removes stage directions (text in *italics*)
   - Tracks line numbers and character counts
4. **Parse Preview**:
   - Summary of speakers, dialogues, and character counts
   - Speaker breakdown with percentages
   - Cost estimation with quota tracking
   - Warnings for potential issues
5. **Removed Content Viewer**: Shows all stage directions that were removed
6. **Validation System**: Checks for parsing issues before proceeding

### What's New in Phase 2

The parser now includes:
- **Enhanced speaker detection** that handles variations like `JOE (DM)` 
- **Character counting** for accurate cost estimation
- **Stage direction removal** with full tracking
- **Parse validation** to catch issues early
- **Beautiful UI** for reviewing parse results
- **Cost warnings** based on ElevenLabs pricing

### Quick Start

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Open browser**:
   ```
   http://localhost:3001
   ```

3. **Upload a script** and watch it parse!

### Environment Setup

Make sure your `.env` file has:
```
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_SUBSCRIPTION_QUOTA=1000000
PORT=3001
```

### Next Steps

Phase 3 will implement:
- Fetching available voices from ElevenLabs
- Mapping each speaker to a voice
- Voice preview system
- Saving/loading voice mappings

### Known Issues

- Server status indicator may show "offline" even when running (minor bug)
- Using port 3001 instead of 3000 due to conflict

### Manual Actions Required

**For Phase 3.1.1**: You'll need to add your REAL ElevenLabs API key to the .env file

---

## Development Log

- **Phase 1 Completed**: 2024-11-09 - All infrastructure in place
- **Phase 2 Completed**: 2024-11-09 - Parser fully functional with cost estimation

---

*Built with Node.js, Express, and vanilla JavaScript for maximum compatibility*