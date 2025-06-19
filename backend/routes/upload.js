const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config/environment');
const logger = require('../utils/logger');
const fileManager = require('../utils/file-manager');

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

// Upload and process endpoint
router.post('/', upload.single('script'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        logger.info(`File uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
        
        // Process the uploaded file
        const result = await fileManager.processUploadedFile(req.file);
        
        // Return processed file info
        res.json({
            success: true,
            file: {
                id: result.sessionId,
                ...result.fileInfo
            }
        });
    } catch (error) {
        logger.error('Upload/processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get file preview
router.get('/:sessionId/preview', async (req, res) => {
    try {
        const preview = await fileManager.getFilePreview(req.params.sessionId);
        res.json({
            success: true,
            ...preview
        });
    } catch (error) {
        logger.error('Preview error:', error);
        res.status(404).json({ error: error.message });
    }
});

// Get session info
router.get('/:sessionId', async (req, res) => {
    try {
        const session = await fileManager.getSession(req.params.sessionId);
        res.json({
            success: true,
            session: fileManager.sanitizeFileInfo(session)
        });
    } catch (error) {
        logger.error('Session error:', error);
        res.status(404).json({ error: error.message });
    }
});

// Delete session and cleanup files
router.delete('/:sessionId', async (req, res) => {
    try {
        await fileManager.cleanup(req.params.sessionId);
        res.json({
            success: true,
            message: 'Session cleaned up'
        });
    } catch (error) {
        logger.error('Cleanup error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 