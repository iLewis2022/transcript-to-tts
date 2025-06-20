// Episode Library System - Permanent history of all processed episodes
// Stores file references, metadata, and allows re-download anytime

class EpisodeLibrary {
    constructor() {
        this.dbName = 'TTSEpisodeLibrary';
        this.dbVersion = 1;
        this.db = null;
        this.initialized = false;
    }

    /**
     * Initialize the library database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.initialized = true;
                console.log('✓ Episode Library initialized');
                
                // Add library button to UI
                this.addLibraryButton();
                
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Episodes store
                if (!db.objectStoreNames.contains('episodes')) {
                    const episodeStore = db.createObjectStore('episodes', { 
                        keyPath: 'episodeId',
                        autoIncrement: true 
                    });
                    episodeStore.createIndex('sessionId', 'sessionId', { unique: true });
                    episodeStore.createIndex('processedDate', 'processedDate', { unique: false });
                    episodeStore.createIndex('episodeName', 'episodeName', { unique: false });
                }
                
                // Files store (references to generated files)
                if (!db.objectStoreNames.contains('audioFiles')) {
                    const fileStore = db.createObjectStore('audioFiles', { 
                        keyPath: 'fileId',
                        autoIncrement: true 
                    });
                    fileStore.createIndex('episodeId', 'episodeId', { unique: false });
                    fileStore.createIndex('speaker', 'speaker', { unique: false });
                }
                
                // Tags/Collections store
                if (!db.objectStoreNames.contains('collections')) {
                    const collectionStore = db.createObjectStore('collections', { 
                        keyPath: 'collectionId',
                        autoIncrement: true 
                    });
                }
            };
        });
    }

    /**
     * Add library button to header
     */
    addLibraryButton() {
        // Check if button already exists
        if (document.getElementById('library-button')) return;
        
        const header = document.querySelector('header');
        if (!header) return;
        
        const libraryBtn = document.createElement('button');
        libraryBtn.id = 'library-button';
        libraryBtn.className = 'library-btn';
        libraryBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                <path d="M12 7h5"/>
                <path d="M12 12h5"/>
                <path d="M12 17h5"/>
            </svg>
            My Episodes
        `;
        libraryBtn.onclick = () => this.showLibrary();
        
        // Insert before any existing menu
        const menu = header.querySelector('.advanced-menu');
        if (menu) {
            header.insertBefore(libraryBtn, menu);
        } else {
            header.appendChild(libraryBtn);
        }
        
        // Update episode count badge
        this.updateLibraryBadge();
    }

    /**
     * Save episode to library after processing completes
     */
    async saveEpisode(episodeData) {
        if (!this.db) await this.init();
        
        const episode = {
            sessionId: episodeData.sessionId,
            episodeName: episodeData.episodeName || 'Untitled Episode',
            episodeNumber: episodeData.episodeNumber,
            processedDate: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
            outputDirectory: episodeData.outputDirectory,
            statistics: {
                totalFiles: episodeData.totalFiles || 0,
                completedFiles: episodeData.completedFiles || 0,
                failedFiles: episodeData.failedFiles || 0,
                totalCharacters: episodeData.totalCharacters || 0,
                processingTime: episodeData.processingTime || 0,
                totalCost: episodeData.totalCost || 0
            },
            speakers: episodeData.speakers || [],
            metadata: episodeData.metadata || {},
            tags: episodeData.tags || [],
            favorite: false,
            notes: ''
        };
        
        const transaction = this.db.transaction(['episodes', 'audioFiles'], 'readwrite');
        const episodeStore = transaction.objectStore('episodes');
        const fileStore = transaction.objectStore('audioFiles');
        
        return new Promise((resolve, reject) => {
            // Save episode
            const episodeRequest = episodeStore.add(episode);
            
            episodeRequest.onsuccess = async (event) => {
                const episodeId = event.target.result;
                episode.episodeId = episodeId;
                
                // Save file references
                if (episodeData.files && episodeData.files.length > 0) {
                    for (const file of episodeData.files) {
                        await this.saveFileReference(episodeId, file);
                    }
                }
                
                console.log(`✓ Episode "${episode.episodeName}" saved to library`);
                this.updateLibraryBadge();
                this.showSaveNotification(episode.episodeName);
                
                resolve(episode);
            };
            
            episodeRequest.onerror = () => reject(episodeRequest.error);
        });
    }

    /**
     * Save file reference
     */
    async saveFileReference(episodeId, fileData) {
        const file = {
            episodeId: episodeId,
            filename: fileData.filename,
            displayName: fileData.displayName,
            speaker: fileData.speaker,
            size: fileData.size,
            duration: fileData.duration,
            characterCount: fileData.characterCount,
            relativePath: fileData.relativePath,
            index: fileData.index
        };
        
        const transaction = this.db.transaction(['audioFiles'], 'readwrite');
        const store = transaction.objectStore('audioFiles');
        
        return new Promise((resolve, reject) => {
            const request = store.add(file);
            request.onsuccess = () => resolve(file);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Show library interface
     */
    async showLibrary() {
        const episodes = await this.getAllEpisodes();
        
        const libraryHTML = `
            <div class="episode-library">
                <div class="library-header">
                    <h2>📚 My Episode Library</h2>
                    <button class="close-library" onclick="episodeLibrary.closeLibrary()">×</button>
                </div>
                
                <div class="library-toolbar">
                    <div class="library-search">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input type="text" placeholder="Search episodes..." 
                               id="library-search" 
                               onkeyup="episodeLibrary.searchEpisodes(this.value)">
                    </div>
                    
                    <div class="library-filters">
                        <select id="library-sort" onchange="episodeLibrary.sortEpisodes(this.value)">
                            <option value="recent">Most Recent</option>
                            <option value="oldest">Oldest First</option>
                            <option value="name">Name (A-Z)</option>
                            <option value="size">Largest First</option>
                        </select>
                        
                        <button class="filter-btn ${this.showFavorites ? 'active' : ''}" 
                                onclick="episodeLibrary.toggleFavorites()">
                            ⭐ Favorites
                        </button>
                    </div>
                    
                    <div class="library-stats">
                        <span>${episodes.length} episodes</span>
                        <span>${this.calculateTotalSize(episodes)}</span>
                    </div>
                </div>
                
                <div class="library-content">
                    ${episodes.length === 0 ? `
                        <div class="empty-library">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                            </svg>
                            <h3>No Episodes Yet</h3>
                            <p>Your processed episodes will appear here</p>
                        </div>
                    ` : `
                        <div class="episode-grid" id="episode-grid">
                            ${episodes.map(episode => this.renderEpisodeCard(episode)).join('')}
                        </div>
                    `}
                </div>
                
                <div class="library-footer">
                    <button class="btn btn-ghost" onclick="episodeLibrary.exportLibrary()">
                        💾 Export Library
                    </button>
                    <button class="btn btn-ghost" onclick="episodeLibrary.clearOldEpisodes()">
                        🗑️ Clear Old Episodes
                    </button>
                    <button class="btn btn-danger" onclick="episodeLibrary.clearAllData()">
                        ⚠️ Clear All Data
                    </button>
                </div>
            </div>
        `;
        
        // Create or update library overlay
        let overlay = document.getElementById('library-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'library-overlay';
            overlay.className = 'library-overlay';
            document.body.appendChild(overlay);
        }
        
        overlay.innerHTML = libraryHTML;
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Render episode card
     */
    renderEpisodeCard(episode) {
        const processedDate = new Date(episode.processedDate);
        const isRecent = (Date.now() - processedDate) < (24 * 60 * 60 * 1000); // Less than 24 hours
        
        return `
            <div class="episode-card ${episode.favorite ? 'favorite' : ''}" data-episode-id="${episode.episodeId}">
                <div class="episode-card-header">
                    <h3>${episode.episodeName}</h3>
                    <button class="favorite-btn" onclick="episodeLibrary.toggleFavorite(${episode.episodeId})">
                        ${episode.favorite ? '⭐' : '☆'}
                    </button>
                </div>
                
                <div class="episode-meta">
                    <span class="episode-date">${this.formatDate(episode.processedDate)}</span>
                    ${isRecent ? '<span class="badge new">New</span>' : ''}
                </div>
                
                <div class="episode-stats">
                    <div class="stat">
                        <span class="stat-icon">🎙️</span>
                        <span class="stat-value">${episode.statistics.completedFiles}</span>
                        <span class="stat-label">files</span>
                    </div>
                    <div class="stat">
                        <span class="stat-icon">👥</span>
                        <span class="stat-value">${episode.speakers.length}</span>
                        <span class="stat-label">speakers</span>
                    </div>
                    <div class="stat">
                        <span class="stat-icon">💰</span>
                        <span class="stat-value">$${(episode.statistics.totalCost || 0).toFixed(2)}</span>
                        <span class="stat-label">cost</span>
                    </div>
                </div>
                
                <div class="episode-speakers">
                    ${episode.speakers.slice(0, 3).map(speaker => 
                        `<span class="speaker-chip">${speaker}</span>`
                    ).join('')}
                    ${episode.speakers.length > 3 ? 
                        `<span class="speaker-chip more">+${episode.speakers.length - 3}</span>` : ''
                    }
                </div>
                
                <div class="episode-actions">
                    <button class="btn btn-primary btn-sm" onclick="episodeLibrary.accessEpisode(${episode.episodeId})">
                        📂 Open
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="episodeLibrary.showEpisodeDetails(${episode.episodeId})">
                        ℹ️ Details
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="episodeLibrary.deleteEpisode(${episode.episodeId})">
                        🗑️
                    </button>
                </div>
                
                ${episode.notes ? `
                    <div class="episode-notes">
                        <p>${episode.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Access episode - load into download interface
     */
    async accessEpisode(episodeId) {
        const episode = await this.getEpisode(episodeId);
        if (!episode) return;
        
        // Update last accessed
        await this.updateEpisodeAccess(episodeId);
        
        // Close library
        this.closeLibrary();
        
        // Load episode into download interface
        if (window.fileDownloadManager) {
            // Set state for download manager
            window.state = window.state || {};
            window.state.currentSessionId = episode.sessionId;
            
            // Initialize and show download interface
            await window.fileDownloadManager.initialize(episode.sessionId);
            await window.fileDownloadManager.showDownloadInterface();
        } else {
            // Fallback: show quick access
            this.showQuickAccess(episode);
        }
    }

    /**
     * Show episode details modal
     */
    async showEpisodeDetails(episodeId) {
        const episode = await this.getEpisode(episodeId);
        const files = await this.getEpisodeFiles(episodeId);
        
        const modal = document.createElement('div');
        modal.className = 'modal episode-details-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>${episode.episodeName}</h3>
                    <button class="close-button" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="details-grid">
                        <div class="detail-section">
                            <h4>📊 Statistics</h4>
                            <dl>
                                <dt>Processed Date</dt>
                                <dd>${new Date(episode.processedDate).toLocaleString()}</dd>
                                
                                <dt>Last Accessed</dt>
                                <dd>${new Date(episode.lastAccessed).toLocaleString()}</dd>
                                
                                <dt>Total Files</dt>
                                <dd>${episode.statistics.completedFiles} / ${episode.statistics.totalFiles}</dd>
                                
                                <dt>Processing Time</dt>
                                <dd>${this.formatDuration(episode.statistics.processingTime)}</dd>
                                
                                <dt>Total Cost</dt>
                                <dd>$${(episode.statistics.totalCost || 0).toFixed(2)}</dd>
                                
                                <dt>Output Directory</dt>
                                <dd><code>${episode.outputDirectory}</code></dd>
                            </dl>
                        </div>
                        
                        <div class="detail-section">
                            <h4>🎭 Speakers (${episode.speakers.length})</h4>
                            <div class="speaker-list-detailed">
                                ${episode.speakers.map(speaker => `
                                    <div class="speaker-item">
                                        <span>${speaker}</span>
                                        <span class="file-count">${files.filter(f => f.speaker === speaker).length} files</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>📝 Notes</h4>
                        <textarea id="episode-notes-${episodeId}" 
                                  placeholder="Add notes about this episode..."
                                  onblur="episodeLibrary.saveNotes(${episodeId}, this.value)">${episode.notes || ''}</textarea>
                    </div>
                    
                    <div class="detail-section">
                        <h4>🏷️ Tags</h4>
                        <div class="tags-container">
                            ${episode.tags.map(tag => `
                                <span class="tag">${tag} 
                                    <button onclick="episodeLibrary.removeTag(${episodeId}, '${tag}')">×</button>
                                </span>
                            `).join('')}
                            <input type="text" placeholder="Add tag..." 
                                   onkeypress="if(event.key==='Enter') episodeLibrary.addTag(${episodeId}, this.value)">
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>📄 Files (${files.length})</h4>
                        <div class="file-list-detailed">
                            ${files.slice(0, 10).map(file => `
                                <div class="file-item-detailed">
                                    <span class="file-index">${file.index}</span>
                                    <span class="file-name">${file.filename}</span>
                                    <span class="file-speaker">${file.speaker}</span>
                                    <span class="file-size">${this.formatSize(file.size)}</span>
                                </div>
                            `).join('')}
                            ${files.length > 10 ? `<p class="more-files">... and ${files.length - 10} more files</p>` : ''}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="episodeLibrary.accessEpisode(${episodeId})">
                        Open Episode
                    </button>
                    <button class="btn btn-secondary" onclick="episodeLibrary.exportEpisode(${episodeId})">
                        Export Data
                    </button>
                    <button class="btn btn-danger" onclick="episodeLibrary.deleteEpisode(${episodeId})">
                        Delete Episode
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Get all episodes
     */
    async getAllEpisodes() {
        if (!this.db) return [];
        
        const transaction = this.db.transaction(['episodes'], 'readonly');
        const store = transaction.objectStore('episodes');
        const index = store.index('processedDate');
        
        return new Promise((resolve, reject) => {
            const episodes = [];
            const request = index.openCursor(null, 'prev'); // Most recent first
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    episodes.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(episodes);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get specific episode
     */
    async getEpisode(episodeId) {
        const transaction = this.db.transaction(['episodes'], 'readonly');
        const store = transaction.objectStore('episodes');
        
        return new Promise((resolve, reject) => {
            const request = store.get(episodeId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get episode files
     */
    async getEpisodeFiles(episodeId) {
        const transaction = this.db.transaction(['audioFiles'], 'readonly');
        const store = transaction.objectStore('audioFiles');
        const index = store.index('episodeId');
        
        return new Promise((resolve, reject) => {
            const files = [];
            const request = index.openCursor(IDBKeyRange.only(episodeId));
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    files.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(files.sort((a, b) => a.index - b.index));
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update episode access time
     */
    async updateEpisodeAccess(episodeId) {
        const episode = await this.getEpisode(episodeId);
        if (!episode) return;
        
        episode.lastAccessed = new Date().toISOString();
        
        const transaction = this.db.transaction(['episodes'], 'readwrite');
        const store = transaction.objectStore('episodes');
        store.put(episode);
    }

    /**
     * Toggle favorite status
     */
    async toggleFavorite(episodeId) {
        const episode = await this.getEpisode(episodeId);
        if (!episode) return;
        
        episode.favorite = !episode.favorite;
        
        const transaction = this.db.transaction(['episodes'], 'readwrite');
        const store = transaction.objectStore('episodes');
        
        store.put(episode).onsuccess = () => {
            // Update UI
            const card = document.querySelector(`[data-episode-id="${episodeId}"]`);
            if (card) {
                card.classList.toggle('favorite');
                const btn = card.querySelector('.favorite-btn');
                if (btn) btn.textContent = episode.favorite ? '⭐' : '☆';
            }
        };
    }

    /**
     * Save notes
     */
    async saveNotes(episodeId, notes) {
        const episode = await this.getEpisode(episodeId);
        if (!episode) return;
        
        episode.notes = notes;
        
        const transaction = this.db.transaction(['episodes'], 'readwrite');
        const store = transaction.objectStore('episodes');
        store.put(episode);
    }

    /**
     * Add tag
     */
    async addTag(episodeId, tag) {
        if (!tag.trim()) return;
        
        const episode = await this.getEpisode(episodeId);
        if (!episode) return;
        
        if (!episode.tags.includes(tag.trim())) {
            episode.tags.push(tag.trim());
            
            const transaction = this.db.transaction(['episodes'], 'readwrite');
            const store = transaction.objectStore('episodes');
            store.put(episode);
            
            // Refresh details modal
            this.showEpisodeDetails(episodeId);
        }
    }

    /**
     * Remove tag
     */
    async removeTag(episodeId, tag) {
        const episode = await this.getEpisode(episodeId);
        if (!episode) return;
        
        episode.tags = episode.tags.filter(t => t !== tag);
        
        const transaction = this.db.transaction(['episodes'], 'readwrite');
        const store = transaction.objectStore('episodes');
        store.put(episode);
        
        // Refresh details modal
        this.showEpisodeDetails(episodeId);
    }

    /**
     * Delete episode
     */
    async deleteEpisode(episodeId) {
        if (!confirm('Delete this episode from library? (Audio files will remain in outputs folder)')) {
            return;
        }
        
        const transaction = this.db.transaction(['episodes', 'audioFiles'], 'readwrite');
        
        // Delete episode
        transaction.objectStore('episodes').delete(episodeId);
        
        // Delete associated files
        const fileStore = transaction.objectStore('audioFiles');
        const fileIndex = fileStore.index('episodeId');
        const request = fileIndex.openCursor(IDBKeyRange.only(episodeId));
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                fileStore.delete(cursor.primaryKey);
                cursor.continue();
            }
        };
        
        transaction.oncomplete = () => {
            this.updateLibraryBadge();
            // Refresh view
            if (document.getElementById('library-overlay').classList.contains('active')) {
                this.showLibrary();
            }
        };
    }

    /**
     * Clear old episodes (older than 30 days)
     */
    async clearOldEpisodes() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        
        const episodes = await this.getAllEpisodes();
        const oldEpisodes = episodes.filter(ep => 
            new Date(ep.processedDate) < cutoffDate && !ep.favorite
        );
        
        if (oldEpisodes.length === 0) {
            alert('No old episodes to clear');
            return;
        }
        
        if (!confirm(`Delete ${oldEpisodes.length} episodes older than 30 days? (Favorites will be kept)`)) {
            return;
        }
        
        for (const episode of oldEpisodes) {
            await this.deleteEpisode(episode.episodeId);
        }
        
        this.showLibrary();
    }

    /**
     * Clear all data
     */
    async clearAllData() {
        if (!confirm('⚠️ This will delete your entire episode library! Are you sure?')) {
            return;
        }
        
        if (!confirm('⚠️ FINAL WARNING: This action cannot be undone. Delete everything?')) {
            return;
        }
        
        const transaction = this.db.transaction(['episodes', 'audioFiles'], 'readwrite');
        transaction.objectStore('episodes').clear();
        transaction.objectStore('audioFiles').clear();
        
        transaction.oncomplete = () => {
            this.updateLibraryBadge();
            this.closeLibrary();
            alert('Library cleared');
        };
    }

    /**
     * Export library data
     */
    async exportLibrary() {
        const episodes = await this.getAllEpisodes();
        const allFiles = [];
        
        for (const episode of episodes) {
            const files = await this.getEpisodeFiles(episode.episodeId);
            allFiles.push({ episode, files });
        }
        
        const exportData = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            episodeCount: episodes.length,
            episodes: allFiles
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tts_library_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Search episodes
     */
    searchEpisodes(query) {
        const cards = document.querySelectorAll('.episode-card');
        const lowerQuery = query.toLowerCase();
        
        cards.forEach(card => {
            const name = card.querySelector('h3').textContent.toLowerCase();
            const speakers = Array.from(card.querySelectorAll('.speaker-chip'))
                .map(chip => chip.textContent.toLowerCase())
                .join(' ');
            
            if (name.includes(lowerQuery) || speakers.includes(lowerQuery)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    /**
     * Update library badge with episode count
     */
    async updateLibraryBadge() {
        const episodes = await this.getAllEpisodes();
        const btn = document.getElementById('library-button');
        
        if (btn && episodes.length > 0) {
            // Remove existing badge
            const existingBadge = btn.querySelector('.badge');
            if (existingBadge) existingBadge.remove();
            
            // Add new badge
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.textContent = episodes.length;
            btn.appendChild(badge);
        }
    }

    /**
     * Utility functions
     */
    closeLibrary() {
        const overlay = document.getElementById('library-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        
        // Less than 24 hours
        if (diff < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(diff / (60 * 60 * 1000));
            if (hours === 0) {
                const mins = Math.floor(diff / (60 * 1000));
                return `${mins} min${mins !== 1 ? 's' : ''} ago`;
            }
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        }
        
        // Less than 7 days
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
            return `${days} day${days !== 1 ? 's' : ''} ago`;
        }
        
        // Default date format
        return date.toLocaleDateString();
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m ${seconds % 60}s`;
    }

    formatSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    calculateTotalSize(episodes) {
        const totalBytes = episodes.reduce((sum, ep) => 
            sum + (ep.statistics.totalSize || 0), 0
        );
        return this.formatSize(totalBytes);
    }

    async openOutputFolder(outputDirectory) {
        // Try to copy path to clipboard
        try {
            await navigator.clipboard.writeText(outputDirectory);
            
            // Show notification with the path
            const notification = document.createElement('div');
            notification.className = 'notification info';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #3b82f6;
                color: white;
                padding: 1rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                max-width: 400px;
                font-size: 0.9rem;
            `;
            notification.innerHTML = `
                <div><strong>📂 Output Folder Path:</strong></div>
                <div style="margin: 0.5rem 0; font-family: monospace; background: rgba(255,255,255,0.2); padding: 0.5rem; border-radius: 4px; word-break: break-all;">
                    ${outputDirectory}
                </div>
                <div style="font-size: 0.8rem; opacity: 0.9;">
                    ✅ Path copied to clipboard! Navigate to this folder in your file explorer.
                </div>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, 5000);
            
        } catch (error) {
            // Fallback: just show the path
            alert(`Output folder location:\n\n${outputDirectory}\n\n(Navigate to this folder in your file explorer)`);
        }
    }

    showSaveNotification(episodeName) {
        const notification = document.createElement('div');
        notification.className = 'notification success library-notification';
        notification.innerHTML = `
            <span>✅ "${episodeName}" saved to library</span>
            <button onclick="episodeLibrary.showLibrary()">View</button>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    /**
     * Quick access panel for episodes without full UI
     */
    showQuickAccess(episode) {
        const panel = document.createElement('div');
        panel.className = 'quick-access-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h3>📂 ${episode.episodeName}</h3>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="panel-body">
                <p><strong>Output Directory:</strong></p>
                <code>${episode.outputDirectory}</code>
                <p class="stats">
                    ${episode.statistics.completedFiles} files • 
                    ${episode.speakers.length} speakers • 
                    $${(episode.statistics.totalCost || 0).toFixed(2)}
                </p>
            </div>
            <div class="panel-footer">
                <button class="btn btn-primary" onclick="episodeLibrary.openOutputFolder('${episode.outputDirectory}')">
                    📂 Open Folder
                </button>
                <button class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()">
                    Close
                </button>
            </div>
        `;
        
        document.body.appendChild(panel);
    }
}

// Initialize episode library
window.episodeLibrary = new EpisodeLibrary();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.episodeLibrary.init().catch(console.error);
}); 