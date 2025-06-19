# Phase 1.2.1 - Frontend Upload Interface

## CURSOR INSTRUCTIONS
**CRITICAL**: Update README.md after completing this checkpoint:
- [x] 1_2_1 Frontend Upload Interface - [timestamp]
- Update progress percentage to ~25%
- Note: File upload working with drag-and-drop support

## Step 1: Update Main HTML

Replace `frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Campaign TTS Processor</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>Campaign TTS Processor</h1>
            <p>Convert D&D scripts to character audio files</p>
            <div class="server-status" id="server-status">
                <span class="status-indicator"></span>
                <span class="status-text">Checking server...</span>
            </div>
        </header>
        
        <main>
            <!-- Upload Section -->
            <section id="upload-section" class="section active">
                <div class="upload-zone" id="upload-zone">
                    <input type="file" id="file-input" accept=".md,.txt,.doc,.docx" hidden>
                    <div class="upload-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </div>
                    <h3>Drop your episode script here</h3>
                    <p>or <button class="browse-button" onclick="document.getElementById('file-input').click()">browse files</button></p>
                    <p class="supported-formats">Supports: MD, TXT, DOC, DOCX</p>
                </div>
                
                <div id="file-preview" class="file-preview hidden">
                    <div class="file-info">
                        <h3>File Uploaded</h3>
                        <p class="file-name"></p>
                        <p class="file-size"></p>
                        <p class="file-type"></p>
                    </div>
                    <div class="file-content">
                        <h4>Preview (first 500 characters)</h4>
                        <pre class="content-preview"></pre>
                    </div>
                    <div class="file-actions">
                        <button class="btn btn-primary" id="proceed-parse">Proceed to Parse</button>
                        <button class="btn btn-secondary" id="upload-different">Upload Different File</button>
                    </div>
                </div>
            </section>
            
            <!-- Parse Section (hidden initially) -->
            <section id="parse-section" class="section hidden">
                <h2>Parse Preview</h2>
                <div id="parse-results"></div>
            </section>
        </main>
    </div>
    
    <script src="js/app.js"></script>
</body>
</html>
```

## Step 2: Enhanced CSS Styles

Update `frontend/css/styles.css`:

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --bg-primary: #0a0a0a;
    --bg-secondary: #1a1a1a;
    --bg-tertiary: #2a2a2a;
    --text-primary: #e0e0e0;
    --text-secondary: #999;
    --accent: #667eea;
    --accent-hover: #764ba2;
    --success: #4ade80;
    --error: #f87171;
    --warning: #fbbf24;
    --border: #333;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    line-height: 1.6;
    min-height: 100vh;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

/* Header Styles */
header {
    text-align: center;
    margin-bottom: 40px;
    padding: 40px 0;
    border-bottom: 1px solid var(--border);
    position: relative;
}

header h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

header p {
    color: var(--text-secondary);
    font-size: 1.1rem;
}

/* Server Status */
.server-status {
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--bg-secondary);
    border-radius: 20px;
    font-size: 0.875rem;
}

.status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-secondary);
}

.status-indicator.online {
    background: var(--success);
    box-shadow: 0 0 8px var(--success);
}

.status-indicator.offline {
    background: var(--error);
}

/* Section Management */
.section {
    display: none;
}

.section.active {
    display: block;
}

/* Upload Zone */
.upload-zone {
    border: 2px dashed var(--border);
    border-radius: 12px;
    padding: 60px 40px;
    text-align: center;
    background: var(--bg-secondary);
    transition: all 0.3s ease;
    cursor: pointer;
}

.upload-zone:hover {
    border-color: var(--accent);
    background: rgba(102, 126, 234, 0.05);
}

.upload-zone.drag-over {
    border-color: var(--accent);
    background: rgba(102, 126, 234, 0.1);
    transform: scale(1.02);
}

.upload-icon {
    color: var(--accent);
    margin-bottom: 20px;
}

.upload-zone h3 {
    font-size: 1.5rem;
    margin-bottom: 10px;
}

.browse-button {
    background: none;
    border: none;
    color: var(--accent);
    text-decoration: underline;
    cursor: pointer;
    font-size: inherit;
}

.browse-button:hover {
    color: var(--accent-hover);
}

.supported-formats {
    margin-top: 20px;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

/* File Preview */
.file-preview {
    background: var(--bg-secondary);
    border-radius: 12px;
    padding: 30px;
    margin-top: 20px;
}

.file-info {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
}

.file-info h3 {
    color: var(--success);
    margin-bottom: 10px;
}

.file-info p {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin: 4px 0;
}

.file-name {
    color: var(--text-primary) !important;
    font-weight: 500;
}

.file-content {
    margin-bottom: 20px;
}

.file-content h4 {
    margin-bottom: 10px;
    color: var(--accent);
}

.content-preview {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 15px;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    max-height: 300px;
    overflow-y: auto;
}

/* Buttons */
.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-primary {
    background: var(--accent);
    color: white;
}

.btn-primary:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    margin-left: 10px;
}

.btn-secondary:hover {
    background: var(--border);
}

/* Utility Classes */
.hidden {
    display: none !important;
}

/* Loading State */
.loading {
    opacity: 0.6;
    pointer-events: none;
}

.loading::after {
    content: '...';
    animation: dots 1.5s infinite;
}

@keyframes dots {
    0%, 20% { content: '.'; }
    40% { content: '..'; }
    60%, 100% { content: '...'; }
}

/* Scrollbar Styling */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: var(--bg-primary);
}

::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
}
```

## Step 3: JavaScript Upload Handler

Create `frontend/js/app.js`:

```javascript
// Global state
const state = {
    currentFile: null,
    currentFileId: null,
    serverOnline: false
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
        
        // Read file for preview
        const reader = new FileReader();
        reader.onload = (e) => {
            displayFilePreview(file, e.target.result);
        };
        reader.readAsText(file);
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload file. Please try again.');
    } finally {
        elements.uploadZone.classList.remove('loading');
    }
}

function displayFilePreview(file, content) {
    // Hide upload zone
    elements.uploadZone.classList.add('hidden');
    elements.filePreview.classList.remove('hidden');
    
    // Display file info
    document.querySelector('.file-name').textContent = file.name;
    document.querySelector('.file-size').textContent = `Size: ${formatFileSize(file.size)}`;
    document.querySelector('.file-type').textContent = `Type: ${file.type || 'Unknown'}`;
    
    // Display content preview
    const preview = content.substring(0, 500);
    document.querySelector('.content-preview').textContent = preview + (content.length > 500 ? '...' : '');
}

// Proceed to Parse
async function proceedToParse() {
    if (!state.currentFileId) {
        alert('No file uploaded');
        return;
    }
    
    // TODO: Implement parsing in Phase 2
    console.log('Proceeding to parse:', state.currentFileId);
    
    // For now, just show a message
    alert('Parser will be implemented in Phase 2');
}

// Reset Upload
function resetUpload() {
    state.currentFile = null;
    state.currentFileId = null;
    elements.fileInput.value = '';
    elements.uploadZone.classList.remove('hidden');
    elements.filePreview.classList.add('hidden');
}

// Utility Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
```

## Step 4: Test File Upload

1. Make sure server is running (`npm run dev`)
2. Open `http://localhost:3000`
3. Try uploading a test markdown file
4. Verify file preview appears
5. Check that file is saved in `uploads/temp/` directory

## Step 5: Create Test Markdown File

Create `test-episode.md` for testing:

```markdown
# Episode 117A - The Mirror's Edge

**JOE:** The chamber trembles as Threnos speaks, reality itself seeming to bend around his words.

**CELESTIA:** And you'll abide by whatever choice we make?

**THRENOS:** *smiling, and for the first time it seems genuinely warm* "I am a mirror, remember? I will reflect whatever you truly are."

**SAXY:** That's either the most beautiful thing I've ever heard, or the most terrifying.

**THRENOS:** "Why not both?"
```

## Checkpoint 1.2.1 Complete! ✓

You've successfully:
1. Created drag-and-drop file upload interface
2. Implemented file validation and upload
3. Built file preview with first 500 characters
4. Added server status indicator
5. Styled with dark theme and smooth animations

**NEXT**: Update README.md, then proceed to 1_2_2 File Processing Pipeline.

**REMINDER FOR CURSOR**: 
- Update README: `- [x] 1_2_1 Frontend Upload Interface - [timestamp]`
- Progress: ~25%
- Note: Drag-and-drop upload working, file preview functional