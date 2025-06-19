class FilePreview {
    constructor() {
        this.currentSession = null;
        this.previewContainer = document.getElementById('file-preview');
    }

    async displaySession(sessionId) {
        this.currentSession = sessionId;
        
        try {
            // Fetch session info
            const sessionResponse = await fetch(`/api/upload/${sessionId}`);
            const sessionData = await sessionResponse.json();
            
            if (!sessionResponse.ok) {
                throw new Error(sessionData.error || 'Failed to load session');
            }
            
            // Fetch preview with more content
            const previewResponse = await fetch(`/api/upload/${sessionId}/preview?maxLength=1000`);
            const previewData = await previewResponse.json();
            
            // Analyze content
            const analysis = this.analyzeContent(previewData.preview);
            
            // Display enhanced preview
            this.render(sessionData.session, previewData, analysis);
            
        } catch (error) {
            console.error('Preview error:', error);
            this.showError(error.message);
        }
    }

    analyzeContent(text) {
        // Detect speakers
        const speakerRegex = /(?:^\*\*([A-Z][A-Z\s]+)\*\*:|^([A-Z][A-Z\s]+):)/gm;
        const speakers = new Set();
        let match;
        
        while ((match = speakerRegex.exec(text)) !== null) {
            const speaker = match[1] || match[2];
            if (speaker) speakers.add(speaker.trim());
        }
        
        // Count stage directions
        const stageDirections = (text.match(/\*[^*]+\*/g) || []).length;
        
        // Estimate dialogue lines
        const lines = text.split('\n').filter(line => line.trim());
        const dialogueLines = lines.filter(line => 
            /^(?:\*\*)?[A-Z][A-Z\s]*(?:\*\*)?:/.test(line)
        ).length;
        
        return {
            detectedSpeakers: Array.from(speakers),
            speakerCount: speakers.size,
            stageDirectionCount: stageDirections,
            estimatedDialogueLines: dialogueLines,
            lineCount: lines.length
        };
    }

    render(fileInfo, previewData, analysis) {
        const html = `
            <div class="preview-header">
                <h3>File Analysis</h3>
                <button class="btn-icon" id="close-preview" title="Close preview">✕</button>
            </div>
            
            <div class="preview-grid">
                <!-- File Info Card -->
                <div class="preview-card">
                    <h4>📄 File Information</h4>
                    <dl class="info-list">
                        <dt>Filename:</dt>
                        <dd>${fileInfo.originalName}</dd>
                        
                        <dt>Size:</dt>
                        <dd>${this.formatFileSize(fileInfo.size)}</dd>
                        
                        <dt>Characters:</dt>
                        <dd>${fileInfo.textLength.toLocaleString()}</dd>
                        
                        ${fileInfo.episodeInfo?.detected ? `
                            <dt>Episode:</dt>
                            <dd>${fileInfo.episodeInfo.number || 'Unknown'}${
                                fileInfo.episodeInfo.name ? ' - ' + fileInfo.episodeInfo.name : ''
                            }</dd>
                        ` : ''}
                        
                        <dt>Status:</dt>
                        <dd class="status-${fileInfo.status}">${fileInfo.status}</dd>
                    </dl>
                </div>
                
                <!-- Content Analysis Card -->
                <div class="preview-card">
                    <h4>📊 Content Analysis</h4>
                    <dl class="info-list">
                        <dt>Speakers Detected:</dt>
                        <dd>${analysis.speakerCount}</dd>
                        
                        <dt>Dialogue Lines:</dt>
                        <dd>~${analysis.estimatedDialogueLines}</dd>
                        
                        <dt>Stage Directions:</dt>
                        <dd>${analysis.stageDirectionCount}</dd>
                        
                        <dt>Total Lines:</dt>
                        <dd>${analysis.lineCount}</dd>
                        
                        <dt>Est. Processing Time:</dt>
                        <dd>${this.estimateProcessingTime(fileInfo.textLength)}</dd>
                    </dl>
                </div>
                
                <!-- Speakers Card -->
                <div class="preview-card full-width">
                    <h4>🎭 Detected Speakers</h4>
                    ${analysis.detectedSpeakers.length > 0 ? `
                        <div class="speaker-tags">
                            ${analysis.detectedSpeakers.map(speaker => 
                                `<span class="speaker-tag">${speaker}</span>`
                            ).join('')}
                        </div>
                    ` : '<p class="no-data">No speakers detected in preview</p>'}
                </div>
            </div>
            
            <!-- Content Preview -->
            <div class="content-preview-section">
                <div class="preview-header">
                    <h4>📝 Content Preview</h4>
                    <span class="preview-info">${
                        previewData.truncated ? 
                        `Showing first ${previewData.preview.length} of ${previewData.totalLength.toLocaleString()} characters` :
                        'Showing complete file'
                    }</span>
                </div>
                <pre class="content-preview enhanced">${this.highlightContent(previewData.preview)}</pre>
            </div>
            
            <!-- Actions -->
            <div class="preview-actions">
                <button class="btn btn-primary" id="proceed-parse">
                    Continue to Speaker Mapping →
                </button>
                <button class="btn btn-secondary" id="upload-different">
                    Upload Different File
                </button>
                ${fileInfo.textLength > 500000 ? `
                    <p class="warning-text">
                        ⚠️ Large file detected. Processing may take several minutes.
                    </p>
                ` : ''}
            </div>
        `;
        
        this.previewContainer.innerHTML = html;
        this.attachEventListeners();
    }

    highlightContent(text) {
        // Escape HTML
        let highlighted = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Highlight speakers (both formats)
        highlighted = highlighted.replace(
            /^(\*\*)?([A-Z][A-Z\s]+)(\*\*)?:/gm,
            '<span class="highlight-speaker">$1$2$3:</span>'
        );
        
        // Highlight stage directions
        highlighted = highlighted.replace(
            /\*([^*]+)\*/g,
            '<span class="highlight-stage">*$1*</span>'
        );
        
        return highlighted;
    }

    estimateProcessingTime(characters) {
        // Rough estimate: ~30 characters per second
        const seconds = Math.ceil(characters / 30);
        
        if (seconds < 60) {
            return `${seconds} seconds`;
        } else if (seconds < 3600) {
            const minutes = Math.ceil(seconds / 60);
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else {
            const hours = Math.ceil(seconds / 3600);
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    attachEventListeners() {
        // Close preview
        document.getElementById('close-preview')?.addEventListener('click', () => {
            window.fileUploader?.resetUpload();
        });
        
        // Upload different
        document.getElementById('upload-different')?.addEventListener('click', () => {
            window.fileUploader?.resetUpload();
        });
        
        // Proceed to parse
        document.getElementById('proceed-parse')?.addEventListener('click', () => {
            this.proceedToParse();
        });
    }

    proceedToParse() {
        if (!this.currentSession) {
            alert('No session active');
            return;
        }
        
        // TODO: Implement in Phase 2
        console.log('Ready for Phase 2 - Parse session:', this.currentSession);
        alert('Phase 1 Complete! Parser will be implemented in Phase 2.');
    }

    showError(message) {
        this.previewContainer.innerHTML = `
            <div class="error-message">
                <h3>⚠️ Error</h3>
                <p>${message}</p>
                <button class="btn btn-secondary" onclick="window.fileUploader?.resetUpload()">
                    Try Again
                </button>
            </div>
        `;
    }
}

// Initialize preview handler
window.filePreview = new FilePreview(); 