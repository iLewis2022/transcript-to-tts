# 🎨 Image Scourer Module Documentation

## Overview
The Image Scourer Module is a powerful tool that analyzes D&D campaign scripts to identify perfect moments for visual content creation. It generates optimized prompts for AI image generation (Midjourney) and AI video generation (Kling) tools.

## Features

### 🎯 Core Functionality
- **Smart Visual Detection**: Automatically identifies epic moments, character reveals, atmospheric scenes, and action sequences
- **Impact Ranking**: Categorizes opportunities by visual impact (LOW, MEDIUM, HIGH, EPIC)
- **Video Intelligence**: Determines which scenes would work well as short videos with technical rationale
- **Optimized Prompts**: Generates Midjourney v6 compatible prompts with proper parameters and style cues

### 📋 Visual Categories
- **CHARACTER_REVEAL**: Important character introductions and reveals
- **EPIC_MOMENT**: Climactic scenes with high visual impact
- **ATMOSPHERE**: Environmental and mood-setting scenes
- **ACTION_SEQUENCE**: Combat and dynamic action scenes
- **EMOTIONAL_BEAT**: Character development and emotional moments
- **LOCATION_ESTABLISH**: Setting and world-building scenes

## User Flow

```
Script → Load from Dialogue Tab → Generate LLM Prompt → 
Copy to Claude/ChatGPT → Paste Analysis → Review/Edit → Export Prompts
```

## Step-by-Step Usage

### 1. Script Loading
1. First, process your D&D script in the **Dialogue Processing** tab
2. Switch to the **Image Scourer** tab
3. Click **"Load from Dialogue Tab"** to import your processed script

### 2. LLM Analysis
1. Copy the generated analysis prompt
2. Paste it into Claude Opus, ChatGPT, or another advanced LLM
3. The LLM will analyze your script and return a JSON response

### 3. Parse Results
1. Copy the complete LLM response
2. Paste it into the **"Paste Analysis"** section
3. Click **"Parse Response"** to extract visual opportunities

### 4. Review Opportunities
- **All Images Tab**: View all visual opportunities with Midjourney prompts
- **Video Candidates Tab**: Focus on scenes suitable for video generation
- Edit prompts directly in the interface if needed
- Each opportunity shows:
  - Line numbers where it occurs
  - Scene description
  - Visual type and impact level
  - Optimized Midjourney prompt
  - Video potential and rationale (if applicable)

### 5. Export Options
- **Export Midjourney Prompts**: Text file with all image prompts
- **Export Kling Prompts**: Video-optimized prompts for video generation
- **Export All Data**: Complete JSON data for advanced users

## LLM Prompt Template

The module generates a comprehensive prompt that includes:

```
Analyze this D&D campaign script for visual opportunities...

For each visual opportunity, provide:
1. Line number/range where it occurs
2. Visual type: CHARACTER_REVEAL, EPIC_MOMENT, ATMOSPHERE, etc.
3. Impact level: LOW, MEDIUM, HIGH, EPIC
4. Scene description (what's happening)
5. Midjourney prompt (optimized for Midjourney v6 standards)
6. Video potential: YES/NO
7. Video rationale (if YES, why it would work as video)

Guidelines for prompts:
- Use style cues, lighting, camera angles
- Include aspect ratios (--ar 16:9 for landscapes)
- Specify quality settings (--q 2 --s 750)
- Consider video limitations for dynamic scenes

Format as JSON with visualOpportunities array...
```

## Example Output

### Image Opportunity
```json
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
```

### Video Adaptation
For video candidates, Midjourney parameters are automatically removed and video-specific instructions are added:

**Original Midjourney Prompt:**
```
Ancient red dragon emerging from misty mountain peak, massive wings spreading, lightning storm background, epic fantasy art, dramatic lighting, cinematic composition, detailed scales, volumetric fog, painted by Greg Rutkowski --ar 16:9 --q 2 --s 750
```

**Adapted for Kling Video:**
```
Ancient red dragon emerging from misty mountain peak, massive wings spreading, lightning storm background, epic fantasy art, dramatic lighting, cinematic composition, detailed scales, volumetric fog, painted by Greg Rutkowski, smooth camera movement, cinematic motion, high quality, professional lighting
```

## Export Formats

### Midjourney Prompts (`.txt`)
```
=== Image 1: The ancient dragon emerges from the mountain ===
Type: EPIC_MOMENT | Impact: EPIC
Lines: 45-47
Prompt:
Ancient red dragon emerging from misty mountain peak...
```

### Kling Video Prompts (`.txt`)
```
=== Video 1: The ancient dragon emerges from the mountain ===
Rationale: Clear single subject with dramatic motion
Prompt:
Ancient red dragon emerging from misty mountain peak, smooth camera movement...
```

### Complete Data (`.json`)
Full structured data including metadata, all opportunities, and analysis results.

## Technical Features

### Smart Prompt Optimization
- **Midjourney v6 Standards**: Includes proper parameters like `--ar`, `--q`, `--s`
- **Style References**: Incorporates artist names and artistic styles
- **Technical Specifications**: Lighting, composition, and camera angles
- **Negative Prompts**: Removes unwanted elements when needed

### Video Intelligence
- **Motion Analysis**: Identifies scenes with clear, filmable motion
- **Technical Limitations**: Considers current AI video model capabilities
- **Single Subject Focus**: Prefers scenes with clear focal points
- **Transformation Scenes**: Favors reveals, emergences, and dramatic changes

### User Experience
- **Live Editing**: Modify prompts directly in the interface
- **Visual Categorization**: Color-coded by type and impact
- **Copy-to-Clipboard**: Quick copying of individual prompts
- **Responsive Design**: Works on desktop and mobile devices

## Best Practices

### For Better Results
1. **Detailed Scripts**: More descriptive scripts yield better visual opportunities
2. **Clear Scene Breaks**: Well-structured scripts with clear scene divisions
3. **Character Descriptions**: Include visual details about characters and locations
4. **Action Clarity**: Describe actions and movements clearly

### LLM Selection
- **Claude Opus**: Excellent for creative analysis and following complex instructions
- **GPT-4/GPT-4 Turbo**: Strong performance with good prompt adherence
- **Gemini Pro**: Good alternative with strong visual understanding

### Midjourney Tips
- Test prompts with different aspect ratios
- Experiment with style parameters
- Use the `--style` parameter for consistent looks
- Combine multiple style references for unique results

## Integration

The Image Scourer Module integrates seamlessly with the existing TTS workflow:

1. **Script Processing**: Uses the same parsed scripts from Dialogue Processing
2. **Session Management**: Leverages existing session and file management
3. **Export System**: Consistent with other module export patterns
4. **UI Design**: Matches the application's existing design language

## Future Enhancements

### Planned Features
- **Storyboard Mode**: Visual timeline of all scenes
- **Style Presets**: Quick application of art styles (anime, realistic, fantasy)
- **Batch Processing**: Generate multiple variations per scene
- **Reference Library**: Save and reuse successful prompts
- **Direct API Integration**: Connect directly to Midjourney/Kling when APIs become available

### Advanced Features
- **Scene Correlation**: Link images to specific dialogue lines
- **Character Consistency**: Maintain character appearance across scenes
- **Location Mapping**: Track and reuse location descriptions
- **Mood Analysis**: Automatic mood and tone detection

## Troubleshooting

### Common Issues
- **"No script loaded"**: Ensure you've processed a script in the Dialogue tab first
- **"Failed to parse response"**: Check that the LLM response contains valid JSON
- **Missing video candidates**: Some scripts may not have suitable video opportunities

### Tips
- Copy the complete LLM response, including any explanatory text
- The parser will extract JSON automatically from longer responses
- If parsing fails, manually clean the JSON response
- Ensure the LLM follows the exact format specified in the prompt

## File Structure

```
frontend/
├── js/
│   ├── image-scourer.js      # Main module controller
│   └── visual-analyzer.js    # LLM prompt generation & parsing
├── index.html                # Added Image Scourer tab & module
└── css/styles.css           # Image Scourer specific styles

backend/
├── routes/
│   └── image-routes.js      # API endpoints (future expansion)
└── server.js               # Route integration
```

This module transforms your D&D campaign scripts into a comprehensive visual production pipeline, making it easy to create stunning artwork and videos that bring your stories to life! 