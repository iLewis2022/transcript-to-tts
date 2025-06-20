// Visual Analyzer - LLM Prompt Generator for Image Scourer Module
// frontend/js/visual-analyzer.js

const VISUAL_ANALYSIS_PROMPT = `Analyze this D&D campaign script for visual opportunities - moments that would create stunning images or videos.

For each visual opportunity, provide:
1. Line number/range where it occurs
2. Visual type: CHARACTER_REVEAL, EPIC_MOMENT, ATMOSPHERE, ACTION_SEQUENCE, EMOTIONAL_BEAT, LOCATION_ESTABLISH
3. Impact level: LOW, MEDIUM, HIGH, EPIC
4. Scene description (what's happening)
5. Midjourney prompt (optimized for Midjourney v6 standards)
6. Video potential: YES/NO (would this work well as a short video?)
7. Video rationale (if YES, why it would work as video)

Guidelines for prompts:
- Midjourney: Use style cues, lighting, camera angles, artistic references
- Include aspect ratios that fit the scene (--ar 16:9 for landscapes, --ar 9:16 for portraits)
- Specify quality settings (--q 2 --s 750 for high quality)
- Use weight parameters for important elements
- Include negative prompts where needed

For video candidates:
- Prefer scenes with clear motion or transformation
- Avoid complex multi-character interactions
- Focus on establishing shots, reveals, and atmospheric moments
- Consider technical limitations of current AI video models

Format your response as JSON:
{
  "visualOpportunities": [
    {
      "id": 1,
      "lineRange": "45-47",
      "type": "EPIC_MOMENT",
      "impact": "EPIC",
      "scene": "The ancient dragon emerges from the mountain, wings spreading against the storm",
      "midjourneyPrompt": "Ancient red dragon emerging from misty mountain peak, massive wings spreading, lightning storm background, epic fantasy art, dramatic lighting, cinematic composition, detailed scales, volumetric fog, painted by Greg Rutkowski --ar 16:9 --q 2 --s 750",
      "videoPotential": true,
      "videoRationale": "Clear single subject with dramatic motion - wings spreading and emerging from fog would translate well to video"
    }
  ],
  "summary": {
    "totalOpportunities": 25,
    "videosCandidates": 8,
    "epicMoments": 3,
    "characterReveals": 5,
    "atmosphereShots": 10,
    "actionSequences": 7
  }
}

Script to analyze:
[SCRIPT_CONTENT]`;

// Export the prompt template
window.VISUAL_ANALYSIS_PROMPT = VISUAL_ANALYSIS_PROMPT;

// Additional utility functions for visual analysis
class VisualAnalyzer {
    static generatePrompt(scriptContent) {
        const numberedScript = scriptContent.split('\n')
            .map((line, index) => `${index + 1}: ${line}`)
            .join('\n');
        
        return VISUAL_ANALYSIS_PROMPT.replace('[SCRIPT_CONTENT]', numberedScript);
    }
    
    static validateJsonResponse(responseText) {
        try {
            // Try to extract JSON from the response
            let jsonData;
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No valid JSON found in response');
            }
            
            // Validate structure
            if (!jsonData.visualOpportunities || !Array.isArray(jsonData.visualOpportunities)) {
                throw new Error('Invalid structure: missing visualOpportunities array');
            }
            
            // Validate each opportunity
            for (let i = 0; i < jsonData.visualOpportunities.length; i++) {
                const opp = jsonData.visualOpportunities[i];
                const required = ['id', 'lineRange', 'type', 'impact', 'scene', 'midjourneyPrompt', 'videoPotential'];
                
                for (const field of required) {
                    if (opp[field] === undefined) {
                        throw new Error(`Missing required field '${field}' in opportunity ${i + 1}`);
                    }
                }
                
                // Validate enums
                const validTypes = ['CHARACTER_REVEAL', 'EPIC_MOMENT', 'ATMOSPHERE', 'ACTION_SEQUENCE', 'EMOTIONAL_BEAT', 'LOCATION_ESTABLISH'];
                const validImpacts = ['LOW', 'MEDIUM', 'HIGH', 'EPIC'];
                
                if (!validTypes.includes(opp.type)) {
                    throw new Error(`Invalid type '${opp.type}' in opportunity ${i + 1}`);
                }
                
                if (!validImpacts.includes(opp.impact)) {
                    throw new Error(`Invalid impact '${opp.impact}' in opportunity ${i + 1}`);
                }
                
                if (typeof opp.videoPotential !== 'boolean') {
                    throw new Error(`videoPotential must be boolean in opportunity ${i + 1}`);
                }
                
                // If video potential is true, require rationale
                if (opp.videoPotential && !opp.videoRationale) {
                    throw new Error(`videoRationale required when videoPotential is true in opportunity ${i + 1}`);
                }
            }
            
            return jsonData;
            
        } catch (error) {
            throw new Error(`Failed to parse response: ${error.message}`);
        }
    }
    
    static adaptMidjourneyForVideo(midjourneyPrompt) {
        // Remove Midjourney-specific parameters
        let videoPrompt = midjourneyPrompt
            .replace(/--ar \d+:\d+/g, '')
            .replace(/--q \d+/g, '')
            .replace(/--s \d+/g, '')
            .replace(/--v \d+/g, '')
            .replace(/--style \w+/g, '')
            .replace(/--chaos \d+/g, '')
            .replace(/--weird \d+/g, '')
            .trim();
        
        // Remove negative prompts (--no parameters)
        videoPrompt = videoPrompt.replace(/--no [^-]+/g, '').trim();
        
        // Add video-specific instructions
        videoPrompt += ', smooth camera movement, cinematic motion, high quality, professional lighting';
        
        return videoPrompt;
    }
    
    static categorizeOpportunities(opportunities) {
        const categories = {
            CHARACTER_REVEAL: [],
            EPIC_MOMENT: [],
            ATMOSPHERE: [],
            ACTION_SEQUENCE: [],
            EMOTIONAL_BEAT: [],
            LOCATION_ESTABLISH: []
        };
        
        opportunities.forEach(opp => {
            if (categories[opp.type]) {
                categories[opp.type].push(opp);
            }
        });
        
        return categories;
    }
    
    static getImpactStats(opportunities) {
        const stats = {
            EPIC: 0,
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0
        };
        
        opportunities.forEach(opp => {
            stats[opp.impact]++;
        });
        
        return stats;
    }
    
    static getVideoOpportunities(opportunities) {
        return opportunities.filter(opp => opp.videoPotential);
    }
}

// Export the analyzer class
window.VisualAnalyzer = VisualAnalyzer; 