// Session Recovery System using IndexedDB
// Automatically saves progress and allows recovery after crashes

class SessionRecovery {
    constructor() {
        this.dbName = 'TTSProcessorSessions';
        this.dbVersion = 1;
        this.db = null;
        this.currentSession = null;
        this.autoSaveInterval = null;
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Failed to open IndexedDB');
                reject(request.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✓ Session recovery database initialized');
                
                // Start auto-save
                this.startAutoSave();
                
                // Check for recoverable sessions (DISABLED - uncomment to re-enable)
                // this.checkForRecoverableSessions();
                
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Sessions store
                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionStore = db.createObjectStore('sessions', { 
                        keyPath: 'sessionId' 
                    });
                    sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
                    sessionStore.createIndex('status', 'status', { unique: false });
                }
                
                // Files store
                if (!db.objectStoreNames.contains('files')) {
                    const fileStore = db.createObjectStore('files', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    fileStore.createIndex('sessionId', 'sessionId', { unique: false });
                }
                
                console.log('✓ Session recovery database created');
            };
        });
    }

    /**
     * Save current session state
     */
    async saveSession(sessionData) {
        if (!this.db) return;
        
        const session = {
            sessionId: sessionData.sessionId || window.state?.currentSessionId,
            timestamp: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            status: sessionData.status || 'in_progress',
            episodeName: sessionData.episodeName,
            episodeDir: sessionData.episodeDir,
            stage: sessionData.stage || 'unknown',
            data: {
                parseResults: sessionData.parseResults || window.state?.parseResults,
                speakerMapping: sessionData.speakerMapping || window.state?.speakerMapper?.mapping,
                settings: sessionData.settings,
                progress: sessionData.progress
            },
            files: {
                total: sessionData.totalFiles || 0,
                completed: sessionData.completedFiles || 0,
                failed: sessionData.failedFiles || 0
            }
        };
        
        const transaction = this.db.transaction(['sessions'], 'readwrite');
        const store = transaction.objectStore('sessions');
        
        return new Promise((resolve, reject) => {
            const request = store.put(session);
            
            request.onsuccess = () => {
                this.currentSession = session;
                console.log(`✓ Session ${session.sessionId} saved`);
                resolve(session);
            };
            
            request.onerror = () => {
                console.error('Failed to save session');
                reject(request.error);
            };
        });
    }

    /**
     * Get all recoverable sessions
     */
    async getRecoverableSessions() {
        if (!this.db) return [];
        
        const transaction = this.db.transaction(['sessions'], 'readonly');
        const store = transaction.objectStore('sessions');
        const index = store.index('timestamp');
        
        return new Promise((resolve, reject) => {
            const sessions = [];
            const request = index.openCursor(null, 'prev'); // Most recent first
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const session = cursor.value;
                    // Only show sessions from last 7 days
                    const daysOld = (Date.now() - new Date(session.timestamp)) / (1000 * 60 * 60 * 24);
                    if (daysOld < 7) {
                        sessions.push(session);
                    }
                    cursor.continue();
                } else {
                    resolve(sessions);
                }
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Check for and display recoverable sessions
     */
    async checkForRecoverableSessions() {
        const sessions = await this.getRecoverableSessions();
        
        if (sessions.length > 0) {
            this.showRecoveryDialog(sessions);
        }
    }

    /**
     * Show recovery dialog
     */
    showRecoveryDialog(sessions) {
        const modal = document.createElement('div');
        modal.className = 'modal recovery-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔄 Recover Previous Sessions</h3>
                    <button class="close-button" onclick="sessionRecovery.closeRecoveryDialog()">×</button>
                </div>
                <div class="modal-body">
                    <p>Found ${sessions.length} previous session(s). Would you like to recover?</p>
                    <div class="session-list">
                        ${sessions.map(session => `
                            <div class="session-item" data-session-id="${session.sessionId}">
                                <div class="session-info">
                                    <h4>${session.episodeName || 'Unknown Episode'}</h4>
                                    <p class="session-meta">
                                        ${new Date(session.lastUpdated).toLocaleString()}
                                        • Stage: ${session.stage}
                                        • Status: ${session.status}
                                    </p>
                                    <p class="session-progress">
                                        Files: ${session.files.completed}/${session.files.total} completed
                                        ${session.files.failed > 0 ? `(${session.files.failed} failed)` : ''}
                                    </p>
                                </div>
                                <div class="session-actions">
                                    <button class="btn btn-primary" onclick="sessionRecovery.recoverSession('${session.sessionId}')">
                                        Recover
                                    </button>
                                    <button class="btn btn-secondary" onclick="sessionRecovery.viewSessionFiles('${session.sessionId}')">
                                        View Files
                                    </button>
                                    <button class="btn btn-ghost" onclick="sessionRecovery.deleteSession('${session.sessionId}')">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="sessionRecovery.closeRecoveryDialog()">
                        Start Fresh
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Recover a session
     */
    async recoverSession(sessionId) {
        const transaction = this.db.transaction(['sessions'], 'readonly');
        const store = transaction.objectStore('sessions');
        const request = store.get(sessionId);
        
        request.onsuccess = async (event) => {
            const session = event.target.result;
            if (!session) {
                alert('Session not found');
                return;
            }
            
            console.log('Recovering session:', session);
            
            // Restore state
            window.state = {
                currentSessionId: session.sessionId,
                parseResults: session.data.parseResults,
                speakerMapper: {
                    mapping: session.data.speakerMapping
                }
            };
            
            // Close recovery dialog
            this.closeRecoveryDialog();
            
            // Navigate to appropriate stage
            switch (session.stage) {
                case 'download':
                case 'complete':
                    // Go directly to download
                    if (window.fileDownloadManager) {
                        await window.fileDownloadManager.initialize(session.sessionId);
                        await window.fileDownloadManager.showDownloadInterface();
                    } else {
                        this.showQuickDownload(session);
                    }
                    break;
                    
                case 'processing':
                    alert('This episode was being processed. Please check the outputs folder.');
                    this.showQuickDownload(session);
                    break;
                    
                default:
                    alert(`Session recovered at ${session.stage} stage. Please continue from there.`);
            }
        };
    }

    /**
     * Show quick download interface
     */
    showQuickDownload(session) {
        const quickDownload = document.createElement('div');
        quickDownload.className = 'quick-download-panel';
        quickDownload.innerHTML = `
            <div class="panel-content">
                <h3>📁 Quick Access to Files</h3>
                <p><strong>Episode:</strong> ${session.episodeName || 'Unknown'}</p>
                <p><strong>Output Directory:</strong></p>
                <code class="directory-path">${session.episodeDir || `outputs/${session.episodeName}_*`}</code>
                <p class="help-text">
                    Your audio files are saved in the above directory. 
                    You can access them directly from your file system.
                </p>
                <div class="panel-actions">
                    <button class="btn btn-primary" onclick="sessionRecovery.copyPath('${session.episodeDir}')">
                        📋 Copy Path
                    </button>
                    <button class="btn btn-secondary" onclick="sessionRecovery.showFileList('${session.sessionId}')">
                        📄 Show File List
                    </button>
                    <button class="btn btn-ghost" onclick="this.parentElement.parentElement.parentElement.remove()">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(quickDownload);
    }

    /**
     * View session files without full recovery
     */
    async viewSessionFiles(sessionId) {
        try {
            const response = await fetch(`/api/download/files/${sessionId}`);
            const data = await response.json();
            
            if (data.success && data.files) {
                this.showFileListModal(data);
            } else {
                alert('Could not retrieve file list. Check the outputs folder manually.');
            }
        } catch (error) {
            console.error('Failed to get file list:', error);
            alert('Could not retrieve file list. Check the outputs folder manually.');
        }
    }

    /**
     * Show file list modal
     */
    showFileListModal(data) {
        const modal = document.createElement('div');
        modal.className = 'modal file-list-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>📄 Files for ${data.episodeInfo.episodeName}</h3>
                    <button class="close-button" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="file-info-summary">
                        <p><strong>Total Files:</strong> ${data.files.length}</p>
                        <p><strong>Output Directory:</strong></p>
                        <code>${data.episodeInfo.episodeName || 'outputs/...'}</code>
                    </div>
                    <div class="file-quick-list">
                        ${data.files.map(file => `
                            <div class="file-quick-item">
                                <span class="file-name">${file.filename}</span>
                                <span class="file-speaker">${file.speaker}</span>
                                <span class="file-size">${this.formatSize(file.size)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="sessionRecovery.recoverSession('${data.sessionId}')">
                        Recover Full Session
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Delete a session
     */
    async deleteSession(sessionId) {
        if (!confirm('Delete this session from history? (Files will remain in outputs folder)')) {
            return;
        }
        
        const transaction = this.db.transaction(['sessions'], 'readwrite');
        const store = transaction.objectStore('sessions');
        
        store.delete(sessionId).onsuccess = () => {
            // Refresh the dialog
            this.closeRecoveryDialog();
            this.checkForRecoverableSessions();
        };
    }

    /**
     * Start auto-save
     */
    startAutoSave() {
        // Save every 30 seconds if there's an active session
        this.autoSaveInterval = setInterval(() => {
            if (window.state?.currentSessionId) {
                this.saveSession({
                    sessionId: window.state.currentSessionId,
                    stage: this.detectCurrentStage(),
                    episodeName: this.getEpisodeName()
                });
            }
        }, 30000);
    }

    /**
     * Detect current stage based on visible sections
     */
    detectCurrentStage() {
        const activeSection = document.querySelector('.section:not(.hidden)');
        if (!activeSection) return 'unknown';
        
        const sectionMap = {
            'upload-section': 'upload',
            'parse-section': 'parse',
            'mapping-section': 'mapping',
            'cost-section': 'cost',
            'processing-section': 'processing',
            'download-section': 'download'
        };
        
        return sectionMap[activeSection.id] || 'unknown';
    }

    /**
     * Get episode name from parse results or file
     */
    getEpisodeName() {
        return window.state?.parseResults?.episode?.name || 
               window.state?.currentFile?.name ||
               'Unknown Episode';
    }

    /**
     * Utility functions
     */
    closeRecoveryDialog() {
        document.querySelector('.recovery-modal')?.remove();
    }

    copyPath(path) {
        if (path && navigator.clipboard) {
            navigator.clipboard.writeText(path).then(() => {
                alert('Path copied to clipboard!');
            });
        }
    }

    formatSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Manual session save (call this at key points)
     */
    async checkpoint(stage, additionalData = {}) {
        if (!window.state?.currentSessionId) return;
        
        await this.saveSession({
            stage,
            ...additionalData
        });
    }
}

// Initialize session recovery
window.sessionRecovery = new SessionRecovery();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.sessionRecovery.init().catch(console.error);
}); 