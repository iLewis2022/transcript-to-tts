// Campaign TTS Processor - Main Application
class TTSApp {
    constructor() {
        this.currentStep = 'upload';
        this.scriptData = null;
        this.speakerMapping = {};
        this.init();
    }

    init() {
        console.log('TTS Processor initialized');
        this.setupEventListeners();
        this.loadInitialView();
    }

    setupEventListeners() {
        // Event listeners will be added as we build components
    }

    loadInitialView() {
        // Initial view loading logic
        console.log('Loading initial view...');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ttsApp = new TTSApp();
}); 