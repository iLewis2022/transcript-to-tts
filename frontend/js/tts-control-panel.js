// ===== TTS CONTROL PANEL - PHASE 5 =====
// Enhanced TTS integration with full ElevenLabs control

class TTSControlPanel {
    constructor() {
        this.isVisible = false;
        this.currentVoice = null;
        this.currentSettings = {
            model_id: 'eleven_multilingual_v2',
            output_format: 'pcm_44100',
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
        };
        this.availableModels = [];
        this.availableFormats = [];
        this.isGenerating = false;
        
        this.init();
    }
    
    /**
     * Initialize TTS control panel
     */
    init() {
        this.createHTML();
        this.bindEvents();
        this.loadModelsAndFormats();
        console.log('TTSControlPanel: Initialized');
    }
    
    /**
     * Create TTS control panel HTML interface
     */
    createHTML() {
        const html = `
            <div id="tts-control-panel" class="tts-control-panel hidden">
                <div class="tts-panel-overlay"></div>
                <div class="tts-panel-modal">
                    <div class="tts-panel-header">
                        <h2>🎤 Advanced TTS Controls</h2>
                        <button class="tts-close-btn">×</button>
                    </div>
                    
                    <div class="tts-panel-content">
                        <!-- Voice Selection -->
                        <div class="tts-section">
                            <h3>🎭 Voice Selection</h3>
                            <select id="voice-select" class="voice-select">
                                <option value="">Select a voice...</option>
                            </select>
                            <button class="btn btn-secondary" id="preview-voice-btn" disabled>
                                🔊 Preview Voice
                            </button>
                            <div class="voice-info hidden" id="voice-info">
                                <div class="voice-details"></div>
                                <audio controls class="voice-preview-audio hidden" id="voice-preview-audio"></audio>
                            </div>
                        </div>
                        
                        <!-- Model & Quality Settings -->
                        <div class="tts-section">
                            <h3>⚙️ Model & Quality</h3>
                            <div class="settings-grid">
                                <div class="setting-group">
                                    <label for="model-select">AI Model</label>
                                    <select id="model-select" class="setting-select">
                                        <option value="">Loading models...</option>
                                    </select>
                                    <div class="setting-info" id="model-info">Select a model</div>
                                </div>
                                
                                <div class="setting-group">
                                    <label for="format-select">Output Format</label>
                                    <select id="format-select" class="setting-select">
                                        <option value="">Loading formats...</option>
                                    </select>
                                    <div class="setting-info" id="format-info">Select a format</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Voice Settings -->
                        <div class="tts-section">
                            <h3>🎛️ Voice Settings</h3>
                            <div class="voice-settings">
                                <div class="setting-slider">
                                    <label>Stability: <span id="stability-value">0.5</span></label>
                                    <input type="range" id="stability-slider" min="0" max="1" step="0.01" value="0.5">
                                </div>
                                
                                <div class="setting-slider">
                                    <label>Similarity Boost: <span id="similarity-value">0.8</span></label>
                                    <input type="range" id="similarity-slider" min="0" max="1" step="0.01" value="0.8">
                                </div>
                                
                                <div class="setting-slider">
                                    <label>Style: <span id="style-value">0.0</span></label>
                                    <input type="range" id="style-slider" min="0" max="1" step="0.01" value="0.0">
                                </div>
                                
                                <div class="setting-checkbox">
                                    <label>
                                        <input type="checkbox" id="speaker-boost" checked>
                                        Use Speaker Boost
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Test Generation -->
                        <div class="tts-section">
                            <h3>🧪 Test Generation & Verification</h3>
                            <textarea id="test-text" placeholder="Enter text to test...">Hello, this is a test.</textarea>
                            <div class="verification-buttons">
                                <button class="btn btn-primary" id="generate-test-btn">🎵 Generate Test Audio</button>
                                <button class="btn btn-secondary" id="verify-model-btn">🔍 Verify Model Execution</button>
                                <button class="btn btn-secondary" id="verify-settings-btn">🔄 Verify Settings Sync</button>
                            </div>
                            <audio controls class="test-audio hidden" id="test-audio"></audio>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="tts-panel-actions">
                            <button class="btn btn-secondary" id="cancel-tts-btn">Cancel</button>
                            <button class="btn btn-primary" id="apply-settings-btn">✅ Apply Settings</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        document.querySelector('.tts-close-btn').addEventListener('click', () => this.hide());
        document.querySelector('.tts-panel-overlay').addEventListener('click', () => this.hide());
        document.getElementById('cancel-tts-btn').addEventListener('click', () => this.hide());
        
        document.getElementById('voice-select').addEventListener('change', (e) => this.onVoiceSelect(e.target.value));
        document.getElementById('preview-voice-btn').addEventListener('click', () => this.previewCurrentVoice());
        
        document.getElementById('model-select').addEventListener('change', (e) => this.onModelSelect(e.target.value));
        document.getElementById('format-select').addEventListener('change', (e) => this.onFormatSelect(e.target.value));
        
        document.getElementById('stability-slider').addEventListener('input', (e) => this.updateSetting('stability', e.target.value));
        document.getElementById('similarity-slider').addEventListener('input', (e) => this.updateSetting('similarity_boost', e.target.value));
        document.getElementById('style-slider').addEventListener('input', (e) => this.updateSetting('style', e.target.value));
        document.getElementById('speaker-boost').addEventListener('change', (e) => this.updateSetting('use_speaker_boost', e.target.checked));
        
        document.getElementById('generate-test-btn').addEventListener('click', () => this.generateTestAudio());
        document.getElementById('verify-model-btn').addEventListener('click', () => this.verifyModelExecution());
        document.getElementById('verify-settings-btn').addEventListener('click', () => this.verifySettingsDisplay());
        document.getElementById('apply-settings-btn').addEventListener('click', () => this.applySettings());
    }
    
    /**
     * Load available models and formats
     */
    async loadModelsAndFormats() {
        try {
            const [modelsResponse, formatsResponse] = await Promise.all([
                fetch('/api/tts/models'),
                fetch('/api/tts/formats')
            ]);
            
            const modelsData = await modelsResponse.json();
            const formatsData = await formatsResponse.json();
            
            if (modelsData.success) {
                this.availableModels = modelsData.models;
                this.populateModelSelect();
            }
            
            if (formatsData.success) {
                this.availableFormats = formatsData.formats;
                this.populateFormatSelect();
            }
            
        } catch (error) {
            console.error('TTSControlPanel: Failed to load models/formats:', error);
        }
    }
    
    /**
     * Populate model selection dropdown
     */
    populateModelSelect() {
        const select = document.getElementById('model-select');
        select.innerHTML = '';
        
        this.availableModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.model_id;
            option.textContent = model.name;
            if (model.recommended) option.textContent += ' ⭐';
            if (model.warning) option.style.color = '#e74c3c';
            select.appendChild(option);
        });
        
        const recommended = this.availableModels.find(m => m.recommended);
        if (recommended) {
            select.value = recommended.model_id;
            this.currentSettings.model_id = recommended.model_id;
            this.onModelSelect(recommended.model_id);
        }
    }
    
    /**
     * Populate format selection dropdown
     */
    populateFormatSelect() {
        const select = document.getElementById('format-select');
        select.innerHTML = '';
        
        this.availableFormats.forEach(format => {
            const option = document.createElement('option');
            option.value = format.format;
            option.textContent = format.name;
            if (format.recommended) option.textContent += ' ⭐';
            select.appendChild(option);
        });
        
        const recommended = this.availableFormats.find(f => f.recommended);
        if (recommended) {
            select.value = recommended.format;
            this.currentSettings.output_format = recommended.format;
            this.onFormatSelect(recommended.format);
        }
    }
    
    /**
     * Show TTS control panel
     */
    async show(voiceId = null, dialogues = []) {
        this.isVisible = true;
        this.currentDialogues = dialogues;
        
        document.getElementById('tts-control-panel').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // AUTOMATIC VERIFICATION: Verify current model immediately
        await this.verifyCurrentModel();
        
        await this.loadVoices();
        
        if (voiceId) {
            document.getElementById('voice-select').value = voiceId;
            this.onVoiceSelect(voiceId);
        }
        
        // AUTOMATIC VERIFICATION: Verify all settings are applied correctly
        this.verifySettingsDisplay();
    }
    
    /**
     * Hide TTS control panel
     */
    hide() {
        this.isVisible = false;
        document.getElementById('tts-control-panel').classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    /**
     * Load available voices
     */
    async loadVoices() {
        try {
            const response = await fetch('/api/elevenlabs/voices');
            const data = await response.json();
            
            if (data.success) {
                this.populateVoiceSelect(data.voices);
            }
            
        } catch (error) {
            console.error('TTSControlPanel: Failed to load voices:', error);
        }
    }
    
    /**
     * Populate voice selection dropdown
     */
    populateVoiceSelect(voices) {
        const select = document.getElementById('voice-select');
        select.innerHTML = '<option value="">Select a voice...</option>';
        
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.voice_id;
            option.textContent = `${voice.name} (${voice.gender || 'unknown'})`;
            select.appendChild(option);
        });
    }
    
    /**
     * Handle voice selection
     */
    async onVoiceSelect(voiceId) {
        if (!voiceId) {
            this.currentVoice = null;
            document.getElementById('preview-voice-btn').disabled = true;
            return;
        }
        
        try {
            const response = await fetch(`/api/tts/voice-settings/${voiceId}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentVoice = data.voice;
                this.displayVoiceInfo(data.voice);
                document.getElementById('preview-voice-btn').disabled = false;
            }
            
        } catch (error) {
            console.error('TTSControlPanel: Failed to get voice details:', error);
        }
    }
    
    /**
     * Display voice information
     */
    displayVoiceInfo(voice) {
        const infoDiv = document.querySelector('.voice-details');
        infoDiv.innerHTML = `
            <div class="voice-meta">
                <span class="voice-tag">${voice.gender || 'Unknown'}</span>
                <span class="voice-tag">${voice.age || 'Unknown'}</span>
                <span class="voice-tag">${voice.accent || 'Unknown'}</span>
                <span class="voice-tag">${voice.category}</span>
            </div>
            <p class="voice-description">${voice.description || 'No description available'}</p>
        `;
        
        document.getElementById('voice-info').classList.remove('hidden');
    }
    
    /**
     * Preview current voice
     */
    async previewCurrentVoice() {
        if (!this.currentVoice || this.isGenerating) return;
        
        this.isGenerating = true;
        const previewBtn = document.getElementById('preview-voice-btn');
        previewBtn.textContent = '⏳ Generating...';
        
        try {
            const response = await fetch('/api/tts/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voice_id: this.currentVoice.voice_id,
                    text: 'Hello, this is a preview of my voice.',
                    settings: this.currentSettings
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.playAudioPreview(data.audio_base64, data.mime_type, 'voice-preview-audio');
            }
            
        } catch (error) {
            console.error('TTSControlPanel: Preview failed:', error);
            alert('Preview failed: ' + error.message);
        } finally {
            this.isGenerating = false;
            previewBtn.textContent = '🔊 Preview Voice';
        }
    }
    
    /**
     * Handle model selection
     */
    onModelSelect(modelId) {
        this.currentSettings.model_id = modelId;
        
        const model = this.availableModels.find(m => m.model_id === modelId);
        if (model) {
            const infoDiv = document.getElementById('model-info');
            let infoHTML = model.description;
            if (model.warning) {
                infoHTML += `<div style="color: #e74c3c; margin-top: 5px;">⚠️ ${model.warning}</div>`;
            }
            infoDiv.innerHTML = infoHTML;
        }
    }
    
    /**
     * Handle format selection
     */
    onFormatSelect(format) {
        this.currentSettings.output_format = format;
        
        const formatObj = this.availableFormats.find(f => f.format === format);
        if (formatObj) {
            document.getElementById('format-info').innerHTML = formatObj.description;
        }
    }
    
    /**
     * Update voice setting
     */
    updateSetting(setting, value) {
        this.currentSettings[setting] = setting === 'use_speaker_boost' ? value : parseFloat(value);
        
        if (setting === 'stability') {
            document.getElementById('stability-value').textContent = value;
        } else if (setting === 'similarity_boost') {
            document.getElementById('similarity-value').textContent = value;
        } else if (setting === 'style') {
            document.getElementById('style-value').textContent = value;
        }
    }
    
    /**
     * Generate test audio
     */
    async generateTestAudio() {
        if (!this.currentVoice || this.isGenerating) return;
        
        const testText = document.getElementById('test-text').value.trim();
        if (!testText) return;
        
        this.isGenerating = true;
        const generateBtn = document.getElementById('generate-test-btn');
        generateBtn.textContent = '⏳ Generating...';
        
        try {
            const response = await fetch('/api/tts/generate-single', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voice_id: this.currentVoice.voice_id,
                    text: testText,
                    settings: this.currentSettings
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.playAudioPreview(data.audio_base64, 'audio/wav', 'test-audio');
            }
            
        } catch (error) {
            console.error('TTSControlPanel: Test generation failed:', error);
            alert('Test generation failed: ' + error.message);
        } finally {
            this.isGenerating = false;
            generateBtn.textContent = '🎵 Generate Test Audio';
        }
    }
    
    /**
     * Play audio preview
     */
    playAudioPreview(audioBase64, mimeType, audioElementId) {
        const audioElement = document.getElementById(audioElementId);
        const audioBlob = new Blob([this.base64ToArrayBuffer(audioBase64)], { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        audioElement.src = audioUrl;
        audioElement.classList.remove('hidden');
        audioElement.play();
        
        // Clean up URL after playing
        audioElement.onended = () => {
            URL.revokeObjectURL(audioUrl);
        };
    }
    
    /**
     * Convert base64 to array buffer
     */
    base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    /**
     * Apply settings and close panel
     */
    applySettings() {
        if (this.onSettingsApply) {
            this.onSettingsApply(this.currentSettings, this.currentVoice);
        }
        
        this.hide();
        console.log('✅ TTS settings applied:', this.currentSettings);
    }
    
    /**
     * Set callback for when settings are applied
     */
    setCallback(callback) {
        this.onSettingsApply = callback;
    }
    
    /**
     * VERIFICATION: Automatically verify current model being used
     */
    async verifyCurrentModel() {
        try {
            console.log('🔍 VERIFICATION: Checking current model...');
            
            const response = await fetch('/api/tts/verify-current-model');
            const data = await response.json();
            
            if (data.success) {
                const verification = data.verification;
                console.log('✅ VERIFICATION RESULT:', verification);
                
                // Add persistent verification display
                this.displayModelVerification(verification);
                
                // Auto-select the verified model in dropdown
                if (document.getElementById('model-select')) {
                    document.getElementById('model-select').value = verification.environment_default;
                    this.currentSettings.model_id = verification.environment_default;
                    this.onModelSelect(verification.environment_default);
                }
                
                return verification;
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('❌ VERIFICATION FAILED:', error);
            this.displayModelVerification({ 
                error: 'Failed to verify model: ' + error.message,
                environment_default: 'unknown',
                is_using_recommended: false
            });
        }
    }
    
    /**
     * VERIFICATION: Display persistent model verification status
     */
    displayModelVerification(verification) {
        // Remove any existing verification display
        const existingVerification = document.querySelector('.model-verification-status');
        if (existingVerification) {
            existingVerification.remove();
        }
        
        // Create persistent verification display
        const verificationHTML = `
            <div class="model-verification-status ${verification.is_using_recommended ? 'verified-good' : 'verified-warning'}">
                <div class="verification-header">
                    <strong>🔍 Model Verification</strong>
                </div>
                <div class="verification-details">
                    <div class="verification-item">
                        <span class="verification-label">Currently Using:</span>
                        <span class="verification-value">${verification.environment_default || 'Unknown'}</span>
                        ${verification.is_using_recommended ? '<span class="verification-badge good">✅ HIGH QUALITY</span>' : '<span class="verification-badge warning">⚠️ LOW QUALITY</span>'}
                    </div>
                    <div class="verification-item">
                        <span class="verification-label">Recommended:</span>
                        <span class="verification-value">${verification.recommended_model || 'eleven_multilingual_v2'}</span>
                    </div>
                    ${verification.warning ? `<div class="verification-warning">⚠️ ${verification.warning}</div>` : ''}
                    ${verification.error ? `<div class="verification-error">❌ ${verification.error}</div>` : ''}
                    <div class="verification-timestamp">Last verified: ${new Date(verification.timestamp || Date.now()).toLocaleTimeString()}</div>
                </div>
            </div>
        `;
        
        // Insert at the top of the TTS panel content
        const panelContent = document.querySelector('.tts-panel-content');
        panelContent.insertAdjacentHTML('afterbegin', verificationHTML);
    }
    
    /**
     * VERIFICATION: Verify all settings are properly displayed
     */
    verifySettingsDisplay() {
        console.log('🔍 VERIFICATION: Checking settings display...');
        
        const verificationResults = {
            model_selected: document.getElementById('model-select')?.value === this.currentSettings.model_id,
            format_selected: document.getElementById('format-select')?.value === this.currentSettings.output_format,
            stability_value: document.getElementById('stability-slider')?.value == this.currentSettings.stability,
            similarity_value: document.getElementById('similarity-slider')?.value == this.currentSettings.similarity_boost,
            style_value: document.getElementById('style-slider')?.value == this.currentSettings.style,
            speaker_boost: document.getElementById('speaker-boost')?.checked === this.currentSettings.use_speaker_boost
        };
        
        console.log('🔍 SETTINGS VERIFICATION:', verificationResults);
        
        // Count mismatches
        const mismatches = Object.entries(verificationResults).filter(([key, match]) => !match);
        
        if (mismatches.length > 0) {
            console.warn('⚠️ SETTINGS MISMATCH DETECTED:', mismatches);
            this.displaySettingsWarning(mismatches);
        } else {
            console.log('✅ All settings properly synchronized');
            this.displaySettingsSuccess();
        }
        
        return verificationResults;
    }
    
    /**
     * VERIFICATION: Display settings warning
     */
    displaySettingsWarning(mismatches) {
        const warningHTML = `
            <div class="settings-verification-warning">
                ⚠️ Settings synchronization issue detected:
                ${mismatches.map(([key]) => `<li>${key.replace('_', ' ')}</li>`).join('')}
                <button onclick="ttsControlPanel.forceSyncSettings()" class="btn btn-secondary">🔄 Force Sync</button>
            </div>
        `;
        
        this.showTemporaryMessage(warningHTML, 'warning');
    }
    
    /**
     * VERIFICATION: Display settings success
     */
    displaySettingsSuccess() {
        this.showTemporaryMessage('✅ All TTS settings verified and synchronized', 'success');
    }
    
    /**
     * VERIFICATION: Force synchronize all settings
     */
    forceSyncSettings() {
        console.log('🔄 FORCE SYNC: Synchronizing all settings...');
        
        // Force update all UI elements to match current settings
        if (document.getElementById('model-select')) {
            document.getElementById('model-select').value = this.currentSettings.model_id;
        }
        if (document.getElementById('format-select')) {
            document.getElementById('format-select').value = this.currentSettings.output_format;
        }
        if (document.getElementById('stability-slider')) {
            document.getElementById('stability-slider').value = this.currentSettings.stability;
            document.getElementById('stability-value').textContent = this.currentSettings.stability;
        }
        if (document.getElementById('similarity-slider')) {
            document.getElementById('similarity-slider').value = this.currentSettings.similarity_boost;
            document.getElementById('similarity-value').textContent = this.currentSettings.similarity_boost;
        }
        if (document.getElementById('style-slider')) {
            document.getElementById('style-slider').value = this.currentSettings.style;
            document.getElementById('style-value').textContent = this.currentSettings.style;
        }
        if (document.getElementById('speaker-boost')) {
            document.getElementById('speaker-boost').checked = this.currentSettings.use_speaker_boost;
        }
        
        // Re-verify after sync
        setTimeout(() => {
            this.verifySettingsDisplay();
        }, 100);
    }
    
    /**
     * VERIFICATION: Show temporary message
     */
    showTemporaryMessage(message, type = 'info') {
        // Remove existing temporary messages
        document.querySelectorAll('.temporary-message').forEach(el => el.remove());
        
        const messageHTML = `
            <div class="temporary-message ${type}">
                ${message}
            </div>
        `;
        
        const panelContent = document.querySelector('.tts-panel-content');
        panelContent.insertAdjacentHTML('afterbegin', messageHTML);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            document.querySelectorAll('.temporary-message').forEach(el => el.remove());
        }, 5000);
    }
    
    /**
     * VERIFICATION: Verify model execution with actual API call
     */
    async verifyModelExecution() {
        if (!this.currentVoice) {
            alert('Please select a voice first for model execution verification');
            return;
        }
        
        try {
            console.log('🧪 VERIFICATION: Testing actual model execution...');
            this.showTemporaryMessage('🧪 Testing model execution...', 'info');
            
            const response = await fetch('/api/tts/verify-model-execution', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voice_id: this.currentVoice.voice_id,
                    settings: this.currentSettings
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                const verification = data.verification;
                console.log('✅ MODEL EXECUTION VERIFIED:', verification);
                
                let message = `✅ Model execution verified: ${verification.requested_model}`;
                if (verification.is_v2_model) {
                    message += ' (HIGH QUALITY)';
                } else {
                    message += ' ⚠️ (LEGACY QUALITY)';
                }
                
                this.showTemporaryMessage(message, verification.is_v2_model ? 'success' : 'warning');
                
                // Play the verification audio as proof
                if (data.audio_base64) {
                    this.playAudioPreview(data.audio_base64, 'audio/mpeg', 'test-audio');
                }
                
                return verification;
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('❌ MODEL EXECUTION VERIFICATION FAILED:', error);
            this.showTemporaryMessage('❌ Model execution verification failed: ' + error.message, 'error');
        }
    }
}

// Initialize TTS control panel
const ttsControlPanel = new TTSControlPanel();

// Test function
window.testTTSControlPanel = function() {
    ttsControlPanel.show();
    console.log('✅ TTS Control Panel opened');
};

// Export
window.ttsControlPanel = ttsControlPanel; 