# Phase 1.2.2 - File Processing Pipeline

## CURSOR INSTRUCTIONS
**CRITICAL**: Update README.md after completing this checkpoint:
- [x] 1_2_2 File Processing Pipeline - [timestamp]
- Update progress percentage to ~30%
- Note: DOC/DOCX conversion working, file processing complete

## Step 1: Install Additional Dependencies

```bash
npm install --save textract uuid
```

## Step 2: File Converter Utility

Create `backend/utils/file-converter.js`:

```javascript
const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const textract = require('textract');
const logger = require('./logger');

class FileConverter {
    constructor() {
        this.converters = {
            '.txt': this.readTextFile,
            '.md': this.readTextFile,
            '.docx': this.convertDocx,
            '.doc': this.convertDoc
        };
    }

    async convertToText(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const converter = this.converters[ext];
        
        if (!converter) {
            throw new Error(`Unsupported file type: ${ext}`);
        }
        
        try {
            logger.info(`Converting file: ${path.basename(filePath)} (${ext})`);
            const text = await converter.call(this, filePath);
            logger.success(`File converted successfully: ${text.length} characters`);
            return text;
        } catch (error) {
            logger.error(`File conversion failed: ${error.message}`);
            throw error;
        }
    }

    async readTextFile(filePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        return this.normalizeText(content);
    }

    async convertDocx(filePath) {
        const result = await mammoth.extractRawText({ path: filePath });
        
        if (result.messages && result.messages.length > 0) {
            logger.warn('DOCX conversion warnings:', result.messages);
        }
        
        return this.normalizeText(result.value);
    }

    async convertDoc(filePath) {
        return new Promise((resolve, reject) => {
            textract.fromFileWithPath(filePath, (error, text) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(this.normalizeText(text));
                }
            });
        });
    }

    normalizeText(text) {
        // Normalize line endings and clean up whitespace
        return text
            .replace(/\r\n/g, '\n')     // Windows to Unix line endings
            .replace(/\r/g, '\n')        // Old Mac to Unix line endings
            .replace(/\n{3,}/g, '\n\n')  // Multiple blank lines to double
            .replace(/[ \t]+$/gm, '')    // Trailing whitespace
            .trim();
    }
}

module.exports = new FileConverter();
```

## Step 3: Enhanced File Manager

Update `backend/utils/file-manager.js`:

```javascript
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/environment');
const logger = require('./logger');
const fileConverter = require('./file-converter');

class FileManager {
    constructor() {
        this.sessions = new Map();
    }

    async processUploadedFile(file) {
        const sessionId = uuidv4();
        const fileInfo = {
            sessionId,
            originalName: file.originalname,
            uploadedName: file.filename,
            size: file.size,
            mimeType: file.mimetype,
            uploadPath: file.path,
            uploadedAt: new Date().toISOString(),
            status: 'uploaded'
        };
        
        try {
            // Convert file to text
            const text = await fileConverter.convertToText(file.path);
            
            // Calculate hash for duplicate detection
            const hash = crypto.createHash('md5').update(text).digest('hex');
            
            // Detect episode info from filename or content
            const episodeInfo = this.detectEpisodeInfo(file.originalname, text);
            
            // Store processed info
            fileInfo.processedText = text;
            fileInfo.textLength = text.length;
            fileInfo.hash = hash;
            fileInfo.episodeInfo = episodeInfo;
            fileInfo.status = 'processed';
            
            // Save to session
            this.sessions.set(sessionId, fileInfo);
            
            // Save text to temp file for easier access
            const textPath = path.join(
                config.files.uploadDir,
                'temp',
                `${sessionId}.txt`
            );
            await fs.writeFile(textPath, text, 'utf-8');
            fileInfo.textPath = textPath;
            
            logger.success(`File processed: ${fileInfo.originalName} (${fileInfo.textLength} chars)`);
            
            return {
                sessionId,
                fileInfo: this.sanitizeFileInfo(fileInfo)
            };
        } catch (error) {
            fileInfo.status = 'error';
            fileInfo.error = error.message;
            this.sessions.set(sessionId, fileInfo);
            throw error;
        }
    }

    detectEpisodeInfo(filename, content) {
        const info = {
            number: null,
            name: null,
            detected: false
        };
        
        // Try to extract from filename
        const filenameMatch = filename.match(/(?:episode|ep|e)[\s_-]*(\d+[a-z]?)/i);
        if (filenameMatch) {
            info.number = filenameMatch[1].toUpperCase();
            info.detected = true;
        }
        
        // Try to extract from content (first few lines)
        const firstLines = content.split('\n').slice(0, 5).join('\n');
        
        // Look for episode number
        const contentMatch = firstLines.match(/(?:episode|ep|#)\s*(\d+[a-z]?)/i);
        if (contentMatch && !info.number) {
            info.number = contentMatch[1].toUpperCase();
            info.detected = true;
        }
        
        // Look for episode title
        const titleMatch = firstLines.match(/(?:episode\s*\d+[a-z]?\s*[-:]\s*)(.+)/i);
        if (titleMatch) {
            info.name = titleMatch[1].trim();
        }
        
        return info;
    }

    async getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        return session;
    }

    async getFilePreview(sessionId, maxLength = 500) {
        const session = await this.getSession(sessionId);
        
        if (!session.processedText) {
            throw new Error('File not yet processed');
        }
        
        const preview = session.processedText.substring(0, maxLength);
        const truncated = session.processedText.length > maxLength;
        
        return {
            preview,
            truncated,
            totalLength: session.processedText.length
        };
    }

    sanitizeFileInfo(fileInfo) {
        // Return only safe info to frontend
        return {
            sessionId: fileInfo.sessionId,
            originalName: fileInfo.originalName,
            size: fileInfo.size,
            textLength: fileInfo.textLength,
            episodeInfo: fileInfo.episodeInfo,
            status: fileInfo.status,
            uploadedAt: fileInfo.uploadedAt,
            error: fileInfo.error
        };
    }

    async cleanup(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        
        // Delete uploaded file
        try {
            await fs.unlink(session.uploadPath);
        } catch (error) {
            logger.warn(`Failed to delete upload file: ${error.message}`);
        }
        
        // Delete text file
        if (session.textPath) {
            try {
                await fs.unlink(session.textPath);
            } catch (error) {
                logger.warn(`Failed to delete text file: ${error.message}`);
            }
        }
        
        // Remove from sessions
        this.sessions.delete(sessionId);
    }

    // Cleanup old sessions (run periodically)
    async cleanupOldSessions(maxAgeHours = 24) {
        const now = Date.now();
        const maxAge = maxAgeHours * 60 * 60 * 1000;
        
        for (const [sessionId, session] of this.sessions) {
            const age = now - new Date(session.uploadedAt).getTime();
            if (age > maxAge) {
                logger.info(`Cleaning up old session: ${sessionId}`);
                await this.cleanup(sessionId);
            }
        }
    }
}

module.exports = new FileManager();