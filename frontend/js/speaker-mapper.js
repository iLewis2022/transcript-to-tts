// Speaker Mapper - Handles voice selection and mapping
class SpeakerMapper {
    constructor() {
        this.availableVoices = [];
        this.speakerMapping = {};
    }

    async fetchVoices() {
        try {
            const response = await fetch('/api/elevenlabs/voices');
            this.availableVoices = await response.json();
            return this.availableVoices;
        } catch (error) {
            console.error('Failed to fetch voices:', error);
            return [];
        }
    }

    mapSpeakerToVoice(speaker, voiceId, settings = {}) {
        this.speakerMapping[speaker] = {
            voiceId,
            settings: {
                stability: settings.stability || 0.75,
                similarity_boost: settings.similarity_boost || 0.75,
                style: settings.style || 0.5,
                use_speaker_boost: settings.use_speaker_boost || true
            }
        };
    }

    getSpeakerMapping() {
        return this.speakerMapping;
    }

    validateMapping(speakers) {
        const unmapped = speakers.filter(speaker => !this.speakerMapping[speaker]);
        return {
            isValid: unmapped.length === 0,
            unmappedSpeakers: unmapped
        };
    }

    saveMapping() {
        localStorage.setItem('tts_speaker_mapping', JSON.stringify(this.speakerMapping));
    }

    loadMapping() {
        const saved = localStorage.getItem('tts_speaker_mapping');
        if (saved) {
            this.speakerMapping = JSON.parse(saved);
        }
    }
} 