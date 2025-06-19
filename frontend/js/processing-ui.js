// Processing UI Component - Phase 5 Enhanced
class ProcessingUI {
    constructor() {
        this.sessionId = null;
        this.updateInterval = null;
        this.stats = null;
        this.startTime = null;
    }

    /**
     * Initialize processing UI - Phase 5.2.1
     */
    initializeUI(sessionId, queueInfo) {
        this.sessionId = sessionId;
        this.startTime = Date.now();
        
        console.log('Initializing enhanced processing UI...');
        
        const html = `
            <div class="processing-container">
                <!-- Main Progress Section -->
                <div class="processing-header">
                    <h2>🎙️ Processing Audio Files</h2>
                    <div class="processing-status">
                        <span class="status-indicator processing"></span>
                        <span class="status-text">Processing...</span>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div class="progress-section">
                    <div class="progress-bar-container">
                        <div class="progress-bar" id="main-progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                            <div class="progress-text">0%</div>
                        </div>
                    </div>
                    <div class="progress-stats">
                        <span id="progress-fraction">0/${queueInfo.totalItems}</span>
                        <span id="time-elapsed">00:00</span>
                    </div>
                </div>
                
                <!-- Current Item -->
                <div class="current-item-section">
                    <h3>Currently Processing</h3>
                    <div class="current-item" id="current-item">
                        <div class="item-icon">🔊</div>
                        <div class="item-details">
                            <div class="item-name">Waiting to start...</div>
                            <div class="item-speaker"></div>
                        </div>
                        <div class="item-status">
                            <div class="spinner small"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Statistics Grid -->
                <div class="stats-grid">
                    <div class="stat-card completed">
                        <div class="stat-icon">✅</div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-completed">0</div>
                            <div class="stat-label">Completed</div>
                        </div>
                    </div>
                    <div class="stat-card processing">
                        <div class="stat-icon">⏳</div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-processing">0</div>
                            <div class="stat-label">Processing</div>
                        </div>
                    </div>
                    <div class="stat-card queued">
                        <div class="stat-icon">📋</div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-queued">0</div>
                            <div class="stat-label">Queued</div>
                        </div>
                    </div>
                    <div class="stat-card failed">
                        <div class="stat-icon">❌</div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-failed">0</div>
                            <div class="stat-label">Failed</div>
                        </div>
                    </div>
                </div>
                
                <!-- Processing Log -->
                <div class="processing-log-section">
                    <div class="log-header">
                        <h3>Processing Log</h3>
                        <button class="btn-small" onclick="window.processingUI.toggleLog()">
                            <span id="log-toggle-text">Show</span>
                        </button>
                    </div>
                    <div class="processing-log hidden" id="processing-log">
                        <div class="log-entries" id="log-entries">
                            <!-- Log entries will be added here -->
                        </div>
                    </div>
                </div>
                
                <!-- Control Buttons -->
                <div class="processing-controls">
                    <button class="btn btn-secondary" id="pause-btn" onclick="window.processingUI.pauseProcessing()">
                        ⏸️ Pause
                    </button>
                    <button class="btn btn-secondary hidden" id="resume-btn" onclick="window.processingUI.resumeProcessing()">
                        ▶️ Resume
                    </button>
                    <button class="btn btn-warning" onclick="window.processingUI.cancelProcessing()">
                        ❌ Cancel
                    </button>
                    <button class="btn btn-secondary hidden" id="retry-btn" onclick="window.processingUI.retryFailed()">
                        🔄 Retry Failed
                    </button>
                </div>
                
                <!-- Time Estimates -->
                <div class="time-estimates">
                    <div class="estimate-item">
                        <span class="estimate-label">Est. Remaining:</span>
                        <span class="estimate-value" id="time-remaining">Calculating...</span>
                    </div>
                    <div class="estimate-item">
                        <span class="estimate-label">Avg. per item:</span>
                        <span class="estimate-value" id="avg-time">--</span>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('processing-content').innerHTML = html;
        
        // Start status updates
        this.startStatusUpdates();
    }

    /**
     * Start polling for status updates - Phase 5.2.1
     */
    startStatusUpdates() {
        // Initial update
        this.updateStatus();
        
        // Update every second
        this.updateInterval = setInterval(() => {
            this.updateStatus();
            this.updateElapsedTime();
        }, 1000);
    }

    /**
     * Update processing status
     */
    async updateStatus() {
        try {
            const response = await fetch(`/api/processing/status/${this.sessionId}`);
            const data = await response.json();
            
            if (data.success) {
                this.stats = data.stats;
                this.updateUI(data.stats);
                
                // Check if complete
                if (!data.stats.isProcessing && data.stats.remaining === 0) {
                    this.onProcessingComplete();
                }
            }
        } catch (error) {
            console.error('Status update error:', error);
        }
    }

    /**
     * Update UI elements with current stats
     */
    updateUI(stats) {
        // Update progress bar
        const progressBar = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        if (progressBar) {
            progressBar.style.width = `${stats.percentage}%`;
            progressText.textContent = `${stats.percentage}%`;
        }
        
        // Update progress fraction
        document.getElementById('progress-fraction').textContent = 
            `${stats.completed}/${stats.total}`;
        
        // Update statistics
        document.getElementById('stat-completed').textContent = stats.completed;
        document.getElementById('stat-processing').textContent = 
            stats.isProcessing ? 1 : 0;
        document.getElementById('stat-queued').textContent = stats.remaining;
        document.getElementById('stat-failed').textContent = stats.failed;
        
        // Update current item
        if (stats.currentItem) {
            this.updateCurrentItem(stats.currentItem);
        }
        
        // Update time estimates
        if (stats.estimatedRemaining) {
            document.getElementById('time-remaining').textContent = 
                this.formatTime(stats.estimatedRemaining);
        }
        
        if (stats.avgTimePerItem) {
            document.getElementById('avg-time').textContent = 
                `${(stats.avgTimePerItem / 1000).toFixed(1)}s`;
        }
        
        // Show retry button if there are failures
        if (stats.failed > 0 && !stats.isProcessing) {
            document.getElementById('retry-btn').classList.remove('hidden');
        }
        
        // Update pause/resume buttons
        if (stats.isPaused) {
            document.getElementById('pause-btn').classList.add('hidden');
            document.getElementById('resume-btn').classList.remove('hidden');
        } else {
            document.getElementById('pause-btn').classList.remove('hidden');
            document.getElementById('resume-btn').classList.add('hidden');
        }
    }

    /**
     * Update current item display
     */
    updateCurrentItem(item) {
        const itemEl = document.getElementById('current-item');
        itemEl.innerHTML = `
            <div class="item-icon">🎤</div>
            <div class="item-details">
                <div class="item-name">${item.id}.mp3</div>
                <div class="item-speaker">${item.speaker} • ${item.characterCount} chars</div>
            </div>
            <div class="item-status">
                <div class="spinner small"></div>
                <span>Processing...</span>
            </div>
        `;
    }

    /**
     * Add entry to processing log
     */
    addLogEntry(type, message, item = null) {
        const logEntries = document.getElementById('log-entries');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        entry.innerHTML = `
            <span class="log-time">${timestamp}</span>
            <span class="log-icon">${this.getLogIcon(type)}</span>
            <span class="log-message">${message}</span>
        `;
        
        logEntries.insertBefore(entry, logEntries.firstChild);
        
        // Keep only last 100 entries
        while (logEntries.children.length > 100) {
            logEntries.removeChild(logEntries.lastChild);
        }
    }

    /**
     * Update elapsed time display
     */
    updateElapsedTime() {
        if (!this.startTime) return;
        
        const elapsed = Date.now() - this.startTime;
        document.getElementById('time-elapsed').textContent = this.formatTime(elapsed);
    }

    /**
     * Control functions - Phase 5.2.3
     */
    async pauseProcessing() {
        try {
            await fetch(`/api/processing/pause/${this.sessionId}`, { method: 'POST' });
            this.addLogEntry('info', 'Processing paused');
        } catch (error) {
            console.error('Pause error:', error);
        }
    }

    async resumeProcessing() {
        try {
            await fetch(`/api/processing/resume/${this.sessionId}`, { method: 'POST' });
            this.addLogEntry('info', 'Processing resumed');
        } catch (error) {
            console.error('Resume error:', error);
        }
    }

    async cancelProcessing() {
        if (!confirm('Are you sure you want to cancel processing? You can download completed files.')) {
            return;
        }
        
        try {
            await fetch(`/api/processing/cancel/${this.sessionId}`, { method: 'POST' });
            this.stopStatusUpdates();
            this.addLogEntry('warning', 'Processing cancelled by user');
            this.showCancelledState();
        } catch (error) {
            console.error('Cancel error:', error);
        }
    }

    async retryFailed() {
        try {
            await fetch(`/api/processing/retry/${this.sessionId}`, { method: 'POST' });
            this.addLogEntry('info', 'Retrying failed items...');
            document.getElementById('retry-btn').classList.add('hidden');
        } catch (error) {
            console.error('Retry error:', error);
        }
    }

    /**
     * Toggle log visibility
     */
    toggleLog() {
        const log = document.getElementById('processing-log');
        const toggleText = document.getElementById('log-toggle-text');
        
        if (log.classList.contains('hidden')) {
            log.classList.remove('hidden');
            toggleText.textContent = 'Hide';
        } else {
            log.classList.add('hidden');
            toggleText.textContent = 'Show';
        }
    }

    /**
     * Handle processing completion
     */
    onProcessingComplete() {
        this.stopStatusUpdates();
        
        const statusEl = document.querySelector('.processing-status');
        statusEl.innerHTML = `
            <span class="status-indicator complete"></span>
            <span class="status-text">Complete!</span>
        `;
        
        // Add completion log entry
        this.addLogEntry('success', `Processing complete! ${this.stats.completed} files generated.`);
        
        // Hide control buttons
        document.querySelector('.processing-controls').classList.add('hidden');
        
        // Show completion actions
        this.showCompletionActions();
    }

    /**
     * Show completion actions
     */
    showCompletionActions() {
        const container = document.querySelector('.processing-container');
        const actionsHTML = `
            <div class="completion-actions">
                <h3>🎉 Processing Complete!</h3>
                <p>${this.stats.completed} audio files successfully generated</p>
                ${this.stats.failed > 0 ? 
                    `<p class="warning-text">⚠️ ${this.stats.failed} files failed to process</p>` : ''
                }
                <div class="completion-buttons">
                    <button class="btn btn-primary" onclick="proceedToDownload()">
                        📥 Download Files
                    </button>
                    <button class="btn btn-secondary" onclick="viewProcessingDetails()">
                        📊 View Details
                    </button>
                    <button class="btn btn-secondary" onclick="startNewEpisode()">
                        🔄 Process Another Episode
                    </button>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', actionsHTML);
    }

    /**
     * Show cancelled state
     */
    showCancelledState() {
        const statusEl = document.querySelector('.processing-status');
        statusEl.innerHTML = `
            <span class="status-indicator cancelled"></span>
            <span class="status-text">Cancelled</span>
        `;
        
        // Update UI to show partial completion
        const container = document.querySelector('.processing-container');
        const cancelHTML = `
            <div class="cancellation-notice">
                <h3>Processing Cancelled</h3>
                <p>${this.stats.completed} files were completed before cancellation</p>
                <button class="btn btn-primary" onclick="proceedToPartialDownload()">
                    📥 Download Completed Files
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', cancelHTML);
    }

    /**
     * Stop status updates
     */
    stopStatusUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Utility functions
     */
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        }
        return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
    }

    getLogIcon(type) {
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        return icons[type] || '📝';
    }

    /**
     * Clean up
     */
    cleanup() {
        this.stopStatusUpdates();
        this.sessionId = null;
        this.stats = null;
        this.startTime = null;
    }
}

// Initialize and export
window.processingUI = new ProcessingUI(); 