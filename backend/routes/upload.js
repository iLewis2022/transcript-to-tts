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