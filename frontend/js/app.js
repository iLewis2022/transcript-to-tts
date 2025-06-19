// Enhanced App.js with Speaker Mapping - frontend/js/app.js
// Global state
window.state = {
    currentFile: null,
    currentFileId: null,
    currentSessionId: null,
    serverOnline: false,
    parseResults: null,
    costEstimate: null,
    speakerMapper: null,
    currentSettingsSpeaker: null
};

// Initialize speaker mapper
state.speakerMapper = new SpeakerMapper();

// Export for file preview component
window.fileUploader = {
    resetUpload: () => resetUpload()
};

// DOM Elements
const elements = {
    uploadZone: document.getElementById('upload-zone'),
    fileInput: document.getElementById('file-input'),
    filePreview: document.getElementById('file-preview'),
    uploadSection: document.getElementById('upload-section'),
    parseSection: document.getElementById('parse-section'),
    costSection: document.getElementById('cost-section'),
    mappingSection: document.getElementById('mapping-section'),
    serverStatus: document.getElementById('server-status'),
    proceedButton: document.getElementById('proceed-parse'),
    uploadDifferentButton: document.getElementById('upload-different')
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkServerStatus();
    setInterval(checkServerStatus, 5000);
});

// Event Listeners
function setupEventListeners() {
    // File input change
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    elements.uploadZone.addEventListener('click', () => elements.fileInput.click());
    elements.uploadZone.addEventListener('dragover', handleDragOver);
    elements.uploadZone.addEventListener('dragleave', handleDragLeave);
    elements.uploadZone.addEventListener('drop', handleDrop);
    
    // Buttons
    elements.proceedButton.addEventListener('click', proceedToParse);
    elements.uploadDifferentButton.addEventListener('click', resetUpload);
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.addEventListener(eventName, preventDefaults, false);
    });
    
    // Voice settings modal - Range inputs
    document.querySelectorAll('#voice-settings-modal input[type="range"]').forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.nextElementSibling.textContent = e.target.value;
        });
    });
}

// Server Status Check
async function checkServerStatus() {
    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            state.serverOnline = true;
            updateServerStatus(true);
        } else {
            state.serverOnline = false;
            updateServerStatus(false);
        }
    } catch (error) {
        state.serverOnline = false;
        updateServerStatus(false);
    }
}

function updateServerStatus(online) {
    const indicator = elements.serverStatus.querySelector('.status-indicator');
    const text = elements.serverStatus.querySelector('.status-text');
    
    if (online) {
        indicator.classList.add('online');
        indicator.classList.remove('offline');
        text.textContent = 'Server Online';
    } else {
        indicator.classList.remove('online');
        indicator.classList.add('offline');
        text.textContent = 'Server Offline';
    }
}

// Drag and Drop Handlers
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDragOver(e) {
    preventDefaults(e);
    elements.uploadZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    preventDefaults(e);
    elements.uploadZone.classList.remove('drag-over');
}

function handleDrop(e) {
    preventDefaults(e);
    elements.uploadZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// File Handling
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

async function handleFile(file) {
    // Validate file type
    const validExtensions = ['.md', '.txt', '.doc', '.docx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
        alert(`Invalid file type. Please upload one of: ${validExtensions.join(', ')}`);
        return;
    }
    
    state.currentFile = file;
    
    // Show loading state
    elements.uploadZone.classList.add('loading');
    
    try {
        // Upload file
        const formData = new FormData();
        formData.append('script', file);
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        const data = await response.json();
        state.currentFileId = data.file.id;
        state.currentSessionId = data.file.id;
        
        // Display file preview
        displayFilePreview(file, data.file);
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload file. Please try again.');
    } finally {
        elements.uploadZone.classList.remove('loading');
    }
}

function displayFilePreview(file, fileInfo) {
    // Hide upload zone
    elements.uploadZone.classList.add('hidden');
    elements.filePreview.classList.remove('hidden');
    
    // Display file info
    document.querySelector('.file-name').textContent = file.name;
    document.querySelector('.file-size').textContent = `Size: ${formatFileSize(file.size)}`;
    document.querySelector('.file-type').textContent = `Type: ${file.type || 'Unknown'}`;
    
    // Get and display preview
    if (fileInfo.textLength) {
        document.querySelector('.file-info').insertAdjacentHTML('beforeend', 
            `<p class="file-chars">Characters: ${fileInfo.textLength.toLocaleString()}</p>`
        );
    }
    
    // Load preview content
    loadFilePreview();
}

async function loadFilePreview() {
    try {
        const response = await fetch(`/api/upload/${state.currentSessionId}/preview`);
        const data = await response.json();
        
        if (data.success) {
            const preview = data.preview + (data.truncated ? '...' : '');
            document.querySelector('.content-preview').textContent = preview;
        }
    } catch (error) {
        console.error('Preview error:', error);
    }
}

// Proceed to Parse
async function proceedToParse() {
    if (!state.currentSessionId) {
        alert('No file uploaded');
        return;
    }
    
    // Show loading state
    elements.proceedButton.disabled = true;
    elements.proceedButton.textContent = 'Parsing...';
    
    try {
        // Call parse endpoint
        const response = await fetch('/api/process/parse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: state.currentSessionId
            })
        });
        
        if (!response.ok) {
            throw new Error('Parse failed');
        }
        
        const data = await response.json();
        
        // Store the complete parse results including cost data
        state.parseResults = {
            ...data,
            cost: data.cost,
            speakerCosts: data.speakerCosts,
            suggestions: data.suggestions,
            monthlyProjection: data.monthlyProjection
        };
        
        console.log('Parse results stored in state:', state.parseResults);
        
        // Display parse results
        displayParseResults(data);
        
    } catch (error) {
        console.error('Parse error:', error);
        alert('Failed to parse script. Please try again.');
    } finally {
        elements.proceedButton.disabled = false;
        elements.proceedButton.textContent = 'Proceed to Parse';
    }
}

// Display Parse Results
function displayParseResults(results) {
    // Hide upload section, show parse section
    elements.uploadSection.classList.remove('active');
    elements.parseSection.classList.add('active');
    elements.parseSection.classList.remove('hidden');
    
    // Build parse results HTML
    const parseHTML = `
        <div class="parse-preview">
            <div class="parse-summary">
                <h3>Parse Summary</h3>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="label">Speakers:</span>
                        <span class="value">${results.preview.summary.speakers}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Dialogues:</span>
                        <span class="value">${results.preview.summary.dialogues}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Total Characters:</span>
                        <span class="value">${results.preview.summary.characters.toLocaleString()}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Stage Directions:</span>
                        <span class="value">${results.preview.summary.stageDirections}</span>
                    </div>
                </div>
            </div>
            
            <div class="speaker-list">
                <h3>Detected ${results.preview.speakerList.length} Speakers</h3>
                <div class="speakers">
                    ${results.preview.speakerList.map(speaker => `
                        <div class="speaker-item">
                            <span class="speaker-name">${speaker.name}</span>
                            <span class="speaker-count">${speaker.count} lines</span>
                            <span class="speaker-chars">${results.stats.speakerBreakdown[speaker.name].characterCount.toLocaleString()} chars</span>
                            <span class="speaker-percent">${results.stats.speakerBreakdown[speaker.name].percentage}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="cost-preview ${results.cost.warningLevel}">
                <h3>Cost Estimate</h3>
                <div class="cost-message">${results.cost.message}</div>
                <div class="cost-details">
                    <p>Total Characters: ${results.cost.details.totalCharacters}</p>
                    <p>Quota Remaining: ${results.cost.details.quotaRemaining}</p>
                    ${results.cost.details.overageCharacters !== '0' ? 
                        `<p>Overage Characters: ${results.cost.details.overageCharacters}</p>` : ''}
                </div>
            </div>
            
            ${results.preview.warnings && results.preview.warnings.length > 0 ? `
                <div class="parse-warnings">
                    <h3>Warnings</h3>
                    ${results.preview.warnings.map(warning => `
                        <div class="warning-item ${warning.severity}">
                            <span class="warning-icon">⚠️</span>
                            ${warning.message}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="removed-content-section">
                <h3>Stage Directions Found: ${results.preview.summary.stageDirections}</h3>
                <button class="btn btn-secondary" onclick="toggleRemovedContent()">
                    <span class="toggle-icon">▶</span> Show Removed Content
                </button>
                <div id="removed-content" class="removed-content hidden"></div>
            </div>
            
            <div class="parse-actions">
                <button class="btn btn-primary" onclick="confirmParse()">Confirm Parse & Continue</button>
                <button class="btn btn-secondary" onclick="adjustSettings()">Adjust Settings</button>
                <button class="btn btn-secondary" onclick="startOver()">Start Over</button>
            </div>
        </div>
    `;
    
    document.getElementById('parse-results').innerHTML = parseHTML;
}

// Toggle Removed Content
async function toggleRemovedContent() {
    const contentDiv = document.getElementById('removed-content');
    const button = event.target.closest('button');
    const icon = button.querySelector('.toggle-icon');
    
    if (contentDiv.classList.contains('hidden')) {
        // Load removed content if not already loaded
        if (!contentDiv.dataset.loaded) {
            try {
                const response = await fetch(`/api/process/parse/${state.currentSessionId}/removed`);
                const data = await response.json();
                
                if (data.success) {
                    displayRemovedContent(data);
                    contentDiv.dataset.loaded = 'true';
                }
            } catch (error) {
                console.error('Failed to load removed content:', error);
            }
        }
        
        contentDiv.classList.remove('hidden');
        icon.textContent = '▼';
        button.innerHTML = '<span class="toggle-icon">▼</span> Hide Removed Content';
    } else {
        contentDiv.classList.add('hidden');
        icon.textContent = '▶';
        button.innerHTML = '<span class="toggle-icon">▶</span> Show Removed Content';
    }
}

function displayRemovedContent(data) {
    const contentDiv = document.getElementById('removed-content');
    
    const html = `
        <div class="removed-summary">
            <p>Total removed: ${data.totalRemoved} stage directions (${data.charactersRemoved} characters)</p>
        </div>
        <div class="removed-list">
            ${data.removedContent.map(item => `
                <div class="removed-item">
                    <div class="removed-header">
                        <span class="speaker">${item.speaker}</span>
                        <span class="dialogue-index">Dialogue #${item.dialogueIndex + 1}</span>
                    </div>
                    <div class="removed-directions">
                        ${item.removed.map(dir => `
                            <span class="stage-direction">*${dir.text}*</span>
                        `).join(' ')}
                    </div>
                    <div class="removed-context">
                        Context: "${item.context}"
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    contentDiv.innerHTML = html;
}

// Parse Actions
async function confirmParse() {
    // Validate parse first
    try {
        const response = await fetch(`/api/process/parse/${state.currentSessionId}/validate`, {
            method: 'POST'
        });
        
        const validation = await response.json();
        
        if (!validation.ready) {
            const issues = validation.validation.issues.map(i => i.message).join('\n');
            if (!confirm(`Parse validation found issues:\n${issues}\n\nContinue anyway?`)) {
                return;
            }
        }
        
        // Proceed to Phase 4 - Cost Analysis
        proceedToCostAnalysis();
        
    } catch (error) {
        console.error('Validation error:', error);
        alert('Failed to validate parse results.');
    }
}

// Phase 4 - Comprehensive Cost Analysis Functions
async function proceedToCostAnalysis() {
    // Hide parse section, show cost section
    elements.parseSection.classList.remove('active');
    const costSection = document.getElementById('cost-section');
    costSection.classList.add('active');
    costSection.classList.remove('hidden');
    
    // Initialize comprehensive cost analysis
    await loadComprehensiveCostAnalysis();
}

async function loadComprehensiveCostAnalysis() {
    try {
        // First, check if we already have the cost data from parse results
        if (state.parseResults && state.parseResults.cost) {
            console.log('Using existing cost data from parse results:', state.parseResults);
            
            // Use the data we already have from parse
            const { cost, speakerCosts, suggestions, monthlyProjection } = state.parseResults;
            
            displayCostAnalysisUI(cost, speakerCosts, suggestions, monthlyProjection);
            
        } else {
            // Fallback: fetch from API if we don't have the data
            console.log('Fetching cost data from API...');
            
            const response = await fetch(`/api/process/parse/${state.currentSessionId}`);
            const data = await response.json();
            
            console.log('Full cost response from API:', data);
            
            if (data.success) {
                const { cost, speakerCosts, suggestions, monthlyProjection } = data;
                
                // Store the data in state for future use
                state.parseResults.cost = cost;
                state.parseResults.speakerCosts = speakerCosts;
                state.parseResults.suggestions = suggestions;
                state.parseResults.monthlyProjection = monthlyProjection;
                
                displayCostAnalysisUI(cost, speakerCosts, suggestions, monthlyProjection);
                
            } else {
                throw new Error(data.error || 'Failed to load cost data');
            }
        }
        
    } catch (error) {
        console.error('Failed to load comprehensive cost analysis:', error);
        alert('Failed to load cost analysis. Please try again.');
    }
}

// Helper function to display the cost analysis UI
function displayCostAnalysisUI(cost, speakerCosts, suggestions, monthlyProjection) {
    console.log('Displaying cost analysis with data:', { cost, speakerCosts, suggestions, monthlyProjection });
    
    // Use the comprehensive CostDisplay component
    const costHtml = window.costDisplay.displayCostPreview(
        { cost, suggestions },
        speakerCosts,
        monthlyProjection
    );
    
    // Store current cost data for the component
    window.costDisplay.currentCost = cost;
    
    // Update the cost section with the comprehensive display
    let costAnalysisDiv = document.getElementById('cost-analysis-content');
    if (!costAnalysisDiv) {
        // Create the content div if it doesn't exist
        const costSection = document.getElementById('cost-section');
        costSection.innerHTML = `
            <div class="section-header">
                <h2>💰 Cost Analysis</h2>
                <p>Review processing costs and quota usage before proceeding</p>
            </div>
            <div id="cost-analysis-content"></div>
        `;
        costAnalysisDiv = document.getElementById('cost-analysis-content');
    }
    
    costAnalysisDiv.innerHTML = costHtml;
    
    // Start real-time cost updates
    window.costDisplay.startCostUpdates(state.currentSessionId);
}

async function loadQuotaStatus() {
    try {
        const response = await fetch('/api/process/quota');
        const data = await response.json();
        
        if (data.success) {
            const usage = data.usage;
            
            // Update quota display
            document.querySelector('.quota-current').textContent = usage.used.toLocaleString();
            document.querySelector('.quota-total').textContent = usage.quota.toLocaleString();
            document.querySelector('.quota-remaining').textContent = usage.remaining.toLocaleString();
            document.querySelector('.quota-reset-date').textContent = formatResetDate(new Date(usage.resetDate));
            
            // Update quota bar
            const quotaBar = document.querySelector('.quota-used');
            quotaBar.style.width = `${usage.percentage}%`;
            
            // Color code based on usage
            if (usage.percentage > 90) {
                quotaBar.style.background = 'var(--error)';
            } else if (usage.percentage > 75) {
                quotaBar.style.background = 'var(--warning)';
            } else {
                quotaBar.style.background = 'var(--success)';
            }
            
            state.quotaUsage = usage;
        }
    } catch (error) {
        console.error('Failed to load quota status:', error);
    }
}

async function loadEpisodeCost() {
    try {
        const response = await fetch(`/api/process/cost/${state.currentSessionId}`);
        const data = await response.json();
        
        if (data.success) {
            const cost = data.cost;
            const breakdown = data.breakdown;
            
            // Update main cost display
            const costAmount = document.querySelector('.cost-amount');
            const costMessage = document.querySelector('.cost-message');
            
            costAmount.textContent = cost.details.cost;
            costMessage.textContent = cost.message;
            
            // Style based on warning level
            costAmount.className = 'cost-amount';
            if (cost.warningLevel === 'critical' || cost.warningLevel === 'high') {
                costAmount.classList.add('expensive');
            } else if (cost.warningLevel === 'medium') {
                costAmount.classList.add('moderate');
            } else {
                costAmount.classList.add('cheap');
            }
            
            // Update breakdown
            document.querySelector('.total-chars').textContent = cost.details.totalCharacters;
            document.querySelector('.quota-chars').textContent = (parseInt(cost.details.totalCharacters.replace(/,/g, '')) - parseInt(cost.details.overageCharacters.replace(/,/g, ''))).toLocaleString();
            document.querySelector('.overage-chars').textContent = cost.details.overageCharacters;
            
            // Display speaker breakdown
            displaySpeakerBreakdown(breakdown);
            
            // Display suggestions if any
            if (data.suggestions && data.suggestions.length > 0) {
                displayCostSuggestions(data.suggestions);
            }
            
            // Display projections
            if (data.projections) {
                displayMonthlyProjections(data.projections);
            }
            
            state.costEstimate = data;
        }
    } catch (error) {
        console.error('Failed to load episode cost:', error);
    }
}

async function checkCostWarnings() {
    try {
        const response = await fetch(`/api/process/cost/${state.currentSessionId}/warnings`);
        const data = await response.json();
        
        if (data.success && data.warningLevel !== 'none' && data.warningLevel !== 'low') {
            displayCostWarning(data);
        } else {
            // Hide warning section
            document.getElementById('cost-warnings').classList.add('hidden');
        }
    } catch (error) {
        console.error('Failed to check cost warnings:', error);
    }
}

function displayCostWarning(warningData) {
    const warningsDiv = document.getElementById('cost-warnings');
    const details = warningData.details;
    
    // Update warning content
    document.querySelector('.warning-title').textContent = details.title;
    document.querySelector('.warning-message').textContent = details.message;
    document.querySelector('.warning-icon').textContent = details.icon;
    
    // Update warning actions
    const actionsDiv = document.querySelector('.warning-actions');
    actionsDiv.innerHTML = '';
    
    if (details.actions.includes('review')) {
        actionsDiv.innerHTML += '<button class="btn btn-secondary" onclick="reviewCostDetails()">Review Details</button>';
    }
    if (details.actions.includes('split')) {
        actionsDiv.innerHTML += '<button class="btn btn-secondary" onclick="suggestEpisodeSplit()">Split Episode</button>';
    }
    if (details.actions.includes('cancel')) {
        actionsDiv.innerHTML += '<button class="btn btn-secondary" onclick="cancelProcessing()">Cancel Processing</button>';
    }
    
    // Add continue button for non-blocking warnings
    if (details.type !== 'strong') {
        actionsDiv.innerHTML += '<button class="btn btn-primary" onclick="acknowledgeWarning()">Continue Anyway</button>';
    }
    
    // Style warning based on level
    warningsDiv.className = `cost-warnings ${warningData.warningLevel}`;
    warningsDiv.classList.remove('hidden');
}

function displaySpeakerBreakdown(breakdown) {
    const breakdownTable = document.querySelector('.breakdown-table');
    
    const breakdownHTML = `
        <div class="breakdown-row" style="font-weight: bold; background: var(--bg-tertiary);">
            <div class="breakdown-speaker">Speaker</div>
            <div class="breakdown-chars">Characters</div>
            <div class="breakdown-percentage">Percentage</div>
            <div class="breakdown-cost">Est. Cost</div>
        </div>
        ${Object.entries(breakdown.speakers).map(([speaker, data]) => `
            <div class="breakdown-row">
                <div class="breakdown-speaker">${speaker}</div>
                <div class="breakdown-chars">${data.characters.toLocaleString()}</div>
                <div class="breakdown-percentage">${data.percentage}%</div>
                <div class="breakdown-cost">${data.formattedCost || '$0.00'}</div>
            </div>
        `).join('')}
    `;
    
    breakdownTable.innerHTML = breakdownHTML;
}

function displayCostSuggestions(suggestions) {
    const suggestionsDiv = document.getElementById('cost-suggestions');
    const suggestionsList = document.querySelector('.suggestions-list');
    
    const suggestionsHTML = suggestions.map(suggestion => `
        <div class="suggestion-item">
            <div class="suggestion-content">
                <div class="suggestion-type">${suggestion.type.replace('-', ' ')}</div>
                <p class="suggestion-message">${suggestion.message}</p>
            </div>
            ${suggestion.potentialSavings ? `<div class="suggestion-savings">Save ${formatCost(suggestion.potentialSavings)}</div>` : ''}
        </div>
    `).join('');
    
    suggestionsList.innerHTML = suggestionsHTML;
    suggestionsDiv.classList.remove('hidden');
}

function displayMonthlyProjections(projections) {
    const projectionsDiv = document.getElementById('monthly-projections');
    const projectionContent = document.querySelector('.projection-content');
    
    const projectionHTML = `
        <div class="projection-grid">
            <div class="projection-item">
                <div class="projection-value">${projections.currentDailyRate.toLocaleString()}</div>
                <div class="projection-label">Daily Usage Rate</div>
            </div>
            <div class="projection-item">
                <div class="projection-value">${projections.projectedTotal.toLocaleString()}</div>
                <div class="projection-label">Projected Monthly Total</div>
            </div>
            <div class="projection-item">
                <div class="projection-value">${projections.projectedOverage.toLocaleString()}</div>
                <div class="projection-label">Projected Overage</div>
            </div>
            <div class="projection-item">
                <div class="projection-value">${formatCost(projections.projectedCost)}</div>
                <div class="projection-label">Projected Cost</div>
            </div>
        </div>
        ${projections.willExceedQuota ? `
            <div class="warning-item warning" style="margin-top: 20px;">
                <span class="warning-icon">⚠️</span>
                This episode will likely cause you to exceed your monthly quota.
            </div>
        ` : ''}
    `;
    
    projectionContent.innerHTML = projectionHTML;
    projectionsDiv.classList.remove('hidden');
}

async function refreshCostAnalysis() {
    await loadCostAnalysis();
}

function reviewCostDetails() {
    // Show detailed breakdown and suggestions
    document.getElementById('speaker-costs').scrollIntoView({ behavior: 'smooth' });
}

function suggestEpisodeSplit() {
    alert('Episode splitting functionality will be available in Phase 6. For now, consider editing the script manually to reduce length.');
}

function cancelProcessing() {
    if (confirm('Are you sure you want to cancel? You will lose your current progress.')) {
        startOver();
    }
}

function acknowledgeWarning() {
    // Hide warning and proceed
    document.getElementById('cost-warnings').classList.add('hidden');
}

function formatCost(cost) {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(2)}`;
}

function formatResetDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Phase 3 - Speaker Mapping Functions
async function proceedToMapping() {
    // Hide parse section, show mapping section
    elements.parseSection.classList.remove('active');
    elements.mappingSection.classList.add('active');
    elements.mappingSection.classList.remove('hidden');
    
    // Show loading state
    document.getElementById('voice-loading').classList.remove('hidden');
    document.getElementById('mapping-table').classList.add('hidden');
    
    try {
        // Fetch available voices FIRST and wait for completion
        console.log('[DEBUG] Fetching voices...');
        await state.speakerMapper.fetchVoices();
        console.log('[DEBUG] Voices fetched:', state.speakerMapper.availableVoices.length);
        
        // Verify voices were loaded
        if (!state.speakerMapper.availableVoices || state.speakerMapper.availableVoices.length === 0) {
            throw new Error('No voices available. Please check your ElevenLabs API key permissions.');
        }
        
        // Try to load previous mapping
        state.speakerMapper.loadMapping();
        
        // Display mapping interface AFTER voices are loaded
        displayMappingInterface();
        
    } catch (error) {
        console.error('Failed to load voices:', error);
        alert(`Failed to load voices: ${error.message}\nPlease check your ElevenLabs API key.`);
        
        // Go back to parse section on error
        elements.mappingSection.classList.remove('active');
        elements.mappingSection.classList.add('hidden');
        elements.parseSection.classList.add('active');
    } finally {
        document.getElementById('voice-loading').classList.add('hidden');
    }
}

function displayMappingInterface() {
    const speakers = state.parseResults.preview.speakerList.map(s => s.name);
    const mappingTable = document.getElementById('mapping-table');
    
    // Check if voices are available
    if (!state.speakerMapper.availableVoices || state.speakerMapper.availableVoices.length === 0) {
        mappingTable.innerHTML = `
            <div class="error-message">
                <h3>No voices available</h3>
                <p>Unable to load voices from ElevenLabs. Please check:</p>
                <ul>
                    <li>Your API key has "Voices: Read only" permission</li>
                    <li>Your ElevenLabs account is active</li>
                    <li>You have not exceeded rate limits</li>
                </ul>
                <button class="btn btn-primary" onclick="retryLoadVoices()">Retry</button>
            </div>
        `;
        mappingTable.classList.remove('hidden');
        return;
    }
    
    // Build mapping table HTML
    const tableHTML = `
        <div class="mapping-header">
            <div class="header-item">Speaker</div>
            <div class="header-item">Lines</div>
            <div class="header-item">Voice</div>
            <div class="header-item">Actions</div>
        </div>
        <div class="mapping-rows">
            ${speakers.map((speaker, index) => {
                const stats = state.parseResults.stats.speakerBreakdown[speaker];
                const currentMapping = state.speakerMapper.speakerMapping[speaker];
                
                return `
                    <div class="mapping-row" data-speaker="${speaker}">
                        <div class="mapping-speaker">
                            <strong>${speaker}</strong>
                            <span class="speaker-stats">${stats.characterCount.toLocaleString()} chars</span>
                        </div>
                        <div class="mapping-lines">${stats.dialogueCount}</div>
                        <div class="mapping-voice">
                            <select class="voice-select" onchange="updateVoiceMapping('${speaker}', this.value)">
                                <option value="">Select a voice...</option>
                                ${state.speakerMapper.availableVoices.map(voice => `
                                    <option value="${voice.voice_id}" 
                                        ${currentMapping?.voiceId === voice.voice_id ? 'selected' : ''}>
                                        ${voice.name} ${voice.category === 'premade' ? '(Default)' : '(Custom)'}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="mapping-actions">
                            <button class="action-btn" onclick="previewVoice('${speaker}')" title="Preview Voice">
                                🔊
                            </button>
                            <button class="action-btn" onclick="openVoiceSettings('${speaker}')" title="Voice Settings">
                                ⚙️
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    mappingTable.innerHTML = tableHTML;
    mappingTable.classList.remove('hidden');
    
    // Log for debugging
    console.log('[DEBUG] Mapping interface displayed with', state.speakerMapper.availableVoices.length, 'voices');
    
    // Validate mapping
    validateMapping();
}

function updateVoiceMapping(speaker, voiceId) {
    if (voiceId) {
        state.speakerMapper.mapSpeakerToVoice(speaker, voiceId);
    } else {
        delete state.speakerMapper.speakerMapping[speaker];
    }
    
    validateMapping();
}

function validateMapping() {
    const speakers = state.parseResults.preview.speakerList.map(s => s.name);
    const validation = state.speakerMapper.validateMapping(speakers);
    
    const warningsDiv = document.getElementById('mapping-warnings');
    
    if (!validation.isValid || validation.warnings.length > 0) {
        const warningsHTML = `
            ${!validation.isValid ? `
                <div class="warning-item error">
                    <span class="warning-icon">❌</span>
                    Unmapped speakers: ${validation.unmappedSpeakers.join(', ')}
                </div>
            ` : ''}
            ${validation.warnings.map(warning => `
                <div class="warning-item ${warning.severity}">
                    <span class="warning-icon">⚠️</span>
                    ${warning.message}
                </div>
            `).join('')}
        `;
        
        warningsDiv.innerHTML = warningsHTML;
        warningsDiv.classList.remove('hidden');
    } else {
        warningsDiv.classList.add('hidden');
    }
}

async function previewVoice(speaker) {
    const mapping = state.speakerMapper.speakerMapping[speaker];
    if (!mapping) {
        alert('Please select a voice first');
        return;
    }
    
    // Get sample dialogue for this speaker
    const dialogues = await getDialoguesForSpeaker(speaker);
    if (!dialogues || dialogues.length === 0) {
        alert('No dialogue found for this speaker');
        return;
    }
    
    // Use first dialogue or a sample
    const sampleText = dialogues[0].cleanedText.substring(0, 200);
    
    try {
        const preview = await state.speakerMapper.generatePreview(
            speaker, 
            mapping.voiceId, 
            sampleText, 
            mapping.settings
        );
        
        // Play the preview
        const audio = document.getElementById('preview-player');
        audio.src = `data:audio/mpeg;base64,${preview.audio}`;
        audio.play();
        
    } catch (error) {
        console.error('Preview failed:', error);
        alert('Failed to generate preview. Please check your API key.');
    }
}

async function getDialoguesForSpeaker(speaker) {
    try {
        const response = await fetch(`/api/process/parse/${state.currentSessionId}`);
        const data = await response.json();
        
        if (data.success) {
            return data.results.dialogues.filter(d => d.speaker === speaker);
        }
    } catch (error) {
        console.error('Failed to get dialogues:', error);
    }
    return [];
}

function openVoiceSettings(speaker) {
    state.currentSettingsSpeaker = speaker;
    const mapping = state.speakerMapper.speakerMapping[speaker];
    
    if (!mapping) {
        alert('Please select a voice first');
        return;
    }
    
    // Load current settings
    document.getElementById('stability').value = mapping.settings.stability;
    document.getElementById('similarity').value = mapping.settings.similarity_boost;
    document.getElementById('style').value = mapping.settings.style;
    document.getElementById('speaker-boost').checked = mapping.settings.use_speaker_boost;
    
    // Update displays
    document.querySelectorAll('#voice-settings-modal input[type="range"]').forEach(input => {
        input.nextElementSibling.textContent = input.value;
    });
    
    // Show modal
    document.getElementById('voice-settings-modal').classList.remove('hidden');
}

function closeVoiceSettings() {
    document.getElementById('voice-settings-modal').classList.add('hidden');
    state.currentSettingsSpeaker = null;
}

function saveVoiceSettings() {
    if (!state.currentSettingsSpeaker) return;
    
    const settings = {
        stability: parseFloat(document.getElementById('stability').value),
        similarity_boost: parseFloat(document.getElementById('similarity').value),
        style: parseFloat(document.getElementById('style').value),
        use_speaker_boost: document.getElementById('speaker-boost').checked
    };
    
    // Update the mapping
    const mapping = state.speakerMapper.speakerMapping[state.currentSettingsSpeaker];
    if (mapping) {
        mapping.settings = settings;
    }
    
    closeVoiceSettings();
}

async function autoAssignVoices() {
    const speakers = state.parseResults.preview.speakerList.map(s => s.name);
    
    // Show loading state
    const button = event.target.closest('button');
    button.disabled = true;
    button.textContent = 'Auto-assigning...';
    
    try {
        await state.speakerMapper.autoAssignVoices(speakers);
        displayMappingInterface();
        alert('Voices auto-assigned! Review and adjust as needed.');
    } catch (error) {
        console.error('Auto-assign failed:', error);
        alert('Failed to auto-assign voices');
    } finally {
        button.disabled = false;
        button.innerHTML = '<span class="icon">🎲</span> Auto-Assign Voices';
    }
}

function loadPreviousMapping() {
    const history = state.speakerMapper.getMappingHistory();
    
    if (history.length === 0) {
        alert('No previous mappings found');
        return;
    }
    
    // Display history modal
    const historyHTML = `
        ${history.map(item => `
            <div class="history-item" onclick="loadHistoryItem(${item.id})">
                <div class="history-info">
                    <strong>${item.episodeName}</strong>
                    <span>${new Date(item.savedAt).toLocaleDateString()}</span>
                </div>
                <div class="history-stats">
                    ${item.speakerCount} speakers
                </div>
            </div>
        `).join('')}
    `;
    
    document.getElementById('mapping-history-list').innerHTML = historyHTML;
    document.getElementById('history-modal').classList.remove('hidden');
}

function loadHistoryItem(historyId) {
    state.speakerMapper.loadFromHistory(historyId);
    displayMappingInterface();
    closeHistoryModal();
    alert('Previous mapping loaded!');
}

function closeHistoryModal() {
    document.getElementById('history-modal').classList.add('hidden');
}

function exportMapping() {
    state.speakerMapper.exportMapping();
}

async function importMapping(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        await state.speakerMapper.importMapping(file);
        displayMappingInterface();
        alert('Mapping imported successfully!');
    } catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import mapping file');
    }
    
    // Clear the input
    event.target.value = '';
}

async function confirmMapping() {
    const speakers = state.parseResults.preview.speakerList.map(s => s.name);
    const validation = state.speakerMapper.validateMapping(speakers);
    
    if (!validation.isValid) {
        alert(`Please map all speakers before continuing.\nUnmapped: ${validation.unmappedSpeakers.join(', ')}`);
        return;
    }
    
    // Save mapping
    state.speakerMapper.saveMapping();
    
    // Transition to Phase 4 - Cost Analysis (not Phase 5!)
    proceedToCostAnalysis();
}

function backToParse() {
    elements.mappingSection.classList.remove('active');
    elements.parseSection.classList.add('active');
    elements.parseSection.classList.remove('hidden');
}

function adjustSettings() {
    // TODO: Implement settings adjustment
    alert('Settings adjustment will be implemented in a future phase.');
}

function startOver() {
    if (confirm('Are you sure you want to start over? This will discard the current parse.')) {
        resetUpload();
        elements.parseSection.classList.remove('active');
        elements.mappingSection.classList.remove('active');
        elements.uploadSection.classList.add('active');
        elements.uploadSection.classList.remove('hidden');
    }
}

// Reset Upload
function resetUpload() {
    state.currentFile = null;
    state.currentFileId = null;
    state.currentSessionId = null;
    state.parseResults = null;
    elements.fileInput.value = '';
    elements.uploadZone.classList.remove('hidden');
    elements.filePreview.classList.add('hidden');
    
    // Clear any added elements
    const charInfo = document.querySelector('.file-chars');
    if (charInfo) charInfo.remove();
}

// Utility Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function for backward compatibility with the costDisplay component
function backToMapping() {
    // Stop cost updates
    if (window.costDisplay) {
        window.costDisplay.stopCostUpdates();
    }
    
    // Navigate back to mapping section
    document.getElementById('cost-section').classList.remove('active');
    document.getElementById('cost-section').classList.add('hidden');
    document.getElementById('mapping-section').classList.add('active');
    document.getElementById('mapping-section').classList.remove('hidden');
}

// Add retry function
async function retryLoadVoices() {
    document.getElementById('voice-loading').classList.remove('hidden');
    document.getElementById('mapping-table').classList.add('hidden');
    
    try {
        await state.speakerMapper.fetchVoices();
        displayMappingInterface();
    } catch (error) {
        console.error('Retry failed:', error);
        alert('Failed to load voices. Please check your API key.');
    } finally {
        document.getElementById('voice-loading').classList.add('hidden');
    }
}

// Make functions globally available
window.toggleRemovedContent = toggleRemovedContent;
window.confirmParse = confirmParse;
window.adjustSettings = adjustSettings;
window.startOver = startOver;
window.updateVoiceMapping = updateVoiceMapping;
window.previewVoice = previewVoice;
window.openVoiceSettings = openVoiceSettings;
window.closeVoiceSettings = closeVoiceSettings;
window.saveVoiceSettings = saveVoiceSettings;
window.autoAssignVoices = autoAssignVoices;
window.loadPreviousMapping = loadPreviousMapping;
window.loadHistoryItem = loadHistoryItem;
window.closeHistoryModal = closeHistoryModal;
window.exportMapping = exportMapping;
window.importMapping = importMapping;
window.confirmMapping = confirmMapping;
window.backToParse = backToParse;
window.retryLoadVoices = retryLoadVoices;

// Proceed to Processing - Phase 5
async function proceedToProcessing() {
    // Hide cost section, show processing section
    const costSection = document.getElementById('cost-section');
    costSection.classList.remove('active');
    costSection.classList.add('hidden');
    
    const processingSection = document.getElementById('processing-section');
    processingSection.classList.add('active');
    processingSection.classList.remove('hidden');
    
    try {
        // Start processing
        const response = await fetch('/api/processing/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: state.currentSessionId,
                speakerMapping: state.speakerMapper.getSpeakerMapping()
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Initialize processing UI
            window.processingUI.initializeUI(data.sessionId, data.queueInfo);
        } else {
            throw new Error(data.error);
        }
        
    } catch (error) {
        console.error('Failed to start processing:', error);
        alert(`Failed to start processing: ${error.message}`);
    }
}

// Phase 6 functions - File Download & Management
async function proceedToDownload() {
    console.log('[DEBUG] proceedToDownload called');
    console.log('[DEBUG] Current sessionId:', state.currentSessionId);
    console.log('[DEBUG] fileDownloadManager available:', !!window.fileDownloadManager);
    
    const sessionId = state.currentSessionId;
    if (!sessionId) {
        console.error('[ERROR] No active session found');
        alert('No active session found');
        return;
    }
    
    if (!window.fileDownloadManager) {
        console.error('[ERROR] fileDownloadManager not available');
        alert('Download manager not loaded');
        return;
    }
    
    try {
        console.log('[DEBUG] Initializing download manager...');
        const initialized = await window.fileDownloadManager.initialize(sessionId);
        console.log('[DEBUG] Download manager initialized:', initialized);
        
        if (initialized) {
            console.log('[DEBUG] Showing download interface...');
            await window.fileDownloadManager.showDownloadInterface();
            window.fileDownloadManager.setupFilters();
            console.log('[DEBUG] Download interface setup complete');
        } else {
            console.error('[ERROR] Failed to initialize download manager');
            alert('Failed to load download information');
        }
    } catch (error) {
        console.error('[ERROR] Download error:', error);
        alert(`Download error: ${error.message}`);
    }
}

function viewProcessingDetails() {
    // Show processing log and details
    const logSection = document.querySelector('.processing-log-section');
    if (logSection) {
        logSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        alert('Processing details not available');
    }
}

function startNewEpisode() {
    if (confirm('Start processing a new episode? This will reset the current session.')) {
        location.reload();
    }
}

async function proceedToPartialDownload() {
    // Same as proceedToDownload - handles partial processing results
    await proceedToDownload();
}

// Make Phase 5 functions globally available
window.proceedToProcessing = proceedToProcessing;
window.proceedToDownload = proceedToDownload;
window.viewProcessingDetails = viewProcessingDetails;
window.startNewEpisode = startNewEpisode;
window.proceedToPartialDownload = proceedToPartialDownload; 