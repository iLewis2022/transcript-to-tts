const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Process script endpoint (stub for now)
router.post('/parse', async (req, res) => {
    try {
        const { fileId } = req.body;
        
        if (!fileId) {
            return res.status(400).json({ error: 'File ID required' });
        }
        
        logger.info(`Processing parse request for file: ${fileId}`);
        
        // TODO: Implement actual parsing in Phase 2
        res.json({
            success: true,
            message: 'Parser not yet implemented',
            fileId: fileId
        });
    } catch (error) {
        logger.error('Parse error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get processing status
router.get('/status/:sessionId', async (req, res) => {
    try {
        // TODO: Implement status tracking
        res.json({
            sessionId: req.params.sessionId,
            status: 'pending',
            progress: 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 