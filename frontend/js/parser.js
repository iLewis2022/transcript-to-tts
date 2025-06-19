// Script Parser - Handles dialogue extraction and speaker detection
class ScriptParser {
    constructor() {
        // Regex patterns for speaker detection
        this.speakerPatterns = [
            /^\*\*([A-Z][A-Z\s]+)\*\*:/gm,  // **SPEAKER**:
            /^([A-Z][A-Z\s]+):/gm            // SPEAKER:
        ];
    }

    detectSpeakers(text) {
        const speakers = new Set();
        
        // Try both patterns
        this.speakerPatterns.forEach(pattern => {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                speakers.add(match[1].trim());
            }
        });

        return Array.from(speakers);
    }

    extractDialogues(text) {
        // Will implement dialogue extraction logic
        console.log('Extracting dialogues...');
        return [];
    }

    cleanDialogue(text) {
        // Remove italic stage directions
        const stageDirections = [];
        const cleaned = text.replace(/\*([^*]+)\*/g, (match, p1) => {
            stageDirections.push(p1);
            return '';
        });
        
        return { 
            cleaned: cleaned.trim(), 
            removed: stageDirections 
        };
    }

    parseScript(text) {
        const speakers = this.detectSpeakers(text);
        const dialogues = this.extractDialogues(text);
        
        return {
            speakers,
            dialogues,
            totalCharacters: text.length
        };
    }
} 