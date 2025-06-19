// File Manager Utility
const fs = require('fs').promises;
const path = require('path');

class FileManager {
    constructor() {
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
}

module.exports = FileManager; 