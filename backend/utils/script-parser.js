// Backend Script Parser Utility
class ScriptParser {
    constructor() {
        this.speakerPatterns = [
            /^\*\*([A-Z][A-Z\s]+)\*\*:/gm,  // **SPEAKER**:
            /^([A-Z][A-Z\s]+):/gm            // SPEAKER:
        ];
    }

    detectSpeakers(text) {
        const speakers = new Set();
        
        this.speakerPatterns.forEach(pattern => {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                speakers.add(match[1].trim());
            }
        });

        return Array.from(speakers).sort();
    }

    extractDialogues(text) {
        const dialogues = [];
        const lines = text.split('\n');
        let currentSpeaker = null;
        let currentDialogue = '';
        let dialogueIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check if this line is a speaker
            let speakerMatch = null;
            for (const pattern of this.speakerPatterns) {
                pattern.lastIndex = 0; // Reset regex
                speakerMatch = pattern.exec(line);
                if (speakerMatch) break;
            }

            if (speakerMatch) {
                // Save previous dialogue if exists
                if (currentSpeaker && currentDialogue.trim()) {
                    dialogues.push({
                        index: dialogueIndex++,
                        speaker: currentSpeaker,
                        text: currentDialogue.trim()
                    });
                }

                // Start new dialogue
                currentSpeaker = speakerMatch[1].trim();
                currentDialogue = line.replace(speakerMatch[0], '').trim();
            } else if (currentSpeaker && line) {
                // Continue current dialogue
                if (currentDialogue) currentDialogue += ' ';
                currentDialogue += line;
            }
        }

        // Don't forget the last dialogue
        if (currentSpeaker && currentDialogue.trim()) {
            dialogues.push({
                index: dialogueIndex++,
                speaker: currentSpeaker,
                text: currentDialogue.trim()
            });
        }

        return dialogues;
    }

    cleanDialogue(text) {
        const stageDirections = [];
        const cleaned = text.replace(/\*([^*]+)\*/g, (match, p1) => {
            stageDirections.push(p1);
            return '';
        });
        
        return { 
            cleaned: cleaned.trim().replace(/\s+/g, ' '), 
            removed: stageDirections 
        };
    }

    parseScript(text) {
        const speakers = this.detectSpeakers(text);
        const rawDialogues = this.extractDialogues(text);
        
        // Clean each dialogue
        const dialogues = rawDialogues.map(d => {
            const cleaned = this.cleanDialogue(d.text);
            return {
                ...d,
                originalText: d.text,
                cleanedText: cleaned.cleaned,
                stageDirections: cleaned.removed,
                characterCount: cleaned.cleaned.length
            };
        });

        // Calculate statistics
        const stats = {
            totalSpeakers: speakers.length,
            totalDialogues: dialogues.length,
            totalCharacters: dialogues.reduce((sum, d) => sum + d.characterCount, 0),
            averageDialogueLength: dialogues.length > 0 ? 
                Math.round(dialogues.reduce((sum, d) => sum + d.characterCount, 0) / dialogues.length) : 0,
            speakerBreakdown: {}
        };

        // Speaker statistics
        speakers.forEach(speaker => {
            const speakerDialogues = dialogues.filter(d => d.speaker === speaker);
            stats.speakerBreakdown[speaker] = {
                dialogueCount: speakerDialogues.length,
                characterCount: speakerDialogues.reduce((sum, d) => sum + d.characterCount, 0),
                percentage: stats.totalCharacters > 0 ? 
                    Math.round((speakerDialogues.reduce((sum, d) => sum + d.characterCount, 0) / stats.totalCharacters) * 100) : 0
            };
        });

        return {
            speakers,
            dialogues,
            stats,
            totalStageDirections: dialogues.reduce((sum, d) => sum + d.stageDirections.length, 0)
        };
    }
}

module.exports = ScriptParser; 