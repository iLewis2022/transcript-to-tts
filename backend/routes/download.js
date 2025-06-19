// Download Routes - Phase 6.1.0
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const config = require('../config/environment');

// Store active ZIP jobs
const zipJobs = new Map();

/**
 * Get list of files for download - Phase 6.1.1
 */
router.get('/files/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    try {
        // Find the episode directory
        const episodeDir = await findEpisodeDirectory(sessionId);
        if (!episodeDir) {
            return res.status(404).json({ 
                success: false, 
                error: 'Episode directory not found' 
            });
        }
        
        // Read metadata
        const metadata = await readMetadata(episodeDir);
        
        // Get all audio files
        const files = await getAudioFiles(episodeDir);
        
        // Get unique speakers
        const speakers = [...new Set(files.map(f => f.speaker))].sort();
        
        // Calculate total size
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        
        res.json({
            success: true,
            sessionId,
            episodeInfo: {
                episodeName: metadata?.episode || path.basename(episodeDir),
                processedAt: metadata?.processedAt || new Date().toISOString(),
                totalFiles: files.length,
                totalSize: totalSize
            },
            files,
            speakers
        });
        
    } catch (error) {
        logger.error('Failed to get file list:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load file list' 
        });
    }
});

/**
 * Download individual file
 */
router.get('/file/:sessionId/:filename', async (req, res) => {
    const { sessionId, filename } = req.params;
    
    try {
        const episodeDir = await findEpisodeDirectory(sessionId);
        if (!episodeDir) {
            return res.status(404).json({ error: 'Episode not found' });
        }
        
        const filePath = path.join(episodeDir, filename);
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({ error: 'File not found' });
        }
        
        // Set headers for download
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Stream file
        const stream = require('fs').createReadStream(filePath);
        stream.pipe(res);
        
    } catch (error) {
        logger.error('File download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

/**
 * Create ZIP of all files - Phase 6.1.0
 */
router.post('/zip/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const jobId = uuidv4();
    
    try {
        const episodeDir = await findEpisodeDirectory(sessionId);
        if (!episodeDir) {
            return res.status(404).json({ error: 'Episode not found' });
        }
        
        // Create ZIP job
        const job = {
            id: jobId,
            sessionId,
            episodeDir,
            status: 'creating',
            progress: 0,
            message: 'Initializing...',
            complete: false,
            error: null,
            filename: null
        };
        
        zipJobs.set(jobId, job);
        
        // Start ZIP creation in background
        createZipArchive(job).catch(error => {
            job.error = error.message;
            job.status = 'failed';
            logger.error('ZIP creation failed:', error);
        });
        
        res.json({
            success: true,
            jobId,
            message: 'ZIP creation started'
        });
        
    } catch (error) {
        logger.error('Failed to start ZIP creation:', error);
        res.status(500).json({ error: 'Failed to create ZIP' });
    }
});

/**
 * Get ZIP creation status
 */
router.get('/zip/status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = zipJobs.get(jobId);
    
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        complete: job.complete,
        error: job.error
    });
});

/**
 * Download completed ZIP
 */
router.get('/zip/download/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const job = zipJobs.get(jobId);
    
    if (!job || !job.complete || !job.filename) {
        return res.status(404).json({ error: 'ZIP not ready' });
    }
    
    try {
        const zipPath = path.join(config.paths.temp, job.filename);
        
        // Check if file exists
        await fs.access(zipPath);
        
        // Set headers
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${job.filename}"`);
        
        // Stream file
        const stream = require('fs').createReadStream(zipPath);
        stream.pipe(res);
        
        // Clean up after download
        stream.on('end', async () => {
            try {
                await fs.unlink(zipPath);
                zipJobs.delete(jobId);
            } catch (error) {
                logger.error('Failed to clean up ZIP:', error);
            }
        });
        
    } catch (error) {
        logger.error('ZIP download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

/**
 * Download files by speaker
 */
router.post('/speaker/:sessionId/:speaker', async (req, res) => {
    const { sessionId, speaker } = req.params;
    const jobId = uuidv4();
    
    try {
        const episodeDir = await findEpisodeDirectory(sessionId);
        if (!episodeDir) {
            return res.status(404).json({ error: 'Episode not found' });
        }
        
        // Get speaker files
        const allFiles = await getAudioFiles(episodeDir);
        const speakerFiles = allFiles.filter(f => f.speaker === speaker);
        
        if (speakerFiles.length === 0) {
            return res.status(404).json({ error: 'No files found for speaker' });
        }
        
        // Create ZIP job
        const job = {
            id: jobId,
            sessionId,
            episodeDir,
            files: speakerFiles,
            speaker,
            status: 'creating',
            progress: 0,
            message: 'Initializing...',
            complete: false,
            error: null,
            filename: null
        };
        
        zipJobs.set(jobId, job);
        
        // Start ZIP creation
        createSpeakerZip(job).catch(error => {
            job.error = error.message;
            job.status = 'failed';
            logger.error('Speaker ZIP creation failed:', error);
        });
        
        res.json({
            success: true,
            jobId,
            message: 'ZIP creation started'
        });
        
    } catch (error) {
        logger.error('Failed to create speaker ZIP:', error);
        res.status(500).json({ error: 'Failed to create ZIP' });
    }
});

/**
 * Download selected files
 */
router.post('/selected/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const { files } = req.body;
    const jobId = uuidv4();
    
    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'No files selected' });
    }
    
    try {
        const episodeDir = await findEpisodeDirectory(sessionId);
        if (!episodeDir) {
            return res.status(404).json({ error: 'Episode not found' });
        }
        
        // Validate selected files exist
        const allFiles = await getAudioFiles(episodeDir);
        const selectedFiles = allFiles.filter(f => files.includes(f.filename));
        
        if (selectedFiles.length === 0) {
            return res.status(404).json({ error: 'No valid files selected' });
        }
        
        // Create ZIP job
        const job = {
            id: jobId,
            sessionId,
            episodeDir,
            files: selectedFiles,
            status: 'creating',
            progress: 0,
            message: 'Initializing...',
            complete: false,
            error: null,
            filename: null
        };
        
        zipJobs.set(jobId, job);
        
        // Start ZIP creation
        createSelectedZip(job).catch(error => {
            job.error = error.message;
            job.status = 'failed';
            logger.error('Selected ZIP creation failed:', error);
        });
        
        res.json({
            success: true,
            jobId,
            message: 'ZIP creation started'
        });
        
    } catch (error) {
        logger.error('Failed to create selected ZIP:', error);
        res.status(500).json({ error: 'Failed to create ZIP' });
    }
});

/**
 * Download metadata
 */
router.get('/metadata/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    try {
        const episodeDir = await findEpisodeDirectory(sessionId);
        if (!episodeDir) {
            return res.status(404).json({ error: 'Episode not found' });
        }
        
        // Read all metadata files
        const metadata = await readMetadata(episodeDir);
        const processingLog = await readProcessingLog(episodeDir);
        const speakerMapping = await readSpeakerMapping(episodeDir);
        
        // Combine metadata
        const combinedMetadata = {
            sessionId,
            episode: metadata?.episode || path.basename(episodeDir),
            processedAt: metadata?.processedAt || new Date().toISOString(),
            processingLog,
            speakerMapping,
            stats: metadata?.stats || {},
            files: await getAudioFiles(episodeDir)
        };
        
        // Send as JSON download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="metadata_${sessionId}.json"`);
        res.json(combinedMetadata);
        
    } catch (error) {
        logger.error('Metadata download error:', error);
        res.status(500).json({ error: 'Failed to download metadata' });
    }
});

/**
 * Helper: Find episode directory
 */
async function findEpisodeDirectory(sessionId) {
    try {
        const outputsDir = config.paths.outputs;
        const dirs = await fs.readdir(outputsDir);
        
        logger.info(`Looking for session ${sessionId} in ${dirs.length} directories`);
        
        // Sort directories by modification time (newest first)
        const dirStats = [];
        for (const dir of dirs) {
            const dirPath = path.join(outputsDir, dir);
            try {
                const stat = await fs.stat(dirPath);
                if (stat.isDirectory()) {
                    dirStats.push({ dir, dirPath, mtime: stat.mtime });
                }
            } catch (error) {
                // Skip this directory
                continue;
            }
        }
        
        dirStats.sort((a, b) => b.mtime - a.mtime);
        
        // Look for directory containing session ID or matching pattern
        for (const { dir, dirPath } of dirStats) {
            logger.debug(`Checking directory: ${dir}`);
            
            // Check if directory name contains session ID
            if (dir.includes(sessionId)) {
                logger.info(`Found session directory by name: ${dir}`);
                return dirPath;
            }
            
            // Check if metadata contains session ID
            try {
                const metadata = await readMetadata(dirPath);
                if (metadata?.sessionId === sessionId) {
                    logger.info(`Found session directory by metadata: ${dir}`);
                    return dirPath;
                }
            } catch (error) {
                // Continue checking other directories
                logger.debug(`No metadata in ${dir}:`, error.message);
            }
            
            // Also check for any audio files that might match the session pattern
            try {
                const files = await fs.readdir(dirPath);
                const hasAudioFiles = files.some(file => file.endsWith('.mp3'));
                if (hasAudioFiles) {
                    logger.info(`Found directory with audio files (newest match): ${dir}`);
                    // Return the most recently modified directory with audio files as fallback
                    return dirPath;
                }
            } catch (error) {
                // Continue checking
                continue;
            }
        }
        
        logger.warn(`No directory found for session: ${sessionId}`);
        return null;
    } catch (error) {
        logger.error('Error finding episode directory:', error);
        return null;
    }
}

/**
 * Helper: Get audio files from directory
 */
async function getAudioFiles(episodeDir) {
    const files = [];
    
    try {
        const entries = await fs.readdir(episodeDir);
        
        for (const entry of entries) {
            if (entry.endsWith('.mp3')) {
                const filePath = path.join(episodeDir, entry);
                const stat = await fs.stat(filePath);
                
                // Parse filename for speaker info
                const match = entry.match(/^(\d+)[-_](.+)\.mp3$/);
                const speaker = match ? match[2].replace(/-/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ') : 'Unknown';
                
                files.push({
                    id: entry.replace('.mp3', ''),
                    filename: entry,
                    displayName: entry,
                    speaker: speaker,
                    size: stat.size,
                    createdAt: stat.ctime,
                    duration: null // Could be calculated if needed
                });
            }
        }
        
        // Sort by filename (which includes index)
        files.sort((a, b) => a.filename.localeCompare(b.filename));
        
    } catch (error) {
        logger.error('Error reading audio files:', error);
    }
    
    return files;
}

/**
 * Helper: Read metadata file
 */
async function readMetadata(episodeDir) {
    try {
        const metadataPath = path.join(episodeDir, 'metadata.json');
        const content = await fs.readFile(metadataPath, 'utf8');
        return JSON.parse(content);
    } catch {
        return null;
    }
}

/**
 * Helper: Read processing log
 */
async function readProcessingLog(episodeDir) {
    try {
        const logPath = path.join(episodeDir, 'processing_log.json');
        const content = await fs.readFile(logPath, 'utf8');
        return JSON.parse(content);
    } catch {
        return null;
    }
}

/**
 * Helper: Read speaker mapping
 */
async function readSpeakerMapping(episodeDir) {
    try {
        const mappingPath = path.join(episodeDir, 'speaker_mapping.json');
        const content = await fs.readFile(mappingPath, 'utf8');
        return JSON.parse(content);
    } catch {
        return null;
    }
}

/**
 * Create ZIP archive of all files
 */
async function createZipArchive(job) {
    const episodeName = path.basename(job.episodeDir);
    const zipFilename = `${episodeName}_complete.zip`;
    const zipPath = path.join(config.paths.temp || './temp', zipFilename);
    
    // Ensure temp directory exists
    await fs.mkdir(path.dirname(zipPath), { recursive: true });
    
    return new Promise((resolve, reject) => {
        const output = require('fs').createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });
        
        output.on('close', () => {
            job.complete = true;
            job.progress = 100;
            job.message = 'ZIP ready for download';
            job.filename = zipFilename;
            logger.info(`ZIP created: ${zipFilename} (${archive.pointer()} bytes)`);
            resolve();
        });
        
        archive.on('error', reject);
        
        archive.on('progress', (progress) => {
            job.progress = Math.floor((progress.entries.processed / progress.entries.total) * 100);
            job.message = `Processing file ${progress.entries.processed} of ${progress.entries.total}`;
        });
        
        archive.pipe(output);
        
        // Add all files from episode directory
        archive.directory(job.episodeDir, episodeName);
        
        archive.finalize();
    });
}

/**
 * Create ZIP for specific speaker
 */
async function createSpeakerZip(job) {
    const speakerName = job.speaker.replace(/[^a-zA-Z0-9]/g, '_');
    const zipFilename = `${speakerName}_audio_files.zip`;
    const zipPath = path.join(config.paths.temp || './temp', zipFilename);
    
    await fs.mkdir(path.dirname(zipPath), { recursive: true });
    
    return new Promise((resolve, reject) => {
        const output = require('fs').createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });
        
        output.on('close', () => {
            job.complete = true;
            job.progress = 100;
            job.message = 'ZIP ready for download';
            job.filename = zipFilename;
            resolve();
        });
        
        archive.on('error', reject);
        
        let processed = 0;
        archive.on('entry', () => {
            processed++;
            job.progress = Math.floor((processed / job.files.length) * 100);
            job.message = `Processing file ${processed} of ${job.files.length}`;
        });
        
        archive.pipe(output);
        
        // Add speaker files
        for (const file of job.files) {
            const filePath = path.join(job.episodeDir, file.filename);
            archive.file(filePath, { name: file.filename });
        }
        
        archive.finalize();
    });
}

/**
 * Create ZIP for selected files
 */
async function createSelectedZip(job) {
    const zipFilename = `selected_files_${Date.now()}.zip`;
    const zipPath = path.join(config.paths.temp || './temp', zipFilename);
    
    await fs.mkdir(path.dirname(zipPath), { recursive: true });
    
    return new Promise((resolve, reject) => {
        const output = require('fs').createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });
        
        output.on('close', () => {
            job.complete = true;
            job.progress = 100;
            job.message = 'ZIP ready for download';
            job.filename = zipFilename;
            resolve();
        });
        
        archive.on('error', reject);
        
        let processed = 0;
        archive.on('entry', () => {
            processed++;
            job.progress = Math.floor((processed / job.files.length) * 100);
            job.message = `Processing file ${processed} of ${job.files.length}`;
        });
        
        archive.pipe(output);
        
        // Add selected files
        for (const file of job.files) {
            const filePath = path.join(job.episodeDir, file.filename);
            archive.file(filePath, { name: file.filename });
        }
        
        archive.finalize();
    });
}

module.exports = router; 