// Enhanced ElevenLabs Routes - backend/routes/elevenlabs.js
const express = require('express');
const router = express.Router();
const elevenLabsClient = require('../utils/elevenlabs-client');
const logger = require('../utils/logger');

/**
 * Get available voices - Phase 3.1.1
 */
router.get('/voices', async (req, res) => {
    try {
        logger.info('Fetching ElevenLabs voices');
        
        const forceRefresh = req.query.refresh === 'true';
        const voices = await elevenLabsClient.getVoices(forceRefresh);
        
        res.json({
            success: true,
            voices,
            count: voices.length,
            cached: !forceRefresh
        });
        
    } catch (error) {
        logger.error('Failed to fetch voices:', error);
        
        // Return basic voices for testing if API fails
        if (error.response?.status === 401) {
            res.status(401).json({ 
                error: 'Invalid API key. Please check your ElevenLabs API key in .env file.' 
            });
        } else {
            res.status(500).json({ 
                error: error.message,
                fallbackVoices: [
                    { voice_id: 'demo1', name: 'Demo Voice 1 (API key needed)', category: 'demo' },
                    { voice_id: 'demo2', name: 'Demo Voice 2 (API key needed)', category: 'demo' }
                ]
            });
        }
    }
});

/**
 * Get subscription usage
 */
router.get('/usage', async (req, res) => {
    try {
        const usage = await elevenLabsClient.getSubscriptionInfo();
        
        res.json({
            success: true,
            usage
        });
        
    } catch (error) {
        logger.error('Failed to fetch usage:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Generate voice preview - Phase 3.1.3
 */
router.post('/preview', async (req, res) => {
    try {
        const { voiceId, text, settings } = req.body;
        
        if (!voiceId || !text) {
            return res.status(400).json({ error: 'Voice ID and text required' });
        }
        
        // Limit preview text length
        const previewText = text.substring(0, 200);
        
        logger.info(`Generating preview for voice ${voiceId}`);
        const preview = await elevenLabsClient.generatePreview(voiceId, previewText, settings);
        
        res.json({
            success: true,
            preview
        });
        
    } catch (error) {
        logger.error('Failed to generate preview:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get voice suggestions based on character type
 */
router.get('/suggestions/:characterType', (req, res) => {
    const suggestions = elevenLabsClient.getSuggestedVoices(req.params.characterType);
    
    res.json({
        success: true,
        characterType: req.params.characterType,
        suggestions
    });
});

/**
 * Validate API key
 */
router.get('/validate', async (req, res) => {
    try {
        const validation = await elevenLabsClient.validateApiKey();
        res.json(validation);
    } catch (error) {
        res.status(500).json({ valid: false, error: error.message });
    }
});

/**
 * Get single voice details
 */
router.get('/voices/:voiceId', async (req, res) => {
    try {
        const voice = await elevenLabsClient.getVoice(req.params.voiceId);
        
        if (!voice) {
            return res.status(404).json({ error: 'Voice not found' });
        }
        
        res.json({
            success: true,
            voice
        });
        
    } catch (error) {
        logger.error('Failed to fetch voice:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;