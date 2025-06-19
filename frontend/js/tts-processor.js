// TTS Processor Frontend Component - Phase 5.2.1

class TTSProcessor {
    constructor() {
        this.statusPollingInterval = null;
        this.currentStatus = null;
        this.progressUpdateInterval = 1000; // 1 second
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * Initialize processing UI - Phase 5.2.1
     */
    initializeProcessing(sessionData, speakerMapping) {
        console.log('Initializing TTS processing...');
        
        // Show processing section
        this.showProcessingSection();
        
        // Display processing info
        this.displayProcessingInfo(sessionData, speakerMapping);
        
        // Reset state
        this.currentStatus = null;
        this.retryCount = 0;
        
        return { success: true };
    }

    /**
     * Show processing section in UI
     */
    showProcessingSection() {
        // Hide other sections
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show processing section
        const processingSection = document.getElementById('processing-section');
        if (processingSection) {
            processingSection.style.display = 'block';
        } else {
            this.createProcessingSection();
        }
    }

    /**
     * Create processing section dynamically
     */
    createProcessingSection() {
        const container = document.querySelector('.container');
        const processingHTML = `
            <div id="processing-section" class="section">
                <h2><i class="fas fa-microphone"></i> TTS Processing - Phase 5</h2>
                
                <!-- Processing Header -->
                <div class="processing-header">
                    <div class="episode-info">
                        <h3 id="episode-title">Episode Processing</h3>
                        <p id="episode-stats">Preparing to process...</p>
                    </div>
                    <div class="processing-controls">
                        <button id="start-btn" class="btn btn-primary" onclick="ttsProcessor.startProcessing()">
                            <i class="fas fa-play"></i> Start Processing
                        </button>
                        <button id="pause-btn" class="btn btn-warning" onclick="ttsProcessor.pauseProcessing()" disabled>
                            <i class="fas fa-pause"></i> Pause
                        </button>
                        <button id="resume-btn" class="btn btn-success" onclick="ttsProcessor.resumeProcessing()" disabled style="display: none;">
                            <i class="fas fa-play"></i> Resume
                        </button>
                        <button id="cancel-btn" class="btn btn-danger" onclick="ttsProcessor.cancelProcessing()" disabled>
                            <i class="fas fa-stop"></i> Cancel
                        </button>
                    </div>
                </div>

                <!-- Progress Overview -->
                <div class="progress-overview">
                    <div class="progress-card">
                        <h4>Overall Progress</h4>
                        <div class="progress-bar-container">
                            <div id="overall-progress" class="progress-bar" data-percentage="0">
                                <div class="progress-fill"></div>
                                <span class="progress-text">0%</span>
                            </div>
                        </div>
                        <div class="progress-stats">
                            <span id="completed-count">0</span> completed • 
                            <span id="failed-count">0</span> failed • 
                            <span id="remaining-count">0</span> remaining
                        </div>
                    </div>

                    <div class="time-estimates">
                        <div class="time-card">
                            <i class="fas fa-clock"></i>
                            <div>
                                <div class="time-label">Elapsed</div>
                                <div id="elapsed-time" class="time-value">00:00</div>
                            </div>
                        </div>
                        <div class="time-card">
                            <i class="fas fa-hourglass-half"></i>
                            <div>
                                <div class="time-label">Estimated Remaining</div>
                                <div id="estimated-time" class="time-value">--:--</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Current Item Display -->
                <div id="current-item" class="current-item" style="display: none;">
                    <div class="current-item-header">
                        <h4>Currently Processing</h4>
                        <div class="item-status" id="current-status">Preparing...</div>
                    </div>
                    <div class="current-item-details">
                        <div class="item-info">
                            <span id="current-speaker" class="speaker-name">Speaker</span>
                            <span id="current-position" class="position">Item 0 of 0</span>
                        </div>
                        <div id="current-text" class="item-text">Text content...</div>
                    </div>
                </div>

                <!-- Processing Queue -->
                <div class="processing-queue">
                    <div class="queue-tabs">
                        <button class="tab-btn active" onclick="ttsProcessor.showQueueTab('pending')">
                            Pending (<span id="pending-count">0</span>)
                        </button>
                        <button class="tab-btn" onclick="ttsProcessor.showQueueTab('completed')">
                            Completed (<span id="completed-tab-count">0</span>)
                        </button>
                        <button class="tab-btn" onclick="ttsProcessor.showQueueTab('failed')">
                            Failed (<span id="failed-tab-count">0</span>)
                        </button>
                    </div>
                    
                    <div id="queue-pending" class="queue-content active">
                        <div class="queue-list" id="pending-list">
                            <!-- Pending items will be populated here -->
                        </div>
                    </div>
                    
                    <div id="queue-completed" class="queue-content">
                        <div class="queue-list" id="completed-list">
                            <!-- Completed items will be populated here -->
                        </div>
                    </div>
                    
                    <div id="queue-failed" class="queue-content">
                        <div class="queue-list" id="failed-list">
                            <!-- Failed items will be populated here -->
                        </div>
                        <div class="retry-section">
                            <button id="retry-btn" class="btn btn-warning" onclick="ttsProcessor.retryFailed()" disabled>
                                <i class="fas fa-redo"></i> Retry All Failed
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Completion Status -->
                <div id="completion-status" class="completion-status" style="display: none;">
                    <div class="completion-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3>Processing Complete!</h3>
                    <div class="completion-stats">
                        <div class="stat">
                            <span class="stat-value" id="final-completed">0</span>
                            <span class="stat-label">Files Generated</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value" id="final-failed">0</span>
                            <span class="stat-label">Failed Items</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value" id="final-time">0</span>
                            <span class="stat-label">Total Time</span>
                        </div>
                    </div>
                    <div class="completion-actions">
                        <button class="btn btn-primary" onclick="ttsProcessor.downloadResults()">
                            <i class="fas fa-download"></i> Download Results
                        </button>
                        <button class="btn btn-secondary" onclick="window.location.reload()">
                            <i class="fas fa-redo"></i> Process Another Episode
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML += processingHTML;
    }

    /**
     * Display processing information
     */
    displayProcessingInfo(sessionData, speakerMapping) {
        // Update episode title
        const episodeTitle = document.getElementById('episode-title');
        if (episodeTitle) {
            const episodeName = sessionData.episodeInfo?.name || 'Unknown Episode';
            episodeTitle.textContent = `Processing: ${episodeName}`;
        }

        // Update episode stats
        const episodeStats = document.getElementById('episode-stats');
        if (episodeStats) {
            const speakerCount = Object.keys(speakerMapping).length;
            const dialogueCount = sessionData.parseResults?.dialogues?.length || 0;
            episodeStats.textContent = `${dialogueCount} dialogues • ${speakerCount} speakers mapped`;
        }
    }

    /**
     * Start TTS processing - Phase 5.1.2
     */
    async startProcessing() {
        try {
            console.log('Starting TTS processing...');
            
            // Initialize processing on backend
            const initResponse = await fetch('/api/processing/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: window.currentSessionId,
                    speakerMapping: window.currentSpeakerMapping,
                    episodeInfo: window.currentSessionData?.episodeInfo
                })
            });
            
            if (!initResponse.ok) {
                throw new Error('Failed to initialize processing');
            }
            
            const initData = await initResponse.json();
            console.log('Processing initialized:', initData);
            
            // Start processing
            const startResponse = await fetch('/api/processing/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!startResponse.ok) {
                throw new Error('Failed to start processing');
            }
            
            // Update UI state
            this.updateControlButtons('processing');
            
            // Start status polling
            this.startStatusPolling();
            
            // Show current item section
            document.getElementById('current-item').style.display = 'block';
            
        } catch (error) {
            console.error('Start processing error:', error);
            this.showError(`Failed to start processing: ${error.message}`);
        }
    }

    /**
     * Pause processing - Phase 5.2.3
     */
    async pauseProcessing() {
        try {
            const response = await fetch('/api/processing/pause', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error('Failed to pause processing');
            }
            
            this.updateControlButtons('paused');
            
        } catch (error) {
            console.error('Pause processing error:', error);
            this.showError(`Failed to pause processing: ${error.message}`);
        }
    }

    /**
     * Resume processing - Phase 5.2.3
     */
    async resumeProcessing() {
        try {
            const response = await fetch('/api/processing/resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error('Failed to resume processing');
            }
            
            this.updateControlButtons('processing');
            
        } catch (error) {
            console.error('Resume processing error:', error);
            this.showError(`Failed to resume processing: ${error.message}`);
        }
    }

    /**
     * Cancel processing - Phase 5.2.3
     */
    async cancelProcessing() {
        try {
            if (!confirm('Are you sure you want to cancel processing? This cannot be undone.')) {
                return;
            }
            
            const response = await fetch('/api/processing/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error('Failed to cancel processing');
            }
            
            this.stopStatusPolling();
            this.updateControlButtons('cancelled');
            
        } catch (error) {
            console.error('Cancel processing error:', error);
            this.showError(`Failed to cancel processing: ${error.message}`);
        }
    }

    /**
     * Retry failed items - Phase 5.2.2
     */
    async retryFailed() {
        try {
            const response = await fetch('/api/processing/retry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error('Failed to retry processing');
            }
            
            this.updateControlButtons('processing');
            
        } catch (error) {
            console.error('Retry processing error:', error);
            this.showError(`Failed to retry processing: ${error.message}`);
        }
    }

    /**
     * Start status polling - Phase 5.2.1
     */
    startStatusPolling() {
        this.stopStatusPolling(); // Clear any existing interval
        
        this.statusPollingInterval = setInterval(async () => {
            try {
                await this.updateStatus();
            } catch (error) {
                console.error('Status polling error:', error);
                this.retryCount++;
                
                if (this.retryCount >= this.maxRetries) {
                    console.error('Max retries reached, stopping status polling');
                    this.stopStatusPolling();
                    this.showError('Lost connection to processing server');
                }
            }
        }, this.progressUpdateInterval);
    }

    /**
     * Stop status polling
     */
    stopStatusPolling() {
        if (this.statusPollingInterval) {
            clearInterval(this.statusPollingInterval);
            this.statusPollingInterval = null;
        }
        this.retryCount = 0;
    }

    /**
     * Update processing status - Phase 5.2.1
     */
    async updateStatus() {
        const response = await fetch(`/api/processing/status/${window.currentSessionId}`);
        if (!response.ok) {
            throw new Error('Failed to get status');
        }
        
        const data = await response.json();
        this.currentStatus = data.stats;
        
        // Reset retry count on successful update
        this.retryCount = 0;
        
        // Update UI components
        this.updateProgressDisplay(this.currentStatus);
        this.updateCurrentItem(this.currentStatus);
        this.updateTimeEstimates(this.currentStatus);
        this.updateQueueCounts(this.currentStatus);
        
        // Check if processing is complete
        if (!this.currentStatus.isProcessing && this.currentStatus.completed + this.currentStatus.failed === this.currentStatus.total) {
            this.stopStatusPolling();
            this.showCompletionStatus();
        }
    }

    /**
     * Update progress display
     */
    updateProgressDisplay(status) {
        const percentage = status.percentage || 0;
        const progressBar = document.getElementById('overall-progress');
        const progressFill = progressBar?.querySelector('.progress-fill');
        const progressText = progressBar?.querySelector('.progress-text');
        
        if (progressBar) {
            progressBar.setAttribute('data-percentage', percentage);
        }
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        if (progressText) {
            progressText.textContent = `${percentage}%`;
        }
        
        // Update counts
        const completedCount = document.getElementById('completed-count');
        const failedCount = document.getElementById('failed-count');
        const remainingCount = document.getElementById('remaining-count');
        
        if (completedCount) completedCount.textContent = status.completed || 0;
        if (failedCount) failedCount.textContent = status.failed || 0;
        if (remainingCount) remainingCount.textContent = status.remaining || 0;
    }

    /**
     * Update current item display
     */
    updateCurrentItem(status) {
        const currentItem = status.currentItem;
        if (!currentItem) return;
        
        const speakerEl = document.getElementById('current-speaker');
        const positionEl = document.getElementById('current-position');
        const textEl = document.getElementById('current-text');
        const statusEl = document.getElementById('current-status');
        
        if (speakerEl) speakerEl.textContent = currentItem.speaker || 'Unknown';
        if (positionEl) positionEl.textContent = `Item ${(status.completed || 0) + 1} of ${status.total || 0}`;
        if (textEl) textEl.textContent = currentItem.text ? this.truncateText(currentItem.text, 150) : 'Processing...';
        if (statusEl) statusEl.textContent = this.getStatusText(currentItem.status);
    }

    /**
     * Update time estimates
     */
    updateTimeEstimates(status) {
        const elapsedEl = document.getElementById('elapsed-time');
        const estimatedEl = document.getElementById('estimated-time');
        
        if (elapsedEl) {
            elapsedEl.textContent = this.formatDuration(status.elapsed || 0);
        }
        
        if (estimatedEl) {
            if (status.estimatedRemaining > 0) {
                estimatedEl.textContent = this.formatDuration(status.estimatedRemaining);
            } else {
                estimatedEl.textContent = '--:--';
            }
        }
    }

    /**
     * Update queue counts
     */
    updateQueueCounts(status) {
        const pendingCount = document.getElementById('pending-count');
        const completedTabCount = document.getElementById('completed-tab-count');
        const failedTabCount = document.getElementById('failed-tab-count');
        const retryBtn = document.getElementById('retry-btn');
        
        if (pendingCount) pendingCount.textContent = status.remaining || 0;
        if (completedTabCount) completedTabCount.textContent = status.completed || 0;
        if (failedTabCount) failedTabCount.textContent = status.failed || 0;
        
        // Enable/disable retry button
        if (retryBtn) {
            retryBtn.disabled = (status.failed || 0) === 0;
        }
    }

    /**
     * Show completion status
     */
    showCompletionStatus() {
        this.updateControlButtons('complete');
        
        const completionSection = document.getElementById('completion-status');
        if (completionSection) {
            completionSection.style.display = 'block';
            
            // Update final stats
            const finalCompleted = document.getElementById('final-completed');
            const finalFailed = document.getElementById('final-failed');
            const finalTime = document.getElementById('final-time');
            
            if (finalCompleted) finalCompleted.textContent = this.currentStatus.completed || 0;
            if (finalFailed) finalFailed.textContent = this.currentStatus.failed || 0;
            if (finalTime) finalTime.textContent = this.formatDuration(this.currentStatus.elapsed || 0);
        }
        
        // Hide current item
        const currentItem = document.getElementById('current-item');
        if (currentItem) {
            currentItem.style.display = 'none';
        }
    }

    /**
     * Update control button states
     */
    updateControlButtons(state) {
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const resumeBtn = document.getElementById('resume-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        
        // Reset all buttons
        [startBtn, pauseBtn, resumeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.disabled = false;
                btn.style.display = 'inline-flex';
            }
        });
        
        switch (state) {
            case 'processing':
                if (startBtn) { startBtn.disabled = true; startBtn.style.display = 'none'; }
                if (resumeBtn) { resumeBtn.disabled = true; resumeBtn.style.display = 'none'; }
                break;
                
            case 'paused':
                if (startBtn) { startBtn.disabled = true; startBtn.style.display = 'none'; }
                if (pauseBtn) { pauseBtn.disabled = true; pauseBtn.style.display = 'none'; }
                break;
                
            case 'cancelled':
            case 'complete':
                [startBtn, pauseBtn, resumeBtn, cancelBtn].forEach(btn => {
                    if (btn) btn.disabled = true;
                });
                break;
        }
    }

    /**
     * Show queue tab
     */
    showQueueTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[onclick="ttsProcessor.showQueueTab('${tabName}')"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.queue-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`queue-${tabName}`).classList.add('active');
    }

    /**
     * Download processing results
     */
    async downloadResults() {
        try {
            // Call the Phase 6 download function
            if (window.proceedToDownload) {
                await window.proceedToDownload();
            } else {
                this.showError('Download manager not available');
            }
        } catch (error) {
            console.error('Download error:', error);
            this.showError(`Failed to download results: ${error.message}`);
        }
    }

    /**
     * Utility methods
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    formatDuration(ms) {
        if (!ms || ms < 0) return '00:00';
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        } else {
            return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        }
    }

    getStatusText(status) {
        const statusTexts = {
            'pending': 'Waiting...',
            'processing': 'Generating audio...',
            'completed': 'Complete',
            'failed': 'Failed'
        };
        return statusTexts[status] || 'Unknown';
    }

    showError(message) {
        console.error(message);
        // Implementation depends on existing notification system
        alert(`Error: ${message}`);
    }

    showInfo(message) {
        console.info(message);
        // Implementation depends on existing notification system
        alert(`Info: ${message}`);
    }
}

// Initialize global TTS processor
const ttsProcessor = new TTSProcessor(); 