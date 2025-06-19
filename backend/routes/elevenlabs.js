const express = require('express');
const router = express.Router();
const config = require('../config/environment');
const logger = require('../utils/logger');

// Get available voices (stub for now)
router.get('/voices', async (req, res) => {
    try {
        logger.info('Fetching ElevenLabs voices');
        
        // TODO: Implement actual ElevenLabs API call
        res.json({
            voices: [
                { id: 'demo1', name: 'Demo Voice 1' },
                { id: 'demo2', name: 'Demo Voice 2' }
            ]
        });
    } catch (error) {
        logger.error('Failed to fetch voices:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get subscription usage
router.get('/usage', async (req, res) => {
    try {
        // TODO: Implement actual usage tracking
        res.json({
            quota: config.elevenLabs.subscriptionQuota,
            used: 0,
            remaining: config.elevenLabs.subscriptionQuota
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test voice preview
router.post('/preview', async (req, res) => {
    try {
        const { voiceId, text } = req.body;
        
        if (!voiceId || !text) {
            return res.status(400).json({ error: 'Voice ID and text required' });
        }
        
        // TODO: Implement actual preview generation
        res.json({
            success: true,
            message: 'Preview generation not yet implemented'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 