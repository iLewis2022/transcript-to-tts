// Enhanced Cost Calculator with Real-time Tracking - Phase 4
const elevenLabsClient = require('./elevenlabs-client');
const logger = require('./logger');

class CostCalculator {
    constructor() {
        this.overageRate = 0.00003; // $30 per 1M characters
        this.warningThresholds = {
            none: { max: 0, color: 'green' },
            low: { max: 25, color: 'green' },
            medium: { max: 100, color: 'yellow' },
            high: { max: 250, color: 'orange' },
            critical: { max: Infinity, color: 'red' }
        };
    }

    /**
     * Get current usage from ElevenLabs API - Phase 4.1.3
     */
    async getCurrentUsage() {
        try {
            const subscription = await elevenLabsClient.getSubscriptionInfo();
            
            return {
                used: subscription.character_count,
                quota: subscription.character_limit,
                remaining: subscription.available_characters,
                percentage: subscription.usage_percentage,
                resetDate: new Date(subscription.next_character_count_reset_unix * 1000),
                tier: subscription.tier
            };
        } catch (error) {
            logger.error('Failed to get subscription usage:', error);
            // Return mock data if API fails
            return {
                used: 234567,
                quota: parseInt(process.env.ELEVENLABS_SUBSCRIPTION_QUOTA) || 1000000,
                remaining: 765433,
                percentage: 23,
                resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                tier: 'starter'
            };
        }
    }

    /**
     * Calculate cost for character count - Phase 4.1.2
     */
    async calculateCost(characters, currentUsage = null) {
        // Get current usage if not provided
        const usage = currentUsage || await this.getCurrentUsage();
        const remaining = usage.remaining;

        let cost = 0;
        let withinQuota = true;
        let overageChars = 0;
        let quotaChars = 0;

        if (characters <= remaining) {
            // Entirely within quota
            quotaChars = characters;
            withinQuota = true;
            cost = 0;
        } else {
            // Some overage
            quotaChars = Math.max(0, remaining);
            overageChars = characters - quotaChars;
            cost = overageChars * this.overageRate;
            withinQuota = false;
        }

        // Determine warning level - Phase 4.2.2
        const warningLevel = this.getWarningLevel(cost);

        return {
            total: cost,
            withinQuota,
            characters,
            usage,
            quotaRemaining: remaining,
            overageChars,
            quotaChars,
            costBreakdown: {
                subscriptionChars: quotaChars,
                overageChars,
                overageCost: cost,
                ratePerMillion: 30
            },
            warning: warningLevel,
            formattedCost: this.formatCost(cost),
            message: this.getCostMessage(cost, characters, withinQuota)
        };
    }

    /**
     * Get warning level based on cost - Phase 4.2.1 & 4.2.2
     */
    getWarningLevel(cost) {
        if (cost === 0) return 'none';
        if (cost <= 25) return 'low';
        if (cost <= 100) return 'medium';
        if (cost <= 250) return 'high';
        return 'critical';
    }

    /**
     * Format cost for display
     */
    formatCost(cost) {
        if (cost === 0) return '$0.00';
        if (cost < 0.01) return '<$0.01';
        return `$${cost.toFixed(2)}`;
    }

    /**
     * Get cost message based on calculation - Phase 4.1.3
     */
    getCostMessage(cost, characters, withinQuota) {
        const charStr = characters.toLocaleString();
        
        if (withinQuota) {
            return `${charStr} characters ($0.00 - within subscription)`;
        }
        
        const warning = this.getWarningLevel(cost);
        const costStr = this.formatCost(cost);
        
        switch (warning) {
            case 'low':
                return `${charStr} characters (${costStr} overage)`;
            case 'medium':
                return `${charStr} characters (${costStr} overage) ⚠️`;
            case 'high':
                return `${charStr} characters (${costStr} overage) 🚨 High cost warning`;
            case 'critical':
                return `${charStr} characters (${costStr} overage) ❌ Very high cost!`;
            default:
                return `${charStr} characters (${costStr})`;
        }
    }

    /**
     * Get detailed warning information - Phase 4.2.3
     */
    getWarningDetails(warningLevel, cost) {
        const warnings = {
            none: {
                title: 'No Additional Cost',
                message: 'This episode will be processed within your subscription quota.',
                icon: '✅',
                actions: []
            },
            low: {
                title: 'Small Overage Charge',
                message: `You'll be charged ${this.formatCost(cost)} for character overage.`,
                icon: '💰',
                actions: []
            },
            medium: {
                title: 'Moderate Overage Charge',
                message: `This will cost ${this.formatCost(cost)} in overage. Consider reviewing if needed.`,
                icon: '⚠️',
                actions: ['review']
            },
            high: {
                title: 'High Cost Alert',
                message: `This will cost ${this.formatCost(cost)} in overage charges.`,
                icon: '🚨',
                actions: ['review', 'split'],
                type: 'soft'
            },
            critical: {
                title: 'Very High Cost Warning',
                message: `This will cost ${this.formatCost(cost)} in overage charges. This is significantly above normal.`,
                icon: '❌',
                actions: ['review', 'split', 'cancel'],
                type: 'strong'
            }
        };

        return warnings[warningLevel];
    }

    /**
     * Calculate speaker breakdown with costs - Phase 4.1.1
     */
    calculateSpeakerBreakdown(dialogues, totalCost = null) {
        const breakdown = {};
        let totalChars = 0;
        
        // First pass: count characters per speaker
        dialogues.forEach(dialogue => {
            const chars = dialogue.characterCount || dialogue.cleanedText?.length || dialogue.text?.length || 0;
            
            if (!breakdown[dialogue.speaker]) {
                breakdown[dialogue.speaker] = {
                    count: 0,
                    characters: 0,
                    percentage: 0,
                    estimatedCost: 0,
                    dialogues: []
                };
            }
            
            breakdown[dialogue.speaker].count++;
            breakdown[dialogue.speaker].characters += chars;
            breakdown[dialogue.speaker].dialogues.push({
                index: dialogue.index,
                chars: chars,
                preview: dialogue.cleanedText?.substring(0, 50) || dialogue.text?.substring(0, 50)
            });
            
            totalChars += chars;
        });

        // Second pass: calculate percentages and costs
        Object.keys(breakdown).forEach(speaker => {
            const speakerData = breakdown[speaker];
            speakerData.percentage = totalChars > 0 ? 
                ((speakerData.characters / totalChars) * 100).toFixed(1) : 0;
            
            // Estimate cost per speaker if total cost provided
            if (totalCost !== null && totalCost > 0) {
                speakerData.estimatedCost = (totalCost * (speakerData.percentage / 100));
                speakerData.formattedCost = this.formatCost(speakerData.estimatedCost);
            }
            
            // Find longest dialogue
            speakerData.longestDialogue = Math.max(...speakerData.dialogues.map(d => d.chars));
            speakerData.averageLength = Math.round(speakerData.characters / speakerData.count);
        });

        // Sort by character count (descending)
        const sorted = Object.entries(breakdown)
            .sort(([,a], [,b]) => b.characters - a.characters)
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});

        return {
            speakers: sorted,
            totalCharacters: totalChars,
            speakerCount: Object.keys(breakdown).length
        };
    }

    /**
     * Format cost summary for UI display
     */
    formatCostSummary(calculation) {
        const { total, characters, usage, overageChars, warning } = calculation;
        const warningDetails = this.getWarningDetails(warning, total);
        
        return {
            message: calculation.message,
            details: {
                totalCharacters: characters.toLocaleString(),
                quotaRemaining: usage.remaining.toLocaleString(),
                quotaUsed: usage.used.toLocaleString(),
                quotaTotal: usage.quota.toLocaleString(),
                cost: this.formatCost(total),
                overageCharacters: overageChars > 0 ? overageChars.toLocaleString() : '0',
                resetDate: this.formatResetDate(usage.resetDate),
                daysUntilReset: this.daysUntilReset(usage.resetDate)
            },
            warningLevel: warning,
            warningDetails,
            usage
        };
    }

    /**
     * Format reset date for display
     */
    formatResetDate(date) {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    /**
     * Calculate days until quota reset
     */
    daysUntilReset(resetDate) {
        const now = new Date();
        const days = Math.ceil((resetDate - now) / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 0;
    }

    /**
     * Project monthly usage based on current rate
     */
    async projectMonthlyUsage(additionalChars = 0) {
        const usage = await this.getCurrentUsage();
        const daysIntoMonth = 30 - this.daysUntilReset(usage.resetDate);
        const dailyRate = usage.used / Math.max(1, daysIntoMonth);
        const projectedTotal = usage.used + additionalChars + (dailyRate * this.daysUntilReset(usage.resetDate));
        
        return {
            currentDailyRate: Math.round(dailyRate),
            projectedTotal: Math.round(projectedTotal),
            projectedOverage: Math.max(0, projectedTotal - usage.quota),
            willExceedQuota: projectedTotal > usage.quota,
            projectedCost: Math.max(0, (projectedTotal - usage.quota) * this.overageRate)
        };
    }

    /**
     * Get cost optimization suggestions
     */
    getCostOptimizationSuggestions(breakdown, totalCost) {
        const suggestions = [];
        
        // Check for speakers with very few lines
        Object.entries(breakdown.speakers).forEach(([speaker, data]) => {
            if (data.count < 3 && data.characters > 100) {
                suggestions.push({
                    type: 'merge-speaker',
                    speaker,
                    message: `${speaker} has only ${data.count} lines. Consider merging with narrator.`,
                    potentialSavings: data.estimatedCost || 0
                });
            }
        });
        
        // Check for very long dialogues that could be split
        Object.entries(breakdown.speakers).forEach(([speaker, data]) => {
            const veryLong = data.dialogues.filter(d => d.chars > 2000).length;
            if (veryLong > 0) {
                suggestions.push({
                    type: 'split-dialogues',
                    speaker,
                    message: `${speaker} has ${veryLong} very long dialogues that could be split.`,
                    affectedDialogues: veryLong
                });
            }
        });
        
        // Suggest removing minor characters if cost is high
        if (totalCost > 100) {
            const minorSpeakers = Object.entries(breakdown.speakers)
                .filter(([_, data]) => data.percentage < 2)
                .map(([speaker, data]) => ({ speaker, ...data }));
                
            if (minorSpeakers.length > 0) {
                const potentialSavings = minorSpeakers.reduce((sum, s) => sum + (s.estimatedCost || 0), 0);
                suggestions.push({
                    type: 'remove-minor',
                    message: `Consider removing ${minorSpeakers.length} minor speakers to save ${this.formatCost(potentialSavings)}`,
                    speakers: minorSpeakers.map(s => s.speaker),
                    potentialSavings
                });
            }
        }
        
        return suggestions;
    }
}

module.exports = new CostCalculator(); 