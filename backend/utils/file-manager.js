// File Manager Utility
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
        this.uploadDir = process.env.UPLOAD_DIR || './uploads';
        this.outputDir = process.env.OUTPUT_DIR || './outputs';
    }

    async ensureDirectories() {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
            await fs.mkdir(this.outputDir, { recursive: true });
            return true;
        } catch (error) {
            console.error('Failed to create directories:', error);
            return false;
        }
    }

    async createEpisodeFolder(episodeName) {
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const folderName = `${episodeName}_${timestamp}`;
        const episodePath = path.join(this.outputDir, folderName);
        
        try {
            await fs.mkdir(episodePath, { recursive: true });
            return {
                success: true,
                path: episodePath,
                folderName
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async saveMetadata(episodePath, metadata) {
        const metadataPath = path.join(episodePath, 'processing_log.json');
        try {
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            return { success: true, path: metadataPath };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async saveSpeakerMapping(episodePath, mapping) {
        const mappingPath = path.join(episodePath, 'speaker_mapping.json');
        try {
            await fs.writeFile(mappingPath, JSON.stringify(mapping, null, 2));
            return { success: true, path: mappingPath };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    generateFilename(index, speaker, extension = '.mp3') {
        const paddedIndex = String(index).padStart(3, '0');
        return `${paddedIndex}_${speaker}${extension}`;
    }

    async getEpisodeFolders() {
        try {
            const folders = await fs.readdir(this.outputDir);
            const episodeFolders = [];
            
            for (const folder of folders) {
                const folderPath = path.join(this.outputDir, folder);
                const stats = await fs.stat(folderPath);
                
                if (stats.isDirectory()) {
                    // Try to read metadata
                    let metadata = null;
                    try {
                        const metadataPath = path.join(folderPath, 'processing_log.json');
                        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
                        metadata = JSON.parse(metadataContent);
                    } catch (e) {
                        // No metadata file
                    }

                    episodeFolders.push({
                        name: folder,
                        path: folderPath,
                        created: stats.birthtime,
                        modified: stats.mtime,
                        metadata
                    });
                }
            }

            return episodeFolders.sort((a, b) => b.created - a.created);
        } catch (error) {
            console.error('Failed to get episode folders:', error);
            return [];
        }
    }

    async cleanupUploads(olderThanDays = 7) {
        try {
            const files = await fs.readdir(this.uploadDir);
            const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
            let cleaned = 0;

            for (const file of files) {
                const filePath = path.join(this.uploadDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime < cutoffDate) {
                    await fs.unlink(filePath);
                    cleaned++;
                }
            }

            return { success: true, cleaned };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getFileInfo(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const content = await fs.readFile(filePath, 'utf-8');
            
            return {
                success: true,
                stats: {
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime
                },
                content,
                preview: content.substring(0, 500),
                lineCount: content.split('\n').length,
                characterCount: content.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
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

    // Legacy methods for compatibility (keeping basic functionality)
    async saveFile(content, filename) {
        const filePath = path.join(config.files.uploadDir, filename);
        await fs.writeFile(filePath, content, 'utf-8');
        logger.info(`File saved: ${filename}`);
        return filePath;
    }

    async createEpisodeDirectory(episodeNumber) {
        const episodeDir = path.join(config.files.outputDir, `episode-${episodeNumber}`);
        await fs.mkdir(episodeDir, { recursive: true });
        logger.info(`Episode directory created: ${episodeDir}`);
        return episodeDir;
    }

    async saveAudioFile(buffer, filename, episodeDir) {
        const filePath = path.join(episodeDir, filename);
        await fs.writeFile(filePath, buffer);
        logger.info(`Audio file saved: ${filename}`);
        return filePath;
    }

    /**
     * Save processing metadata - Phase 6.1.2
     */
    async saveMetadata(episodeDir, metadata) {
        try {
            const metadataPath = path.join(episodeDir, 'metadata.json');
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            
            logger.info(`Saved metadata: ${metadataPath}`);
            return {
                success: true,
                path: metadataPath
            };
        } catch (error) {
            logger.error('Failed to save metadata:', error);
            throw error;
        }
    }

    async generateFilename(speaker, index, extension = 'mp3') {
        const sanitizedSpeaker = speaker
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        
        const paddedIndex = String(index).padStart(3, '0');
        return `${paddedIndex}-${sanitizedSpeaker}.${extension}`;
    }

    async createZipArchive(episodeDir, outputPath) {
        const archiver = require('archiver');
        const output = require('fs').createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        return new Promise((resolve, reject) => {
            output.on('close', () => {
                logger.success(`Archive created: ${outputPath} (${archive.pointer()} bytes)`);
                resolve(outputPath);
            });
            
            archive.on('error', reject);
            archive.pipe(output);
            archive.directory(episodeDir, false);
            archive.finalize();
        });
    }
}

module.exports = new FileManager(); 