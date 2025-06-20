class SFXModule {
    constructor() {
        this.scriptContent = null;
        this.parsedData = null;
        this.generationQueue = [];
        this.isGenerating = false;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Tab switching
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // Script loading
        document.getElementById('load-from-dialogue')?.addEventListener('click', () => this.loadFromDialogue());
        document.getElementById('sfx-file-input')?.addEventListener('change', (e) => this.handleDirectUpload(e));
        
        // Prompt handling
        document.getElementById('copy-prompt')?.addEventListener('click', () => this.copyPrompt());
        
        // Response parsing
        document.getElementById('parse-response')?.addEventListener('click', () => this.parseResponse());
        
        // Generation
        document.getElementById('generate-all')?.addEventListener('click', () => this.startGeneration());
        document.getElementById('cancel-generation')?.addEventListener('click', () => this.cancelGeneration());
        
        // Downloads
        document.getElementById('download-sfx')?.addEventListener('click', () => this.downloadSFX());
        document.getElementById('download-music-prompts')?.addEventListener('click', () => this.downloadMusicPrompts());
        
        // Help modal
        document.getElementById('sfx-help-btn')?.addEventListener('click', () => this.showHelpModal());
    }
    
    switchTab(tabName) {
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Show/hide modules
        document.getElementById('dialogue-module')?.classList.toggle('hidden', tabName !== 'dialogue');
        document.getElementById('sfx-module')?.classList.toggle('hidden', tabName !== 'sfx');
        document.getElementById('image-module')?.classList.toggle('hidden', tabName !== 'images');
    }
    
    async loadFromDialogue() {
        try {
            // Check if there's a session ID from the dialogue tab
            if (!window.state || !window.state.currentSessionId) {
                alert('Please load a script in the Dialogue tab first');
                return;
            }
            
            // Fetch the script content from the backend session
            const response = await fetch(`/api/upload/${window.state.currentSessionId}/preview?maxLength=50000`);
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to load script content');
            }
            
            this.scriptContent = data.preview;
            this.sessionId = window.state.currentSessionId;
            
            // Get filename from current file info
            const filename = window.state.currentFile?.name || 'Loaded Script';
            
            // Update UI
            document.getElementById('sfx-script-name').textContent = filename;
            document.getElementById('sfx-script-content').textContent = this.scriptContent.substring(0, 1000) + '...';
            document.getElementById('sfx-script-preview').classList.remove('hidden');
            
            // Generate and show prompt
            this.generatePrompt();
            
            // Show next sections
            document.getElementById('sfx-prompt-section').classList.remove('hidden');
            document.getElementById('sfx-response-section').classList.remove('hidden');
            
        } catch (error) {
            console.error('Failed to load script:', error);
            alert('Failed to load script from dialogue tab: ' + error.message);
        }
    }
    
    async handleDirectUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type
        const validExtensions = ['.md', '.txt', '.doc', '.docx'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        
        if (!validExtensions.includes(fileExtension)) {
            alert(`Invalid file type. Please upload one of: ${validExtensions.join(', ')}`);
            return;
        }
        
        try {
            // Read file content directly
            const text = await this.readFileContent(file);
            
            this.scriptContent = text;
            this.sessionId = null; // No backend session for direct upload
            
            // Update UI
            document.getElementById('sfx-script-name').textContent = file.name;
            document.getElementById('sfx-script-content').textContent = this.scriptContent.substring(0, 1000) + '...';
            document.getElementById('sfx-script-preview').classList.remove('hidden');
            
            // Generate and show prompt
            this.generatePrompt();
            
            // Show next sections
            document.getElementById('sfx-prompt-section').classList.remove('hidden');
            document.getElementById('sfx-response-section').classList.remove('hidden');
            
        } catch (error) {
            console.error('Failed to read file:', error);
            alert('Failed to read file: ' + error.message);
        }
    }
    
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    generatePrompt() {
        const prompt = `Analyze this D&D campaign script for sound effects and background music opportunities.

For each sound effect, provide:
1. Line number reference
2. Context (what's happening)
3. SFX prompt for ElevenLabs (be specific about the sound)
4. Duration (short/medium/long)
5. Category (FOLEY/AMBIENCE/COMBAT/CREATURES/ENVIRONMENTAL/MAGICAL)

For background music sections, provide:
1. Scene description
2. Emotional tone
3. SUNO prompt (musical style, instruments, mood)
4. Suggested duration

Format your response as JSON:
{
  "soundEffects": [
    {
      "lineNumber": 23,
      "context": "The heavy oak door creaks open",
      "prompt": "Heavy wooden medieval door slowly creaking open with old metal hinges groaning",
      "duration": "medium",
      "category": "FOLEY"
    }
  ],
  "musicSuggestions": [
    {
      "sceneStart": "The party enters the tavern",
      "sceneEnd": "They approach the mysterious stranger",
      "description": "Bustling tavern atmosphere",
      "sunoPrompt": "Medieval tavern background music, lute and fiddle, warm and lively, ambient chatter, 120bpm, D major",
      "duration": "2-3 minutes"
    }
  ]
}

Script to analyze: (Attached)`;
        
        document.getElementById('llm-prompt').textContent = prompt;
    }
    
    async copyPrompt() {
        const prompt = document.getElementById('llm-prompt').textContent;
        
        try {
            await navigator.clipboard.writeText(prompt);
            
            // Show feedback
            const feedback = document.getElementById('copy-feedback');
            feedback.classList.remove('hidden');
            setTimeout(() => feedback.classList.add('hidden'), 2000);
        } catch (error) {
            alert('Failed to copy. Please select and copy manually.');
        }
    }
    
    parseResponse() {
        const response = document.getElementById('llm-response').value.trim();
        
        if (!response) {
            this.showError('Please paste the LLM response first');
            return;
        }
        
        try {
            // Try to extract JSON from the response
            let jsonData;
            
            // First try: response is pure JSON
            try {
                jsonData = JSON.parse(response);
            } catch {
                // Second try: extract JSON from text
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonData = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No valid JSON found in response');
                }
            }
            
            // Validate structure
            if (!jsonData.soundEffects || !Array.isArray(jsonData.soundEffects)) {
                throw new Error('Invalid response structure: missing soundEffects array');
            }
            
            this.parsedData = jsonData;
            this.displayParsedData();
            
            // Show generation section
            document.getElementById('sfx-list-section').classList.remove('hidden');
            document.getElementById('sfx-generation-section').classList.remove('hidden');
            
            // Hide error if shown
            document.getElementById('parse-error').classList.add('hidden');
            
        } catch (error) {
            this.showError(`Failed to parse response: ${error.message}`);
        }
    }
    
    displayParsedData() {
        const { soundEffects = [], musicSuggestions = [] } = this.parsedData;
        
        // Update stats
        document.getElementById('total-sfx').textContent = soundEffects.length;
        document.getElementById('total-music').textContent = musicSuggestions.length;
        
        // Estimate cost based on ElevenLabs pricing (40 credits per second, ~$0.0008 per credit)
        let totalCredits = 0;
        soundEffects.forEach(sfx => {
            const duration = this.getDurationSeconds(sfx.duration);
            if (duration === null) {
                totalCredits += 100; // Estimate ~2.5 seconds average for auto-duration
            } else {
                totalCredits += duration * 40; // 40 credits per second
            }
        });
        const estimatedCost = (totalCredits * 0.0008).toFixed(2);
        document.getElementById('estimated-cost').textContent = `$${estimatedCost}`;
        
        // Render sound effects
        const sfxHTML = soundEffects.map((sfx, index) => `
            <div class="sfx-item" data-index="${index}">
                <div class="sfx-header">
                    <span class="sfx-number">${String(index + 1).padStart(3, '0')}</span>
                    <span class="sfx-category ${sfx.category.toLowerCase()}">${sfx.category}</span>
                    <span class="sfx-duration">${sfx.duration}</span>
                    <button class="remove-sfx" data-index="${index}">✕</button>
                </div>
                <div class="sfx-context">Line ${sfx.lineNumber}: ${sfx.context}</div>
                <textarea class="sfx-prompt" data-index="${index}" rows="2">${sfx.prompt}</textarea>
            </div>
        `).join('');
        
        document.getElementById('sfx-list').innerHTML = sfxHTML || '<p>No sound effects found</p>';
        
        // Render music suggestions
        const musicHTML = musicSuggestions.map((music, index) => `
            <div class="music-suggestion">
                <div class="music-header">
                    <h4>🎵 ${music.description}</h4>
                    <span class="music-duration">${music.duration}</span>
                </div>
                <p class="music-scene">${music.sceneStart} → ${music.sceneEnd}</p>
                <div class="suno-prompt-container">
                    <div class="suno-prompt">${music.sunoPrompt}</div>
                    <button class="copy-suno-prompt" onclick="sfxModule.copySunoPrompt(${index})">
                        Copy SUNO Prompt
                    </button>
                </div>
            </div>
        `).join('');
        
        document.getElementById('music-suggestions').innerHTML = musicHTML || '<p>No music suggestions</p>';
        
        // Add event listeners for edits
        this.attachEditListeners();
    }
    
    attachEditListeners() {
        // Remove buttons
        document.querySelectorAll('.remove-sfx').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.parsedData.soundEffects.splice(index, 1);
                this.displayParsedData();
            });
        });
        
        // Edit prompts
        document.querySelectorAll('.sfx-prompt').forEach(textarea => {
            textarea.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.parsedData.soundEffects[index].prompt = e.target.value;
            });
        });
    }
    
    async copySunoPrompt(index) {
        const music = this.parsedData.musicSuggestions[index];
        try {
            await navigator.clipboard.writeText(music.sunoPrompt);
            alert('SUNO prompt copied to clipboard!');
        } catch (error) {
            alert('Failed to copy. Please select and copy manually.');
        }
    }
    
    async startGeneration() {
        if (!this.parsedData || !this.parsedData.soundEffects.length) {
            alert('No sound effects to generate');
            return;
        }
        
        this.generationQueue = [...this.parsedData.soundEffects];
        this.isGenerating = true;
        
        // Update UI
        document.getElementById('generate-all').classList.add('hidden');
        document.getElementById('cancel-generation').classList.remove('hidden');
        document.getElementById('generation-progress').classList.remove('hidden');
        document.getElementById('generation-log').classList.remove('hidden');
        
        // Clear previous log
        document.getElementById('log-entries').innerHTML = '';
        
        // Start processing
        await this.processGenerationQueue();
    }
    
    async processGenerationQueue() {
        const total = this.generationQueue.length;
        
        for (let i = 0; i < total && this.isGenerating; i++) {
            const sfx = this.generationQueue[i];
            
            // Update progress
            this.updateProgress(i, total, sfx);
            
            try {
                // Generate SFX
                const result = await this.generateSingleSFX(sfx, i);
                this.logSuccess(sfx, i);
            } catch (error) {
                this.logError(sfx, i, error);
            }
            
            // Rate limiting delay
            if (i < total - 1) {
                await this.delay(500);
            }
        }
        
        if (this.isGenerating) {
            this.completeGeneration();
        }
    }
    
    async generateSingleSFX(sfx, index) {
        const response = await fetch('/api/sfx/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: sfx.prompt,
                duration: this.getDurationSeconds(sfx.duration),
                filename: `${String(index + 1).padStart(3, '0')}_${sfx.category.toLowerCase()}`,
                context: sfx.context
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Generation failed');
        }
        
        return response.json();
    }
    
    getDurationSeconds(duration) {
        const durations = {
            'short': null,      // Let API decide (most cost-effective)
            'medium': 5,        // 5 seconds = 200 credits
            'long': 10          // 10 seconds = 400 credits
        };
        return durations[duration];
    }
    
    updateProgress(current, total, sfx) {
        const percentage = Math.round(((current + 1) / total) * 100);
        
        document.getElementById('current-sfx-name').textContent = sfx.context;
        document.getElementById('progress-fill').style.width = `${percentage}%`;
        document.getElementById('progress-text').textContent = `${current + 1} / ${total}`;
        document.getElementById('progress-percentage').textContent = `${percentage}%`;
    }
    
    logSuccess(sfx, index) {
        const logEntry = `
            <div class="log-entry success">
                <span class="log-icon">✓</span>
                <span class="log-text">${String(index + 1).padStart(3, '0')} - ${sfx.context}</span>
            </div>
        `;
        document.getElementById('log-entries').insertAdjacentHTML('beforeend', logEntry);
    }
    
    logError(sfx, index, error) {
        const logEntry = `
            <div class="log-entry error">
                <span class="log-icon">✗</span>
                <span class="log-text">${String(index + 1).padStart(3, '0')} - ${sfx.context}: ${error.message}</span>
            </div>
        `;
        document.getElementById('log-entries').insertAdjacentHTML('beforeend', logEntry);
    }
    
    cancelGeneration() {
        this.isGenerating = false;
        document.getElementById('generate-all').classList.remove('hidden');
        document.getElementById('cancel-generation').classList.add('hidden');
    }
    
    completeGeneration() {
        // Update UI
        document.getElementById('generate-all').classList.remove('hidden');
        document.getElementById('cancel-generation').classList.add('hidden');
        document.getElementById('sfx-download-section').classList.remove('hidden');
        
        // Show completion message
        this.logSuccess({ context: 'Generation complete!' }, 999);
    }
    
    async downloadSFX() {
        try {
            const response = await fetch('/api/sfx/download');
            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sfx_package_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            alert('Failed to download SFX package');
        }
    }
    
    async downloadMusicPrompts() {
        if (!this.parsedData || !this.parsedData.musicSuggestions) {
            alert('No music prompts to download');
            return;
        }
        
        // Create text file with all SUNO prompts
        const content = this.parsedData.musicSuggestions.map((music, index) => 
            `=== ${index + 1}. ${music.description} ===\n` +
            `Scene: ${music.sceneStart} → ${music.sceneEnd}\n` +
            `Duration: ${music.duration}\n` +
            `SUNO Prompt:\n${music.sunoPrompt}\n\n`
        ).join('\n');
        
        // Download as text file
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'music_prompts_suno.txt';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
    
    showError(message) {
        const errorElement = document.getElementById('parse-error');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }
    
    // Help Modal Functions
    showHelpModal() {
        document.getElementById('sfx-help-modal').classList.remove('hidden');
    }
    
    closeHelpModal() {
        document.getElementById('sfx-help-modal').classList.add('hidden');
    }
    
    showHelpTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.help-tab').forEach(tab => {
            tab.classList.toggle('active', tab.textContent.toLowerCase().includes(tabName));
        });
        
        // Show/hide content
        document.querySelectorAll('.help-content').forEach(content => {
            content.classList.toggle('hidden', !content.id.includes(tabName));
            content.classList.toggle('active', content.id.includes(tabName));
        });
    }
    
    async copyClaudePrompt() {
        const promptTemplate = `Analyze this D&D campaign script for sound effects and background music opportunities.

For each sound effect, provide:
1. Line number reference
2. Context (what's happening)  
3. SFX prompt for ElevenLabs (be specific about the sound)
4. Duration (short/medium/long)
5. Category (FOLEY/AMBIENCE/COMBAT/CREATURES/ENVIRONMENTAL/MAGICAL)

For background music sections, provide:
1. Scene description
2. Emotional tone
3. SUNO prompt (musical style, instruments, mood)
4. Suggested duration

Format your response as JSON:
{
  "soundEffects": [
    {
      "lineNumber": 23,
      "context": "The heavy oak door creaks open",
      "prompt": "Heavy wooden medieval door slowly creaking open with old metal hinges groaning",
      "duration": "medium",
      "category": "FOLEY"
    }
  ],
  "musicSuggestions": [
    {
      "sceneStart": "The party enters the tavern",
      "sceneEnd": "They approach the mysterious stranger", 
      "description": "Bustling tavern atmosphere",
      "sunoPrompt": "Medieval tavern background music, lute and fiddle, warm and lively, ambient chatter, 120bpm, D major",
      "duration": "2-3 minutes"
    }
  ]
}

Script to analyze: (Attached)`;

        try {
            await navigator.clipboard.writeText(promptTemplate);
            alert('Claude prompt template copied to clipboard!');
        } catch (error) {
            alert('Failed to copy. Please select and copy manually.');
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.sfxModule = new SFXModule();
}); 