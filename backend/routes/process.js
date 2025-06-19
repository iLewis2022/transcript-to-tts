const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const fileManager = require('../utils/file-manager');
const ScriptParser = require('../utils/script-parser');
const costCalculator = require('../utils/cost-calculator');
const elevenLabsClient = require('../utils/elevenlabs-client');

// Initialize parser
const parser = new ScriptParser();

/**
 * Parse script endpoint with enhanced cost calculation - Phase 4
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
        
        // Get current quota usage - Phase 4.1.3
        const currentUsage = await costCalculator.getCurrentUsage();
        
        // Calculate costs with real quota data
        const costEstimate = await costCalculator.calculateCost(
            parseResults.stats.totalCharacters, 
            currentUsage
        );
        
        // Get detailed cost summary
        const costSummary = costCalculator.formatCostSummary(costEstimate);
        
        // Calculate speaker breakdown with cost estimates
        const speakerBreakdown = costCalculator.calculateSpeakerBreakdown(
            parseResults.dialogues,
            costEstimate.total
        );
        
        // Get cost optimization suggestions if needed
        const suggestions = costEstimate.total > 25 ? 
            costCalculator.getCostOptimizationSuggestions(speakerBreakdown, costEstimate.total) : [];
        
        // Project monthly usage
        const monthlyProjection = await costCalculator.projectMonthlyUsage(parseResults.stats.totalCharacters);
        
        // Store enhanced results in session
        session.parseResults = parseResults;
        session.costEstimate = costEstimate;
        session.speakerBreakdown = speakerBreakdown;
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
            parseTime: parseResults.parseTime,
            suggestions,
            monthlyProjection
        });
        
    } catch (error) {
        logger.error('Parse error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get real-time cost update - Phase 4.2.3
 */
router.get('/cost/:sessionId', async (req, res) => {
    try {
        const session = await fileManager.getSession(req.params.sessionId);
        
        if (!session.parseResults) {
            return res.status(404).json({ error: 'No parse results found' });
        }
        
        // Recalculate with current usage
        const currentUsage = await costCalculator.getCurrentUsage();
        const costEstimate = await costCalculator.calculateCost(
            session.parseResults.stats.totalCharacters,
            currentUsage
        );
        
        const costSummary = costCalculator.formatCostSummary(costEstimate);
        
        res.json({
            success: true,
            cost: costSummary,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Cost update error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Confirm cost and proceed - Phase 4.2.1
 */
router.post('/cost/:sessionId/confirm', async (req, res) => {
    try {
        const { acknowledged, splitEpisode } = req.body;
        const session = await fileManager.getSession(req.params.sessionId);
        
        if (!session.costEstimate) {
            return res.status(400).json({ error: 'No cost estimate found' });
        }
        
        // Check if cost requires acknowledgment
        const requiresAcknowledgment = session.costEstimate.warning === 'high' || 
                                       session.costEstimate.warning === 'critical';
        
        if (requiresAcknowledgment && !acknowledged) {
            return res.status(400).json({ 
                error: 'Cost acknowledgment required',
                warning: session.costEstimate.warningDetails
            });
        }
        
        // Mark session as cost-approved
        session.costApproved = true;
        session.costApprovedAt = new Date().toISOString();
        session.splitRequested = splitEpisode || false;
        
        res.json({
            success: true,
            message: 'Cost approved, ready to proceed with processing',
            proceedToPhase: 5
        });
        
    } catch (error) {
        logger.error('Cost confirmation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get quota history and trends - Phase 4.2.3
 */
router.get('/quota/history', async (req, res) => {
    try {
        // TODO: Implement historical tracking in future phase
        // For now, return current snapshot
        const currentUsage = await costCalculator.getCurrentUsage();
        const projection = await costCalculator.projectMonthlyUsage();
        
        res.json({
            success: true,
            current: currentUsage,
            projection,
            history: [] // Will be populated when we add tracking
        });
        
    } catch (error) {
        logger.error('Quota history error:', error);
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
            cost: session.costEstimate,
            speakerBreakdown: session.speakerBreakdown
        });
        
    } catch (error) {
        logger.error('Get parse error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get removed stage directions
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
 * Validate parse results
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
        
        // Add cost warning if high
        if (session.costEstimate && session.costEstimate.warning === 'high' || session.costEstimate.warning === 'critical') {
            validation.warnings.push({
                type: 'high-cost',
                message: `Processing will cost ${session.costEstimate.formattedCost}`,
                severity: 'warning',
                cost: session.costEstimate
            });
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
            hasCostEstimate: !!session.costEstimate,
            costApproved: !!session.costApproved
        });
        
    } catch (error) {
        res.status(404).json({ error: 'Session not found' });
    }
});

module.exports = router; 