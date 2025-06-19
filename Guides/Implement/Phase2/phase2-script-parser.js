// Enhanced Script Parser - backend/utils/script-parser.js
const logger = require('./logger');

class ScriptParser {
    constructor() {
        // Enhanced regex patterns for speaker detection
        this.speakerPatterns = [
            {
                pattern: /^\*\*([A-Z][A-Z\s\-\(\)]+?)\*\*\s*:/gm,
                name: 'bold-speaker'
            },
            {
                pattern: /^([A-Z][A-Z\s\-\(\)]+?)\s*:/gm,
                name: 'plain-speaker'
            }
        ];
        
        // Pattern for stage directions (italics)
        this.stageDirectionPattern = /\*([^*]+)\*/g;
        
        // Pattern for common non-dialogue lines
        this.nonDialoguePatterns = [
            /^\s*$/,                    // Empty lines
            /^[-=]+$/,                  // Separator lines
            /^\[.*\]$/,                 // Bracketed notes
            /^\(.*\)$/,                 // Parenthetical notes
            /^Chapter|Episode|Scene/i   // Headers
        ];
    }

    /**
     * Detect all unique speakers in the text
     */
    detectSpeakers(text) {
        const speakers = new Map(); // Use Map to track line counts
        
        // Try each pattern
        this.speakerPatterns.forEach(({ pattern, name }) => {
            pattern.lastIndex = 0; // Reset regex
            const matches = text.matchAll(pattern);
            
            for (const match of matches) {
                const speaker = this.normalizeSpeakerName(match[1]);
                const count = speakers.get(speaker) || 0;
                speakers.set(speaker, count + 1);
            }
        });

        // Convert to array with counts
        const speakerArray = Array.from(speakers.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count); // Sort by frequency

        logger.info(`Detected ${speakerArray.length} unique speakers`);
        return speakerArray;
    }

    /**
     * Normalize speaker names (handle variations)
     */
    normalizeSpeakerName(name) {
        return name
            .trim()
            .replace(/\s+/g, ' ')           // Normalize whitespace
            .replace(/\(.*\)/, '')          // Remove parentheticals
            .toUpperCase();                 // Consistent casing
    }

    /**
     * Extract all dialogues with enhanced parsing
     */
    extractDialogues(text) {
        const dialogues = [];
        const lines = text.split('\n');
        
        let currentSpeaker = null;
        let currentDialogue = [];
        let dialogueIndex = 0;
        let lineNumber = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            lineNumber++;
            
            // Skip non-dialogue lines
            if (this.isNonDialogueLine(line)) {
                continue;
            }

            // Check if this line starts with a speaker
            const speakerMatch = this.detectSpeakerInLine(line);

            if (speakerMatch) {
                // Save previous dialogue if exists
                if (currentSpeaker && currentDialogue.length > 0) {
                    const dialogueText = currentDialogue.join(' ').trim();
                    if (dialogueText) {
                        dialogues.push({
                            index: dialogueIndex++,
                            speaker: currentSpeaker,
                            text: dialogueText,
                            lineStart: lineNumber - currentDialogue.length,
                            lineEnd: lineNumber - 1
                        });
                    }
                }

                // Start new dialogue
                currentSpeaker = this.normalizeSpeakerName(speakerMatch.speaker);
                const remainingText = line.substring(speakerMatch.endIndex).trim();
                currentDialogue = remainingText ? [remainingText] : [];
            } else if (currentSpeaker && line.trim()) {
                // Continue current dialogue
                currentDialogue.push(line.trim());
            }
        }

        // Don't forget the last dialogue
        if (currentSpeaker && currentDialogue.length > 0) {
            const dialogueText = currentDialogue.join(' ').trim();
            if (dialogueText) {
                dialogues.push({
                    index: dialogueIndex++,
                    speaker: currentSpeaker,
                    text: dialogueText,
                    lineStart: lineNumber - currentDialogue.length,
                    lineEnd: lineNumber
                });
            }
        }

        logger.info(`Extracted ${dialogues.length} dialogue entries`);
        return dialogues;
    }

    /**
     * Check if line is non-dialogue
     */
    isNonDialogueLine(line) {
        return this.nonDialoguePatterns.some(pattern => pattern.test(line.trim()));
    }

    /**
     * Detect speaker in a single line
     */
    detectSpeakerInLine(line) {
        for (const { pattern, name } of this.speakerPatterns) {
            pattern.lastIndex = 0; // Reset regex
            const match = pattern.exec(line);
            if (match) {
                return {
                    speaker: match[1],
                    format: name,
                    endIndex: match.index + match[0].length
                };
            }
        }
        return null;
    }

    /**
     * Clean dialogue by removing stage directions
     */
    cleanDialogue(text) {
        const stageDirections = [];
        let cleanedText = text;
        
        // Find and remove all stage directions
        const matches = text.matchAll(this.stageDirectionPattern);
        for (const match of matches) {
            stageDirections.push({
                text: match[1],
                position: match.index
            });
        }
        
        // Remove stage directions from text
        cleanedText = cleanedText.replace(this.stageDirectionPattern, '');
        
        // Clean up extra whitespace
        cleanedText = cleanedText
            .replace(/\s+/g, ' ')           // Multiple spaces to single
            .replace(/\s+([.,!?])/g, '$1')  // Remove space before punctuation
            .trim();
        
        return { 
            cleaned: cleanedText,
            removed: stageDirections,
            removalCount: stageDirections.length
        };
    }

    /**
     * Main parsing function with full statistics
     */
    parseScript(text) {
        logger.info('Starting script parse...');
        const startTime = Date.now();
        
        // Detect speakers
        const speakers = this.detectSpeakers(text);
        
        // Extract raw dialogues
        const rawDialogues = this.extractDialogues(text);
        
        // Clean each dialogue and collect statistics
        const dialogues = [];
        let totalStageDirections = 0;
        let totalCharactersRemoved = 0;
        
        for (const dialogue of rawDialogues) {
            const cleaned = this.cleanDialogue(dialogue.text);
            
            dialogues.push({
                ...dialogue,
                originalText: dialogue.text,
                cleanedText: cleaned.cleaned,
                stageDirections: cleaned.removed,
                characterCount: cleaned.cleaned.length,
                originalCharacterCount: dialogue.text.length
            });
            
            totalStageDirections += cleaned.removalCount;
            totalCharactersRemoved += (dialogue.text.length - cleaned.cleaned.length);
        }

        // Calculate comprehensive statistics
        const stats = this.calculateStatistics(speakers, dialogues, totalStageDirections, totalCharactersRemoved);
        
        const parseTime = Date.now() - startTime;
        logger.success(`Parse completed in ${parseTime}ms`);
        
        return {
            speakers: speakers.map(s => s.name), // Just names for compatibility
            speakersDetailed: speakers,          // Full speaker info with counts
            dialogues,
            stats,
            parseTime
        };
    }

    /**
     * Calculate detailed statistics
     */
    calculateStatistics(speakers, dialogues, totalStageDirections, totalCharactersRemoved) {
        const totalCharacters = dialogues.reduce((sum, d) => sum + d.characterCount, 0);
        
        const stats = {
            totalSpeakers: speakers.length,
            totalDialogues: dialogues.length,
            totalCharacters,
            totalCharactersOriginal: dialogues.reduce((sum, d) => sum + d.originalCharacterCount, 0),
            totalCharactersRemoved,
            averageDialogueLength: dialogues.length > 0 ? 
                Math.round(totalCharacters / dialogues.length) : 0,
            totalStageDirections,
            speakerBreakdown: {}
        };

        // Build detailed speaker breakdown
        speakers.forEach(({ name }) => {
            const speakerDialogues = dialogues.filter(d => d.speaker === name);
            const characterCount = speakerDialogues.reduce((sum, d) => sum + d.characterCount, 0);
            
            stats.speakerBreakdown[name] = {
                dialogueCount: speakerDialogues.length,
                characterCount,
                percentage: totalCharacters > 0 ? 
                    Math.round((characterCount / totalCharacters) * 100) : 0,
                averageLength: speakerDialogues.length > 0 ?
                    Math.round(characterCount / speakerDialogues.length) : 0,
                longestDialogue: Math.max(...speakerDialogues.map(d => d.characterCount), 0),
                shortestDialogue: speakerDialogues.length > 0 ?
                    Math.min(...speakerDialogues.map(d => d.characterCount)) : 0
            };
        });

        return stats;
    }

    /**
     * Generate a preview of parsing results
     */
    generateParsePreview(parseResults, maxDialogues = 5) {
        const { speakers, dialogues, stats } = parseResults;
        
        return {
            summary: {
                speakers: speakers.length,
                dialogues: dialogues.length,
                characters: stats.totalCharacters,
                stageDirections: stats.totalStageDirections
            },
            speakerList: parseResults.speakersDetailed,
            sampleDialogues: dialogues.slice(0, maxDialogues).map(d => ({
                speaker: d.speaker,
                text: d.cleanedText.substring(0, 100) + (d.cleanedText.length > 100 ? '...' : ''),
                removed: d.stageDirections.length
            })),
            warnings: this.generateWarnings(parseResults)
        };
    }

    /**
     * Generate parsing warnings
     */
    generateWarnings(parseResults) {
        const warnings = [];
        const { dialogues, stats } = parseResults;
        
        // Check for very short dialogues
        const veryShort = dialogues.filter(d => d.characterCount < 10);
        if (veryShort.length > 0) {
            warnings.push({
                type: 'short-dialogues',
                message: `Found ${veryShort.length} very short dialogues (< 10 characters)`,
                severity: 'info'
            });
        }
        
        // Check for very long dialogues
        const veryLong = dialogues.filter(d => d.characterCount > 2000);
        if (veryLong.length > 0) {
            warnings.push({
                type: 'long-dialogues',
                message: `Found ${veryLong.length} very long dialogues (> 2000 characters) that may need chunking`,
                severity: 'warning'
            });
        }
        
        // Check for potential speaker variations
        const speakerNames = Object.keys(stats.speakerBreakdown);
        const variations = this.findPotentialVariations(speakerNames);
        if (variations.length > 0) {
            warnings.push({
                type: 'speaker-variations',
                message: `Potential speaker variations detected: ${variations.join(', ')}`,
                severity: 'warning'
            });
        }
        
        return warnings;
    }

    /**
     * Find potential speaker name variations
     */
    findPotentialVariations(speakers) {
        const variations = [];
        
        for (let i = 0; i < speakers.length; i++) {
            for (let j = i + 1; j < speakers.length; j++) {
                const s1 = speakers[i];
                const s2 = speakers[j];
                
                // Check if one contains the other
                if (s1.includes(s2) || s2.includes(s1)) {
                    variations.push(`${s1} / ${s2}`);
                }
                
                // Check for DM variations
                if ((s1.includes('DM') && s2.includes('DM')) && s1 !== s2) {
                    variations.push(`${s1} / ${s2}`);
                }
            }
        }
        
        return variations;
    }
}

module.exports = ScriptParser;