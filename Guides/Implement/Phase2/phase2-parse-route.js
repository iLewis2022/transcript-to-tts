// Enhanced Process Routes - backend/routes/process.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const fileManager = require('../utils/file-manager');
const ScriptParser = require('../utils/script-parser');
const CostCalculator = require('../utils/cost-calculator');

// Initialize parser and calculator
const parser = new ScriptParser();
const costCalculator = new CostCalculator();

/**
 * Parse script endpoint - Phase 2.1.2
 */
router.post('/parse', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID required' });
        }
        
        logger.info(`Processing parse request for session: ${sessionId}`);
        
        // Get session data
        const session = await fileManager.getSession(sessionId);
        if (!session.processedText) {
            return res.status(400).json({ error: 'No processed text found for session' });
        }
        
        // Parse the script
        const parseResults = parser.parseScript(session.processedText);
        
        // Calculate costs
        const costEstimate = costCalculator.calculateCost(parseResults.stats.totalCharacters);
        const costSummary = costCalculator.formatCostSummary(costEstimate);
        const speakerBreakdown = costCalculator.calculateSpeakerBreakdown(parseResults.dialogues);
        
        // Store parse results in session
        session.parseResults = parseResults;
        session.costEstimate = costEstimate;
        session.status = 'parsed';
        
        // Generate preview
        const preview = parser.generateParsePreview(parseResults);
        
        res.json({
            success: true,
            sessionId,
            preview,
            cost: costSummary,
            speakerCosts: speakerBreakdown,
            stats: parseResults.stats,
            parseTime: parseResults.parseTime
        });
        
    } catch (error) {
        logger.error('Parse error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get detailed parse results
 */
router.get('/parse/:sessionId', async (req, res) => {
    try {
        const session = await fileManager.getSession(req.params.sessionId);
        
        if (!session.parseResults) {
            return res.status(404).json({ error: 'No parse results found' });
        }
        
        res.json({
            success: true,
            results: session.parseResults,
            cost: session.costEstimate
        });
        
    } catch (error) {
        logger.error('Get parse error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get removed stage directions - Phase 2.2.2
 */
router.get('/parse/:sessionId/removed', async (req, res) => {
    try {
        const session = await fileManager.getSession(req.params.sessionId);
        
        if (!session.parseResults) {
            return res.status(404).json({ error: 'No parse results found' });
        }
        
        // Collect all removed stage directions
        const removedContent = [];
        session.parseResults.dialogues.forEach((dialogue, index) => {
            if (dialogue.stageDirections && dialogue.stageDirections.length > 0) {
                removedContent.push({
                    dialogueIndex: index,
                    speaker: dialogue.speaker,
                    removed: dialogue.stageDirections,
                    context: dialogue.originalText.substring(0, 100) + '...'
                });
            }
        });
        
        res.json({
            success: true,
            totalRemoved: session.parseResults.stats.totalStageDirections,
            charactersRemoved: session.parseResults.stats.totalCharactersRemoved,
            removedContent
        });
        
    } catch (error) {
        logger.error('Get removed content error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Validate parse results - Phase 2.2.3
 */
router.post('/parse/:sessionId/validate', async (req, res) => {
    try {
        const session = await fileManager.getSession(req.params.sessionId);
        
        if (!session.parseResults) {
            return res.status(404).json({ error: 'No parse results found' });
        }
        
        const validation = {
            valid: true,
            issues: [],
            warnings: []
        };
        
        // Check for empty dialogues
        const emptyDialogues = session.parseResults.dialogues.filter(d => !d.cleanedText.trim());
        if (emptyDialogues.length > 0) {
            validation.issues.push({
                type: 'empty-dialogues',
                message: `Found ${emptyDialogues.length} empty dialogues after cleaning`,
                severity: 'error'
            });
            validation.valid = false;
        }
        
        // Check for very short dialogues
        const shortDialogues = session.parseResults.dialogues.filter(d => d.characterCount < 5);
        if (shortDialogues.length > 0) {
            validation.warnings.push({
                type: 'short-dialogues',
                message: `Found ${shortDialogues.length} very short dialogues (< 5 characters)`,
                severity: 'warning',
                examples: shortDialogues.slice(0, 3).map(d => ({
                    speaker: d.speaker,
                    text: d.cleanedText
                }))
            });
        }
        
        // Check for potential speaker issues
        const speakerCounts = {};
        session.parseResults.dialogues.forEach(d => {
            speakerCounts[d.speaker] = (speakerCounts[d.speaker] || 0) + 1;
        });
        
        const rareSpeakers = Object.entries(speakerCounts)
            .filter(([speaker, count]) => count < 3)
            .map(([speaker, count]) => ({ speaker, count }));
            
        if (rareSpeakers.length > 0) {
            validation.warnings.push({
                type: 'rare-speakers',
                message: `Found speakers with very few dialogues`,
                severity: 'info',
                speakers: rareSpeakers
            });
        }
        
        // Add any warnings from the parser
        if (session.parseResults.warnings) {
            validation.warnings.push(...session.parseResults.warnings);
        }
        
        res.json({
            success: true,
            validation,
            ready: validation.valid && validation.warnings.filter(w => w.severity === 'error').length === 0
        });
        
    } catch (error) {
        logger.error('Validation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get processing status
 */
router.get('/status/:sessionId', async (req, res) => {
    try {
        const session = await fileManager.getSession(req.params.sessionId);
        
        res.json({
            sessionId: req.params.sessionId,
            status: session.status || 'unknown',
            hasParseResults: !!session.parseResults,
            hasCostEstimate: !!session.costEstimate
        });
        
    } catch (error) {
        res.status(404).json({ error: 'Session not found' });
    }
});

module.exports = router;