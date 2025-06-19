# Phase 1.2.3 - Initial File Preview

## CURSOR INSTRUCTIONS
**CRITICAL**: Update README.md after completing this checkpoint:
- [x] 1_2_3 Initial File Preview - [timestamp]
- Update progress percentage to ~35%
- Note: Phase 1 complete! File preview with stats working

## Step 1: Enhanced Preview Component

Create `frontend/js/file-preview.js`:

```javascript
class FilePreview {
    constructor() {
        this.currentSession = null;
        this.previewContainer = document.getElementById('file-preview');
    }

    async displaySession(sessionId) {
        this.currentSession = sessionId;
        
        try {
            // Fetch session info
            const sessionResponse = await fetch(`/api/upload/session/${sessionId}`);
            const sessionData = await sessionResponse.json();
            
            if (!sessionResponse.ok) {
                throw new Error(sessionData.error || 'Failed to load session');
            }
            
            // Fetch preview with more content
            const previewResponse = await fetch(`/api/upload/session/${sessionId}/preview?maxLength=1000`);
            const previewData = await previewResponse.json();
            
            // Analyze content
            const analysis = this.analyzeContent(previewData.preview);
            
            // Display enhanced preview
            this.render(sessionData.file, previewData, analysis);
            
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
```

## Step 2: Update CSS for Enhanced Preview

Add to `frontend/css/styles.css`:

```css
/* Preview Enhancements */
.preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.btn-icon {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
}

.btn-icon:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.preview-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 30px;
}

.preview-card {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
}

.preview-card.full-width {
    grid-column: 1 / -1;
}

.preview-card h4 {
    color: var(--accent);
    margin-bottom: 15px;
    font-size: 1.1rem;
}

.info-list {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px 16px;
}

.info-list dt {
    color: var(--text-secondary);
    font-weight: 500;
}

.info-list dd {
    color: var(--text-primary);
    margin: 0;
}

.status-processed {
    color: var(--success);
}

.status-error {
    color: var(--error);
}

.speaker-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.speaker-tag {
    background: var(--bg-tertiary);
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 0.875rem;
    border: 1px solid var(--border);
}

.content-preview-section {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
}

.preview-info {
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: normal;
}

.content-preview.enhanced {
    max-height: 400px;
    font-size: 0.9rem;
}

.highlight-speaker {
    color: var(--accent);
    font-weight: bold;
}

.highlight-stage {
    color: var(--warning);
    font-style: italic;
    opacity: 0.8;
}

.preview-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.warning-text {
    color: var(--warning);
    font-size: 0.875rem;
    margin: 0;
    flex: 1;
    text-align: right;
}

.no-data {
    color: var(--text-secondary);
    font-style: italic;
}

.error-message {
    text-align: center;
    padding: 40px;
}

.error-message h3 {
    color: var(--error);
    margin-bottom: 10px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .preview-grid {
        grid-template-columns: 1fr;
    }
    
    .preview-actions {
        flex-direction: column;
    }
    
    .warning-text {
        text-align: center;
    }
}
```

## Step 3: Update Main App to Use Preview

Update `frontend/js/app.js`:

```javascript
// Add to the top
window.fileUploader = {
    resetUpload: resetUpload
};

// Update handleFile function to use the new preview
async function handleFile(file) {
    // ... existing validation code ...
    
    try {
        // Upload file
        const formData = new FormData();
        formData.append('script', file);
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }
        
        state.currentSessionId = data.sessionId;
        
        // Hide upload zone
        elements.uploadZone.classList.add('hidden');
        elements.filePreview.classList.remove('hidden');
        
        // Use the new preview component
        await window.filePreview.displaySession(data.sessionId);
        
    } catch (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload file: ${error.message}`);
        resetUpload();
    } finally {
        elements.uploadZone.classList.remove('loading');
    }
}
```

## Step 4: Update HTML to Include New Script

Update `frontend/index.html` (before closing body tag):

```html
    <script src="js/file-preview.js"></script>
    <script src="js/app.js"></script>
</body>
```

## Step 5: Create Phase 1 Summary

Create `docs/phase1-complete.md`:

```markdown
# Phase 1 Complete - Core Infrastructure ✅

## Accomplished

### 1.1 Project Setup & Structure
- ✅ Complete directory structure
- ✅ All dependencies installed
- ✅ Environment configuration with validation
- ✅ Logging system with color coding
- ✅ Express server with middleware
- ✅ Health check and status endpoints

### 1.2 File Upload System  
- ✅ Drag-and-drop upload interface
- ✅ File type validation (MD, TXT, DOC, DOCX)
- ✅ File conversion to normalized text
- ✅ Session-based file management
- ✅ Automatic cleanup service
- ✅ Episode detection from filename/content
- ✅ Enhanced preview with content analysis

## Key Features Working

1. **Upload**: Drag-and-drop or browse for script files
2. **Convert**: All supported formats convert to clean text
3. **Analyze**: Automatic detection of speakers and content structure
4. **Preview**: Rich preview showing file stats and content highlights
5. **Sessions**: Secure session management with automatic cleanup

## Ready for Phase 2

The foundation is solid and ready for:
- Script parsing engine
- Speaker detection and mapping
- Dialogue extraction
- Stage direction handling

## Test Instructions

1. Start server: `npm run dev`
2. Open: `http://localhost:3000`
3. Upload a test script file
4. Verify preview shows:
   - File information
   - Character count
   - Detected speakers
   - Content preview with highlighting

## Notes

- Server automatically cleans up old sessions after 24 hours
- Large files (>500k chars) show processing time warning
- Episode detection works for common naming patterns
```

## Checkpoint 1.2.3 Complete! ✓

You've successfully completed **Phase 1**:
1. Enhanced preview with content analysis
2. Speaker detection in preview
3. Stage direction highlighting
4. Processing time estimation
5. Responsive preview interface

**PHASE 1 COMPLETE!** 🎉

**NEXT**: Update README.md to show Phase 1 complete, then proceed to Phase 2.1.1 Core Parser Logic.

**REMINDER FOR CURSOR**: 
- Update README: `- [x] 1_2_3 Initial File Preview - [timestamp]`
- Mark Phase 1 as complete: `- [x] Phase 1: Core Infrastructure`
- Update progress to ~35%
- Note: Ready to begin Phase 2 - Script Parsing Engine