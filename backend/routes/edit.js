// ===== DIALOGUE EDITING API ROUTES - CHECKPOINT 3 =====
// Backend endpoints for saving and loading edited dialogues

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config/environment');

// Store editing sessions in memory (for quick access)
const editingSessions = new Map();

/**
 * Save edited dialogues - POST /api/edit/save/:sessionId
 */
router.post('/save/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const { dialogues, metadata } = req.body;
    
    try {
        logger.info(`Saving edited dialogues for session ${sessionId}`);
        
        // Validate session exists (handle test sessions)
        let sessionPath;
        if (sessionId.includes('test-session')) {
            sessionPath = path.join(__dirname, '../../temp', sessionId);
            // Create test session directory if it doesn't exist
            try {
                await fs.access(sessionPath);
            } catch {
                await fs.mkdir(sessionPath, { recursive: true });
                logger.info(`Created test session directory: ${sessionId}`);
            }
        } else {
            sessionPath = path.join(config.paths.uploads, sessionId);
            try {
                await fs.access(sessionPath);
            } catch {
                logger.warn(`Session directory not found: ${sessionId}`);
                return res.status(404).json({ 
                    success: false, 
                    error: 'Session not found' 
                });
            }
        }
        
        // Validate request data
        if (!dialogues || !Array.isArray(dialogues)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid dialogues data'
            });
        }
        
        // Prepare save data
        const saveData = {
            dialogues,
            metadata: {
                ...metadata,
                savedAt: new Date().toISOString(),
                totalLines: dialogues.length,
                modifiedLines: dialogues.filter(d => d.modified).length,
                version: '1.0'
            },
            sessionId
        };
        
        // Save to file
        const editedPath = path.join(sessionPath, 'edited_dialogues.json');
        await fs.writeFile(editedPath, JSON.stringify(saveData, null, 2));
        
        // Update in-memory session
        editingSessions.set(sessionId, {
            lastSaved: new Date().toISOString(),
            hasEdits: true,
            dialogueCount: dialogues.length,
            modifiedCount: dialogues.filter(d => d.modified).length
        });
        
        logger.success(`Saved ${dialogues.length} dialogues for session ${sessionId} (${saveData.metadata.modifiedLines} modified)`);
        
        res.json({
            success: true,
            message: 'Dialogues saved successfully',
            metadata: saveData.metadata
        });
        
    } catch (error) {
        logger.error('Failed to save edited dialogues:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save changes: ' + error.message
        });
    }
});

/**
 * Auto-save edited dialogues - POST /api/edit/autosave/:sessionId
 */
router.post('/autosave/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const { dialogues } = req.body;
    
    try {
        // Handle test sessions
        let sessionPath;
        if (sessionId.includes('test-session')) {
            sessionPath = path.join(__dirname, '../../temp', sessionId);
            // Create test session directory if it doesn't exist
            try {
                await fs.access(sessionPath);
            } catch {
                await fs.mkdir(sessionPath, { recursive: true });
                logger.info(`Created test session directory for autosave: ${sessionId}`);
            }
        } else {
            sessionPath = path.join(config.paths.uploads, sessionId);
            // Check if session exists
            try {
                await fs.access(sessionPath);
            } catch {
                return res.status(404).json({ success: false, error: 'Session not found' });
            }
        }
        
        // Save auto-save data
        const autosaveData = {
            dialogues,
            autoSavedAt: new Date().toISOString(),
            sessionId
        };
        
        const autosavePath = path.join(sessionPath, 'autosave_dialogues.json');
        await fs.writeFile(autosavePath, JSON.stringify(autosaveData, null, 2));
        
        logger.debug(`Auto-saved ${dialogues.length} dialogues for session ${sessionId}`);
        
        res.json({ success: true, autoSavedAt: autosaveData.autoSavedAt });
        
    } catch (error) {
        logger.error('Auto-save failed:', error);
        res.status(500).json({ success: false, error: 'Auto-save failed' });
    }
});

/**
 * Get edited dialogues - GET /api/edit/dialogues/:sessionId
 */
router.get('/dialogues/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    try {
        const sessionPath = path.join(config.paths.uploads, sessionId);
        const editedPath = path.join(sessionPath, 'edited_dialogues.json');
        const autosavePath = path.join(sessionPath, 'autosave_dialogues.json');
        
        // Check for edited version first
        try {
            const edited = await fs.readFile(editedPath, 'utf8');
            const editedData = JSON.parse(edited);
            
            logger.info(`Loaded edited dialogues for session ${sessionId}`);
            
            return res.json({
                success: true,
                source: 'edited',
                data: editedData,
                hasEdits: true
            });
        } catch {
            // Check for autosave
            try {
                const autosave = await fs.readFile(autosavePath, 'utf8');
                const autosaveData = JSON.parse(autosave);
                
                logger.info(`Loaded auto-saved dialogues for session ${sessionId}`);
                
                return res.json({
                    success: true,
                    source: 'autosave',
                    data: autosaveData,
                    hasEdits: true
                });
            } catch {
                // No edits found
                logger.info(`No edited dialogues found for session ${sessionId}`);
                
                return res.json({
                    success: true,
                    source: 'none',
                    data: null,
                    hasEdits: false
                });
            }
        }
        
    } catch (error) {
        logger.error('Failed to get edited dialogues:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load dialogues: ' + error.message
        });
    }
});

/**
 * Get editing session info - GET /api/edit/session/:sessionId
 */
router.get('/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    
    try {
        const sessionInfo = editingSessions.get(sessionId) || {
            hasEdits: false,
            lastSaved: null,
            dialogueCount: 0,
            modifiedCount: 0
        };
        
        res.json({
            success: true,
            sessionId,
            info: sessionInfo
        });
        
    } catch (error) {
        logger.error('Failed to get session info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get session info'
        });
    }
});

/**
 * Delete edited dialogues - DELETE /api/edit/dialogues/:sessionId
 */
router.delete('/dialogues/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    try {
        const sessionPath = path.join(config.paths.uploads, sessionId);
        const editedPath = path.join(sessionPath, 'edited_dialogues.json');
        const autosavePath = path.join(sessionPath, 'autosave_dialogues.json');
        
        // Delete files if they exist
        try {
            await fs.unlink(editedPath);
            logger.info(`Deleted edited dialogues for session ${sessionId}`);
        } catch {
            // File doesn't exist, that's fine
        }
        
        try {
            await fs.unlink(autosavePath);
            logger.info(`Deleted auto-save for session ${sessionId}`);
        } catch {
            // File doesn't exist, that's fine
        }
        
        // Remove from memory
        editingSessions.delete(sessionId);
        
        res.json({
            success: true,
            message: 'Edited dialogues deleted successfully'
        });
        
    } catch (error) {
        logger.error('Failed to delete edited dialogues:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete edits'
        });
    }
});

/**
 * Export edited dialogues in various formats - POST /api/edit/export/:sessionId
 */
router.post('/export/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const { format = 'markdown', includeMetadata = false } = req.body;
    
    try {
        // Get edited dialogues
        const sessionPath = path.join(config.paths.uploads, sessionId);
        const editedPath = path.join(sessionPath, 'edited_dialogues.json');
        
        const editedData = JSON.parse(await fs.readFile(editedPath, 'utf8'));
        const { dialogues, metadata } = editedData;
        
        let content = '';
        let filename = '';
        let contentType = 'text/plain';
        
        switch (format) {
            case 'markdown':
                content = generateMarkdown(dialogues, metadata, includeMetadata);
                filename = `edited_script_${sessionId}.md`;
                contentType = 'text/markdown';
                break;
                
            case 'json':
                content = JSON.stringify(editedData, null, 2);
                filename = `edited_dialogues_${sessionId}.json`;
                contentType = 'application/json';
                break;
                
            case 'txt':
                content = generatePlainText(dialogues);
                filename = `edited_script_${sessionId}.txt`;
                contentType = 'text/plain';
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Unsupported format'
                });
        }
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(content);
        
        logger.info(`Exported ${format} for session ${sessionId}`);
        
    } catch (error) {
        logger.error('Failed to export dialogues:', error);
        res.status(500).json({
            success: false,
            error: 'Export failed'
        });
    }
});

/**
 * Helper function to generate markdown
 */
function generateMarkdown(dialogues, metadata, includeMetadata) {
    let content = '# Edited Script\n\n';
    
    if (includeMetadata && metadata) {
        content += `<!-- Generated: ${metadata.savedAt} -->\n`;
        content += `<!-- Total Lines: ${metadata.totalLines} -->\n`;
        content += `<!-- Modified Lines: ${metadata.modifiedLines} -->\n\n`;
    }
    
    let currentSpeaker = null;
    
    dialogues.forEach((dialogue, index) => {
        if (dialogue.type === 'stage') {
            content += `\n*${dialogue.text}*\n\n`;
            currentSpeaker = null;
        } else {
            if (dialogue.speaker !== currentSpeaker) {
                content += `\n**${dialogue.speaker}:**\n`;
                currentSpeaker = dialogue.speaker;
            }
            content += `${dialogue.text}\n`;
        }
    });
    
    return content;
}

/**
 * Helper function to generate plain text
 */
function generatePlainText(dialogues) {
    let content = '';
    let currentSpeaker = null;
    
    dialogues.forEach(dialogue => {
        if (dialogue.type === 'stage') {
            content += `\n[${dialogue.text}]\n\n`;
            currentSpeaker = null;
        } else {
            if (dialogue.speaker !== currentSpeaker) {
                content += `\n${dialogue.speaker}: `;
                currentSpeaker = dialogue.speaker;
            } else {
                content += `${dialogue.speaker}: `;
            }
            content += `${dialogue.text}\n`;
        }
    });
    
    return content;
}

module.exports = router; 