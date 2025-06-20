const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');

// Store current session data
let currentEpisode = null;
let generatedFiles = [];

/**
 * Generate a single sound effect using ElevenLabs API
 */
router.post('/api/sfx/generate', async (req, res) => {
    try {
        const { prompt, duration, filename, context } = req.body;
        
        // Validate inputs
        if (!prompt || !filename) {
            return res.status(400).json({ 
                error: 'Missing required fields: prompt and filename' 
            });
        }
        
        // Check if ElevenLabs API key is configured
        if (!process.env.ELEVENLABS_API_KEY) {
            console.error('ElevenLabs API key not found in environment variables');
            return res.status(500).json({
                error: 'ElevenLabs API key not configured. Please check your .env file.'
            });
        }
        
        // Create episode directory if needed
        if (!currentEpisode) {
            currentEpisode = `episode_sfx_${Date.now()}`;
            const episodeDir = path.join(__dirname, '../../outputs', currentEpisode, 'sfx');
            await fs.mkdir(episodeDir, { recursive: true });
        }
        
        console.log(`Generating SFX: ${filename} - ${context}`);
        console.log(`API Key configured: ${process.env.ELEVENLABS_API_KEY ? 'Yes' : 'No'}`);
        
        // Call ElevenLabs Sound Effects API
        const response = await axios({
            method: 'POST',
            url: 'https://api.elevenlabs.io/v1/text-to-sound-effects/convert',
            headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json'
            },
            data: {
                text: prompt,
                duration_seconds: duration || null,  // Let it auto-determine if not specified
                prompt_influence: 0.3
            },
            responseType: 'stream'
        });
        
        // Save the audio file
        const outputPath = path.join(
            __dirname, 
            '../../outputs', 
            currentEpisode, 
            'sfx', 
            `${filename}.mp3`
        );
        
        // Create write stream
        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);
        
        // Wait for file to be written
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        
        // Track generated file
        generatedFiles.push({
            filename: `${filename}.mp3`,
            prompt,
            context,
            duration,
            path: outputPath
        });
        
        res.json({ 
            success: true, 
            filename: `${filename}.mp3`,
            message: 'Sound effect generated successfully'
        });
        
    } catch (error) {
        console.error('SFX generation error:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        });
        
        // Handle specific ElevenLabs API errors
        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.detail || error.response.statusText;
            
            if (status === 401) {
                return res.status(401).json({ 
                    error: 'Invalid ElevenLabs API key. Please check your API key in the .env file.' 
                });
            } else if (status === 429) {
                return res.status(429).json({ 
                    error: 'Rate limit exceeded. Please wait a moment and try again.' 
                });
            } else if (status === 422) {
                return res.status(422).json({ 
                    error: 'Invalid prompt. Please check your sound effect description.' 
                });
            } else {
                return res.status(status).json({
                    error: `ElevenLabs API error (${status}): ${message}`
                });
            }
        }
        
        // Handle network errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return res.status(500).json({
                error: 'Network error: Unable to connect to ElevenLabs API. Please check your internet connection.'
            });
        }
        
        res.status(500).json({ 
            error: error.message || 'Failed to generate sound effect',
            details: 'Check server console for more information'
        });
    }
});

/**
 * Download all generated SFX as a zip file
 */
router.get('/api/sfx/download', async (req, res) => {
    try {
        if (!currentEpisode || generatedFiles.length === 0) {
            return res.status(404).json({ 
                error: 'No sound effects have been generated yet' 
            });
        }
        
        const zipPath = path.join(
            __dirname, 
            '../../outputs', 
            currentEpisode, 
            `${currentEpisode}_sfx.zip`
        );
        
        // Create zip file
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });
        
        // Pipe archive data to the file
        archive.pipe(output);
        
        // Add all SFX files
        const sfxDir = path.join(__dirname, '../../outputs', currentEpisode, 'sfx');
        archive.directory(sfxDir, 'sfx');
        
        // Add metadata file
        const metadata = {
            episode: currentEpisode,
            generatedAt: new Date().toISOString(),
            totalEffects: generatedFiles.length,
            effects: generatedFiles.map(f => ({
                filename: f.filename,
                context: f.context,
                prompt: f.prompt,
                duration: f.duration
            }))
        };
        
        archive.append(JSON.stringify(metadata, null, 2), { 
            name: 'sfx_metadata.json' 
        });
        
        // Finalize the archive
        await archive.finalize();
        
        // Wait for stream to finish
        await new Promise((resolve) => output.on('close', resolve));
        
        // Send the zip file
        res.download(zipPath, `${currentEpisode}_sfx.zip`, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).json({ error: 'Failed to download file' });
            }
            
            // Clean up zip file after download
            fs.unlink(zipPath).catch(console.error);
        });
        
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ 
            error: 'Failed to create download package' 
        });
    }
});

/**
 * Reset session (for new episode)
 */
router.post('/api/sfx/reset', async (req, res) => {
    currentEpisode = null;
    generatedFiles = [];
    res.json({ success: true, message: 'Session reset' });
});

/**
 * Get generation status
 */
router.get('/api/sfx/status', async (req, res) => {
    res.json({
        hasEpisode: !!currentEpisode,
        episodeName: currentEpisode,
        generatedCount: generatedFiles.length,
        files: generatedFiles.map(f => ({
            filename: f.filename,
            context: f.context
        }))
    });
});

/**
 * Diagnostic endpoint to check SFX system configuration
 */
router.get('/api/sfx/diagnostics', async (req, res) => {
    const diagnostics = {
        timestamp: new Date().toISOString(),
        configuration: {
            elevenlabsApiKey: !!process.env.ELEVENLABS_API_KEY,
            elevenlabsApiKeyLength: process.env.ELEVENLABS_API_KEY ? process.env.ELEVENLABS_API_KEY.length : 0,
            nodeEnv: process.env.NODE_ENV || 'development'
        },
        dependencies: {
            axios: true, // If we get here, axios is working
            archiver: true, // If we get here, archiver is working
            fs: true,
            path: true
        },
        directories: {
            outputsExists: false,
            currentEpisode: currentEpisode
        }
    };

    // Check if outputs directory exists
    try {
        const outputsPath = path.join(__dirname, '../../outputs');
        await fs.access(outputsPath);
        diagnostics.directories.outputsExists = true;
    } catch (error) {
        diagnostics.directories.outputsExists = false;
        diagnostics.directories.outputsError = error.message;
    }

    // Test ElevenLabs API connectivity (test with actual sound effects endpoint)
    if (process.env.ELEVENLABS_API_KEY) {
        try {
            // First test general API access
            const testResponse = await axios({
                method: 'GET',
                url: 'https://api.elevenlabs.io/v1/models',
                headers: {
                    'xi-api-key': process.env.ELEVENLABS_API_KEY
                },
                timeout: 5000
            });
            
            // Test sound effects endpoint with minimal test
            const sfxTestResponse = await axios({
                method: 'POST',
                url: 'https://api.elevenlabs.io/v1/text-to-sound-effects',
                headers: {
                    'xi-api-key': process.env.ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                data: {
                    text: 'test',
                    duration_seconds: 1,
                    prompt_influence: 0.3
                },
                timeout: 10000,
                responseType: 'stream'
            });
            
            diagnostics.elevenlabsConnectivity = {
                status: 'success',
                modelsCount: testResponse.data?.length || 0,
                soundEffectsEndpoint: 'accessible'
            };
        } catch (error) {
            diagnostics.elevenlabsConnectivity = {
                status: 'error',
                error: error.response?.status || error.code,
                message: error.response?.data?.detail || error.message,
                endpoint: error.config?.url || 'unknown'
            };
        }
    } else {
        diagnostics.elevenlabsConnectivity = {
            status: 'no_api_key',
            message: 'ElevenLabs API key not configured'
        };
    }

    res.json(diagnostics);
});

module.exports = router; 