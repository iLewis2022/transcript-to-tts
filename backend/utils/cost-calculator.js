// Cost Calculator Utility
class CostCalculator {
    constructor() {
        this.overageRate = 0.00003; // $30 per 1M characters
    }

    async getCurrentUsage() {
        // TODO: Implement actual ElevenLabs usage check
        // For now return mock data
        return {
            used: 234567,
            quota: parseInt(process.env.ELEVENLABS_SUBSCRIPTION_QUOTA) || 1000000,
            resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
    }

    calculateCost(characters, currentUsage = null) {
        const usage = currentUsage || { used: 234567, quota: 1000000 };
        const remaining = usage.quota - usage.used;

        let cost = 0;
        let withinQuota = true;
        let overageChars = 0;
        let quotaChars = 0;

        if (characters <= remaining) {
            // Entirely within quota
            quotaChars = characters;
            withinQuota = true;
        } else {
            // Some overage
            quotaChars = remaining;
            overageChars = characters - remaining;
            cost = overageChars * this.overageRate;
            withinQuota = false;
        }

        return {
            total: cost,
            withinQuota,
            characters,
            quotaRemaining: remaining,
            overageChars,
            quotaChars,
            costBreakdown: {
                subscriptionChars: quotaChars,
                overageChars,
                overageCost: cost
            },
            warning: this.getWarningLevel(cost)
        };
    }

    getWarningLevel(cost) {
        if (cost === 0) return 'none';
        if (cost < 25) return 'low';
        if (cost < 100) return 'medium';
        if (cost < 250) return 'high';
        return 'critical';
    }

    getWarningMessage(cost, warningLevel) {
        switch (warningLevel) {
            case 'none':
                return '✅ No additional cost - within subscription quota';
            case 'low':
                return `💰 Low overage cost: $${cost.toFixed(2)}`;
            case 'medium':
                return `⚠️ Moderate overage cost: $${cost.toFixed(2)}`;
            case 'high':
                return `🚨 High overage cost: $${cost.toFixed(2)} - Consider review`;
            case 'critical':
                return `❌ Very high overage cost: $${cost.toFixed(2)} - Strong warning!`;
            default:
                return `Overage cost: $${cost.toFixed(2)}`;
        }
    }

    formatCostSummary(calculation) {
        const { total, characters, quotaRemaining, overageChars, warning } = calculation;
        
        return {
            message: this.getWarningMessage(total, warning),
            details: {
                totalCharacters: characters.toLocaleString(),
                quotaRemaining: quotaRemaining.toLocaleString(),
                cost: `$${total.toFixed(2)}`,
                overageCharacters: overageChars > 0 ? overageChars.toLocaleString() : '0'
            },
            warningLevel: warning
        };
    }

    calculateSpeakerBreakdown(dialogues) {
        const breakdown = {};
        
        dialogues.forEach(dialogue => {
            if (!breakdown[dialogue.speaker]) {
                breakdown[dialogue.speaker] = {
                    count: 0,
                    characters: 0,
                    percentage: 0
                };
            }
            breakdown[dialogue.speaker].count++;
            breakdown[dialogue.speaker].characters += dialogue.characterCount || dialogue.text.length;
        });

        // Calculate percentages
        const totalChars = Object.values(breakdown).reduce((sum, speaker) => sum + speaker.characters, 0);
        Object.keys(breakdown).forEach(speaker => {
            breakdown[speaker].percentage = totalChars > 0 ? 
                Math.round((breakdown[speaker].characters / totalChars) * 100) : 0;
        });

        // Sort by character count (descending)
        const sorted = Object.entries(breakdown)
            .sort(([,a], [,b]) => b.characters - a.characters)
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});

        return sorted;
    }
}

module.exports = CostCalculator; 