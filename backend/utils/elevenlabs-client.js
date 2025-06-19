const axios = require('axios');
const config = require('../config/environment');
const logger = require('./logger');

class ElevenLabsClient {
    constructor() {
        this.apiKey = config.elevenLabs.apiKey;
        this.isConfigured = this.apiKey && this.apiKey !== 'not_configured';
        console.log('ElevenLabs API Key:', this.isConfigured ? 'Set (starts with ' + this.apiKey.substring(0, 5) + '...)' : 'NOT CONFIGURED');
        this.baseURL = 'https://api.elevenlabs.io/v1';
        this.voiceCache = null;
        this.cacheExpiry = null;
        this.cacheDuration = 3600000; // 1 hour cache
    }

    /**
     * Get authorization headers
     */
    getHeaders() {
        return {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Fetch all available voices from ElevenLabs
     */
    async getVoices(forceRefresh = false) {
        if (!this.isConfigured) {
            throw new Error('ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to your .env file');
        }

        // Check cache first
        if (!forceRefresh && this.voiceCache && this.cacheExpiry > Date.now()) {
            logger.debug('Returning cached voices');
            return this.voiceCache;
        }

        try {
            logger.info('Fetching voices from ElevenLabs API');
            
            const response = await axios.get(`${this.baseURL}/voices`, {
                headers: this.getHeaders()
            });

            const voices = response.data.voices.map(voice => ({
                voice_id: voice.voice_id,
                name: voice.name,
                category: voice.category || 'custom',
                labels: voice.labels || {},
                description: voice.description || '',
                preview_url: voice.preview_url,
                settings: voice.settings || {
                    stability: 0.75,
                    similarity_boost: 0.75,
                    style: 0.5,
                    use_speaker_boost: true
                },
                // Add metadata for UI
                gender: voice.labels?.gender || 'unknown',
                age: voice.labels?.age || 'unknown',
                accent: voice.labels?.accent || 'unknown',
                use_case: voice.labels?.use_case || 'general'
            }));

            // Sort voices: premade first, then custom, alphabetically within each
            voices.sort((a, b) => {
                if (a.category !== b.category) {
                    return a.category === 'premade' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });

            // Update cache
            this.voiceCache = voices;
            this.cacheExpiry = Date.now() + this.cacheDuration;
            
            logger.success(`Fetched ${voices.length} voices from ElevenLabs`);
            return voices;
            
        } catch (error) {
            logger.error('Failed to fetch voices:', error.message);
            
            // Return cached voices if available, even if expired
            if (this.voiceCache) {
                logger.warn('Returning expired cache due to API error');
                return this.voiceCache;
            }
            
            throw error;
        }
    }

    /**
     * Get subscription info and usage
     */
    async getSubscriptionInfo() {
        if (!this.isConfigured) {
            throw new Error('ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to your .env file');
        }

        try {
            logger.info('Fetching subscription info from ElevenLabs');
            
            const response = await axios.get(`${this.baseURL}/user/subscription`, {
                headers: this.getHeaders()
            });

            const subscription = response.data;
            
            return {
                tier: subscription.tier,
                character_count: subscription.character_count,
                character_limit: subscription.character_limit,
                can_extend_character_limit: subscription.can_extend_character_limit,
                allowed_to_extend_character_limit: subscription.allowed_to_extend_character_limit,
                next_character_count_reset_unix: subscription.next_character_count_reset_unix,
                voice_limit: subscription.voice_limit,
                available_characters: subscription.character_limit - subscription.character_count,
                usage_percentage: Math.round((subscription.character_count / subscription.character_limit) * 100)
            };
            
        } catch (error) {
            // Handle permission error specifically
            if (error.response?.status === 401 && error.response?.data?.detail?.message?.includes('missing_permissions')) {
                logger.warn('API key lacks user_read permission, using fallback subscription data');
                
                // Return mock data based on environment variable
                return {
                    tier: 'custom',
                    character_count: 0,
                    character_limit: config.elevenLabs.subscriptionQuota,
                    available_characters: config.elevenLabs.subscriptionQuota,
                    usage_percentage: 0,
                    next_character_count_reset_unix: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
                    voice_limit: 100,
                    can_extend_character_limit: true,
                    allowed_to_extend_character_limit: true
                };
            }
            
            logger.error('Failed to fetch subscription info:', error.message);
            
            // Return mock data for development
            if (config.nodeEnv === 'development') {
                return {
                    tier: 'starter',
                    character_count: 234567,
                    character_limit: 1000000,
                    available_characters: 765433,
                    usage_percentage: 23,
                    next_character_count_reset_unix: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
                };
            }
            
            throw error;
        }
    }

    /**
     * Generate voice preview
     */
    async generatePreview(voiceId, text, voiceSettings = null) {
        try {
            logger.info(`Generating preview for voice ${voiceId}`);
            
            const settings = voiceSettings || {
                stability: 0.75,
                similarity_boost: 0.75,
                style: 0.5,
                use_speaker_boost: true
            };
            
            const response = await axios.post(
                `${this.baseURL}/text-to-speech/${voiceId}`,
                {
                    text: text.substring(0, 500), // Limit preview length
                    model_id: config.elevenLabs.model,
                    voice_settings: settings
                },
                {
                    headers: this.getHeaders(),
                    responseType: 'arraybuffer'
                }
            );

            // Convert to base64 for easier transport to frontend
            const audioBase64 = Buffer.from(response.data).toString('base64');
            
            return {
                audio: audioBase64,
                mimeType: 'audio/mpeg',
                characterCount: text.length
            };
            
        } catch (error) {
            logger.error('Failed to generate preview:', error.message);
            throw error;
        }
    }

    /**
     * Text to speech conversion (main processing)
     */
    async textToSpeech(voiceId, text, voiceSettings = null) {
        try {
            const settings = voiceSettings || {
                stability: 0.75,
                similarity_boost: 0.75,
                style: 0.5,
                use_speaker_boost: true
            };
            
            const response = await axios.post(
                `${this.baseURL}/text-to-speech/${voiceId}`,
                {
                    text: text,
                    model_id: config.elevenLabs.model,
                    voice_settings: settings
                },
                {
                    headers: this.getHeaders(),
                    responseType: 'arraybuffer'
                }
            );

            return Buffer.from(response.data);
            
        } catch (error) {
            logger.error('Text-to-speech error:', error.message);
            throw error;
        }
    }

    /**
     * Get voice by ID
     */
    async getVoice(voiceId) {
        const voices = await this.getVoices();
        return voices.find(v => v.voice_id === voiceId);
    }

    /**
     * Validate API key by testing voices endpoint instead of subscription
     */
    async validateApiKey() {
        try {
            // Changed: Test with voices endpoint instead of subscription
            // since the API key lacks "User" permission
            logger.info('Validating API key with voices endpoint');
            
            const response = await axios.get(`${this.baseURL}/voices`, {
                headers: this.getHeaders()
            });
            
            // If we can fetch voices, the API key is valid
            if (response.data && response.data.voices) {
                return { 
                    valid: true, 
                    voiceCount: response.data.voices.length 
                };
            }
            
            return { valid: false, error: 'No voices returned' };
            
        } catch (error) {
            if (error.response?.status === 401) {
                return { valid: false, error: 'Invalid API key' };
            }
            return { valid: false, error: error.message };
        }
    }

    /**
     * Get suggested voices for character types
     */
    getSuggestedVoices(characterType) {
        const suggestions = {
            'dm': ['Daniel', 'Adam', 'Antoni'],
            'male_hero': ['Josh', 'Arnold', 'Sam'],
            'female_hero': ['Rachel', 'Domi', 'Bella'],
            'villain': ['Clyde', 'Dave', 'Patrick'],
            'elder': ['George', 'Thomas', 'Michael'],
            'young': ['Charlotte', 'Emily', 'Ethan'],
            'monster': ['Dave', 'Patrick', 'Clyde']
        };
        
        return suggestions[characterType] || suggestions['male_hero'];
    }
}

module.exports = new ElevenLabsClient(); 