// Image Scourer Module - Main Controller
// frontend/js/image-scourer.js

class ImageScourerModule {
    constructor() {
        this.scriptContent = null;
        this.scriptFilename = null;
        this.visualData = null;
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Tab switching for visual types
        document.querySelectorAll('.visual-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchVisualTab(e.target.dataset.type));
        });
        
        // Load script from dialogue tab
        const loadButton = document.getElementById('img-load-from-dialogue');
        if (loadButton) {
            loadButton.addEventListener('click', () => this.loadFromDialogue());
        }
        
        // Direct file upload
        const fileInput = document.getElementById('img-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleDirectUpload(e));
        }
        
        // Copy prompt
        const copyButton = document.getElementById('img-copy-prompt');
        if (copyButton) {
            copyButton.addEventListener('click', () => this.copyPrompt());
        }
        
        // Parse response
        const parseButton = document.getElementById('img-parse-response');
        if (parseButton) {
            parseButton.addEventListener('click', () => this.parseResponse());
        }
        
        // Export buttons
        const exportMJButton = document.getElementById('export-midjourney');
        if (exportMJButton) {
            exportMJButton.addEventListener('click', () => this.exportMidjourney());
        }
        
        const exportKlingButton = document.getElementById('export-kling');
        if (exportKlingButton) {
            exportKlingButton.addEventListener('click', () => this.exportKling());
        }
        
        const exportAllButton = document.getElementById('export-all');
        if (exportAllButton) {
            exportAllButton.addEventListener('click', () => this.exportAll());
        }
        
        // New export buttons
        const exportPDFButton = document.getElementById('export-pdf');
        if (exportPDFButton) {
            exportPDFButton.addEventListener('click', () => this.exportPDF());
        }
        
        const exportVisualButton = document.getElementById('export-visual');
        if (exportVisualButton) {
            exportVisualButton.addEventListener('click', () => this.exportVisualSummary());
        }
    }
    

    
    async loadFromDialogue() {
        try {
            // Check if there's a session ID from the dialogue tab
            if (!window.state || !window.state.currentSessionId) {
                this.showAlert('Please load and parse a script in the Dialogue tab first', 'warning');
                return;
            }
            
            // Fetch the script content from the backend session
            const response = await fetch(`/api/upload/${window.state.currentSessionId}/preview?maxLength=100000`);
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to load script content');
            }
            
            this.scriptContent = data.preview;
            this.sessionId = window.state.currentSessionId;
            
            // Get filename from current file info
            this.scriptFilename = window.state.currentFile?.name || 'Loaded Script';
            
            // Update UI
            document.getElementById('img-script-name').textContent = this.scriptFilename;
            document.getElementById('img-script-content').textContent = this.scriptContent.substring(0, 1000) + '...';
            document.getElementById('img-script-preview').classList.remove('hidden');
            
            // Generate the analysis prompt
            this.generatePrompt();
            
            // Show the next sections
            document.getElementById('img-prompt-section').classList.remove('hidden');
            document.getElementById('img-response-section').classList.remove('hidden');
            
            this.showAlert('Script loaded successfully! Copy the prompt below for LLM analysis.', 'success');
            
        } catch (error) {
            console.error('Failed to load script:', error);
            this.showAlert('Failed to load script from dialogue tab: ' + error.message, 'error');
        }
    }
    
    async handleDirectUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type
        const validExtensions = ['.md', '.txt', '.doc', '.docx'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        
        if (!validExtensions.includes(fileExtension)) {
            this.showAlert(`Invalid file type. Please upload one of: ${validExtensions.join(', ')}`, 'error');
            return;
        }
        
        try {
            // Read file content directly
            const text = await this.readFileContent(file);
            
            this.scriptContent = text;
            this.sessionId = null; // No backend session for direct upload
            this.scriptFilename = file.name;
            
            // Update UI
            document.getElementById('img-script-name').textContent = this.scriptFilename;
            document.getElementById('img-script-content').textContent = this.scriptContent.substring(0, 1000) + '...';
            document.getElementById('img-script-preview').classList.remove('hidden');
            
            // Generate the analysis prompt
            this.generatePrompt();
            
            // Show the next sections
            document.getElementById('img-prompt-section').classList.remove('hidden');
            document.getElementById('img-response-section').classList.remove('hidden');
            
            this.showAlert('Script uploaded successfully! Copy the prompt below for LLM analysis.', 'success');
            
        } catch (error) {
            console.error('Failed to read file:', error);
            this.showAlert('Failed to read file: ' + error.message, 'error');
        }
    }
    
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    generatePrompt() {
        if (!this.scriptContent) {
            this.showAlert('No script content available', 'error');
            return;
        }
        
        try {
            const prompt = VisualAnalyzer.generatePrompt(this.scriptContent);
            document.getElementById('img-llm-prompt').textContent = prompt;
            
            console.log('Generated visual analysis prompt:', prompt.length, 'characters');
        } catch (error) {
            console.error('Failed to generate prompt:', error);
            this.showAlert('Failed to generate analysis prompt', 'error');
        }
    }
    
    async copyPrompt() {
        const promptElement = document.getElementById('img-llm-prompt');
        if (!promptElement.textContent) {
            this.showAlert('No prompt to copy', 'warning');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(promptElement.textContent);
            
            // Show feedback
            const copyButton = document.getElementById('img-copy-prompt');
            const originalText = copyButton.textContent;
            copyButton.textContent = 'Copied!';
            copyButton.style.backgroundColor = '#22c55e';
            
            setTimeout(() => {
                copyButton.textContent = originalText;
                copyButton.style.backgroundColor = '';
            }, 2000);
            
            this.showAlert('Prompt copied to clipboard! Paste it into Claude or ChatGPT.', 'success');
        } catch (error) {
            console.error('Failed to copy prompt:', error);
            this.showAlert('Failed to copy prompt to clipboard', 'error');
        }
    }
    
    parseResponse() {
        const responseText = document.getElementById('img-llm-response').value.trim();
        
        if (!responseText) {
            this.showAlert('Please paste the LLM response first', 'warning');
            return;
        }
        
        try {
            // Use the VisualAnalyzer to validate and parse the response
            const parsedData = VisualAnalyzer.validateJsonResponse(responseText);
            
            this.visualData = parsedData;
            this.displayVisualData();
            
            // Show the display and export sections
            document.getElementById('img-display-section').classList.remove('hidden');
            document.getElementById('img-export-section').classList.remove('hidden');
            
            const totalOpps = parsedData.visualOpportunities.length;
            const videoCount = VisualAnalyzer.getVideoOpportunities(parsedData.visualOpportunities).length;
            
            this.showAlert(`Successfully parsed ${totalOpps} visual opportunities (${videoCount} video candidates)!`, 'success');
            
        } catch (error) {
            console.error('Failed to parse response:', error);
            this.showAlert(`Failed to parse response: ${error.message}`, 'error');
        }
    }
    
    displayVisualData() {
        if (!this.visualData) return;
        
        const { visualOpportunities = [], summary = {} } = this.visualData;
        
        // Update stats
        this.updateStats(visualOpportunities, summary);
        
        // Render all images
        this.renderImageList(visualOpportunities);
        
        // Render video candidates
        this.renderVideoList(visualOpportunities);
    }
    
    updateStats(opportunities, summary) {
        const videoOpportunities = VisualAnalyzer.getVideoOpportunities(opportunities);
        const impactStats = VisualAnalyzer.getImpactStats(opportunities);
        
        document.getElementById('total-images').textContent = opportunities.length;
        document.getElementById('total-videos').textContent = videoOpportunities.length;
        document.getElementById('epic-moments').textContent = impactStats.EPIC;
    }
    
    renderImageList(opportunities) {
        const imageHTML = opportunities.map((vis, index) => this.createImageItemHTML(vis, index)).join('');
        document.getElementById('image-list').innerHTML = imageHTML || '<p>No visual opportunities found</p>';
        
        // Add event listeners for copy buttons
        this.setupCopyButtons();
    }
    
    renderVideoList(opportunities) {
        const videoOpportunities = VisualAnalyzer.getVideoOpportunities(opportunities);
        const videoHTML = videoOpportunities.map((vis, index) => this.createVideoItemHTML(vis, index)).join('');
        document.getElementById('video-list').innerHTML = videoHTML || '<p>No video candidates found</p>';
        
        // Add event listeners for copy buttons
        this.setupCopyButtons();
    }
    
    createImageItemHTML(vis, index) {
        return `
            <div class="visual-item ${vis.impact.toLowerCase()}" data-index="${index}">
                <div class="visual-header">
                    <span class="visual-number">${String(index + 1).padStart(3, '0')}</span>
                    <span class="visual-type ${vis.type.toLowerCase()}">${this.formatType(vis.type)}</span>
                    <span class="visual-impact impact-${vis.impact.toLowerCase()}">${vis.impact}</span>
                    ${vis.videoPotential ? '<span class="video-badge">🎬 Video</span>' : ''}
                </div>
                <div class="visual-scene">Lines ${vis.lineRange}: ${vis.scene}</div>
                <div class="prompt-container">
                    <label>Midjourney Prompt:</label>
                    <textarea class="visual-prompt" data-index="${index}" rows="3">${vis.midjourneyPrompt}</textarea>
                    <button class="copy-single-prompt" data-prompt="${vis.midjourneyPrompt}">Copy</button>
                </div>
                ${vis.videoPotential ? `
                    <div class="video-info">
                        <strong>Video Rationale:</strong> ${vis.videoRationale}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    createVideoItemHTML(vis, index) {
        const adaptedPrompt = VisualAnalyzer.adaptMidjourneyForVideo(vis.midjourneyPrompt);
        return `
            <div class="visual-item video-candidate" data-index="${index}">
                <div class="visual-header">
                    <span class="visual-number">V${String(index + 1).padStart(2, '0')}</span>
                    <span class="visual-type ${vis.type.toLowerCase()}">${this.formatType(vis.type)}</span>
                    <span class="visual-impact impact-${vis.impact.toLowerCase()}">${vis.impact}</span>
                </div>
                <div class="visual-scene">${vis.scene}</div>
                <div class="prompt-container">
                    <label>Kling Prompt (adapted for video):</label>
                    <textarea class="video-prompt" rows="2">${adaptedPrompt}</textarea>
                    <button class="copy-single-prompt" data-prompt="${adaptedPrompt}">Copy</button>
                </div>
                <div class="video-info">
                    <strong>Why this works for video:</strong> ${vis.videoRationale}
                </div>
            </div>
        `;
    }
    
    setupCopyButtons() {
        document.querySelectorAll('.copy-single-prompt').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const prompt = e.target.dataset.prompt;
                try {
                    await navigator.clipboard.writeText(prompt);
                    e.target.textContent = 'Copied!';
                    e.target.style.backgroundColor = '#22c55e';
                    setTimeout(() => {
                        e.target.textContent = 'Copy';
                        e.target.style.backgroundColor = '';
                    }, 2000);
                } catch (error) {
                    console.error('Failed to copy prompt:', error);
                    this.showAlert('Failed to copy prompt', 'error');
                }
            });
        });
    }
    
    formatType(type) {
        return type.replace(/_/g, ' ').toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    switchVisualTab(type) {
        // Update tab buttons
        document.querySelectorAll('.visual-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        
        // Show/hide lists
        document.getElementById('image-list').classList.toggle('hidden', type !== 'images');
        document.getElementById('video-list').classList.toggle('hidden', type !== 'videos');
        
        // Update active class for lists
        document.getElementById('image-list').classList.toggle('active', type === 'images');
        document.getElementById('video-list').classList.toggle('active', type === 'videos');
    }
    
    exportMidjourney() {
        if (!this.visualData || !this.visualData.visualOpportunities) {
            this.showAlert('No visual data to export', 'warning');
            return;
        }
        
        const prompts = this.visualData.visualOpportunities
            .map((vis, index) => 
                `=== Image ${index + 1}: ${vis.scene} ===\n` +
                `Type: ${vis.type} | Impact: ${vis.impact}\n` +
                `Lines: ${vis.lineRange}\n` +
                `Prompt:\n${vis.midjourneyPrompt}\n\n`
            ).join('\n');
        
        const header = `Midjourney Prompts for: ${this.scriptFilename}\n` +
                      `Generated: ${new Date().toLocaleDateString()}\n` +
                      `Total Images: ${this.visualData.visualOpportunities.length}\n\n` +
                      `=`.repeat(60) + '\n\n';
        
        this.downloadFile('midjourney_prompts.txt', header + prompts);
        this.showAlert('Midjourney prompts exported successfully!', 'success');
    }
    
    exportKling() {
        if (!this.visualData || !this.visualData.visualOpportunities) {
            this.showAlert('No visual data to export', 'warning');
            return;
        }
        
        const videoOpportunities = VisualAnalyzer.getVideoOpportunities(this.visualData.visualOpportunities);
        
        if (videoOpportunities.length === 0) {
            this.showAlert('No video candidates to export', 'warning');
            return;
        }
        
        const videoPrompts = videoOpportunities
            .map((vis, index) => 
                `=== Video ${index + 1}: ${vis.scene} ===\n` +
                `Type: ${vis.type} | Impact: ${vis.impact}\n` +
                `Lines: ${vis.lineRange}\n` +
                `Rationale: ${vis.videoRationale}\n` +
                `Prompt:\n${VisualAnalyzer.adaptMidjourneyForVideo(vis.midjourneyPrompt)}\n\n`
            ).join('\n');
        
        const header = `Kling Video Prompts for: ${this.scriptFilename}\n` +
                      `Generated: ${new Date().toLocaleDateString()}\n` +
                      `Total Videos: ${videoOpportunities.length}\n\n` +
                      `=`.repeat(60) + '\n\n';
        
        this.downloadFile('kling_video_prompts.txt', header + videoPrompts);
        this.showAlert('Kling video prompts exported successfully!', 'success');
    }
    
    exportPDF() {
        if (!this.visualData || !this.visualData.visualOpportunities) {
            this.showAlert('No visual data to export', 'warning');
            return;
        }
        
        // Create a beautiful HTML document that will be saved as PDF
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Visual Script Analysis - ${new Date().toLocaleDateString()}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap');
        
        body {
            font-family: 'Inter', sans-serif;
            color: #1a1a2e;
            line-height: 1.6;
            margin: 0;
            padding: 40px;
            background: #f8f9fa;
        }
        
        .header {
            text-align: center;
            margin-bottom: 60px;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 20px;
        }
        
        h1 {
            font-family: 'Playfair Display', serif;
            font-size: 3em;
            margin: 0 0 10px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .stats {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin: 40px 0;
        }
        
        .stat {
            text-align: center;
            background: white;
            padding: 20px 30px;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .stat-value {
            font-size: 2.5em;
            font-weight: 700;
            color: #667eea;
        }
        
        .stat-label {
            font-size: 0.9em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .visual-section {
            margin-bottom: 30px;
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            break-inside: avoid;
        }
        
        .visual-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .visual-number {
            font-size: 2em;
            font-weight: 700;
            color: #667eea;
            min-width: 60px;
        }
        
        .type-badge {
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .type-epic { background: #fee2e2; color: #dc2626; }
        .type-character { background: #ddd6fe; color: #6d28d9; }
        .type-atmosphere { background: #cffafe; color: #0891b2; }
        .type-action { background: #fed7aa; color: #ea580c; }
        .type-emotional { background: #fce7f3; color: #db2777; }
        .type-location { background: #d9f99d; color: #65a30d; }
        
        .impact {
            margin-left: auto;
            font-weight: 700;
            font-size: 1.1em;
        }
        
        .impact-epic { color: #dc2626; }
        .impact-high { color: #f59e0b; }
        .impact-medium { color: #3b82f6; }
        .impact-low { color: #6b7280; }
        
        .scene-description {
            font-size: 1.1em;
            color: #333;
            margin-bottom: 15px;
            font-style: italic;
        }
        
        .prompt-box {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 0.95em;
            line-height: 1.5;
        }
        
        .video-note {
            margin-top: 15px;
            padding: 15px;
            background: #f3f4f6;
            border-radius: 8px;
            border-left: 4px solid #8b5cf6;
        }
        
        .video-note strong {
            color: #8b5cf6;
        }
        
        @media print {
            body { padding: 20px; }
            .visual-section { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Visual Script Analysis</h1>
        <div class="subtitle">AI-Generated Visual Opportunities</div>
        <div class="subtitle">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
    
    <div class="stats">
        <div class="stat">
            <div class="stat-value">${this.visualData.visualOpportunities.length}</div>
            <div class="stat-label">Total Visuals</div>
        </div>
        <div class="stat">
            <div class="stat-value">${this.visualData.visualOpportunities.filter(v => v.videoPotential).length}</div>
            <div class="stat-label">Video Ready</div>
        </div>
        <div class="stat">
            <div class="stat-value">${this.visualData.visualOpportunities.filter(v => v.impact === 'EPIC').length}</div>
            <div class="stat-label">Epic Moments</div>
        </div>
    </div>
    
    ${this.visualData.visualOpportunities.map((vis, index) => `
        <div class="visual-section">
            <div class="visual-header">
                <div class="visual-number">#${String(index + 1).padStart(3, '0')}</div>
                <div class="type-badge type-${this.getTypeClass(vis.type)}">${this.formatType(vis.type)}</div>
                <div class="impact impact-${vis.impact.toLowerCase()}">${vis.impact}</div>
            </div>
            <div class="scene-description">Lines ${vis.lineRange}: "${vis.scene}"</div>
            <div class="prompt-box">${vis.midjourneyPrompt}</div>
            ${vis.videoPotential ? `
                <div class="video-note">
                    <strong>🎬 Video Potential:</strong> ${vis.videoRationale}
                </div>
            ` : ''}
        </div>
    `).join('')}
</body>
</html>`;
        
        // Create blob and download
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        
        // Open in new window for user to save as PDF
        const printWindow = window.open(url, '_blank');
        setTimeout(() => {
            printWindow.print();
            window.URL.revokeObjectURL(url);
        }, 1000);
        
        this.showAlert('PDF report opened for printing/saving!', 'success');
    }
    
    async exportVisualSummary() {
        if (!this.visualData || !this.visualData.visualOpportunities) {
            this.showAlert('No visual data to export', 'warning');
            return;
        }
        
        // Create a visual canvas summary
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size (1920x1080 for a nice wallpaper-style image)
        canvas.width = 1920;
        canvas.height = 1080;
        
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add dark overlay for text readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Title
        ctx.fillStyle = 'white';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Visual Script Analysis', canvas.width / 2, 120);
        
        // Subtitle
        ctx.font = '36px Arial';
        ctx.fillText(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), canvas.width / 2, 180);
        
        // Stats boxes
        const stats = [
            { label: 'Total Visuals', value: this.visualData.visualOpportunities.length },
            { label: 'Video Scenes', value: this.visualData.visualOpportunities.filter(v => v.videoPotential).length },
            { label: 'Epic Moments', value: this.visualData.visualOpportunities.filter(v => v.impact === 'EPIC').length }
        ];
        
        const boxWidth = 300;
        const boxHeight = 150;
        const startX = (canvas.width - (boxWidth * 3 + 60)) / 2;
        
        stats.forEach((stat, index) => {
            const x = startX + (boxWidth + 30) * index;
            const y = 250;
            
            // Box background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.roundRect(ctx, x, y, boxWidth, boxHeight, 20);
            
            // Value
            ctx.fillStyle = '#667eea';
            ctx.font = 'bold 64px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(stat.value, x + boxWidth / 2, y + 80);
            
            // Label
            ctx.fillStyle = '#666';
            ctx.font = '24px Arial';
            ctx.fillText(stat.label, x + boxWidth / 2, y + 120);
        });
        
        // Key moments grid
        ctx.fillStyle = 'white';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Key Visual Moments:', 100, 500);
        
        // List top 5 epic/high impact scenes
        const topScenes = this.visualData.visualOpportunities
            .filter(v => v.impact === 'EPIC' || v.impact === 'HIGH')
            .slice(0, 5);
        
        ctx.font = '24px Arial';
        topScenes.forEach((scene, index) => {
            const y = 560 + (index * 60);
            
            // Scene number
            ctx.fillStyle = '#fbbf24';
            ctx.fillText(`#${String(this.visualData.visualOpportunities.indexOf(scene) + 1).padStart(3, '0')}`, 100, y);
            
            // Scene description (truncated)
            ctx.fillStyle = 'white';
            const description = scene.scene.length > 80 ? scene.scene.substring(0, 77) + '...' : scene.scene;
            ctx.fillText(description, 200, y);
            
            // Type badge
            ctx.fillStyle = this.getTypeColor(scene.type);
            ctx.font = 'bold 18px Arial';
            ctx.fillText(scene.type.replace(/_/g, ' '), 1600, y);
            ctx.font = '24px Arial';
        });
        
        // Footer
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Generated by Campaign TTS Processor - Image Scourer Module', canvas.width / 2, canvas.height - 40);
        
        // Convert to WebP and download
        canvas.toBlob((blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `visual_analysis_${Date.now()}.webp`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 'image/webp', 0.95);
        
        this.showAlert('Visual summary image downloaded!', 'success');
    }
    
    exportAll() {
        if (!this.visualData) {
            this.showAlert('No visual data to export', 'warning');
            return;
        }
        
        const exportData = {
            metadata: {
                scriptName: this.scriptFilename,
                exportDate: new Date().toISOString(),
                totalOpportunities: this.visualData.visualOpportunities.length,
                videoOpportunities: VisualAnalyzer.getVideoOpportunities(this.visualData.visualOpportunities).length
            },
            ...this.visualData
        };
        
        const fullData = JSON.stringify(exportData, null, 2);
        this.downloadFile('visual_analysis_complete.json', fullData);
        this.showAlert('Complete visual analysis data exported!', 'success');
    }
    
    getTypeClass(type) {
        // Convert visual type to CSS class name for PDF styling
        const typeMap = {
            'CHARACTER_REVEAL': 'character',
            'EPIC_MOMENT': 'epic',
            'ATMOSPHERE': 'atmosphere',
            'ACTION_SEQUENCE': 'action',
            'EMOTIONAL_BEAT': 'emotional',
            'LOCATION_ESTABLISH': 'location'
        };
        return typeMap[type] || 'epic';
    }
    
    getTypeColor(type) {
        // Get color for canvas text rendering
        const colors = {
            'CHARACTER_REVEAL': '#6d28d9',
            'EPIC_MOMENT': '#dc2626',
            'ATMOSPHERE': '#0891b2',
            'ACTION_SEQUENCE': '#ea580c',
            'EMOTIONAL_BEAT': '#db2777',
            'LOCATION_ESTABLISH': '#65a30d'
        };
        return colors[type] || '#667eea';
    }
    
    roundRect(ctx, x, y, width, height, radius) {
        // Helper function to draw rounded rectangles on canvas
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }
    
    downloadFile(filename, content) {
        try {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to download file:', error);
            this.showAlert('Failed to download file', 'error');
        }
    }
    
    showAlert(message, type = 'info') {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = `temporary-message ${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
        `;
        
        // Set background color based on type
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize the Image Scourer Module when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.imageScourerModule = new ImageScourerModule();
    console.log('Image Scourer Module initialized');
});

// Export for global access
window.ImageScourerModule = ImageScourerModule; 