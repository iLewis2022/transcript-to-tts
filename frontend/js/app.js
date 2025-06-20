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
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const validation = await response.json();
        console.log('Validation response:', validation);
        
        if (!validation.success) {
            throw new Error(validation.error || 'Validation failed');
        }
        
        if (!validation.ready) {
            const issues = validation.validation?.issues?.map(i => i.message).join('\n') || 'Unknown validation issues';
            if (!confirm(`Parse validation found issues:\n${issues}\n\nContinue anyway?`)) {
                return;
            }
        }
        
        // Proceed to Phase 3 - Voice Mapping (FIXED!)
        proceedToMapping();
        
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
    
    // Get current settings with defaults
    const currentSettings = mapping.settings || {};
    const voiceSettings = state.speakerMapper.voiceSettings?.[speaker] || {};
    
    // Create enhanced voice settings HTML
    const enhancedVoiceSettingsHTML = `
        <div class="voice-settings-content">
            <h4>Voice Settings for ${speaker}</h4>
            
            <!-- Model Selection -->
            <div class="setting-group">
                <label>TTS Model</label>
                <select id="voice-model" class="voice-model-select" onchange="updateModelDescription()">
                    <option value="eleven_multilingual_v2" ${(voiceSettings.model_id || globalModelSettings.defaultModel) === 'eleven_multilingual_v2' ? 'selected' : ''}>Eleven Multilingual v2 (Balanced)</option>
                    <option value="eleven_turbo_v2_5" ${(voiceSettings.model_id || globalModelSettings.defaultModel) === 'eleven_turbo_v2_5' ? 'selected' : ''}>Eleven Turbo v2.5 (Fastest)</option>
                    <option value="eleven_turbo_v2" ${(voiceSettings.model_id || globalModelSettings.defaultModel) === 'eleven_turbo_v2' ? 'selected' : ''}>Eleven Turbo v2</option>
                    <option value="eleven_monolingual_v1" ${(voiceSettings.model_id || globalModelSettings.defaultModel) === 'eleven_monolingual_v1' ? 'selected' : ''}>Eleven English v1 (Highest Quality)</option>
                    <option value="eleven_multilingual_v1" ${(voiceSettings.model_id || globalModelSettings.defaultModel) === 'eleven_multilingual_v1' ? 'selected' : ''}>Eleven Multilingual v1</option>
                </select>
                <p class="model-description" id="model-description">
                    Balanced quality and speed. Supports 29 languages.
                </p>
            </div>
            
            <!-- Language Selection -->
            <div class="setting-group" id="language-group">
                <label>Language</label>
                <select id="voice-language" class="voice-language-select">
                    <option value="en" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'en' ? 'selected' : ''}>English</option>
                    <option value="es" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'es' ? 'selected' : ''}>Spanish</option>
                    <option value="fr" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'fr' ? 'selected' : ''}>French</option>
                    <option value="de" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'de' ? 'selected' : ''}>German</option>
                    <option value="it" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'it' ? 'selected' : ''}>Italian</option>
                    <option value="pt" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'pt' ? 'selected' : ''}>Portuguese</option>
                    <option value="pl" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'pl' ? 'selected' : ''}>Polish</option>
                    <option value="tr" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'tr' ? 'selected' : ''}>Turkish</option>
                    <option value="ru" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'ru' ? 'selected' : ''}>Russian</option>
                    <option value="nl" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'nl' ? 'selected' : ''}>Dutch</option>
                    <option value="cs" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'cs' ? 'selected' : ''}>Czech</option>
                    <option value="ar" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'ar' ? 'selected' : ''}>Arabic</option>
                    <option value="zh" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'zh' ? 'selected' : ''}>Chinese</option>
                    <option value="ja" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'ja' ? 'selected' : ''}>Japanese</option>
                    <option value="ko" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'ko' ? 'selected' : ''}>Korean</option>
                    <option value="hi" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'hi' ? 'selected' : ''}>Hindi</option>
                    <option value="sv" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'sv' ? 'selected' : ''}>Swedish</option>
                    <option value="da" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'da' ? 'selected' : ''}>Danish</option>
                    <option value="fi" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'fi' ? 'selected' : ''}>Finnish</option>
                    <option value="no" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'no' ? 'selected' : ''}>Norwegian</option>
                    <option value="ro" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'ro' ? 'selected' : ''}>Romanian</option>
                    <option value="bg" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'bg' ? 'selected' : ''}>Bulgarian</option>
                    <option value="uk" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'uk' ? 'selected' : ''}>Ukrainian</option>
                    <option value="el" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'el' ? 'selected' : ''}>Greek</option>
                    <option value="hu" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'hu' ? 'selected' : ''}>Hungarian</option>
                    <option value="id" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'id' ? 'selected' : ''}>Indonesian</option>
                    <option value="ms" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'ms' ? 'selected' : ''}>Malay</option>
                    <option value="vi" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'vi' ? 'selected' : ''}>Vietnamese</option>
                    <option value="th" ${(voiceSettings.language_code || globalModelSettings.defaultLanguage) === 'th' ? 'selected' : ''}>Thai</option>
                </select>
            </div>
            
            <!-- Output Format -->
            <div class="setting-group">
                <label>Output Format</label>
                <select id="output-format" class="output-format-select">
                    <option value="mp3_44100_128" ${(voiceSettings.output_format || globalModelSettings.defaultFormat) === 'mp3_44100_128' ? 'selected' : ''}>MP3 - 128kbps, 44.1kHz (Default)</option>
                    <option value="mp3_44100_64" ${(voiceSettings.output_format || globalModelSettings.defaultFormat) === 'mp3_44100_64' ? 'selected' : ''}>MP3 - 64kbps, 44.1kHz (Smaller)</option>
                    <option value="mp3_44100_192" ${(voiceSettings.output_format || globalModelSettings.defaultFormat) === 'mp3_44100_192' ? 'selected' : ''}>MP3 - 192kbps, 44.1kHz (Higher Quality)</option>
                    <option value="pcm_16000" ${(voiceSettings.output_format || globalModelSettings.defaultFormat) === 'pcm_16000' ? 'selected' : ''}>PCM - 16kHz (Uncompressed)</option>
                    <option value="pcm_22050" ${(voiceSettings.output_format || globalModelSettings.defaultFormat) === 'pcm_22050' ? 'selected' : ''}>PCM - 22.05kHz (Uncompressed)</option>
                    <option value="pcm_24000" ${(voiceSettings.output_format || globalModelSettings.defaultFormat) === 'pcm_24000' ? 'selected' : ''}>PCM - 24kHz (Uncompressed)</option>
                    <option value="pcm_44100" ${(voiceSettings.output_format || globalModelSettings.defaultFormat) === 'pcm_44100' ? 'selected' : ''}>PCM - 44.1kHz (Uncompressed)</option>
                </select>
            </div>
            
            <!-- Voice Settings -->
            <div class="setting-group">
                <label>Stability <span id="stability-value">${Math.round((currentSettings.stability || 0.5) * 100)}</span></label>
                <input type="range" id="stability-slider" min="0" max="100" value="${Math.round((currentSettings.stability || 0.5) * 100)}" oninput="document.getElementById('stability-value').textContent = this.value">
            </div>
            
            <div class="setting-group">
                <label>Similarity Boost <span id="similarity-value">${Math.round((currentSettings.similarity_boost || 0.75) * 100)}</span></label>
                <input type="range" id="similarity-slider" min="0" max="100" value="${Math.round((currentSettings.similarity_boost || 0.75) * 100)}" oninput="document.getElementById('similarity-value').textContent = this.value">
            </div>
            
            <div class="setting-group">
                <label>Style <span id="style-value">${Math.round((currentSettings.style || 0) * 100)}</span></label>
                <input type="range" id="style-slider" min="0" max="100" value="${Math.round((currentSettings.style || 0) * 100)}" oninput="document.getElementById('style-value').textContent = this.value">
            </div>
            
            <div class="setting-group">
                <label>
                    <input type="checkbox" id="speaker-boost" ${currentSettings.use_speaker_boost !== false ? 'checked' : ''}>
                    Use Speaker Boost
                </label>
            </div>
        </div>
    `;
    
    // Update modal content
    document.getElementById('voice-settings-body').innerHTML = enhancedVoiceSettingsHTML;
    
    // Initialize model description
    updateModelDescription();
    
    // Show modal
    document.getElementById('voice-settings-modal').classList.remove('hidden');
}

function closeVoiceSettings() {
    document.getElementById('voice-settings-modal').classList.add('hidden');
    state.currentSettingsSpeaker = null;
}

function saveVoiceSettings() {
    if (!state.currentSettingsSpeaker) return;
    
    const speaker = state.currentSettingsSpeaker;
    const model = document.getElementById('voice-model').value;
    const language = document.getElementById('voice-language').value;
    const outputFormat = document.getElementById('output-format').value;
    const stability = parseInt(document.getElementById('stability-slider').value);
    const similarityBoost = parseInt(document.getElementById('similarity-slider').value);
    const style = parseInt(document.getElementById('style-slider').value);
    const useSpeakerBoost = document.getElementById('speaker-boost').checked;
    
    // Update traditional settings
    const settings = {
        stability: stability / 100,
        similarity_boost: similarityBoost / 100,
        style: style / 100,
        use_speaker_boost: useSpeakerBoost
    };
    
    // Update the mapping
    const mapping = state.speakerMapper.speakerMapping[speaker];
    if (mapping) {
        mapping.settings = settings;
    }
    
    // Initialize voiceSettings if not exists
    if (!state.speakerMapper.voiceSettings) {
        state.speakerMapper.voiceSettings = {};
    }
    
    // Update voice settings with model data
    state.speakerMapper.voiceSettings[speaker] = {
        model_id: model,
        language_code: language,
        output_format: outputFormat,
        stability: stability / 100,
        similarity_boost: similarityBoost / 100,
        style: style / 100,
        use_speaker_boost: useSpeakerBoost
    };
    
    // Update UI to show model selection
    const mappingRow = document.querySelector(`[data-speaker="${speaker}"]`);
    if (mappingRow) {
        let modelBadge = mappingRow.querySelector('.model-badge');
        if (!modelBadge) {
            modelBadge = document.createElement('span');
            modelBadge.className = 'model-badge';
            const voiceSelect = mappingRow.querySelector('.voice-select');
            if (voiceSelect) {
                voiceSelect.parentNode.appendChild(modelBadge);
            }
        }
        
        // Update badge text based on model
        if (model.includes('turbo')) {
            modelBadge.textContent = '⚡ Turbo';
        } else if (model.includes('v2')) {
            modelBadge.textContent = '🌟 v2';
        } else {
            modelBadge.textContent = '📢 v1';
        }
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
// Model description updater
function updateModelDescription() {
    const modelSelect = document.getElementById('voice-model');
    const descriptionEl = document.getElementById('model-description');
    const languageGroup = document.getElementById('language-group');
    
    const descriptions = {
        'eleven_multilingual_v2': 'Latest model. Balanced quality and speed. Supports 29 languages.',
        'eleven_turbo_v2_5': 'Fastest generation, lowest latency. Ideal for real-time applications.',
        'eleven_turbo_v2': 'Fast generation with good quality. Lower latency than standard models.',
        'eleven_monolingual_v1': 'Highest quality for English only. Best for final production.',
        'eleven_multilingual_v1': 'Previous generation. Good quality, supports 13 languages.'
    };
    
    const multilingualModels = ['eleven_multilingual_v2', 'eleven_multilingual_v1'];
    
    if (modelSelect && descriptionEl) {
        descriptionEl.textContent = descriptions[modelSelect.value] || '';
        
        // Show/hide language selection based on model
        if (languageGroup) {
            if (multilingualModels.includes(modelSelect.value)) {
                languageGroup.style.display = 'block';
            } else {
                languageGroup.style.display = 'none';
                document.getElementById('voice-language').value = 'en';
            }
        }
    }
}

// Global model settings class
class GlobalModelSettings {
    constructor() {
        this.defaultModel = 'eleven_multilingual_v2';
        this.defaultLanguage = 'en';
        this.defaultFormat = 'mp3_44100_128';
        this.loadDefaults();
    }
    
    showGlobalSettings() {
        const modal = document.createElement('div');
        modal.className = 'modal global-model-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🎙️ Global TTS Model Settings</h3>
                    <button class="close-button" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="global-settings-info">
                        <p>Set default model settings for all new speakers. Individual speakers can still override these.</p>
                    </div>
                    
                    <div class="setting-group">
                        <label>Default Model</label>
                        <select id="global-default-model">
                            <option value="eleven_multilingual_v2">Eleven Multilingual v2 (Recommended)</option>
                            <option value="eleven_turbo_v2_5">Eleven Turbo v2.5 (Fastest)</option>
                            <option value="eleven_monolingual_v1">Eleven English v1 (Highest Quality)</option>
                        </select>
                    </div>
                    
                    <div class="setting-group">
                        <label>Default Language</label>
                        <select id="global-default-language">
                            <option value="en">English</option>
                            <option value="auto">Auto-detect</option>
                        </select>
                    </div>
                    
                    <div class="setting-group">
                        <label>Default Output Format</label>
                        <select id="global-default-format">
                            <option value="mp3_44100_128">MP3 - 128kbps (Recommended)</option>
                            <option value="mp3_44100_192">MP3 - 192kbps (Higher Quality)</option>
                            <option value="mp3_44100_64">MP3 - 64kbps (Smaller Files)</option>
                        </select>
                    </div>
                    
                    <div class="model-comparison">
                        <h4>Model Comparison</h4>
                        <table>
                            <tr>
                                <th>Model</th>
                                <th>Quality</th>
                                <th>Speed</th>
                                <th>Languages</th>
                                <th>Best For</th>
                            </tr>
                            <tr>
                                <td>Multilingual v2</td>
                                <td>⭐⭐⭐⭐</td>
                                <td>⭐⭐⭐</td>
                                <td>29</td>
                                <td>General use</td>
                            </tr>
                            <tr>
                                <td>Turbo v2.5</td>
                                <td>⭐⭐⭐</td>
                                <td>⭐⭐⭐⭐⭐</td>
                                <td>1</td>
                                <td>Quick previews</td>
                            </tr>
                            <tr>
                                <td>English v1</td>
                                <td>⭐⭐⭐⭐⭐</td>
                                <td>⭐⭐</td>
                                <td>1</td>
                                <td>Final production</td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="globalModelSettings.saveDefaults()">
                        Save Defaults
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Load current defaults
        document.getElementById('global-default-model').value = this.defaultModel;
        document.getElementById('global-default-language').value = this.defaultLanguage;
        document.getElementById('global-default-format').value = this.defaultFormat;
    }
    
    saveDefaults() {
        this.defaultModel = document.getElementById('global-default-model').value;
        this.defaultLanguage = document.getElementById('global-default-language').value;
        this.defaultFormat = document.getElementById('global-default-format').value;
        
        // Save to localStorage
        localStorage.setItem('tts_default_model', this.defaultModel);
        localStorage.setItem('tts_default_language', this.defaultLanguage);
        localStorage.setItem('tts_default_format', this.defaultFormat);
        
        document.querySelector('.global-model-modal').remove();
        
        this.showNotification('Default model settings saved');
    }
    
    loadDefaults() {
        this.defaultModel = localStorage.getItem('tts_default_model') || 'eleven_multilingual_v2';
        this.defaultLanguage = localStorage.getItem('tts_default_language') || 'en';
        this.defaultFormat = localStorage.getItem('tts_default_format') || 'mp3_44100_128';
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize global settings
window.globalModelSettings = new GlobalModelSettings();

window.updateModelDescription = updateModelDescription;
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
    console.log('Proceeding to download section...');
    
    const sessionId = window.state?.currentSessionId;
    if (!sessionId) {
        console.error('No active session found');
        alert('No active session found');
        return;
    }
    
    try {
        // Initialize download manager with session
        const initialized = await window.fileDownloadManager.initialize(sessionId);
        if (initialized) {
            // Hide processing section
            document.getElementById('processing-section').classList.add('hidden');
            
            // Show download interface
            await window.fileDownloadManager.showDownloadInterface();
            window.fileDownloadManager.setupFilters();
            
            console.log('Download interface loaded successfully');
            
            // DEBUG: Run diagnostic
            setTimeout(() => {
                window.debugDownloadSection();
            }, 100);
            
        } else {
            throw new Error('Failed to initialize download manager');
        }
    } catch (error) {
        console.error('Failed to load download interface:', error);
        alert('Failed to load download information. Please try refreshing the page.');
    }
}

async function viewProcessingDetails() {
    // Show processing details in download section
    await proceedToDownload();
}

function startNewEpisode() {
    if (confirm('Start processing a new episode? This will reset the current session.')) {
        // Reset state
        window.state = {
            currentFile: null,
            currentFileId: null,
            currentSessionId: null,
            parseResults: null,
            speakerMapper: null
        };
        
        // Hide all sections
        document.querySelectorAll('.section').forEach(s => {
            s.classList.add('hidden');
            s.classList.remove('active');
        });
        
        // Show upload section
        const uploadSection = document.getElementById('upload-section');
        uploadSection.classList.remove('hidden');
        uploadSection.classList.add('active');
        
        // Reset file input
        document.getElementById('file-input').value = '';
        document.getElementById('upload-zone').classList.remove('hidden');
        document.getElementById('file-preview').classList.add('hidden');
        
        // Clear any download sections
        const downloadSection = document.getElementById('download-section');
        if (downloadSection) {
            downloadSection.remove();
        }
        
        console.log('Reset complete, ready for new episode');
    }
}

async function proceedToPartialDownload() {
    // Same as regular download but with partial files
    await proceedToDownload();
}

// Make Phase 5 functions globally available
window.proceedToProcessing = proceedToProcessing;
window.proceedToDownload = proceedToDownload;
window.viewProcessingDetails = viewProcessingDetails;
window.startNewEpisode = startNewEpisode;
window.proceedToPartialDownload = proceedToPartialDownload; 