// TTS Processor - Phase 5 Complete Implementation
const EventEmitter = require('events');
const elevenLabsClient = require('./elevenlabs-client');
const fileManager = require('./file-manager');
const logger = require('./logger');
const path = require('path');

class TTSProcessor extends EventEmitter {
    constructor() {
        super();
        this.queue = [];
        this.processed = [];
        this.failed = [];
        this.isProcessing = false;
        this.isPaused = false;
        this.currentIndex = 0;
        this.startTime = null;
        this.episodeDir = null;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    /**
     * Initialize processing queue - Phase 5.1.1
     */
    async initializeQueue(dialogues, speakerMapping, episodeInfo, sessionId) {
        this.queue = [];
        this.processed = [];
        this.failed = [];
        this.currentIndex = 0;
        this.sessionId = sessionId; // Store session ID
        
        // Create episode directory
        const episodeName = episodeInfo?.name || 'Unknown_Episode';
        const episodeFolder = await fileManager.createEpisodeFolder(episodeName);
        
        if (!episodeFolder.success) {
            throw new Error(`Failed to create episode folder: ${episodeFolder.error}`);
        }
        
        this.episodeDir = episodeFolder.path;
        logger.info(`Episode directory created: ${this.episodeDir}`);
        
        // Build processing queue
        dialogues.forEach((dialogue, index) => {
            const mapping = speakerMapping[dialogue.speaker];
            if (!mapping) {
                logger.warn(`No voice mapping for speaker: ${dialogue.speaker}`);
                return;
            }
            
            // Check if dialogue needs chunking - Phase 5.1.3
            const chunks = this.chunkLongDialogue(dialogue.cleanedText || dialogue.text);
            
            chunks.forEach((chunk, chunkIndex) => {
                const paddedIndex = String(index + 1).padStart(3, '0');
                const suffix = chunks.length > 1 ? String.fromCharCode(97 + chunkIndex) : '';
                
                this.queue.push({
                    id: `${paddedIndex}${suffix}_${dialogue.speaker}`,
                    speaker: dialogue.speaker,
                    text: chunk,
                    originalIndex: index,
                    chunkIndex,
                    totalChunks: chunks.length,
                    voiceId: mapping.voiceId,
                    voiceSettings: mapping.settings,
                    status: 'pending',
                    attempts: 0,
                    characterCount: chunk.length
                });
            });
        });
        
        logger.info(`Processing queue initialized with ${this.queue.length} items`);
        return {
            totalItems: this.queue.length,
            episodeDir: this.episodeDir,
            speakers: Object.keys(speakerMapping)
        };
    }

    /**
     * Smart dialogue chunking - Phase 5.1.3
     */
    chunkLongDialogue(text, maxChars = 1000) {
        if (text.length <= maxChars) return [text];
        
        const chunks = [];
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        let currentChunk = '';
        
        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length <= maxChars) {
                currentChunk += sentence;
            } else {
                if (currentChunk) chunks.push(currentChunk.trim());
                currentChunk = sentence;
            }
        }
        
        if (currentChunk) chunks.push(currentChunk.trim());
        
        // If we still have chunks over maxChars, split at paragraph breaks
        return chunks.flatMap(chunk => {
            if (chunk.length <= maxChars) return chunk;
            
            // Split by paragraphs
            const paragraphs = chunk.split(/\n\n+/);
            const subChunks = [];
            let current = '';
            
            for (const para of paragraphs) {
                if (current.length + para.length <= maxChars) {
                    current += (current ? '\n\n' : '') + para;
                } else {
                    if (current) subChunks.push(current);
                    current = para;
                }
            }
            
            if (current) subChunks.push(current);
            return subChunks;
        });
    }

    /**
     * Start processing the queue - Phase 5.1.2
     */
    async startProcessing() {
        if (this.isProcessing) {
            logger.warn('Processing already in progress');
            return;
        }
        
        this.isProcessing = true;
        this.isPaused = false;
        this.startTime = Date.now();
        
        logger.info('Starting TTS processing...');
        this.emit('processing:start', {
            totalItems: this.queue.length,
            timestamp: new Date().toISOString()
        });
        
        // Process items sequentially to respect rate limits
        for (let i = this.currentIndex; i < this.queue.length; i++) {
            if (!this.isProcessing || this.isPaused) break;
            
            this.currentIndex = i;
            const item = this.queue[i];
            
            try {
                await this.processItem(item);
            } catch (error) {
                logger.error(`Failed to process item ${item.id}:`, error);
                // Error is handled in processItem
            }
            
            // Small delay between requests to avoid rate limiting
            if (i < this.queue.length - 1) {
                await this.delay(100);
            }
        }
        
        this.isProcessing = false;
        this.onProcessingComplete();
    }

    /**
     * Process a single dialogue item - Phase 5.1.2
     */
    async processItem(item) {
        item.status = 'processing';
        const startTime = Date.now();
        
        this.emit('item:start', {
            item,
            queuePosition: this.currentIndex + 1,
            totalItems: this.queue.length
        });
        
        try {
            // Generate audio with retry logic - Phase 5.2.2
            const audio = await this.generateAudioWithRetry(item);
            
            // Save audio file
            const filename = `${item.id}.mp3`;
            const filePath = path.join(this.episodeDir, filename);
            
            await fileManager.saveAudioFile(audio, filename, this.episodeDir);
            
            // Update item status
            item.status = 'completed';
            item.filename = filename;
            item.filePath = filePath;
            item.processingTime = Date.now() - startTime;
            item.audioSize = audio.length;
            
            this.processed.push(item);
            
            // Emit progress update - Phase 5.2.1
            this.emit('item:complete', {
                item,
                progress: {
                    completed: this.processed.length,
                    failed: this.failed.length,
                    remaining: this.queue.length - this.processed.length - this.failed.length,
                    percentage: Math.round((this.processed.length / this.queue.length) * 100)
                }
            });
            
            logger.success(`Processed ${item.id} in ${item.processingTime}ms`);
            
        } catch (error) {
            item.status = 'failed';
            item.error = error.message;
            item.attempts++;
            
            this.failed.push(item);
            
            this.emit('item:error', {
                item,
                error: error.message,
                willRetry: item.attempts < this.retryAttempts
            });
            
            logger.error(`Failed ${item.id} after ${item.attempts} attempts:`, error.message);
        }
    }

    /**
     * Generate audio with retry logic - Phase 5.2.2
     */
    async generateAudioWithRetry(item) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const audio = await elevenLabsClient.textToSpeech(
                    item.voiceId,
                    item.text,
                    item.voiceSettings
                );
                
                return audio;
                
            } catch (error) {
                lastError = error;
                logger.warn(`Attempt ${attempt}/${this.retryAttempts} failed for ${item.id}:`, error.message);
                
                if (attempt < this.retryAttempts) {
                    // Exponential backoff
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    await this.delay(delay);
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Pause processing - Phase 5.2.3
     */
    pauseProcessing() {
        if (!this.isProcessing) return;
        
        this.isPaused = true;
        logger.info('Processing paused');
        
        this.emit('processing:paused', {
            currentIndex: this.currentIndex,
            processed: this.processed.length,
            remaining: this.queue.length - this.currentIndex
        });
    }

    /**
     * Resume processing - Phase 5.2.3
     */
    async resumeProcessing() {
        if (!this.isPaused) return;
        
        logger.info('Resuming processing');
        this.isPaused = false;
        
        this.emit('processing:resumed', {
            currentIndex: this.currentIndex
        });
        
        // Continue from where we left off
        await this.startProcessing();
    }

    /**
     * Cancel processing - Phase 5.2.3
     */
    cancelProcessing() {
        this.isProcessing = false;
        this.isPaused = false;
        
        logger.warn('Processing cancelled by user');
        
        this.emit('processing:cancelled', {
            processed: this.processed.length,
            failed: this.failed.length,
            remaining: this.queue.length - this.currentIndex
        });
    }

    /**
     * Retry failed items - Phase 5.2.2
     */
    async retryFailed() {
        if (this.failed.length === 0) {
            logger.info('No failed items to retry');
            return;
        }
        
        logger.info(`Retrying ${this.failed.length} failed items`);
        
        // Move failed items back to queue
        const itemsToRetry = [...this.failed];
        this.failed = [];
        
        for (const item of itemsToRetry) {
            item.status = 'pending';
            item.attempts = 0;
            await this.processItem(item);
            await this.delay(this.retryDelay);
        }
        
        this.onProcessingComplete();
    }

    /**
     * Handle processing completion
     */
    async onProcessingComplete() {
        const processingTime = Date.now() - this.startTime;
        const stats = this.getStats();
        
        // Save metadata - Phase 6.1.2
        const metadata = {
            sessionId: this.sessionId, // Include session ID for file discovery
            episode: this.episodeDir ? path.basename(this.episodeDir) : 'Unknown',
            processedAt: new Date().toISOString(),
            processingTime: processingTime,
            stats: stats,
            items: {
                processed: this.processed.map(item => ({
                    id: item.id,
                    speaker: item.speaker,
                    filename: item.filename,
                    characterCount: item.characterCount,
                    processingTime: item.processingTime,
                    audioSize: item.audioSize
                })),
                failed: this.failed.map(item => ({
                    id: item.id,
                    speaker: item.speaker,
                    error: item.error,
                    attempts: item.attempts
                }))
            }
        };
        
        if (this.episodeDir) {
            await fileManager.saveMetadata(this.episodeDir, metadata);
        }
        
        logger.success(`Processing complete! ${stats.completed} succeeded, ${stats.failed} failed`);
        
        this.emit('processing:complete', {
            stats,
            processingTime,
            episodeDir: this.episodeDir,
            metadata
        });
    }

    /**
     * Get current processing statistics - Phase 5.2.1
     */
    getStats() {
        const total = this.queue.length;
        const completed = this.processed.length;
        const failed = this.failed.length;
        const remaining = total - completed - failed;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        // Calculate time estimates
        const elapsed = this.startTime ? Date.now() - this.startTime : 0;
        const avgTimePerItem = completed > 0 ? elapsed / completed : 0;
        const estimatedRemaining = avgTimePerItem * remaining;
        
        return {
            total,
            completed,
            failed,
            remaining,
            percentage,
            elapsed,
            estimatedRemaining,
            avgTimePerItem,
            isProcessing: this.isProcessing,
            isPaused: this.isPaused,
            currentItem: this.currentIndex < this.queue.length ? this.queue[this.currentIndex] : null
        };
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.removeAllListeners();
        this.queue = [];
        this.processed = [];
        this.failed = [];
        this.currentIndex = 0;
        this.isProcessing = false;
        this.isPaused = false;
    }
}

module.exports = new TTSProcessor(); 