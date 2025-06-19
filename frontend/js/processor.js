// TTS Processor - Handles the audio generation process
class TTSProcessor {
    constructor() {
        this.queue = [];
        this.processed = [];
        this.failed = [];
        this.isProcessing = false;
        this.currentIndex = 0;
    }

    addToQueue(speaker, text, index) {
        this.queue.push({
            id: `${String(index).padStart(3, '0')}_${speaker}`,
            speaker,
            text,
            originalIndex: index,
            status: 'pending'
        });
    }

    async startProcessing(speakerMapping) {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        console.log(`Starting TTS processing for ${this.queue.length} items`);
        
        for (let i = 0; i < this.queue.length; i++) {
            if (!this.isProcessing) break; // Allow cancellation
            
            this.currentIndex = i;
            const item = this.queue[i];
            
            try {
                const result = await this.processItem(item, speakerMapping);
                this.processed.push(result);
                this.onProgress(i + 1, this.queue.length, item);
            } catch (error) {
                console.error(`Failed to process ${item.id}:`, error);
                this.failed.push({ ...item, error: error.message });
            }
            
            // Small delay to prevent rate limiting
            await this.delay(100);
        }
        
        this.isProcessing = false;
        this.onComplete();
    }

    async processItem(item, speakerMapping) {
        const mapping = speakerMapping[item.speaker];
        if (!mapping) {
            throw new Error(`No voice mapping found for speaker: ${item.speaker}`);
        }

        const response = await fetch('/api/process/dialogue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: item.text,
                voiceId: mapping.voiceId,
                settings: mapping.settings,
                filename: item.id
            })
        });

        if (!response.ok) {
            throw new Error(`Processing failed: ${response.statusText}`);
        }

        return {
            ...item,
            status: 'completed',
            filename: `${item.id}.mp3`
        };
    }

    stopProcessing() {
        this.isProcessing = false;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    onProgress(completed, total, currentItem) {
        // Override this method to handle progress updates
        console.log(`Progress: ${completed}/${total} - Processing: ${currentItem.id}`);
    }

    onComplete() {
        // Override this method to handle completion
        console.log('Processing complete!');
    }

    getStats() {
        return {
            total: this.queue.length,
            completed: this.processed.length,
            failed: this.failed.length,
            remaining: this.queue.length - this.processed.length - this.failed.length
        };
    }
} 