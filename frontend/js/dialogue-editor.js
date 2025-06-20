// ===== DIALOGUE EDITOR - CHECKPOINT 2 =====
// Core dialogue editing functionality
// This is a simplified version for initial testing

class DialogueEditor {
    constructor() {
        this.dialogues = [];
        this.currentSessionId = null;
        this.hasChanges = false;
        this.speakerMapping = {};
        this.autoSaveInterval = null;
        this.autoSaveEnabled = true;
    }

    /**
     * Initialize the dialogue editor with parsed data
     */
    async initialize(sessionId, dialogues, speakerMapping) {
        console.log('DialogueEditor: Initializing with', { sessionId, dialogueCount: dialogues?.length });
        
        this.currentSessionId = sessionId;
        this.speakerMapping = speakerMapping || {};
        
        // Try to load existing edits first
        const existingEdits = await this.loadExistingEdits(sessionId);
        
        if (existingEdits) {
            this.dialogues = existingEdits.dialogues;
            console.log('DialogueEditor: Loaded existing edits from', existingEdits.source);
            
            if (existingEdits.source === 'autosave') {
                alert('📝 Auto-saved changes found! Your previous edits have been restored.');
            }
        } else {
            // Use provided dialogues
            this.dialogues = JSON.parse(JSON.stringify(dialogues || [])); // Deep clone
        }
        
        // Start auto-save
        this.startAutoSave();
        
        // Show the editor interface
        this.showEditorInterface();
    }

    /**
     * Display the basic editor interface
     */
    showEditorInterface() {
        console.log('DialogueEditor: Showing interface for', this.dialogues.length, 'dialogues');
        
        const editorHTML = `
            <div class="dialogue-editor">
                <div class="editor-header">
                    <h2>✏️ Edit Dialogue</h2>
                    <div class="editor-actions">
                        <button class="btn btn-secondary" onclick="dialogueEditor.addDialogue()">
                            ➕ Add Line
                        </button>
                        <div class="save-indicator ${this.hasChanges ? 'has-changes' : ''}">
                            <span class="status-dot"></span>
                            <span class="status-text">${this.hasChanges ? 'Unsaved changes' : 'All changes saved'}</span>
                        </div>
                    </div>
                </div>

                <div class="dialogue-list" id="dialogue-list">
                    ${this.renderDialogueList()}
                </div>

                <div class="editor-footer">
                    <button class="btn btn-secondary" onclick="dialogueEditor.openTemplateManager()">
                        📋 Templates
                    </button>
                    <button class="btn btn-secondary" onclick="dialogueEditor.openTTSControls()">
                        🎤 TTS Settings
                    </button>
                    <button class="btn btn-primary" onclick="dialogueEditor.saveAndContinue()">
                        💾 Save Changes
                    </button>
                    <button class="btn btn-secondary" onclick="dialogueEditor.exportScript()">
                        📄 Export Script
                    </button>
                    <button class="btn btn-ghost" onclick="dialogueEditor.closeEditor()">
                        ❌ Close Editor
                    </button>
                </div>
            </div>
        `;

        // Create or update editor section
        let editorSection = document.getElementById('editor-section');
        if (!editorSection) {
            editorSection = document.createElement('section');
            editorSection.id = 'editor-section';
            editorSection.className = 'section';
            document.querySelector('.container main').appendChild(editorSection);
        }
        
        editorSection.innerHTML = editorHTML;
        
        // Hide other sections and show editor
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        editorSection.classList.remove('hidden');
    }

    /**
     * Render the dialogue list (simplified version)
     */
    renderDialogueList() {
        if (!this.dialogues || this.dialogues.length === 0) {
            return '<div class="empty-state">No dialogues found. Use the parser to generate dialogues first.</div>';
        }

        return this.dialogues.map((dialogue, index) => `
            <div class="dialogue-item ${dialogue.modified ? 'modified' : ''}" data-index="${index}">
                <div class="dialogue-number">${index + 1}</div>
                
                <div class="dialogue-content">
                    <div class="dialogue-header">
                        <select class="speaker-select" onchange="dialogueEditor.changeSpeaker(${index}, this.value)">
                            ${this.getSpeakerOptions(dialogue.speaker)}
                        </select>
                        <span class="dialogue-type ${dialogue.type || 'dialogue'}">${dialogue.type || 'dialogue'}</span>
                        ${dialogue.modified ? '<span class="modified-badge">Modified</span>' : ''}
                    </div>
                    
                    <div class="dialogue-text-wrapper">
                        <textarea class="dialogue-text" 
                                  rows="${this.calculateRows(dialogue.text)}"
                                  onchange="dialogueEditor.updateText(${index}, this.value)"
                                  placeholder="Enter dialogue text...">${dialogue.text || ''}</textarea>
                        <div class="character-count">${(dialogue.text || '').length} chars</div>
                    </div>
                </div>

                <div class="dialogue-actions">
                    <button class="action-btn" onclick="dialogueEditor.moveLineUp(${index})" title="Move Up" ${index === 0 ? 'disabled' : ''}>
                        ⬆️
                    </button>
                    <button class="action-btn" onclick="dialogueEditor.moveLineDown(${index})" title="Move Down" ${index === this.dialogues.length - 1 ? 'disabled' : ''}>
                        ⬇️
                    </button>
                    <button class="action-btn delete" onclick="dialogueEditor.deleteLine(${index})" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Update dialogue text
     */
    updateText(index, newText) {
        if (this.dialogues[index] && this.dialogues[index].text !== newText) {
            this.dialogues[index].text = newText;
            this.dialogues[index].modified = true;
            this.markAsChanged();
            console.log('DialogueEditor: Updated text for line', index + 1);
        }
    }

    /**
     * Change speaker for a dialogue
     */
    changeSpeaker(index, newSpeaker) {
        if (this.dialogues[index] && this.dialogues[index].speaker !== newSpeaker) {
            const oldSpeaker = this.dialogues[index].speaker;
            this.dialogues[index].speaker = newSpeaker;
            this.dialogues[index].modified = true;
            this.markAsChanged();
            
            console.log('DialogueEditor: Changed speaker from', oldSpeaker, 'to', newSpeaker, 'for line', index + 1);
            
            // Update display
            const item = document.querySelector(`[data-index="${index}"]`);
            if (item) {
                item.classList.add('modified');
            }
        }
    }

    /**
     * Add new dialogue line
     */
    addDialogue() {
        const newDialogue = {
            type: 'dialogue',
            speaker: 'SPEAKER',
            text: '',
            modified: true,
            isNew: true
        };
        
        this.dialogues.push(newDialogue);
        this.markAsChanged();
        this.showEditorInterface();
        
        console.log('DialogueEditor: Added new dialogue line');
        
        // Focus on the new line
        setTimeout(() => {
            const newIndex = this.dialogues.length - 1;
            const newItem = document.querySelector(`[data-index="${newIndex}"] .dialogue-text`);
            if (newItem) {
                newItem.focus();
            }
        }, 100);
    }

    /**
     * Delete dialogue line
     */
    deleteLine(index) {
        if (confirm('Delete this dialogue line?')) {
            const deletedDialogue = this.dialogues[index];
            this.dialogues.splice(index, 1);
            this.markAsChanged();
            this.showEditorInterface();
            
            console.log('DialogueEditor: Deleted line', index + 1, ':', deletedDialogue.text?.substring(0, 50) + '...');
        }
    }

    /**
     * Move dialogue line up
     */
    moveLineUp(index) {
        if (index > 0) {
            [this.dialogues[index], this.dialogues[index - 1]] = [this.dialogues[index - 1], this.dialogues[index]];
            this.dialogues[index].modified = true;
            this.dialogues[index - 1].modified = true;
            this.markAsChanged();
            this.showEditorInterface();
            
            console.log('DialogueEditor: Moved line', index + 1, 'up');
        }
    }

    /**
     * Move dialogue line down
     */
    moveLineDown(index) {
        if (index < this.dialogues.length - 1) {
            [this.dialogues[index], this.dialogues[index + 1]] = [this.dialogues[index + 1], this.dialogues[index]];
            this.dialogues[index].modified = true;
            this.dialogues[index + 1].modified = true;
            this.markAsChanged();
            this.showEditorInterface();
            
            console.log('DialogueEditor: Moved line', index + 1, 'down');
        }
    }

    /**
     * Open template manager
     */
    openTemplateManager() {
        // Extract current speaker mapping from dialogues
        const currentSpeakers = [...new Set(this.dialogues.map(d => d.speaker))];
        const currentMapping = {};
        
        // Create a basic mapping (you could extend this to remember previous mappings)
        currentSpeakers.forEach(speaker => {
            currentMapping[speaker] = ''; // Empty voice ID to be filled
        });
        
        // Set up template manager callbacks
        if (window.templateManager) {
            templateManager.setCallbacks({
                onApplyTemplate: async (speakerMapping, templateName) => {
                    await this.applyTemplate(speakerMapping, templateName);
                }
            });
            
            // Show template manager with current speakers
            templateManager.show(currentMapping);
        } else {
            alert('Template Manager not available. Please refresh the page.');
        }
    }
    
    /**
     * Open TTS control panel
     */
    openTTSControls() {
        // Set up TTS control panel callback
        if (window.ttsControlPanel) {
            ttsControlPanel.setCallback((settings, voice) => {
                this.applyTTSSettings(settings, voice);
            });
            
            // Show TTS control panel with current dialogues
            ttsControlPanel.show(null, this.dialogues);
        } else {
            alert('TTS Control Panel not available. Please refresh the page.');
        }
    }
    
    /**
     * Apply TTS settings to current session
     */
    async applyTTSSettings(settings, voice) {
        try {
            // Store TTS settings for later use
            this.currentTTSSettings = settings;
            this.currentVoice = voice;
            
            console.log('✅ Applied TTS settings:', settings);
            console.log('✅ Selected voice:', voice?.name || 'None');
            
            // VERIFICATION: Verify the applied settings immediately
            await this.verifyTTSSettings(settings, voice);
            
            // Update persistent UI indicator
            this.updateTTSStatusIndicator(settings, voice);
            
        } catch (error) {
            console.error('DialogueEditor: Failed to apply TTS settings:', error);
            alert('❌ Failed to apply TTS settings: ' + error.message);
        }
    }
    
    /**
     * VERIFICATION: Verify TTS settings are correctly applied
     */
    async verifyTTSSettings(settings, voice) {
        try {
            console.log('🔍 VERIFICATION: Verifying applied TTS settings...');
            
            // Verify current model configuration
            const response = await fetch('/api/tts/verify-current-model');
            const data = await response.json();
            
            if (data.success) {
                const verification = data.verification;
                
                // Check if applied settings match environment
                const settingsMatch = settings.model_id === verification.environment_default;
                
                if (settingsMatch && verification.is_using_recommended) {
                    console.log('✅ VERIFICATION PASSED: Settings correctly applied with recommended model');
                    this.showTTSVerificationResult('success', `✅ TTS Settings Verified!\n\nModel: ${settings.model_id} (HIGH QUALITY)\nVoice: ${voice?.name || 'Not selected'}\nFormat: ${settings.output_format}`);
                } else if (!settingsMatch) {
                    console.warn('⚠️ VERIFICATION WARNING: Applied settings don\'t match environment default');
                    this.showTTSVerificationResult('warning', `⚠️ Settings Applied with Warning\n\nRequested: ${settings.model_id}\nEnvironment Default: ${verification.environment_default}\n\nThis might cause quality issues!`);
                } else if (!verification.is_using_recommended) {
                    console.warn('⚠️ VERIFICATION WARNING: Not using recommended model');
                    this.showTTSVerificationResult('warning', `⚠️ Quality Warning!\n\nUsing: ${settings.model_id}\nRecommended: ${verification.recommended_model}\n\nConsider switching to v2 for better quality!`);
                }
                
                return verification;
            } else {
                throw new Error('Failed to verify model configuration');
            }
            
        } catch (error) {
            console.error('❌ TTS VERIFICATION FAILED:', error);
            this.showTTSVerificationResult('error', `❌ Verification Failed\n\n${error.message}\n\nSettings applied but not verified.`);
        }
    }
    
    /**
     * Show TTS verification result with proper styling
     */
    showTTSVerificationResult(type, message) {
        // Create a better modal instead of alert
        const modal = document.createElement('div');
        modal.className = `tts-verification-modal ${type}`;
        modal.innerHTML = `
            <div class="tts-verification-overlay"></div>
            <div class="tts-verification-content">
                <div class="tts-verification-header">
                    <h3>🔍 TTS Settings Verification</h3>
                    <button class="tts-verification-close">×</button>
                </div>
                <div class="tts-verification-body">
                    <pre>${message}</pre>
                </div>
                <div class="tts-verification-actions">
                    <button class="btn btn-primary tts-verification-ok">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close handlers
        modal.querySelector('.tts-verification-close').addEventListener('click', () => modal.remove());
        modal.querySelector('.tts-verification-ok').addEventListener('click', () => modal.remove());
        modal.querySelector('.tts-verification-overlay').addEventListener('click', () => modal.remove());
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (modal.parentNode) modal.remove();
        }, 10000);
    }
    
    /**
     * Update persistent TTS status indicator in dialogue editor
     */
    updateTTSStatusIndicator(settings, voice) {
        // Remove existing indicator
        const existingIndicator = document.querySelector('.tts-status-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Create persistent status indicator
        const isHighQuality = settings.model_id === 'eleven_multilingual_v2';
        const indicatorHTML = `
            <div class="tts-status-indicator ${isHighQuality ? 'high-quality' : 'low-quality'}">
                <div class="tts-status-header">
                    <strong>🎤 TTS Settings Active</strong>
                    <span class="tts-status-badge ${isHighQuality ? 'good' : 'warning'}">
                        ${isHighQuality ? '✅ HIGH QUALITY' : '⚠️ LOW QUALITY'}
                    </span>
                </div>
                <div class="tts-status-details">
                    <div class="tts-status-item">
                        <span>Model:</span> 
                        <code>${settings.model_id}</code>
                    </div>
                    <div class="tts-status-item">
                        <span>Voice:</span> 
                        <code>${voice?.name || 'Not selected'}</code>
                    </div>
                    <div class="tts-status-item">
                        <span>Format:</span> 
                        <code>${settings.output_format}</code>
                    </div>
                </div>
            </div>
        `;
        
        // Insert after the dialogue editor header
        const editorHeader = document.querySelector('.dialogue-editor-header');
        if (editorHeader) {
            editorHeader.insertAdjacentHTML('afterend', indicatorHTML);
        }
        
        // Make it persistent by storing in session
        sessionStorage.setItem('tts-settings-applied', JSON.stringify({
            settings,
            voice: voice ? { name: voice.name, voice_id: voice.voice_id } : null,
            timestamp: Date.now()
        }));
    }

    /**
     * Apply template to current session
     */
    async applyTemplate(speakerMapping, templateName) {
        try {
            // Update speaker mappings in dialogues
            let appliedCount = 0;
            
            this.dialogues.forEach(dialogue => {
                if (speakerMapping[dialogue.speaker]) {
                    dialogue.voiceId = speakerMapping[dialogue.speaker];
                    appliedCount++;
                }
            });
            
            // Store the mapping for later use (in TTS generation)
            this.currentSpeakerMapping = speakerMapping;
            
            // Show success message
            console.log(`✅ Applied template "${templateName}" to ${appliedCount} dialogues`);
            
            // Update UI to show applied mappings
            this.showEditorInterface();
            
            // Show confirmation
            alert(`✅ Applied template "${templateName}"\nMapped ${appliedCount} dialogue lines to voices.`);
            
        } catch (error) {
            console.error('DialogueEditor: Failed to apply template:', error);
            alert('❌ Failed to apply template: ' + error.message);
        }
    }

    /**
     * Export edited script
     */
    exportScript() {
        let content = `# Edited Script\n\n`;
        let currentSpeaker = null;
        
        this.dialogues.forEach(dialogue => {
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
        
        // Download file
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edited_script_${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('DialogueEditor: Exported script with', this.dialogues.length, 'lines');
    }

    /**
     * Save changes and continue
     */
    async saveAndContinue() {
        if (!this.hasChanges) {
            alert('No changes to save');
            return;
        }
        
        console.log('DialogueEditor: Saving', this.dialogues.filter(d => d.modified).length, 'changed dialogues');
        
        try {
            // Save edited dialogues
            const response = await fetch(`/api/edit/save/${this.currentSessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dialogues: this.dialogues,
                    metadata: {
                        editedAt: new Date().toISOString(),
                        totalChanges: this.dialogues.filter(d => d.modified).length,
                        editor: 'dialogue-editor-v1'
                    }
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.hasChanges = false;
                this.updateSaveIndicator();
                
                console.log('DialogueEditor: Successfully saved dialogues');
                alert(`✅ Changes saved successfully!\n\nSaved ${data.metadata.totalLines} dialogues (${data.metadata.modifiedLines} modified)`);
                
                // Continue to next phase or close editor
                if (confirm('Would you like to continue to the next step?')) {
                    this.proceedToNextPhase();
                }
            } else {
                throw new Error(data.error);
            }
            
        } catch (error) {
            console.error('DialogueEditor: Save error:', error);
            alert('❌ Failed to save changes: ' + error.message);
        }
    }

    /**
     * Close editor and return to previous view
     */
    closeEditor() {
        if (this.hasChanges && !confirm('You have unsaved changes. Are you sure you want to close?')) {
            return;
        }
        
        console.log('DialogueEditor: Closing editor');
        
        // Stop auto-save
        this.stopAutoSave();
        
        // Hide editor section
        const editorSection = document.getElementById('editor-section');
        if (editorSection) {
            editorSection.classList.add('hidden');
        }
        
        // Show the previous section (mapping or results)
        const mappingSection = document.getElementById('mapping-section');
        const resultsSection = document.getElementById('results-section');
        
        if (mappingSection && !mappingSection.classList.contains('hidden')) {
            mappingSection.classList.remove('hidden');
        } else if (resultsSection) {
            resultsSection.classList.remove('hidden');
        }
    }

    /**
     * Load existing edits from backend
     */
    async loadExistingEdits(sessionId) {
        try {
            const response = await fetch(`/api/edit/dialogues/${sessionId}`);
            const data = await response.json();
            
            if (data.success && data.hasEdits) {
                return {
                    dialogues: data.data.dialogues,
                    source: data.source,
                    metadata: data.data.metadata
                };
            }
            
            return null;
        } catch (error) {
            console.error('DialogueEditor: Failed to load existing edits:', error);
            return null;
        }
    }

    /**
     * Start auto-save functionality
     */
    startAutoSave() {
        if (!this.autoSaveEnabled) return;
        
        // Auto-save every 30 seconds
        this.autoSaveInterval = setInterval(() => {
            if (this.hasChanges) {
                this.autoSave();
            }
        }, 30000);
        
        console.log('DialogueEditor: Auto-save started (30s interval)');
    }

    /**
     * Stop auto-save
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            console.log('DialogueEditor: Auto-save stopped');
        }
    }

    /**
     * Auto-save changes
     */
    async autoSave() {
        if (!this.currentSessionId || !this.hasChanges) return;
        
        try {
            const response = await fetch(`/api/edit/autosave/${this.currentSessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dialogues: this.dialogues })
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('DialogueEditor: Auto-saved at', data.autoSavedAt);
            }
        } catch (error) {
            console.error('DialogueEditor: Auto-save failed:', error);
        }
    }

    /**
     * Proceed to next phase
     */
    proceedToNextPhase() {
        // Stop auto-save
        this.stopAutoSave();
        
        // Hide editor and show mapping section
        document.getElementById('editor-section').classList.add('hidden');
        
        // Try to show mapping section or results section
        const mappingSection = document.getElementById('mapping-section');
        const resultsSection = document.getElementById('results-section');
        
        if (mappingSection) {
            mappingSection.classList.remove('hidden');
        } else if (resultsSection) {
            resultsSection.classList.remove('hidden');
        }
        
        // Update global state if available
        if (window.state && window.state.parseResults) {
            window.state.parseResults.dialogues = this.dialogues;
        }
        
        console.log('DialogueEditor: Proceeded to next phase');
    }

    /**
     * Helper methods
     */
    markAsChanged() {
        this.hasChanges = true;
        this.updateSaveIndicator();
    }

    updateSaveIndicator() {
        const indicator = document.querySelector('.save-indicator');
        if (indicator) {
            indicator.classList.toggle('has-changes', this.hasChanges);
            const statusText = indicator.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = this.hasChanges ? 'Unsaved changes' : 'All changes saved';
            }
        }
    }

    getSpeakerOptions(selected) {
        // Get all unique speakers from dialogues
        const speakers = [...new Set(this.dialogues
            .filter(d => d.type === 'dialogue' && d.speaker)
            .map(d => d.speaker))];
        
        // Add common speaker names if not present
        const commonSpeakers = ['NARRATOR', 'DM', 'SPEAKER'];
        commonSpeakers.forEach(speaker => {
            if (!speakers.includes(speaker)) {
                speakers.push(speaker);
            }
        });
        
        return speakers.map(speaker => 
            `<option value="${speaker}" ${speaker === selected ? 'selected' : ''}>${speaker}</option>`
        ).join('');
    }

    calculateRows(text) {
        if (!text) return 2;
        const lines = text.split('\n').length;
        const chars = text.length;
        const estimatedLines = Math.ceil(chars / 80);
        return Math.max(2, Math.min(6, Math.max(lines, estimatedLines)));
    }
}

// Initialize dialogue editor
window.dialogueEditor = new DialogueEditor();

// Debug helper - creates a test session that works with saves
window.testDialogueEditor = async function() {
    const testDialogues = [
        { type: 'dialogue', speaker: 'ALICE', text: 'Hello, how are you doing today?' },
        { type: 'dialogue', speaker: 'BOB', text: 'I am doing well, thank you for asking!' },
        { type: 'stage', speaker: 'NARRATOR', text: 'Alice and Bob continue their conversation.' },
        { type: 'dialogue', speaker: 'ALICE', text: 'That is wonderful to hear.' }
    ];
    
    console.log('🧪 Setting up dialogue editor test session...');
    
    // Use a test session ID that the backend will handle specially
    const testSessionId = 'test-session-' + Date.now();
    
    console.log('✅ Test session ID:', testSessionId);
    
    // Initialize dialogue editor with test session
    await dialogueEditor.initialize(testSessionId, testDialogues, {});
    
    console.log('🎉 Dialogue editor ready with test session!');
    console.log('💡 Try editing text, changing speakers, adding/deleting lines, and saving!');
    console.log('🔧 Backend will auto-create the session directory for testing');
};

console.log('DialogueEditor: Checkpoint 2 loaded successfully'); 