// Cost Display Component - Phase 4
class CostDisplay {
    constructor() {
        this.currentCost = null;
        this.updateInterval = null;
    }

    /**
     * Display comprehensive cost preview - Phase 4.1.3
     */
    displayCostPreview(costData, speakerBreakdown, monthlyProjection) {
        const { cost, suggestions = [] } = costData;
        
        // Ensure warningDetails exists
        if (!cost.warningDetails) {
            cost.warningDetails = this.getWarningDetails(cost.warningLevel || 'none', cost.total || 0);
        }
        
        // Build cost preview HTML
        const html = `
            <!-- Main Cost Card -->
            <div class="cost-preview ${cost.warningLevel}">
                <div class="cost-header">
                    <h3>
                        <span class="cost-icon">${cost.warningDetails.icon}</span>
                        Processing Cost Estimate
                    </h3>
                    ${cost.usage ? this.renderQuotaUsage(cost.usage) : ''}
                </div>
                
                <div class="cost-message">${cost.message}</div>
                
                <div class="cost-details-grid">
                    <div class="cost-detail">
                        <span class="label">Total Characters:</span>
                        <span class="value">${cost.details.totalCharacters}</span>
                    </div>
                    <div class="cost-detail">
                        <span class="label">Within Quota:</span>
                        <span class="value">${parseInt(cost.details.totalCharacters.replace(/,/g, '')) - parseInt(cost.details.overageCharacters.replace(/,/g, ''))}</span>
                    </div>
                    <div class="cost-detail">
                        <span class="label">Overage Characters:</span>
                        <span class="value ${cost.details.overageCharacters !== '0' ? 'overage' : ''}">${cost.details.overageCharacters}</span>
                    </div>
                    <div class="cost-detail">
                        <span class="label">Estimated Cost:</span>
                        <span class="value cost-amount ${cost.warningLevel}">${cost.details.cost}</span>
                    </div>
                </div>
                
                ${cost.warningLevel !== 'none' ? this.renderWarningAlert(cost.warningDetails) : ''}
            </div>
            
            <!-- Character Breakdown by Speaker -->
            <div class="speaker-breakdown">
                <h3>Character Breakdown by Speaker</h3>
                ${this.renderSpeakerBreakdown(speakerBreakdown, cost.details.cost)}
            </div>
            
            <!-- Monthly Projection -->
            ${monthlyProjection ? this.renderMonthlyProjection(monthlyProjection, cost.details) : ''}
            
            <!-- Cost Optimization Suggestions -->
            ${suggestions && suggestions.length > 0 ? this.renderSuggestions(suggestions) : ''}
            
            <!-- Action Buttons -->
            <div class="cost-actions">
                ${this.renderActionButtons(cost.warningLevel, cost.warningDetails)}
            </div>
        `;
        
        return html;
    }

    /**
     * Render quota usage bar - Phase 4.2.3
     */
    renderQuotaUsage(usage) {
        const percentage = usage.percentage || 0;
        const fillClass = percentage > 90 ? 'critical' : percentage > 75 ? 'warning' : 'normal';
        
        return `
            <div class="quota-usage">
                <div class="quota-bar">
                    <div class="quota-fill ${fillClass}" style="width: ${percentage}%"></div>
                    <div class="quota-label">${percentage}% used</div>
                </div>
                <div class="quota-text">
                    ${usage.used.toLocaleString()} / ${usage.quota.toLocaleString()} characters
                    <span class="reset-info">(resets ${this.formatDate(usage.resetDate)})</span>
                </div>
            </div>
        `;
    }

    /**
     * Render warning alert - Phase 4.2.1
     */
    renderWarningAlert(warningDetails) {
        return `
            <div class="warning-alert ${warningDetails.type || ''}">
                <h4>${warningDetails.title}</h4>
                <p>${warningDetails.message}</p>
                ${warningDetails.type === 'strong' ? `
                    <div class="warning-emphasis">
                        ⚠️ Please review carefully before proceeding
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render speaker breakdown table - Phase 4.1.1
     */
    renderSpeakerBreakdown(breakdown, totalCost) {
        const speakers = Object.entries(breakdown.speakers);
        
        return `
            <div class="speaker-cost-table">
                <div class="table-header">
                    <div>Speaker</div>
                    <div>Lines</div>
                    <div>Characters</div>
                    <div>Percentage</div>
                    ${totalCost !== '$0.00' ? '<div>Est. Cost</div>' : ''}
                </div>
                ${speakers.map(([speaker, data]) => `
                    <div class="table-row">
                        <div class="speaker-name">${speaker}</div>
                        <div>${data.count}</div>
                        <div>${data.characters.toLocaleString()}</div>
                        <div class="percentage">
                            <div class="percentage-bar" style="width: ${data.percentage}%"></div>
                            <span>${data.percentage}%</span>
                        </div>
                        ${totalCost !== '$0.00' && data.formattedCost ? 
                            `<div class="speaker-cost">${data.formattedCost}</div>` : ''}
                    </div>
                `).join('')}
                <div class="table-footer">
                    <div>Total</div>
                    <div>${breakdown.speakerCount} speakers</div>
                    <div>${breakdown.totalCharacters.toLocaleString()}</div>
                    <div>100%</div>
                    ${totalCost !== '$0.00' ? `<div class="total-cost">${totalCost}</div>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render monthly projection - Phase 4.2.3
     */
    renderMonthlyProjection(projection, costDetails) {
        const projectionClass = projection.willExceedQuota ? 'warning' : 'normal';
        
        return `
            <div class="monthly-projection ${projectionClass}">
                <h3>Monthly Usage Projection</h3>
                <div class="projection-content">
                    <p>Current daily average: <strong>${projection.currentDailyRate.toLocaleString()}</strong> characters/day</p>
                    <p>Projected month total: <strong>${projection.projectedTotal.toLocaleString()}</strong> characters</p>
                    ${projection.willExceedQuota ? `
                        <div class="projection-warning">
                            <span class="icon">⚠️</span>
                            <span>At this rate, you'll exceed your quota by ${projection.projectedOverage.toLocaleString()} characters</span>
                            <span class="cost">(~$${projection.projectedCost.toFixed(2)} overage)</span>
                        </div>
                    ` : `
                        <div class="projection-ok">
                            <span class="icon">✅</span>
                            <span>You're on track to stay within your monthly quota</span>
                        </div>
                    `}
                    <div class="days-remaining">
                        ${costDetails.daysUntilReset} days until quota reset
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render cost optimization suggestions
     */
    renderSuggestions(suggestions) {
        return `
            <div class="cost-suggestions">
                <h3>💡 Cost Optimization Suggestions</h3>
                <div class="suggestions-list">
                    ${suggestions.map(suggestion => `
                        <div class="suggestion-item">
                            <div class="suggestion-icon">${this.getSuggestionIcon(suggestion.type)}</div>
                            <div class="suggestion-content">
                                <p>${suggestion.message}</p>
                                ${suggestion.potentialSavings ? 
                                    `<span class="savings">Potential savings: ${this.formatCost(suggestion.potentialSavings)}</span>` : ''
                                }
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render action buttons based on cost level - Phase 4.2.2
     */
    renderActionButtons(warningLevel, warningDetails) {
        const actions = warningDetails.actions || [];
        
        let buttons = '<button class="btn btn-primary" onclick="window.costDisplay.proceedWithCost()">Continue to Processing</button>';
        
        if (actions.includes('review')) {
            buttons += '<button class="btn btn-secondary" onclick="window.costDisplay.reviewDetails()">Review Details</button>';
        }
        
        if (actions.includes('split')) {
            buttons += '<button class="btn btn-warning" onclick="window.costDisplay.suggestSplit()">Split Episode</button>';
        }
        
        if (warningLevel === 'critical') {
            // Make primary button warning color for critical costs
            buttons = buttons.replace('btn-primary', 'btn-warning');
        }
        
        buttons += '<button class="btn btn-secondary" onclick="backToMapping()">Back to Voice Mapping</button>';
        
        return buttons;
    }

    /**
     * Start real-time cost updates
     */
    startCostUpdates(sessionId) {
        // Update every 30 seconds
        this.updateInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/process/cost/${sessionId}`);
                const data = await response.json();
                
                if (data.success) {
                    this.updateCostDisplay(data.cost);
                }
            } catch (error) {
                console.error('Cost update error:', error);
            }
        }, 30000);
    }

    /**
     * Stop cost updates
     */
    stopCostUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Update cost display with new data
     */
    updateCostDisplay(costData) {
        // Update cost amount
        document.querySelectorAll('.cost-amount').forEach(el => {
            el.textContent = costData.details.cost;
            el.className = `value cost-amount ${costData.warningLevel}`;
        });
        
        // Update quota usage
        const quotaBar = document.querySelector('.quota-fill');
        if (quotaBar) {
            const percentage = costData.usage.percentage;
            quotaBar.style.width = `${percentage}%`;
            quotaBar.className = `quota-fill ${percentage > 90 ? 'critical' : percentage > 75 ? 'warning' : 'normal'}`;
            document.querySelector('.quota-label').textContent = `${percentage}% used`;
        }
    }

    /**
     * Proceed with cost acknowledgment - Phase 4.2.1
     */
    async proceedWithCost() {
        const sessionId = window.state.currentSessionId;
        const warningLevel = this.currentCost?.warningLevel;
        
        // Show confirmation for high costs
        if (warningLevel === 'high' || warningLevel === 'critical') {
            const costAmount = this.currentCost.details.cost;
            const message = warningLevel === 'critical' ? 
                `This will cost ${costAmount} in overage charges. This is significantly above normal. Are you sure you want to proceed?` :
                `This will cost ${costAmount} in overage charges. Do you want to continue?`;
                
            if (!confirm(message)) {
                return;
            }
        }
        
        try {
            const response = await fetch(`/api/process/cost/${sessionId}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acknowledged: true,
                    splitEpisode: false
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Stop cost updates
                this.stopCostUpdates();
                
                // Proceed to Phase 5
                alert('Cost approved! Ready for Phase 5 - Processing Engine (not yet implemented)');
                
                // TODO: Call proceedToProcessing() when Phase 5 is ready
            }
        } catch (error) {
            console.error('Cost confirmation error:', error);
            alert('Failed to confirm cost. Please try again.');
        }
    }

    /**
     * Review detailed cost breakdown
     */
    reviewDetails() {
        // Show detailed breakdown modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>Detailed Cost Breakdown</h3>
                    <button class="close-button" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <h4>How costs are calculated:</h4>
                    <ul>
                        <li>Subscription includes: ${this.currentCost.usage.quota.toLocaleString()} characters/month</li>
                        <li>You've used: ${this.currentCost.usage.used.toLocaleString()} characters</li>
                        <li>Remaining in quota: ${this.currentCost.usage.remaining.toLocaleString()} characters</li>
                        <li>This episode needs: ${this.currentCost.details.totalCharacters} characters</li>
                        <li>Overage rate: $30 per 1 million characters</li>
                    </ul>
                    
                    <h4>Cost breakdown:</h4>
                    <p>Characters over quota: ${this.currentCost.details.overageCharacters}</p>
                    <p>Cost calculation: ${this.currentCost.details.overageCharacters.replace(/,/g, '')} × $0.00003 = ${this.currentCost.details.cost}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Suggest episode split
     */
    suggestSplit() {
        alert('Episode splitting will be implemented in Phase 7 - Advanced Features');
    }

    /**
     * Helper functions
     */
    formatDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    formatCost(amount) {
        return amount < 0.01 ? '<$0.01' : `$${amount.toFixed(2)}`;
    }

    getSuggestionIcon(type) {
        const icons = {
            'merge-speaker': '🔀',
            'split-dialogues': '✂️',
            'remove-minor': '🗑️'
        };
        return icons[type] || '💡';
    }

    /**
     * Generate warning details based on level and cost
     */
    getWarningDetails(warningLevel, totalCost) {
        const details = {
            none: {
                icon: '✅',
                title: 'Cost Within Budget',
                message: 'This processing will stay within your monthly quota.',
                type: 'info',
                actions: []
            },
            low: {
                icon: '💚',
                title: 'Low Cost Processing',
                message: 'This processing has minimal cost impact.',
                type: 'info',
                actions: []
            },
            medium: {
                icon: '⚠️',
                title: 'Moderate Cost Warning',
                message: 'This processing will incur some overage charges.',
                type: 'warning',
                actions: ['review']
            },
            high: {
                icon: '🔶',
                title: 'High Cost Warning',
                message: 'This processing will result in significant overage charges.',
                type: 'warning',
                actions: ['review', 'split']
            },
            critical: {
                icon: '🚨',
                title: 'Critical Cost Warning',
                message: 'This processing will result in very high overage charges.',
                type: 'strong',
                actions: ['review', 'split', 'cancel']
            }
        };

        return details[warningLevel] || details.none;
    }
}

// Initialize and export
window.costDisplay = new CostDisplay(); 