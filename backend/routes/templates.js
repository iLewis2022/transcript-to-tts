// ===== TEMPLATE MANAGER API ROUTES - CHECKPOINT 4A =====
// Backend endpoints for managing voice mapping templates

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

// Template storage directory
const TEMPLATES_DIR = path.join(__dirname, '../../data/templates');

// Ensure templates directory exists
async function ensureTemplatesDir() {
    try {
        await fs.access(TEMPLATES_DIR);
    } catch {
        await fs.mkdir(TEMPLATES_DIR, { recursive: true });
        logger.info('Created templates directory');
    }
}

/**
 * Get all templates - GET /api/templates
 */
router.get('/', async (req, res) => {
    try {
        await ensureTemplatesDir();
        
        const files = await fs.readdir(TEMPLATES_DIR);
        const templateFiles = files.filter(f => f.endsWith('.json'));
        
        const templates = [];
        
        for (const file of templateFiles) {
            try {
                const filePath = path.join(TEMPLATES_DIR, file);
                const content = await fs.readFile(filePath, 'utf8');
                const template = JSON.parse(content);
                
                // Add metadata
                const stats = await fs.stat(filePath);
                template.id = path.basename(file, '.json');
                template.lastModified = stats.mtime.toISOString();
                template.fileSize = stats.size;
                
                templates.push(template);
            } catch (error) {
                logger.warn(`Failed to load template ${file}:`, error.message);
            }
        }
        
        // Sort by creation date (newest first)
        templates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        logger.info(`Loaded ${templates.length} templates`);
        
        res.json({
            success: true,
            templates,
            count: templates.length
        });
        
    } catch (error) {
        logger.error('Failed to get templates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load templates: ' + error.message
        });
    }
});

/**
 * Get specific template - GET /api/templates/:templateId
 */
router.get('/:templateId', async (req, res) => {
    try {
        const { templateId } = req.params;
        const templatePath = path.join(TEMPLATES_DIR, `${templateId}.json`);
        
        const content = await fs.readFile(templatePath, 'utf8');
        const template = JSON.parse(content);
        
        // Add metadata
        const stats = await fs.stat(templatePath);
        template.id = templateId;
        template.lastModified = stats.mtime.toISOString();
        template.fileSize = stats.size;
        
        logger.info(`Loaded template: ${templateId}`);
        
        res.json({
            success: true,
            template
        });
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }
        
        logger.error(`Failed to get template ${req.params.templateId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to load template: ' + error.message
        });
    }
});

/**
 * Save new template - POST /api/templates
 */
router.post('/', async (req, res) => {
    try {
        await ensureTemplatesDir();
        
        const { name, description, speakerMapping, metadata = {} } = req.body;
        
        // Validate required fields
        if (!name || !speakerMapping) {
            return res.status(400).json({
                success: false,
                error: 'Name and speaker mapping are required'
            });
        }
        
        // Create template ID from name
        const templateId = name.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
        
        if (!templateId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid template name'
            });
        }
        
        // Check if template already exists
        const templatePath = path.join(TEMPLATES_DIR, `${templateId}.json`);
        try {
            await fs.access(templatePath);
            return res.status(409).json({
                success: false,
                error: 'Template with this name already exists'
            });
        } catch {
            // Good, template doesn't exist
        }
        
        // Create template object
        const template = {
            name,
            description: description || '',
            speakerMapping,
            metadata: {
                ...metadata,
                speakerCount: Object.keys(speakerMapping).length,
                voiceCount: new Set(Object.values(speakerMapping)).size,
                version: '1.0'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save template
        await fs.writeFile(templatePath, JSON.stringify(template, null, 2));
        
        logger.success(`Created template: ${name} (${templateId})`);
        
        res.status(201).json({
            success: true,
            message: 'Template saved successfully',
            template: {
                ...template,
                id: templateId
            }
        });
        
    } catch (error) {
        logger.error('Failed to save template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save template: ' + error.message
        });
    }
});

/**
 * Update existing template - PUT /api/templates/:templateId
 */
router.put('/:templateId', async (req, res) => {
    try {
        const { templateId } = req.params;
        const { name, description, speakerMapping, metadata = {} } = req.body;
        
        const templatePath = path.join(TEMPLATES_DIR, `${templateId}.json`);
        
        // Check if template exists
        let existingTemplate;
        try {
            const content = await fs.readFile(templatePath, 'utf8');
            existingTemplate = JSON.parse(content);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.status(404).json({
                    success: false,
                    error: 'Template not found'
                });
            }
            throw error;
        }
        
        // Update template
        const updatedTemplate = {
            ...existingTemplate,
            name: name || existingTemplate.name,
            description: description !== undefined ? description : existingTemplate.description,
            speakerMapping: speakerMapping || existingTemplate.speakerMapping,
            metadata: {
                ...existingTemplate.metadata,
                ...metadata,
                speakerCount: Object.keys(speakerMapping || existingTemplate.speakerMapping).length,
                voiceCount: new Set(Object.values(speakerMapping || existingTemplate.speakerMapping)).size
            },
            updatedAt: new Date().toISOString()
        };
        
        // Save updated template
        await fs.writeFile(templatePath, JSON.stringify(updatedTemplate, null, 2));
        
        logger.success(`Updated template: ${templateId}`);
        
        res.json({
            success: true,
            message: 'Template updated successfully',
            template: {
                ...updatedTemplate,
                id: templateId
            }
        });
        
    } catch (error) {
        logger.error(`Failed to update template ${req.params.templateId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to update template: ' + error.message
        });
    }
});

/**
 * Delete template - DELETE /api/templates/:templateId
 */
router.delete('/:templateId', async (req, res) => {
    try {
        const { templateId } = req.params;
        const templatePath = path.join(TEMPLATES_DIR, `${templateId}.json`);
        
        // Check if template exists
        try {
            await fs.access(templatePath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.status(404).json({
                    success: false,
                    error: 'Template not found'
                });
            }
            throw error;
        }
        
        // Delete template
        await fs.unlink(templatePath);
        
        logger.success(`Deleted template: ${templateId}`);
        
        res.json({
            success: true,
            message: 'Template deleted successfully'
        });
        
    } catch (error) {
        logger.error(`Failed to delete template ${req.params.templateId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete template: ' + error.message
        });
    }
});

/**
 * Export template - GET /api/templates/:templateId/export
 */
router.get('/:templateId/export', async (req, res) => {
    try {
        const { templateId } = req.params;
        const templatePath = path.join(TEMPLATES_DIR, `${templateId}.json`);
        
        const content = await fs.readFile(templatePath, 'utf8');
        const template = JSON.parse(content);
        
        // Prepare export data
        const exportData = {
            ...template,
            exportedAt: new Date().toISOString(),
            exportVersion: '1.0'
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${templateId}-template.json"`);
        
        res.json(exportData);
        
        logger.info(`Exported template: ${templateId}`);
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }
        
        logger.error(`Failed to export template ${req.params.templateId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to export template: ' + error.message
        });
    }
});

/**
 * Import template - POST /api/templates/import
 */
router.post('/import', async (req, res) => {
    try {
        await ensureTemplatesDir();
        
        const templateData = req.body;
        
        // Validate imported data
        if (!templateData.name || !templateData.speakerMapping) {
            return res.status(400).json({
                success: false,
                error: 'Invalid template data: name and speakerMapping required'
            });
        }
        
        // Create new template ID (to avoid conflicts)
        const baseId = templateData.name.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
        
        let templateId = baseId;
        let counter = 1;
        
        // Find unique ID
        while (true) {
            try {
                const testPath = path.join(TEMPLATES_DIR, `${templateId}.json`);
                await fs.access(testPath);
                templateId = `${baseId}-${counter}`;
                counter++;
            } catch {
                break; // ID is available
            }
        }
        
        // Create imported template
        const importedTemplate = {
            name: templateData.name + (counter > 1 ? ` (${counter - 1})` : ''),
            description: templateData.description || '',
            speakerMapping: templateData.speakerMapping,
            metadata: {
                ...templateData.metadata,
                speakerCount: Object.keys(templateData.speakerMapping).length,
                voiceCount: new Set(Object.values(templateData.speakerMapping)).size,
                imported: true,
                importedAt: new Date().toISOString(),
                originalCreatedAt: templateData.createdAt,
                version: '1.0'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save imported template
        const templatePath = path.join(TEMPLATES_DIR, `${templateId}.json`);
        await fs.writeFile(templatePath, JSON.stringify(importedTemplate, null, 2));
        
        logger.success(`Imported template: ${importedTemplate.name} (${templateId})`);
        
        res.status(201).json({
            success: true,
            message: 'Template imported successfully',
            template: {
                ...importedTemplate,
                id: templateId
            }
        });
        
    } catch (error) {
        logger.error('Failed to import template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import template: ' + error.message
        });
    }
});

module.exports = router; 