// Enhanced App.js with Parser Integration - frontend/js/app.js
// Global state
const state = {
    currentFile: null,
    currentFileId: null,
    currentSessionId: null,
    serverOnline: false,
    parseResults: null,
    costEstimate: null
};

// DOM Elements
const elements = {
    uploadZone: document.getElementById('upload-zone'),
    fileInput: document.getElementById('file-input'),
    filePreview: document.getElementById('file-preview'),
    uploadSection: document.getElementById('upload-section'),
    parseSection: document.getElementById('parse-section'),
    serverStatus: document.getElementById('server-status'),
    proceedButton: document.getElementById('proceed-parse'),
    uploadDifferentButton: document.getElementById('upload-different')
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkServerStatus();
    setInterval(checkServerStatus, 5000);
});

// Event Listeners
function setupEventListeners() {
    // File input change
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    elements.uploadZone.addEventListener('click', () => elements.fileInput.click());
    elements.uploadZone.addEventListener('dragover', handleDragOver);
    elements.uploadZone.addEventListener('dragleave', handleDragLeave);
    elements.uploadZone.addEventListener('drop', handleDrop);
    
    // Buttons
    elements.proceedButton.addEventListener('click', proceedToParse);
    elements.uploadDifferentButton.addEventListener('click', resetUpload);
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.addEventListener(eventName, preventDefaults, false);
    });
}

// Server Status Check
async function checkServerStatus() {
    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            state.serverOnline = true;
            updateServerStatus(true);
        } else {
            state.serverOnline = false;
            updateServerStatus(false);
        }
    } catch (error) {
        state.serverOnline = false;
        updateServerStatus(false);
    }
}

function updateServerStatus(online) {
    const indicator = elements.serverStatus.querySelector('.status-indicator');
    const text = elements.serverStatus.querySelector('.status-text');
    
    if (online) {
        indicator.classList.add('online');
        indicator.classList.remove('offline');
        text.textContent = 'Server Online';
    } else {
        indicator.classList.remove('online');
        indicator.classList.add('offline');
        text.textContent = 'Server Offline';
    }
}

// Drag and Drop Handlers
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDragOver(e) {
    preventDefaults(e);
    elements.uploadZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    preventDefaults(e);
    elements.uploadZone.classList.remove('drag-over');
}

function handleDrop(e) {
    preventDefaults(e);
    elements.uploadZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// File Handling
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

async function handleFile(file) {
    // Validate file type
    const validExtensions = ['.md', '.txt', '.doc', '.docx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
        alert(`Invalid file type. Please upload one of: ${validExtensions.join(', ')}`);
        return;
    }
    
    state.currentFile = file;
    
    // Show loading state
    elements.uploadZone.classList.add('loading');
    
    try {
        // Upload file
        const formData = new FormData();
        formData.append('script', file);
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        const data = await response.json();
        state.currentFileId = data.file.id;
        state.currentSessionId = data.file.id; // Session ID is same as file ID
        
        // Display file preview
        displayFilePreview(file, data.file);
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload file. Please try again.');
    } finally {
        elements.uploadZone.classList.remove('loading');
    }
}

function displayFilePreview(file, fileInfo) {
    // Hide upload zone
    elements.uploadZone.classList.add('hidden');
    elements.filePreview.classList.remove('hidden');
    
    // Display file info
    document.querySelector('.file-name').textContent = file.name;
    document.querySelector('.file-size').textContent = `Size: ${formatFileSize(file.size)}`;
    document.querySelector('.file-type').textContent = `Type: ${file.type || 'Unknown'}`;
    
    // Get and display preview
    if (fileInfo.textLength) {
        document.querySelector('.file-info').insertAdjacentHTML('beforeend', 
            `<p class="file-chars">Characters: ${fileInfo.textLength.toLocaleString()}</p>`
        );
    }
    
    // Load preview content
    loadFilePreview();
}

async function loadFilePreview() {
    try {
        const response = await fetch(`/api/upload/${state.currentSessionId}/preview`);
        const data = await response.json();
        
        if (data.success) {
            const preview = data.preview + (data.truncated ? '...' : '');
            document.querySelector('.content-preview').textContent = preview;
        }
    } catch (error) {
        console.error('Preview error:', error);
    }
}

// Proceed to Parse - Phase 2 Implementation
async function proceedToParse() {
    if (!state.currentSessionId) {
        alert('No file uploaded');
        return;
    }
    
    // Show loading state
    elements.proceedButton.disabled = true;
    elements.proceedButton.textContent = 'Parsing...';
    
    try {
        // Call parse endpoint
        const response = await fetch('/api/process/parse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: state.currentSessionId
            })
        });
        
        if (!response.ok) {
            throw new Error('Parse failed');
        }
        
        const data = await response.json();
        state.parseResults = data;
        
        // Display parse results
        displayParseResults(data);
        
    } catch (error) {
        console.error('Parse error:', error);
        alert('Failed to parse script. Please try again.');
    } finally {
        elements.proceedButton.disabled = false;
        elements.proceedButton.textContent = 'Proceed to Parse';
    }
}

// Display Parse Results - Phase 2.2.1
function displayParseResults(results) {
    // Hide upload section, show parse section
    elements.uploadSection.classList.remove('active');
    elements.parseSection.classList.add('active');
    
    // Build parse results HTML
    const parseHTML = `
        <div class="parse-preview">
            <div class="parse-summary">
                <h3>Parse Summary</h3>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="label">Speakers:</span>
                        <span class="value">${results.preview.summary.speakers}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Dialogues:</span>
                        <span class="value">${results.preview.summary.dialogues}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Total Characters:</span>
                        <span class="value">${results.preview.summary.characters.toLocaleString()}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Stage Directions:</span>
                        <span class="value">${results.preview.summary.stageDirections}</span>
                    </div>
                </div>
            </div>
            
            <div class="speaker-list">
                <h3>Detected ${results.preview.speakerList.length} Speakers</h3>
                <div class="speakers">
                    ${results.preview.speakerList.map(speaker => `
                        <div class="speaker-item">
                            <span class="speaker-name">${speaker.name}</span>
                            <span class="speaker-count">${speaker.count} lines</span>
                            <span class="speaker-chars">${results.stats.speakerBreakdown[speaker.name].characterCount.toLocaleString()} chars</span>
                            <span class="speaker-percent">${results.stats.speakerBreakdown[speaker.name].percentage}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="cost-preview ${results.cost.warningLevel}">
                <h3>Cost Estimate</h3>
                <div class="cost-message">${results.cost.message}</div>
                <div class="cost-details">
                    <p>Total Characters: ${results.cost.details.totalCharacters}</p>
                    <p>Quota Remaining: ${results.cost.details.quotaRemaining}</p>
                    ${results.cost.details.overageCharacters !== '0' ? 
                        `<p>Overage Characters: ${results.cost.details.overageCharacters}</p>` : ''}
                </div>
            </div>
            
            ${results.preview.warnings && results.preview.warnings.length > 0 ? `
                <div class="parse-warnings">
                    <h3>Warnings</h3>
                    ${results.preview.warnings.map(warning => `
                        <div class="warning-item ${warning.severity}">
                            <span class="warning-icon">⚠️</span>
                            ${warning.message}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="removed-content-section">
                <h3>Stage Directions Found: ${results.preview.summary.stageDirections}</h3>
                <button class="btn btn-secondary" onclick="toggleRemovedContent()">
                    <span class="toggle-icon">▶</span> Show Removed Content
                </button>
                <div id="removed-content" class="removed-content hidden"></div>
            </div>
            
            <div class="parse-actions">
                <button class="btn btn-primary" onclick="confirmParse()">Confirm Parse & Continue</button>
                <button class="btn btn-secondary" onclick="adjustSettings()">Adjust Settings</button>
                <button class="btn btn-secondary" onclick="startOver()">Start Over</button>
            </div>
        </div>
    `;
    
    document.getElementById('parse-results').innerHTML = parseHTML;
}

// Toggle Removed Content - Phase 2.2.2
async function toggleRemovedContent() {
    const contentDiv = document.getElementById('removed-content');
    const button = event.target.closest('button');
    const icon = button.querySelector('.toggle-icon');
    
    if (contentDiv.classList.contains('hidden')) {
        // Load removed content if not already loaded
        if (!contentDiv.dataset.loaded) {
            try {
                const response = await fetch(`/api/process/parse/${state.currentSessionId}/removed`);
                const data = await response.json();
                
                if (data.success) {
                    displayRemovedContent(data);
                    contentDiv.dataset.loaded = 'true';
                }
            } catch (error) {
                console.error('Failed to load removed content:', error);
            }
        }
        
        contentDiv.classList.remove('hidden');
        icon.textContent = '▼';
        button.innerHTML = '<span class="toggle-icon">▼</span> Hide Removed Content';
    } else {
        contentDiv.classList.add('hidden');
        icon.textContent = '▶';
        button.innerHTML = '<span class="toggle-icon">▶</span> Show Removed Content';
    }
}

function displayRemovedContent(data) {
    const contentDiv = document.getElementById('removed-content');
    
    const html = `
        <div class="removed-summary">
            <p>Total removed: ${data.totalRemoved} stage directions (${data.charactersRemoved} characters)</p>
        </div>
        <div class="removed-list">
            ${data.removedContent.map(item => `
                <div class="removed-item">
                    <div class="removed-header">
                        <span class="speaker">${item.speaker}</span>
                        <span class="dialogue-index">Dialogue #${item.dialogueIndex + 1}</span>
                    </div>
                    <div class="removed-directions">
                        ${item.removed.map(dir => `
                            <span class="stage-direction">*${dir.text}*</span>
                        `).join(' ')}
                    </div>
                    <div class="removed-context">
                        Context: "${item.context}"
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    contentDiv.innerHTML = html;
}

// Parse Actions
async function confirmParse() {
    // Validate parse first - Phase 2.2.3
    try {
        const response = await fetch(`/api/process/parse/${state.currentSessionId}/validate`, {
            method: 'POST'
        });
        
        const validation = await response.json();
        
        if (!validation.ready) {
            const issues = validation.validation.issues.map(i => i.message).join('\n');
            if (!confirm(`Parse validation found issues:\n${issues}\n\nContinue anyway?`)) {
                return;
            }
        }
        
        // TODO: Proceed to Phase 3 - Speaker Mapping
        alert('Parse confirmed! Speaker mapping will be implemented in Phase 3.');
        
    } catch (error) {
        console.error('Validation error:', error);
        alert('Failed to validate parse results.');
    }
}

function adjustSettings() {
    // TODO: Implement settings adjustment
    alert('Settings adjustment will be implemented in a future phase.');
}

function startOver() {
    if (confirm('Are you sure you want to start over? This will discard the current parse.')) {
        resetUpload();
        elements.parseSection.classList.remove('active');
        elements.uploadSection.classList.add('active');
    }
}

// Reset Upload
function resetUpload() {
    state.currentFile = null;
    state.currentFileId = null;
    state.currentSessionId = null;
    state.parseResults = null;
    elements.fileInput.value = '';
    elements.uploadZone.classList.remove('hidden');
    elements.filePreview.classList.add('hidden');
    
    // Clear any added elements
    const charInfo = document.querySelector('.file-chars');
    if (charInfo) charInfo.remove();
}

// Utility Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}