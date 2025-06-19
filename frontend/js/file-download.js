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
        // Hide processing section
        document.getElementById('processing-section').classList.add('hidden');
        
        // Create or show download section
        let downloadSection = document.getElementById('download-section');
        if (!downloadSection) {
            downloadSection = this.createDownloadSection();
            document.querySelector('.container main').appendChild(downloadSection);
        }
        
        downloadSection.classList.remove('hidden');
        downloadSection.classList.add('active');
        
        // Load and display files
        await this.loadFileList();
    }

    /**
     * Create download section HTML
     */
    createDownloadSection() {
        const section = document.createElement('section');
        section.id = 'download-section';
        section.className = 'section';
        
        section.innerHTML = `
            <h2>📥 Download Audio Files</h2>
            
            <!-- Download Overview -->
            <div class="download-overview">
                <div class="episode-summary">
                    <h3 id="download-episode-title">Episode Files</h3>
                    <p id="download-episode-info">Loading episode information...</p>
                </div>
                
                <div class="download-actions">
                    <button class="btn btn-primary btn-large" onclick="fileDownloadManager.downloadAllAsZip()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download All (ZIP)
                    </button>
                    <button class="btn btn-secondary" onclick="fileDownloadManager.downloadMetadata()">
                        📋 Download Metadata
                    </button>
                </div>
            </div>
            
            <!-- File Browser -->
            <div class="file-browser">
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
                <div class="file-list" id="download-file-list">
                    <div class="loading-message">
                        <div class="spinner"></div>
                        <p>Loading files...</p>
                    </div>
                </div>
            </div>
            
            <!-- Batch Download -->
            <div class="batch-download hidden" id="batch-download">
                <h3>Batch Download</h3>
                <div class="batch-info">
                    <p>Selected: <span id="batch-count">0</span> files</p>
                    <p>Total size: <span id="batch-size">0 MB</span></p>
                </div>
                <div class="batch-actions">
                    <button class="btn btn-primary" onclick="fileDownloadManager.downloadSelected()">
                        Download Selected
                    </button>
                    <button class="btn btn-secondary" onclick="fileDownloadManager.clearSelection()">
                        Clear Selection
                    </button>
                </div>
            </div>
            
            <!-- Download Progress -->
            <div class="download-progress hidden" id="download-progress">
                <h4>Downloading...</h4>
                <div class="progress-bar">
                    <div class="progress-fill" id="download-progress-fill"></div>
                </div>
                <p id="download-status">Preparing download...</p>
            </div>
        `;
        
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
}

// Initialize download manager
window.fileDownloadManager = new FileDownloadManager(); 