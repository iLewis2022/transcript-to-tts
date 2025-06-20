// ===== ENHANCED TTS INTEGRATION - PHASE 5 =====
// Full ElevenLabs control with voice preview, advanced settings, and quality controls

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const elevenLabsClient = require('../utils/elevenlabs-client');

/**
 * Get all available ElevenLabs models - GET /api/tts/models
 */
router.get('/models', async (req, res) => {
    try {
        // ElevenLabs available models with details
        const models = [
            {
                model_id: 'eleven_multilingual_v2',
                name: 'Multilingual v2 (Latest)',
                description: 'Latest and highest quality model with multilingual support',
                languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'hi', 'ar', 'zh', 'ja', 'ko'],
                max_characters: 5000,
                recommended: true,
                cost_multiplier: 1.0,
                quality: 'highest'
            },
            {
                model_id: 'eleven_multilingual_v1',
                name: 'Multilingual v1',
                description: 'Stable multilingual model with good quality',
                languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl'],
                max_characters: 5000,
                recommended: false,
                cost_multiplier: 1.0,
                quality: 'high'
            },
            {
                model_id: 'eleven_monolingual_v1',
                name: 'English v1 (Legacy)',
                description: 'Original English-only model - AVOID THIS ONE',
                languages: ['en'],
                max_characters: 5000,
                recommended: false,
                cost_multiplier: 1.0,
                quality: 'medium',
                warning: 'This is the old model that caused your quality issues!'
            },
            {
                model_id: 'eleven_turbo_v2',
                name: 'Turbo v2 (Fast)',
                description: 'Fastest generation with good quality',
                languages: ['en'],
                max_characters: 500,
                recommended: false,
                cost_multiplier: 0.3,
                quality: 'good',
                speed: 'fastest'
            }
        ];

        res.json({
            success: true,
            models,
            default_recommended: 'eleven_multilingual_v2'
        });

    } catch (error) {
        logger.error('Failed to get models:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load models: ' + error.message
        });
    }
});

/**
 * Get available output formats - GET /api/tts/formats
 */
router.get('/formats', async (req, res) => {
    try {
        const formats = [
            {
                format: 'mp3_44100_128',
                name: 'MP3 Standard (44.1kHz, 128kbps)',
                description: 'Good quality, smaller file size',
                file_extension: 'mp3',
                quality: 'standard',
                file_size: 'small'
            },
            {
                format: 'mp3_44100_192',
                name: 'MP3 High Quality (44.1kHz, 192kbps)',
                description: 'Higher quality MP3',
                file_extension: 'mp3',
                quality: 'high',
                file_size: 'medium'
            },
            {
                format: 'pcm_16000',
                name: 'PCM 16kHz (Uncompressed)',
                description: 'Raw audio, smaller bandwidth',
                file_extension: 'wav',
                quality: 'raw',
                file_size: 'large'
            },
            {
                format: 'pcm_22050',
                name: 'PCM 22.05kHz (Uncompressed)',
                description: 'Higher quality raw audio',
                file_extension: 'wav',
                quality: 'raw_hq',
                file_size: 'larger'
            },
            {
                format: 'pcm_44100',
                name: 'PCM 44.1kHz (CD Quality)',
                description: 'Maximum quality, largest files',
                file_extension: 'wav',
                quality: 'maximum',
                file_size: 'largest',
                recommended: true
            }
        ];

        res.json({
            success: true,
            formats,
            default_recommended: 'pcm_44100'
        });

    } catch (error) {
        logger.error('Failed to get formats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load formats: ' + error.message
        });
    }
});

/**
 * Generate voice preview - POST /api/tts/preview
 */
router.post('/preview', async (req, res) => {
    try {
        const { voice_id, text, settings } = req.body;

        if (!voice_id || !text) {
            return res.status(400).json({
                success: false,
                error: 'voice_id and text are required'
            });
        }

        // Limit preview text length
        const previewText = text.substring(0, 200);
        
        // Default to highest quality for preview
        const previewSettings = {
            model_id: settings?.model_id || 'eleven_multilingual_v2',
            output_format: settings?.output_format || 'mp3_44100_128', // Smaller for preview
            stability: settings?.stability ?? 0.5,
            similarity_boost: settings?.similarity_boost ?? 0.8,
            style: settings?.style ?? 0.0,
            use_speaker_boost: settings?.use_speaker_boost ?? true,
            language_code: settings?.language_code
        };

        logger.info(`Generating preview: ${voice_id} with model ${previewSettings.model_id}`);
        
        const result = await elevenLabsClient.generatePreview(voice_id, previewText, previewSettings);
        
        res.json({
            success: true,
            audio_base64: result.audio,
            mime_type: result.mimeType,
            character_count: result.characterCount,
            settings_used: previewSettings,
            preview_text: previewText
        });

    } catch (error) {
        logger.error('Preview generation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Preview failed: ' + error.message
        });
    }
});

/**
 * Generate single dialogue audio - POST /api/tts/generate-single
 */
router.post('/generate-single', async (req, res) => {
    try {
        const { voice_id, text, settings, dialogue_index } = req.body;

        if (!voice_id || !text) {
            return res.status(400).json({
                success: false,
                error: 'voice_id and text are required'
            });
        }

        // Use high quality settings for single generation
        const generationSettings = {
            model_id: settings?.model_id || 'eleven_multilingual_v2',
            output_format: settings?.output_format || 'pcm_44100',
            stability: settings?.stability ?? 0.5,
            similarity_boost: settings?.similarity_boost ?? 0.8,
            style: settings?.style ?? 0.0,
            use_speaker_boost: settings?.use_speaker_boost ?? true,
            language_code: settings?.language_code
        };

        logger.info(`Generating single audio: ${voice_id} with model ${generationSettings.model_id}`);
        
        const audioBuffer = await elevenLabsClient.textToSpeech(voice_id, text, generationSettings);
        const audioBase64 = audioBuffer.toString('base64');
        
        res.json({
            success: true,
            audio_base64: audioBase64,
            character_count: text.length,
            settings_used: generationSettings,
            dialogue_index,
            file_extension: generationSettings.output_format.startsWith('mp3') ? 'mp3' : 'wav'
        });

    } catch (error) {
        logger.error('Single audio generation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Audio generation failed: ' + error.message
        });
    }
});

/**
 * Get voice settings recommendations - GET /api/tts/voice-settings/:voice_id
 */
router.get('/voice-settings/:voice_id', async (req, res) => {
    try {
        const { voice_id } = req.params;
        
        // Get voice details from ElevenLabs
        const voice = await elevenLabsClient.getVoice(voice_id);
        
        if (!voice) {
            return res.status(404).json({
                success: false,
                error: 'Voice not found'
            });
        }

        // Generate recommendations based on voice characteristics
        const recommendations = generateVoiceRecommendations(voice);
        
        res.json({
            success: true,
            voice,
            recommendations,
            current_settings: voice.settings
        });

    } catch (error) {
        logger.error('Failed to get voice settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get voice settings: ' + error.message
        });
    }
});

/**
 * Validate TTS settings - POST /api/tts/validate-settings
 */
router.post('/validate-settings', async (req, res) => {
    try {
        const { model_id, voice_id, settings, total_characters } = req.body;
        
        const validation = {
            valid: true,
            warnings: [],
            errors: [],
            cost_estimate: null,
            character_limit_ok: true
        };

        // Validate model
        if (model_id === 'eleven_monolingual_v1') {
            validation.warnings.push({
                type: 'model_quality',
                message: 'You are using the old v1 model which has lower quality. Consider upgrading to eleven_multilingual_v2.',
                severity: 'high'
            });
        }

        // Validate character limits
        const modelLimits = {
            'eleven_turbo_v2': 500,
            'eleven_multilingual_v2': 5000,
            'eleven_multilingual_v1': 5000,
            'eleven_monolingual_v1': 5000
        };

        const limit = modelLimits[model_id] || 5000;
        if (total_characters > limit) {
            validation.errors.push({
                type: 'character_limit',
                message: `Text length (${total_characters}) exceeds model limit (${limit}) for ${model_id}`,
                severity: 'error'
            });
            validation.valid = false;
            validation.character_limit_ok = false;
        }

        // Validate voice settings
        if (settings) {
            if (settings.stability < 0 || settings.stability > 1) {
                validation.errors.push({
                    type: 'setting_range',
                    message: 'Stability must be between 0 and 1',
                    severity: 'error'
                });
                validation.valid = false;
            }
            
            if (settings.similarity_boost < 0 || settings.similarity_boost > 1) {
                validation.errors.push({
                    type: 'setting_range',
                    message: 'Similarity boost must be between 0 and 1',
                    severity: 'error'
                });
                validation.valid = false;
            }
        }

        // Calculate cost estimate
        const costPerCharacter = 0.00003; // $30 per 1M characters
        validation.cost_estimate = {
            characters: total_characters,
            cost_usd: (total_characters * costPerCharacter).toFixed(4),
            cost_formatted: `$${(total_characters * costPerCharacter).toFixed(4)}`
        };

        res.json({
            success: true,
            validation
        });

    } catch (error) {
        logger.error('Settings validation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Validation failed: ' + error.message
        });
    }
});

/**
 * VERIFICATION: Get current default model and confirm what's actually being used
 * GET /api/tts/verify-current-model
 */
router.get('/verify-current-model', async (req, res) => {
    try {
        const config = require('../config/environment');
        
        const verification = {
            environment_default: config.elevenLabs.model,
            recommended_model: 'eleven_multilingual_v2',
            is_using_recommended: config.elevenLabs.model === 'eleven_multilingual_v2',
            timestamp: new Date().toISOString(),
            warning: config.elevenLabs.model === 'eleven_monolingual_v1' ? 
                     'CRITICAL: Using old v1 model - quality will be poor!' : null
        };

        logger.info(`Model verification: Using ${verification.environment_default}`);
        
        res.json({
            success: true,
            verification
        });

    } catch (error) {
        logger.error('Model verification failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify model: ' + error.message
        });
    }
});

/**
 * VERIFICATION: Test model usage with actual ElevenLabs call
 * POST /api/tts/verify-model-execution
 */
router.post('/verify-model-execution', async (req, res) => {
    try {
        const { voice_id, settings } = req.body;
        
        if (!voice_id) {
            return res.status(400).json({
                success: false,
                error: 'voice_id is required for verification'
            });
        }

        const testText = 'Model verification test.';
        const actualSettings = {
            model_id: settings?.model_id || require('../config/environment').elevenLabs.model,
            output_format: 'mp3_44100_128', // Small format for test
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
        };

        logger.info(`VERIFICATION: Testing actual model execution with ${actualSettings.model_id}`);
        
        const result = await elevenLabsClient.generatePreview(voice_id, testText, actualSettings);
        
        const verification = {
            requested_model: actualSettings.model_id,
            execution_successful: true,
            character_count: result.characterCount,
            timestamp: new Date().toISOString(),
            settings_used: actualSettings,
            is_v2_model: actualSettings.model_id === 'eleven_multilingual_v2',
            warning: actualSettings.model_id === 'eleven_monolingual_v1' ? 
                     'WARNING: Executed with v1 model!' : null
        };

        logger.info(`VERIFICATION RESULT: Model ${actualSettings.model_id} executed successfully`);
        
        res.json({
            success: true,
            verification,
            audio_base64: result.audio // Proof of execution
        });

    } catch (error) {
        logger.error('Model execution verification failed:', error);
        res.status(500).json({
            success: false,
            error: 'Model execution verification failed: ' + error.message,
            verification: {
                execution_successful: false,
                error_details: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

/**
 * VERIFICATION: Track all TTS generations with model info
 * POST /api/tts/track-generation
 */
router.post('/track-generation', async (req, res) => {
    try {
        const { session_id, voice_id, settings, dialogue_count } = req.body;
        
        const tracking = {
            session_id,
            voice_id,
            model_used: settings?.model_id || require('../config/environment').elevenLabs.model,
            output_format: settings?.output_format,
            dialogue_count,
            timestamp: new Date().toISOString(),
            is_recommended_model: (settings?.model_id || require('../config/environment').elevenLabs.model) === 'eleven_multilingual_v2'
        };

        // Log to console for immediate verification
        console.log('🎯 TTS GENERATION TRACKING:', tracking);
        logger.info('TTS Generation Tracked:', tracking);
        
        // In a real app, you'd save this to a database
        // For now, we'll just return the tracking info
        
        res.json({
            success: true,
            tracking
        });

    } catch (error) {
        logger.error('Generation tracking failed:', error);
        res.status(500).json({
            success: false,
            error: 'Generation tracking failed: ' + error.message
        });
    }
});

/**
 * Get voice usage analytics - GET /api/tts/voice-analytics/:voice_id
 */
router.get('/voice-analytics/:voice_id', async (req, res) => {
    try {
        const { voice_id } = req.params;
        
        // This would typically query a database for usage stats
        // For now, return mock analytics data
        const analytics = {
            voice_id,
            total_generations: 0,
            total_characters: 0,
            average_rating: 0,
            most_used_settings: {
                stability: 0.5,
                similarity_boost: 0.8,
                style: 0.0
            },
            recent_usage: []
        };

        res.json({
            success: true,
            analytics
        });

    } catch (error) {
        logger.error('Failed to get voice analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get analytics: ' + error.message
        });
    }
});

/**
 * Helper function to generate voice setting recommendations
 */
function generateVoiceRecommendations(voice) {
    const recommendations = {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true,
        recommended_model: 'eleven_multilingual_v2',
        reasoning: []
    };

    // Analyze voice characteristics for recommendations
    if (voice.category === 'premade') {
        recommendations.reasoning.push('Premade voices work well with moderate stability (0.4-0.6)');
        recommendations.stability = 0.5;
    } else {
        recommendations.reasoning.push('Custom voices may need higher stability (0.6-0.8)');
        recommendations.stability = 0.7;
    }

    // Gender-based recommendations
    if (voice.gender === 'male') {
        recommendations.similarity_boost = 0.75;
        recommendations.reasoning.push('Male voices often benefit from slightly lower similarity boost');
    } else if (voice.gender === 'female') {
        recommendations.similarity_boost = 0.85;
        recommendations.reasoning.push('Female voices often work well with higher similarity boost');
    }

    // Age-based recommendations
    if (voice.age === 'young') {
        recommendations.style = 0.1;
        recommendations.reasoning.push('Young voices can use slight style enhancement');
    } else if (voice.age === 'middle_aged') {
        recommendations.style = 0.0;
        recommendations.reasoning.push('Middle-aged voices work best with neutral style');
    }

    return recommendations;
}

module.exports = router; 