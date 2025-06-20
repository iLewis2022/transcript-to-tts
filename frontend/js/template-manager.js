// ===== TEMPLATE MANAGER - CHECKPOINT 4A =====
// Frontend component for managing voice mapping templates

class TemplateManager {
    constructor() {
        this.templates = [];
        this.currentTemplate = null;
        this.isVisible = false;
        this.callbacks = {};
        
        this.init();
    }
    
    /**
     * Initialize template manager
     */
    init() {
        this.createHTML();
        this.bindEvents();
        console.log('TemplateManager: Initialized');
    }
    
    /**
     * Create template manager HTML interface
     */
    createHTML() {
        const html = `
            <div id="template-manager" class="template-manager hidden">
                <div class="template-manager-overlay"></div>
                <div class="template-manager-modal">
                    <div class="template-manager-header">
                        <h2>Voice Mapping Templates</h2>
                        <button class="template-close-btn" title="Close">×</button>
                    </div>
                    
                    <div class="template-manager-content">
                        <!-- Template List -->
                        <div class="template-list-section">
                            <div class="template-list-header">
                                <h3>Saved Templates</h3>
                                <div class="template-actions">
                                    <button class="btn btn-secondary" id="import-template-btn">
                                        📁 Import
                                    </button>
                                    <button class="btn btn-primary" id="new-template-btn">
                                        ➕ New Template
                                    </button>
                                </div>
                            </div>
                            
                            <div class="template-list" id="template-list">
                                <div class="template-loading">Loading templates...</div>
                            </div>
                        </div>
                        
                        <!-- Template Form -->
                        <div class="template-form-section hidden" id="template-form-section">
                            <div class="template-form-header">
                                <h3 id="template-form-title">New Template</h3>
                                <button class="btn btn-secondary" id="cancel-template-btn">Cancel</button>
                            </div>
                            
                            <form id="template-form" class="template-form">
                                <div class="form-group">
                                    <label for="template-name">Template Name *</label>
                                    <input type="text" id="template-name" required maxlength="50" 
                                           placeholder="e.g., Podcast Cast, Fantasy Characters">
                                </div>
                                
                                <div class="form-group">
                                    <label for="template-description">Description</label>
                                    <textarea id="template-description" rows="3" maxlength="200"
                                              placeholder="Optional description of this voice mapping..."></textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label>Voice Mappings</label>
                                    <div id="voice-mappings" class="voice-mappings">
                                        <!-- Dynamic content -->
                                    </div>
                                    <button type="button" class="btn btn-secondary btn-small" id="add-mapping-btn">
                                        ➕ Add Mapping
                                    </button>
                                </div>
                                
                                <div class="template-form-actions">
                                    <button type="button" class="btn btn-secondary" id="cancel-template-btn-2">
                                        Cancel
                                    </button>
                                    <button type="submit" class="btn btn-primary" id="save-template-btn">
                                        💾 Save Template
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                
                <!-- Hidden file input for import -->
                <input type="file" id="template-import-file" accept=".json" style="display: none;">
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Close buttons
        document.querySelector('.template-close-btn').addEventListener('click', () => this.hide());
        document.querySelector('.template-manager-overlay').addEventListener('click', () => this.hide());
        
        // Template actions
        document.getElementById('new-template-btn').addEventListener('click', () => this.showForm());
        document.getElementById('import-template-btn').addEventListener('click', () => this.importTemplate());
        document.getElementById('cancel-template-btn').addEventListener('click', () => this.hideForm());
        document.getElementById('cancel-template-btn-2').addEventListener('click', () => this.hideForm());
        
        // Form actions
        document.getElementById('template-form').addEventListener('submit', (e) => this.saveTemplate(e));
        document.getElementById('add-mapping-btn').addEventListener('click', () => this.addMappingRow());
        
        // Import file
        document.getElementById('template-import-file').addEventListener('change', (e) => this.handleImportFile(e));
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
    
    /**
     * Show template manager
     */
    async show(currentMapping = {}) {
        this.currentMapping = currentMapping;
        this.isVisible = true;
        
        document.getElementById('template-manager').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        await this.loadTemplates();
        this.hideForm();
    }
    
    /**
     * Hide template manager
     */
    hide() {
        this.isVisible = false;
        document.getElementById('template-manager').classList.add('hidden');
        document.body.style.overflow = '';
        this.hideForm();
    }
    
    /**
     * Load templates from backend
     */
    async loadTemplates() {
        try {
            const response = await fetch('/api/templates');
            const data = await response.json();
            
            if (data.success) {
                this.templates = data.templates;
                this.renderTemplateList();
            } else {
                throw new Error(data.error);
            }
            
        } catch (error) {
            console.error('TemplateManager: Failed to load templates:', error);
            this.showError('Failed to load templates: ' + error.message);
        }
    }
    
    /**
     * Render template list
     */
    renderTemplateList() {
        const listContainer = document.getElementById('template-list');
        
        if (this.templates.length === 0) {
            listContainer.innerHTML = `
                <div class="template-empty">
                    <p>No templates saved yet.</p>
                    <p>Create your first template to save voice mappings for reuse!</p>
                </div>
            `;
            return;
        }
        
        const html = this.templates.map(template => `
            <div class="template-item" data-template-id="${template.id}">
                <div class="template-info">
                    <h4 class="template-name">${this.escapeHtml(template.name)}</h4>
                    <p class="template-description">${this.escapeHtml(template.description || 'No description')}</p>
                    <div class="template-meta">
                        <span class="template-speakers">${template.metadata.speakerCount} speakers</span>
                        <span class="template-voices">${template.metadata.voiceCount} unique voices</span>
                        <span class="template-date">${this.formatDate(template.createdAt)}</span>
                    </div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-primary btn-small" onclick="templateManager.applyTemplate('${template.id}')">
                        ✓ Apply
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="templateManager.editTemplate('${template.id}')">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="templateManager.exportTemplate('${template.id}')">
                        📤 Export
                    </button>
                    <button class="btn btn-danger btn-small" onclick="templateManager.deleteTemplate('${template.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
        
        listContainer.innerHTML = html;
    }
    
    /**
     * Show template form
     */
    showForm(template = null) {
        this.currentTemplate = template;
        
        const formSection = document.getElementById('template-form-section');
        const formTitle = document.getElementById('template-form-title');
        const nameInput = document.getElementById('template-name');
        const descInput = document.getElementById('template-description');
        
        if (template) {
            formTitle.textContent = 'Edit Template';
            nameInput.value = template.name;
            descInput.value = template.description || '';
            this.renderVoiceMappings(template.speakerMapping);
        } else {
            formTitle.textContent = 'New Template';
            nameInput.value = '';
            descInput.value = '';
            this.renderVoiceMappings(this.currentMapping);
        }
        
        formSection.classList.remove('hidden');
        nameInput.focus();
    }
    
    /**
     * Hide template form
     */
    hideForm() {
        document.getElementById('template-form-section').classList.add('hidden');
        this.currentTemplate = null;
    }
    
    /**
     * Render voice mappings in form
     */
    renderVoiceMappings(mappings = {}) {
        const container = document.getElementById('voice-mappings');
        
        const entries = Object.entries(mappings);
        if (entries.length === 0) {
            entries.push(['', '']); // At least one empty row
        }
        
        const html = entries.map(([speaker, voice], index) => `
            <div class="voice-mapping-row">
                <input type="text" class="mapping-speaker" placeholder="Speaker name" 
                       value="${this.escapeHtml(speaker)}" required>
                <span class="mapping-arrow">→</span>
                <input type="text" class="mapping-voice" placeholder="Voice ID" 
                       value="${this.escapeHtml(voice)}" required>
                <button type="button" class="btn btn-danger btn-small mapping-remove" 
                        onclick="this.parentElement.remove()" ${entries.length === 1 ? 'disabled' : ''}>
                    ×
                </button>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }
    
    /**
     * Add new mapping row
     */
    addMappingRow() {
        const container = document.getElementById('voice-mappings');
        const newRow = document.createElement('div');
        newRow.className = 'voice-mapping-row';
        newRow.innerHTML = `
            <input type="text" class="mapping-speaker" placeholder="Speaker name" required>
            <span class="mapping-arrow">→</span>
            <input type="text" class="mapping-voice" placeholder="Voice ID" required>
            <button type="button" class="btn btn-danger btn-small mapping-remove" 
                    onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(newRow);
        
        // Enable remove buttons
        container.querySelectorAll('.mapping-remove').forEach(btn => btn.disabled = false);
        
        newRow.querySelector('.mapping-speaker').focus();
    }
    
    /**
     * Save template
     */
    async saveTemplate(e) {
        e.preventDefault();
        
        try {
            const name = document.getElementById('template-name').value.trim();
            const description = document.getElementById('template-description').value.trim();
            
            // Collect voice mappings
            const mappingRows = document.querySelectorAll('.voice-mapping-row');
            const speakerMapping = {};
            
            for (const row of mappingRows) {
                const speaker = row.querySelector('.mapping-speaker').value.trim();
                const voice = row.querySelector('.mapping-voice').value.trim();
                
                if (speaker && voice) {
                    speakerMapping[speaker] = voice;
                }
            }
            
            if (Object.keys(speakerMapping).length === 0) {
                this.showError('Please add at least one voice mapping');
                return;
            }
            
            const templateData = {
                name,
                description,
                speakerMapping,
                metadata: {
                    source: 'dialogue-editor'
                }
            };
            
            let response;
            if (this.currentTemplate) {
                // Update existing
                response = await fetch(`/api/templates/${this.currentTemplate.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(templateData)
                });
            } else {
                // Create new
                response = await fetch('/api/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(templateData)
                });
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(result.message);
                await this.loadTemplates();
                this.hideForm();
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('TemplateManager: Failed to save template:', error);
            this.showError('Failed to save template: ' + error.message);
        }
    }
    
    /**
     * Apply template to current session
     */
    async applyTemplate(templateId) {
        try {
            const template = this.templates.find(t => t.id === templateId);
            if (!template) {
                throw new Error('Template not found');
            }
            
            // Call callback if provided
            if (this.callbacks.onApplyTemplate) {
                await this.callbacks.onApplyTemplate(template.speakerMapping, template.name);
            }
            
            this.showSuccess(`Applied template: ${template.name}`);
            this.hide();
            
        } catch (error) {
            console.error('TemplateManager: Failed to apply template:', error);
            this.showError('Failed to apply template: ' + error.message);
        }
    }
    
    /**
     * Edit template
     */
    editTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (template) {
            this.showForm(template);
        }
    }
    
    /**
     * Export template
     */
    async exportTemplate(templateId) {
        try {
            const response = await fetch(`/api/templates/${templateId}/export`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${templateId}-template.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.showSuccess('Template exported successfully');
            } else {
                const error = await response.json();
                throw new Error(error.error);
            }
            
        } catch (error) {
            console.error('TemplateManager: Failed to export template:', error);
            this.showError('Failed to export template: ' + error.message);
        }
    }
    
    /**
     * Delete template
     */
    async deleteTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;
        
        if (!confirm(`Are you sure you want to delete the template "${template.name}"?\n\nThis action cannot be undone.`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/templates/${templateId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Template deleted successfully');
                await this.loadTemplates();
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('TemplateManager: Failed to delete template:', error);
            this.showError('Failed to delete template: ' + error.message);
        }
    }
    
    /**
     * Import template
     */
    importTemplate() {
        document.getElementById('template-import-file').click();
    }
    
    /**
     * Handle import file selection
     */
    async handleImportFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const templateData = JSON.parse(text);
            
            const response = await fetch('/api/templates/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(templateData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Template imported successfully');
                await this.loadTemplates();
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('TemplateManager: Failed to import template:', error);
            this.showError('Failed to import template: ' + error.message);
        }
        
        // Clear file input
        e.target.value = '';
    }
    
    /**
     * Set callback functions
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
    
    /**
     * Show success message
     */
    showSuccess(message) {
        // You can implement a toast notification system here
        console.log('✅ TemplateManager:', message);
        // For now, use alert (replace with better UI later)
        alert('✅ ' + message);
    }
    
    /**
     * Show error message
     */
    showError(message) {
        console.error('❌ TemplateManager:', message);
        alert('❌ ' + message);
    }
    
    /**
     * Utility: Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Utility: Format date
     */
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
}

// Initialize template manager
const templateManager = new TemplateManager();

// Debug helper
window.testTemplateManager = function() {
    console.log('🧪 Testing Template Manager...');
    
    const testMapping = {
        'ALICE': 'voice-001',
        'BOB': 'voice-002',
        'NARRATOR': 'voice-003'
    };
    
    templateManager.show(testMapping);
    console.log('✅ Template Manager opened with test mapping');
};

// Export for use in other modules
window.templateManager = templateManager; 