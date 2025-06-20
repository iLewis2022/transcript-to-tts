// File Download Component - Phase 6.1.0
class FileDownloadManager {
    constructor() {
        this.sessionId = null;
        this.episodeInfo = null;
        this.downloadQueue = [];
        this.isDownloading = false;
    }

    /**
     * Initialize download manager with session data
     */
    async initialize(sessionId) {
        this.sessionId = sessionId;
        
        try {
            // Try to get file list directly - this will verify the session exists
            const response = await fetch(`/api/download/files/${sessionId}`);
            const data = await response.json();
            
            if (data.success) {
                this.episodeInfo = data.episodeInfo;
                return true;
            }
            
            throw new Error(data.error || 'Failed to get download files');
        } catch (error) {
            console.error('Failed to initialize download manager:', error);
            return false;
        }
    }

    /**
     * Show download interface - Phase 6.1.0
     */
    async showDownloadInterface() {
        console.log('🔍 DEBUG: Starting showDownloadInterface...');
        
        // Hide processing section
        const processingSection = document.getElementById('processing-section');
        if (processingSection) {
            processingSection.classList.add('hidden');
            console.log('✓ Processing section hidden');
        } else {
            console.log('⚠️ Processing section not found');
        }
        
        // Hide all other sections first
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('hidden');
            section.classList.remove('active');
            console.log(`✓ Hidden section: ${section.id}`);
        });
        
        // Create or show download section
        let downloadSection = document.getElementById('download-section');
        if (!downloadSection) {
            console.log('📦 Creating new download section...');
            downloadSection = this.createDownloadSection();
            
            // Find the main container
            const mainContainer = document.querySelector('.container main');
            if (mainContainer) {
                mainContainer.appendChild(downloadSection);
                console.log('✓ Download section added to main container');
            } else {
                console.error('❌ Main container not found! Trying body...');
                // Fallback to body
                document.body.appendChild(downloadSection);
            }
        } else {
            console.log('♻️ Using existing download section');
        }
        
        // Make sure it's visible
        downloadSection.classList.remove('hidden');
        downloadSection.classList.add('active');
        downloadSection.style.display = 'block'; // Force display
        
        // Scroll to top to ensure visibility
        window.scrollTo(0, 0);
        downloadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        console.log('📍 Download section classes:', downloadSection.className);
        console.log('📍 Download section display:', getComputedStyle(downloadSection).display);
        console.log('📍 Download section visibility:', getComputedStyle(downloadSection).visibility);
        
        // Load and display files
        try {
            await this.loadFileList();
            console.log('✓ File list loaded');
        } catch (error) {
            console.error('❌ Failed to load file list:', error);
        }
    }

    /**
     * Create download section HTML
     */
    createDownloadSection() {
        const section = document.createElement('section');
        section.id = 'download-section';
        section.className = 'section'; // Make sure it has the section class
        
        // Add inline style temporarily to ensure visibility
        section.style.display = 'block';
        section.style.minHeight = '500px';
        section.style.padding = '20px';
        
        section.innerHTML = `
            <div class="download-container">
                <h2>📥 Download Audio Files</h2>
                
                <!-- Download Overview -->
                <div class="download-overview" style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <div class="episode-summary">
                        <h3 id="download-episode-title">Episode Files</h3>
                        <p id="download-episode-info">Loading episode information...</p>
                    </div>
                    
                    <div class="download-actions" style="margin-top: 20px;">
                        <button class="btn btn-primary btn-large" onclick="fileDownloadManager.downloadAllAsZip()" style="font-size: 1.1rem; padding: 15px 30px;">
                            📦 Download All (ZIP)
                        </button>
                        <button class="btn btn-secondary" onclick="fileDownloadManager.downloadMetadata()">
                            📋 Download Metadata
                        </button>
                        <button class="btn btn-accent tts-launch-btn" onclick="fileDownloadManager.launchTTSProcessor()" style="margin-left: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
                            🚀 Start New Episode
                        </button>
                    </div>
                </div>
                
                <!-- File Browser -->
                <div class="file-browser" style="background: var(--bg-secondary); padding: 20px; border-radius: 12px;">
                    <div class="browser-header">
                        <h3>Individual Files</h3>
                        <div class="browser-controls">
                            <input type="text" id="file-search" placeholder="Search files..." class="search-input">
                            <select id="speaker-filter" class="filter-select">
                                <option value="">All Speakers</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- File List -->
                    <div class="file-list" id="download-file-list" style="margin-top: 20px;">
                        <div class="loading-message" style="text-align: center; padding: 40px;">
                            <div class="spinner" style="width: 40px; height: 40px; margin: 0 auto 20px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                            <p>Loading files...</p>
                        </div>
                    </div>
                </div>
                
                <!-- Hidden elements -->
                <div class="batch-download hidden" id="batch-download">
                    <!-- Batch download UI -->
                </div>
                
                <div class="download-progress hidden" id="download-progress">
                    <!-- Download progress UI -->
                </div>
            </div>
        `;
        
        console.log('✓ Download section HTML created');
        return section;
    }

    /**
     * Load and display file list - Phase 6.1.1
     */
    async loadFileList() {
        try {
            const response = await fetch(`/api/download/files/${this.sessionId}`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load files');
            }
            
            // Update episode info
            this.updateEpisodeInfo(data.episodeInfo);
            
            // Display files
            this.displayFileList(data.files);
            
            // Update filters
            this.updateFilters(data.speakers);
            
        } catch (error) {
            console.error('Failed to load file list:', error);
            this.showError('Failed to load files: ' + error.message);
        }
    }

    /**
     * Update episode information display
     */
    updateEpisodeInfo(info) {
        const titleEl = document.getElementById('download-episode-title');
        const infoEl = document.getElementById('download-episode-info');
        
        if (titleEl) {
            titleEl.textContent = info.episodeName || 'Unknown Episode';
        }
        
        if (infoEl) {
            infoEl.innerHTML = `
                <strong>${info.totalFiles}</strong> audio files • 
                <strong>${this.formatSize(info.totalSize)}</strong> total • 
                Processed on ${new Date(info.processedAt).toLocaleDateString()}
            `;
        }
    }

    /**
     * Display file list with download options
     */
    displayFileList(files) {
        const listContainer = document.getElementById('download-file-list');
        
        if (!files || files.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <p>No files found</p>
                </div>
            `;
            return;
        }
        
        // Group files by speaker
        const filesBySpeaker = this.groupFilesBySpeaker(files);
        
        let html = '';
        for (const [speaker, speakerFiles] of Object.entries(filesBySpeaker)) {
            html += `
                <div class="speaker-group">
                    <div class="speaker-header">
                        <h4>${speaker}</h4>
                        <span class="file-count">${speakerFiles.length} files</span>
                        <button class="btn btn-sm" onclick="fileDownloadManager.downloadSpeaker('${speaker}')">
                            Download All
                        </button>
                    </div>
                    <div class="file-grid">
                        ${speakerFiles.map(file => this.createFileCard(file)).join('')}
                    </div>
                </div>
            `;
        }
        
        listContainer.innerHTML = html;
    }

    /**
     * Create individual file card
     */
    createFileCard(file) {
        return `
            <div class="file-card" data-filename="${file.filename}" data-speaker="${file.speaker}">
                <div class="file-checkbox">
                    <input type="checkbox" id="file-${file.id}" value="${file.filename}" 
                           onchange="fileDownloadManager.toggleFileSelection('${file.filename}')">
                </div>
                <div class="file-info">
                    <div class="file-name">${file.displayName}</div>
                    <div class="file-meta">
                        ${file.duration ? `<span class="duration">${this.formatDuration(file.duration)}</span>` : ''}
                        <span class="size">${this.formatSize(file.size)}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn-icon" onclick="fileDownloadManager.previewFile('${file.filename}')" title="Preview">
                        🔊
                    </button>
                    <button class="btn-icon" onclick="fileDownloadManager.downloadFile('${file.filename}')" title="Download">
                        📥
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Download individual file
     */
    async downloadFile(filename) {
        try {
            const response = await fetch(`/api/download/file/${this.sessionId}/${filename}`);
            
            if (!response.ok) {
                throw new Error('Download failed');
            }
            
            // Get filename from Content-Disposition header or use provided filename
            const contentDisposition = response.headers.get('Content-Disposition');
            const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
            const downloadName = filenameMatch ? filenameMatch[1] : filename;
            
            // Create blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
        } catch (error) {
            console.error('Download error:', error);
            this.showError('Failed to download file');
        }
    }

    /**
     * Download all files as ZIP - Phase 6.1.0
     */
    async downloadAllAsZip() {
        this.showDownloadProgress('Creating ZIP archive...');
        
        try {
            const response = await fetch(`/api/download/zip/${this.sessionId}`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Failed to create ZIP');
            }
            
            // Monitor ZIP creation progress
            const data = await response.json();
            if (data.jobId) {
                await this.monitorZipProgress(data.jobId);
            } else {
                throw new Error('No job ID returned');
            }
            
        } catch (error) {
            console.error('ZIP download error:', error);
            this.hideDownloadProgress();
            this.showError('Failed to create ZIP archive: ' + error.message);
        }
    }

    /**
     * Monitor ZIP creation progress
     */
    async monitorZipProgress(jobId) {
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/download/zip/status/${jobId}`);
                const status = await response.json();
                
                if (status.complete) {
                    clearInterval(pollInterval);
                    this.updateDownloadProgress(100, 'Download starting...');
                    
                    // Download the ZIP file
                    window.location.href = `/api/download/zip/download/${jobId}`;
                    
                    setTimeout(() => {
                        this.hideDownloadProgress();
                    }, 2000);
                } else if (status.error) {
                    clearInterval(pollInterval);
                    throw new Error(status.error);
                } else {
                    // Update progress
                    this.updateDownloadProgress(
                        status.progress || 0,
                        status.message || 'Creating archive...'
                    );
                }
            } catch (error) {
                clearInterval(pollInterval);
                this.hideDownloadProgress();
                this.showError('Failed to create ZIP: ' + error.message);
            }
        }, 1000);
    }

    /**
     * Download files by speaker
     */
    async downloadSpeaker(speaker) {
        this.showDownloadProgress(`Creating ZIP for ${speaker}...`);
        
        try {
            const response = await fetch(`/api/download/speaker/${this.sessionId}/${encodeURIComponent(speaker)}`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Failed to create speaker ZIP');
            }
            
            const data = await response.json();
            if (data.jobId) {
                await this.monitorZipProgress(data.jobId);
            }
            
        } catch (error) {
            console.error('Speaker download error:', error);
            this.hideDownloadProgress();
            this.showError('Failed to download speaker files: ' + error.message);
        }
    }

    /**
     * Download metadata files
     */
    async downloadMetadata() {
        try {
            const response = await fetch(`/api/download/metadata/${this.sessionId}`);
            
            if (!response.ok) {
                throw new Error('Failed to download metadata');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `metadata_${this.sessionId}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
        } catch (error) {
            console.error('Metadata download error:', error);
            this.showError('Failed to download metadata');
        }
    }

    /**
     * File selection management
     */
    toggleFileSelection(filename) {
        const checkbox = document.querySelector(`input[value="${filename}"]`);
        if (checkbox.checked) {
            this.downloadQueue.push(filename);
        } else {
            this.downloadQueue = this.downloadQueue.filter(f => f !== filename);
        }
        
        this.updateBatchDownload();
    }

    /**
     * Update batch download UI
     */
    updateBatchDownload() {
        const batchSection = document.getElementById('batch-download');
        const countEl = document.getElementById('batch-count');
        
        if (this.downloadQueue.length > 0) {
            batchSection.classList.remove('hidden');
            countEl.textContent = this.downloadQueue.length;
            // TODO: Calculate total size
        } else {
            batchSection.classList.add('hidden');
        }
    }

    /**
     * Download selected files
     */
    async downloadSelected() {
        if (this.downloadQueue.length === 0) return;
        
        this.showDownloadProgress('Creating ZIP of selected files...');
        
        try {
            const response = await fetch(`/api/download/selected/${this.sessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: this.downloadQueue })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create ZIP');
            }
            
            const data = await response.json();
            if (data.jobId) {
                await this.monitorZipProgress(data.jobId);
            }
            
        } catch (error) {
            console.error('Selected download error:', error);
            this.hideDownloadProgress();
            this.showError('Failed to download selected files: ' + error.message);
        }
    }

    /**
     * Clear file selection
     */
    clearSelection() {
        this.downloadQueue = [];
        document.querySelectorAll('.file-checkbox input:checked').forEach(cb => {
            cb.checked = false;
        });
        this.updateBatchDownload();
    }

    /**
     * Preview audio file
     */
    async previewFile(filename) {
        try {
            const audio = document.getElementById('preview-player');
            audio.src = `/api/download/file/${this.sessionId}/${filename}`;
            audio.play();
        } catch (error) {
            console.error('Preview error:', error);
            this.showError('Failed to preview file');
        }
    }

    /**
     * Filter and search functionality
     */
    setupFilters() {
        // Search functionality
        const searchInput = document.getElementById('file-search');
        searchInput?.addEventListener('input', (e) => {
            this.filterFiles(e.target.value.toLowerCase());
        });
        
        // Speaker filter
        const speakerFilter = document.getElementById('speaker-filter');
        speakerFilter?.addEventListener('change', (e) => {
            this.filterBySpeaker(e.target.value);
        });
    }

    /**
     * Filter files by search term
     */
    filterFiles(searchTerm) {
        const fileCards = document.querySelectorAll('.file-card');
        
        fileCards.forEach(card => {
            const filename = card.dataset.filename.toLowerCase();
            const speaker = card.dataset.speaker.toLowerCase();
            
            if (filename.includes(searchTerm) || speaker.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
        
        // Update speaker group visibility
        document.querySelectorAll('.speaker-group').forEach(group => {
            const visibleCards = group.querySelectorAll('.file-card:not([style*="display: none"])');
            group.style.display = visibleCards.length > 0 ? '' : 'none';
        });
    }

    /**
     * Filter by speaker
     */
    filterBySpeaker(speaker) {
        const speakerGroups = document.querySelectorAll('.speaker-group');
        
        speakerGroups.forEach(group => {
            if (!speaker || group.querySelector('h4').textContent === speaker) {
                group.style.display = '';
            } else {
                group.style.display = 'none';
            }
        });
    }

    /**
     * Update speaker filter options
     */
    updateFilters(speakers) {
        const filterSelect = document.getElementById('speaker-filter');
        if (!filterSelect) return;
        
        // Clear existing options except "All"
        filterSelect.innerHTML = '<option value="">All Speakers</option>';
        
        // Add speaker options
        speakers.forEach(speaker => {
            const option = document.createElement('option');
            option.value = speaker;
            option.textContent = speaker;
            filterSelect.appendChild(option);
        });
    }

    /**
     * Group files by speaker
     */
    groupFilesBySpeaker(files) {
        const grouped = {};
        
        files.forEach(file => {
            const speaker = file.speaker || 'Unknown';
            if (!grouped[speaker]) {
                grouped[speaker] = [];
            }
            grouped[speaker].push(file);
        });
        
        // Sort speakers alphabetically
        const sorted = {};
        Object.keys(grouped).sort().forEach(key => {
            sorted[key] = grouped[key];
        });
        
        return sorted;
    }

    /**
     * Progress UI helpers
     */
    showDownloadProgress(message) {
        const progressEl = document.getElementById('download-progress');
        const statusEl = document.getElementById('download-status');
        
        if (progressEl) {
            progressEl.classList.remove('hidden');
            if (statusEl) {
                statusEl.textContent = message;
            }
            this.updateDownloadProgress(0, message);
        }
    }

    updateDownloadProgress(percent, message) {
        const fillEl = document.getElementById('download-progress-fill');
        const statusEl = document.getElementById('download-status');
        
        if (fillEl) {
            fillEl.style.width = `${percent}%`;
        }
        if (statusEl && message) {
            statusEl.textContent = message;
        }
    }

    hideDownloadProgress() {
        const progressEl = document.getElementById('download-progress');
        if (progressEl) {
            progressEl.classList.add('hidden');
        }
    }

    /**
     * Utility functions
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    showError(message) {
        // TODO: Implement proper error notification
        console.error(message);
        alert('Error: ' + message);
    }

    /**
     * Launch TTS Processor using custom protocol
     */
    launchTTSProcessor() {
        try {
            // Use the custom tts:// protocol to launch the processor
            window.location.href = 'tts://launch';
            
            // Show a nice notification
            this.showLaunchNotification();
            
        } catch (error) {
            console.error('Failed to launch TTS processor:', error);
            
            // Fallback: show manual instructions
            this.showLaunchFallback();
        }
    }

    /**
     * Show launch notification
     */
    showLaunchNotification() {
        // Create a beautiful notification
        const notification = document.createElement('div');
        notification.className = 'launch-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
            z-index: 10000;
            max-width: 350px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 2rem;">🚀</div>
                <div>
                    <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 4px;">
                        Launching TTS Processor...
                    </div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">
                        Your browser may ask for permission to open the TTS protocol.
                    </div>
                </div>
            </div>
        `;
        
        // Add animation keyframes if not already added
        if (!document.querySelector('#launch-animations')) {
            const style = document.createElement('style');
            style.id = 'launch-animations';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    /**
     * Show fallback instructions if protocol doesn't work
     */
    showLaunchFallback() {
        const modal = document.createElement('div');
        modal.className = 'modal launch-fallback-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 2rem; max-width: 500px; margin: 1rem;">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🚀</div>
                    <h3 style="margin: 0 0 0.5rem 0; color: #333;">Launch TTS Processor</h3>
                    <p style="color: #666; margin: 0;">Protocol handler not available</p>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #333;">Manual Launch Options:</h4>
                    <ol style="margin: 0; padding-left: 1.2rem; color: #555;">
                        <li>Run <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-family: monospace;">npm run dev</code> in your terminal</li>
                        <li>Or double-click <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-family: monospace;">tts-launcher.bat</code></li>
                        <li>Or install the protocol handler from BatchFiles folder</li>
                    </ol>
                </div>
                
                <div style="text-align: center;">
                    <button onclick="this.closest('.modal').remove()" 
                            style="background: #667eea; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-size: 1rem;">
                        Got it!
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Debug function to help troubleshoot visibility issues
function debugDownloadSection() {
    console.log('🔍 DEBUGGING DOWNLOAD SECTION:');
    
    // Check main container
    const mainContainer = document.querySelector('.container main');
    console.log('Main container found:', !!mainContainer);
    if (mainContainer) {
        console.log('Main container children:', mainContainer.children.length);
        Array.from(mainContainer.children).forEach((child, i) => {
            console.log(`  Child ${i}: ${child.tagName}#${child.id}.${child.className}`);
        });
    }
    
    // Check all sections
    const allSections = document.querySelectorAll('.section');
    console.log('Total sections found:', allSections.length);
    allSections.forEach(section => {
        const styles = getComputedStyle(section);
        console.log(`Section: ${section.id}`, {
            hidden: section.classList.contains('hidden'),
            active: section.classList.contains('active'),
            display: styles.display,
            visibility: styles.visibility,
            height: styles.height
        });
    });
    
    // Check download section specifically
    const downloadSection = document.getElementById('download-section');
    if (downloadSection) {
        console.log('✓ Download section exists');
        console.log('Parent:', downloadSection.parentElement?.tagName);
        console.log('Offset Parent:', downloadSection.offsetParent?.tagName);
        console.log('Bounding rect:', downloadSection.getBoundingClientRect());
    } else {
        console.log('❌ Download section NOT FOUND');
    }
}

// Initialize download manager
window.fileDownloadManager = new FileDownloadManager();
window.debugDownloadSection = debugDownloadSection; 