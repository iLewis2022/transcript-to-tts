// Processing Routes - Phase 5
const express = require('express');
const router = express.Router();
const ttsProcessor = require('../utils/tts-processor');
const fileManager = require('../utils/file-manager');
const logger = require('../utils/logger');
const config = require('../config/environment');

// Store active processing sessions
const processingSessions = new Map();

/**
 * Start processing - Phase 5.1.2
 */
router.post('/start', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID required' });
        }
        
        // Check if already processing
        if (processingSessions.has(sessionId)) {
            return res.status(400).json({ error: 'Processing already in progress for this session' });
        }
        
        // Get session data
        const session = await fileManager.getSession(sessionId);
        
        if (!session.parseResults || !session.costApproved) {
            return res.status(400).json({ error: 'Session not ready for processing' });
        }
        
        // Get speaker mapping
        const speakerMapping = req.body.speakerMapping || session.speakerMapping;
        
        if (!speakerMapping) {
            return res.status(400).json({ error: 'Speaker mapping not found' });
        }
        
        logger.info(`Starting processing for session: ${sessionId}`);
        
        // Initialize processing queue
        const queueInfo = await ttsProcessor.initializeQueue(
            session.parseResults.dialogues,
            speakerMapping,
            session.episodeInfo,
            sessionId
        );
        
        // Store session info
        processingSessions.set(sessionId, {
            startTime: Date.now(),
            episodeDir: queueInfo.episodeDir,
            totalItems: queueInfo.totalItems
        });
        
        // Set up event listeners for this session
        setupProcessingListeners(sessionId);
        
        // Start processing asynchronously
        ttsProcessor.startProcessing().catch(error => {
            logger.error('Processing error:', error);
        });
        
        res.json({
            success: true,
            message: 'Processing started',
            sessionId,
            queueInfo
        });
        
    } catch (error) {
        logger.error('Failed to start processing:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get processing status - Phase 5.2.1
 */
router.get('/status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    
    if (!processingSessions.has(sessionId)) {
        return res.status(404).json({ error: 'Processing session not found' });
    }
    
    const stats = ttsProcessor.getStats();
    const sessionInfo = processingSessions.get(sessionId);
    
    res.json({
        success: true,
        sessionId,
        stats,
        sessionInfo
    });
});

/**
 * Pause processing - Phase 5.2.3
 */
router.post('/pause/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    
    if (!processingSessions.has(sessionId)) {
        return res.status(404).json({ error: 'Processing session not found' });
    }
    
    ttsProcessor.pauseProcessing();
    
    res.json({
        success: true,
        message: 'Processing paused'
    });
});

/**
 * Resume processing - Phase 5.2.3
 */
router.post('/resume/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    if (!processingSessions.has(sessionId)) {
        return res.status(404).json({ error: 'Processing session not found' });
    }
    
    await ttsProcessor.resumeProcessing();
    
    res.json({
        success: true,
        message: 'Processing resumed'
    });
});

/**
 * Cancel processing - Phase 5.2.3
 */
router.post('/cancel/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    
    if (!processingSessions.has(sessionId)) {
        return res.status(404).json({ error: 'Processing session not found' });
    }
    
    ttsProcessor.cancelProcessing();
    
    // Clean up session
    processingSessions.delete(sessionId);
    
    res.json({
        success: true,
        message: 'Processing cancelled'
    });
});

/**
 * Retry failed items - Phase 5.2.2
 */
router.post('/retry/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    if (!processingSessions.has(sessionId)) {
        return res.status(404).json({ error: 'Processing session not found' });
    }
    
    await ttsProcessor.retryFailed();
    
    res.json({
        success: true,
        message: 'Retrying failed items'
    });
});

/**
 * Get processing results - Phase 6
 */
router.get('/results/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const sessionInfo = processingSessions.get(sessionId);
    
    if (!sessionInfo) {
        return res.status(404).json({ error: 'Processing session not found' });
    }
    
    const stats = ttsProcessor.getStats();
    
    res.json({
        success: true,
        sessionId,
        complete: !stats.isProcessing && stats.remaining === 0,
        stats,
        episodeDir: sessionInfo.episodeDir,
        downloadReady: stats.completed > 0
    });
});

/**
 * Set up event listeners for processing updates
 */
function setupProcessingListeners(sessionId) {
    // Store listeners so we can remove them later
    const listeners = {
        start: (data) => {
            logger.info(`Processing started for session ${sessionId}:`, data);
        },
        
        itemStart: (data) => {
            logger.debug(`Processing item ${data.item.id} (${data.queuePosition}/${data.totalItems})`);
        },
        
        itemComplete: (data) => {
            logger.success(`Completed ${data.item.id} - Progress: ${data.progress.percentage}%`);
        },
        
        itemError: (data) => {
            logger.error(`Error processing ${data.item.id}: ${data.error}`);
        },
        
        complete: (data) => {
            logger.success(`Processing complete for session ${sessionId}:`, data.stats);
            // Clean up session after completion
            setTimeout(() => {
                processingSessions.delete(sessionId);
            }, config.session.cleanupHours * 60 * 60 * 1000); // Convert hours to milliseconds
        }
    };
    
    // Attach listeners
    ttsProcessor.on('processing:start', listeners.start);
    ttsProcessor.on('item:start', listeners.itemStart);
    ttsProcessor.on('item:complete', listeners.itemComplete);
    ttsProcessor.on('item:error', listeners.itemError);
    ttsProcessor.on('processing:complete', listeners.complete);
    
    // Store listeners for cleanup
    if (!processingSessions.get(sessionId).listeners) {
        processingSessions.get(sessionId).listeners = listeners;
    }
}

// Cleanup on server shutdown
process.on('SIGINT', () => {
    logger.info('Cleaning up processing sessions...');
    ttsProcessor.cleanup();
});

module.exports = router; 