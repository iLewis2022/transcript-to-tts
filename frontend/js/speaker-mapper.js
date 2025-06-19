// Speaker Mapper - Handles voice selection and mapping
class SpeakerMapper {
    constructor() {
        this.availableVoices = [];
        this.speakerMapping = {};
        this.previewCache = new Map();
        this.isLoading = false;
    }

    /**
     * Fetch voices from ElevenLabs with retry logic
     */
    async fetchVoices(retryCount = 0) {
        try {
            this.isLoading = true;
            
            // Add a small delay on first attempt to ensure backend is ready
            if (retryCount === 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            const response = await fetch('/api/elevenlabs/voices');
            const data = await response.json();
            
            if (!response.ok) {
                // If it's a 401 on first attempt, retry once
                if (response.status === 401 && retryCount === 0) {
                    console.log('[DEBUG] Got 401 on first attempt, retrying...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return this.fetchVoices(1);
                }
                
                if (response.status === 401) {
                    throw new Error('Invalid API key. Please check your ElevenLabs API key.');
                }
                
                // Use fallback voices if available
                if (data.fallbackVoices) {
                    this.availableVoices = data.fallbackVoices;
                    return this.availableVoices;
                }
                
                throw new Error(data.error || 'Failed to fetch voices');
            }
            
            this.availableVoices = data.voices;
            console.log('[DEBUG] Successfully loaded', this.availableVoices.length, 'voices');
            return this.availableVoices;
            
        } catch (error) {
            // On network error, retry once
            if (retryCount === 0 && !error.message.includes('API key')) {
                console.log('[DEBUG] Network error, retrying...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.fetchVoices(1);
            }
            
            console.error('Failed to fetch voices:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Map speaker to voice with settings - Phase 3.2.1
     */
    mapSpeakerToVoice(speaker, voiceId, settings = {}) {
        const voice = this.availableVoices.find(v => v.voice_id === voiceId);
        
        this.speakerMapping[speaker] = {
            voiceId,
            voiceName: voice?.name || 'Unknown Voice',
            settings: {
                stability: settings.stability || 0.75,
                similarity_boost: settings.similarity_boost || 0.75,
                style: settings.style || 0.5,
                use_speaker_boost: settings.use_speaker_boost !== false
            }
        };
    }

    /**
     * Get speaker mapping
     */
    getSpeakerMapping() {
        return this.speakerMapping;
    }

    /**
     * Validate all speakers are mapped - Phase 3.2.3
     */
    validateMapping(speakers) {
        const unmapped = speakers.filter(speaker => !this.speakerMapping[speaker]);
        const duplicates = this.findDuplicateVoices();
        
        return {
            isValid: unmapped.length === 0,
            unmappedSpeakers: unmapped,
            duplicateVoices: duplicates,
            warnings: this.generateMappingWarnings(speakers)
        };
    }

    /**
     * Find speakers using the same voice
     */
    findDuplicateVoices() {
        const voiceUsage = {};
        
        Object.entries(this.speakerMapping).forEach(([speaker, mapping]) => {
            if (!voiceUsage[mapping.voiceId]) {
                voiceUsage[mapping.voiceId] = [];
            }
            voiceUsage[mapping.voiceId].push(speaker);
        });
        
        return Object.entries(voiceUsage)
            .filter(([voiceId, speakers]) => speakers.length > 1)
            .map(([voiceId, speakers]) => ({
                voiceId,
                voiceName: this.speakerMapping[speakers[0]].voiceName,
                speakers
            }));
    }

    /**
     * Generate mapping warnings
     */
    generateMappingWarnings(speakers) {
        const warnings = [];
        const duplicates = this.findDuplicateVoices();
        
        if (duplicates.length > 0) {
            duplicates.forEach(dup => {
                warnings.push({
                    type: 'duplicate-voice',
                    severity: 'warning',
                    message: `${dup.voiceName} is used for multiple speakers: ${dup.speakers.join(', ')}`
                });
            });
        }
        
        // Check for potential character/voice mismatches
        Object.entries(this.speakerMapping).forEach(([speaker, mapping]) => {
            // Simple heuristic warnings
            if (speaker.toLowerCase().includes('dm') && !mapping.voiceName.toLowerCase().match(/daniel|adam|antoni/)) {
                warnings.push({
                    type: 'character-mismatch',
                    severity: 'info',
                    message: `Consider using a narrator voice for ${speaker}`
                });
            }
        });
        
        return warnings;
    }

    /**
     * Save mapping to localStorage - Phase 3.2.2
     */
    saveMapping() {
        try {
            const mappingData = {
                version: '1.0',
                savedAt: new Date().toISOString(),
                mapping: this.speakerMapping
            };
            
            localStorage.setItem('tts_speaker_mapping', JSON.stringify(mappingData));
            
            // Also save recent mappings history
            this.saveToHistory();
            
            return true;
        } catch (error) {
            console.error('Failed to save mapping:', error);
            return false;
        }
    }

    /**
     * Load mapping from localStorage
     */
    loadMapping() {
        try {
            const saved = localStorage.getItem('tts_speaker_mapping');
            if (saved) {
                const data = JSON.parse(saved);
                this.speakerMapping = data.mapping || data; // Handle old format
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to load mapping:', error);
            return false;
        }
    }

    /**
     * Save to mapping history
     */
    saveToHistory() {
        try {
            const history = this.getMappingHistory();
            const episodeName = window.state?.parseResults?.episodeInfo?.name || 'Unknown Episode';
            
            // Add current mapping to history
            history.unshift({
                id: Date.now(),
                episodeName,
                savedAt: new Date().toISOString(),
                speakerCount: Object.keys(this.speakerMapping).length,
                mapping: this.speakerMapping
            });
            
            // Keep only last 10 mappings
            history.splice(10);
            
            localStorage.setItem('tts_mapping_history', JSON.stringify(history));
        } catch (error) {
            console.error('Failed to save to history:', error);
        }
    }

    /**
     * Get mapping history
     */
    getMappingHistory() {
        try {
            const saved = localStorage.getItem('tts_mapping_history');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Load mapping from history
     */
    loadFromHistory(historyId) {
        const history = this.getMappingHistory();
        const item = history.find(h => h.id === historyId);
        
        if (item) {
            this.speakerMapping = item.mapping;
            return true;
        }
        return false;
    }

    /**
     * Export mapping to JSON
     */
    exportMapping() {
        const data = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            mapping: this.speakerMapping
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `speaker-mapping-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Import mapping from JSON
     */
    async importMapping(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.mapping) {
                this.speakerMapping = data.mapping;
                return true;
            }
            throw new Error('Invalid mapping file format');
        } catch (error) {
            console.error('Failed to import mapping:', error);
            throw error;
        }
    }

    /**
     * Generate voice preview - Phase 3.1.3
     */
    async generatePreview(speaker, voiceId, text, settings) {
        try {
            // Check cache first
            const cacheKey = `${voiceId}-${text.substring(0, 50)}`;
            if (this.previewCache.has(cacheKey)) {
                return this.previewCache.get(cacheKey);
            }
            
            const response = await fetch('/api/elevenlabs/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    voiceId,
                    text,
                    settings
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate preview');
            }
            
            const data = await response.json();
            
            // Cache the preview
            this.previewCache.set(cacheKey, data.preview);
            
            return data.preview;
            
        } catch (error) {
            console.error('Preview generation failed:', error);
            throw error;
        }
    }

    /**
     * Get suggested voice for speaker
     */
    async getSuggestedVoice(speakerName) {
        // Determine character type from name
        let characterType = 'male_hero'; // default
        
        const nameLower = speakerName.toLowerCase();
        if (nameLower.includes('dm') || nameLower.includes('narrator')) {
            characterType = 'dm';
        } else if (nameLower.match(/queen|princess|lady|girl|woman/)) {
            characterType = 'female_hero';
        } else if (nameLower.match(/lord|king|sir|man|boy/)) {
            characterType = 'male_hero';
        } else if (nameLower.match(/elder|old|ancient/)) {
            characterType = 'elder';
        } else if (nameLower.match(/young|child|kid/)) {
            characterType = 'young';
        } else if (nameLower.match(/monster|beast|demon|dragon/)) {
            characterType = 'monster';
        }
        
        try {
            const response = await fetch(`/api/elevenlabs/suggestions/${characterType}`);
            const data = await response.json();
            
            if (data.success && data.suggestions.length > 0) {
                // Find first available suggested voice
                for (const suggestion of data.suggestions) {
                    const voice = this.availableVoices.find(v => 
                        v.name.toLowerCase() === suggestion.toLowerCase()
                    );
                    if (voice) {
                        return voice.voice_id;
                    }
                }
            }
        } catch (error) {
            console.error('Failed to get suggestions:', error);
        }
        
        // Return first available voice as fallback
        return this.availableVoices[0]?.voice_id;
    }

    /**
     * Auto-assign voices to all speakers
     */
    async autoAssignVoices(speakers) {
        const assignments = {};
        const usedVoices = new Set();
        
        for (const speaker of speakers) {
            // Try to get suggested voice
            let voiceId = await this.getSuggestedVoice(speaker);
            
            // If voice already used, find next available
            if (usedVoices.has(voiceId)) {
                voiceId = this.availableVoices.find(v => !usedVoices.has(v.voice_id))?.voice_id;
            }
            
            if (voiceId) {
                this.mapSpeakerToVoice(speaker, voiceId);
                usedVoices.add(voiceId);
                assignments[speaker] = voiceId;
            }
        }
        
        return assignments;
    }
}

// Export for use in app.js
window.SpeakerMapper = SpeakerMapper; 