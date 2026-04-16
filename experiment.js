class TextResponseExperiment {
    constructor() {
        this.texts = [];
        this.responses = [];
        this.currentIndex = 0;
        this.isStarted = false;
        this.userId = null;
        this.EXPERIMENT_ID = 273;
        this.COMPLETION_CODE = 'C8444JFR';
        this.sessionStart = null;
        this.sessionEnd = null;
        this.listId = this.getListIdFromUrl();
        this.isTerminated = false;
        this.experimentCompleted = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadFromCSV(this.getListFilename());
    }

    initializeElements() {
        // Screen elements
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.consentScreen = document.getElementById('consent-screen');
        this.aiPolicyScreen = document.getElementById('ai-policy-screen');
        this.experimentScreen = document.getElementById('experiment-screen');
        this.completionScreen = document.getElementById('completion-screen');
        this.terminatedScreen = document.getElementById('terminated-screen');
        
        // Welcome screen elements
        this.startBtn = document.getElementById('start-btn');
        
        // Consent screen elements
        this.consentCheckbox = document.getElementById('consent-checkbox');
        this.consentContinueBtn = document.getElementById('consent-continue-btn');
        
        // AI Policy screen elements
        this.aiPolicyCheckbox = document.getElementById('ai-policy-checkbox');
        this.aiPolicyContinueBtn = document.getElementById('ai-policy-continue-btn');
        this.totalTextsSpan = document.getElementById('total-texts');
        this.userIdInput = document.getElementById('user-id-input');
        this.userIdError = document.getElementById('user-id-error');
        
        // Experiment screen elements
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.currentTextNumber = document.getElementById('current-text-number');
        this.textContent = document.getElementById('text-content');
        this.responseTextarea = document.getElementById('response-textarea');
        this.responseLengthError = document.getElementById('response-length-error');
        this.nextBtn = document.getElementById('next-btn');
        
        // Debrief screen elements
        this.debriefScreen = document.getElementById('debrief-screen');
        this.debriefTextarea = document.getElementById('debrief-textarea');
        this.debriefSubmitBtn = document.getElementById('debrief-submit-btn');
        this.debriefError = document.getElementById('debrief-error');

        // Completion screen elements
        this.downloadBtn = document.getElementById('download-btn');
        this.completionCode = document.getElementById('completion-code');
        this.feedbackTextarea = document.getElementById('feedback-textarea');
        this.feedbackSubmitBtn = document.getElementById('feedback-submit-btn');
        this.feedbackSentMsg = document.getElementById('feedback-sent-msg');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.showConsentScreen());
        this.consentCheckbox.addEventListener('change', () => this.validateConsent());
        this.consentContinueBtn.addEventListener('click', () => this.showAiPolicyScreen());
        this.aiPolicyCheckbox.addEventListener('change', () => this.validateAiPolicy());
        this.aiPolicyContinueBtn.addEventListener('click', () => this.startExperiment());
        this.textContent.addEventListener('copy', (e) => e.preventDefault());
        this.nextBtn.addEventListener('click', () => this.nextText());
        this.responseTextarea.addEventListener('input', () => this.validateResponse());
        this.responseTextarea.addEventListener('paste', (e) => e.preventDefault());
        this.downloadBtn.addEventListener('click', () => this.downloadResults());
        this.feedbackSubmitBtn.addEventListener('click', () => this.submitFeedback());
        this.debriefSubmitBtn.addEventListener('click', () => this.submitDebrief());
        this.userIdInput.addEventListener('input', () => this.validateUserId());
        
        document.addEventListener('visibilitychange', () => this.onVisibilityChange());
        
        // Allow Enter key to submit (with Ctrl/Cmd modifier to prevent accidental submission)
        this.responseTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (!this.nextBtn.disabled) {
                    this.nextText();
                }
            }
        });
    }

    getListIdFromUrl() {
        try {
            const params = new URLSearchParams(window.location.search);
            const raw = params.get('list_id');
            let listId = parseInt(raw, 10);
            if (!Number.isFinite(listId) || listId < 1 || listId > 20) {
                listId = 1;
            }
            return listId;
        } catch (e) {
            console.warn('Error parsing list_id from URL, defaulting to 1', e);
            return 1;
        }
    }

    getListFilename() {
        return `dei10_list_${this.listId}.csv`;
    }

    // Method to load data from CSV
    async loadFromCSV(csvFile) {
        try {
            const response = await fetch(csvFile);
            const csvText = await response.text();
            this.texts = this.parseCSV(csvText);
            this.updateWelcomeScreen();
        } catch (error) {
            console.error('Error loading CSV:', error);
            alert('No se pudieron cargar los datos del experimento. Compruebe el archivo CSV.');
        }
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const texts = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            if (values.length >= 2) {
                texts.push({
                    id: parseInt(values[0]) || i,
                    text: values[1] || values[0] // Use second column if available, otherwise first
                });
            }
        }
        // Randomize order so participants with the same list_id
        // do not all see items in the same sequence
        for (let i = texts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [texts[i], texts[j]] = [texts[j], texts[i]];
        }

        return texts;
    }

    updateWelcomeScreen() {
        this.totalTextsSpan.textContent = this.texts.length;
    }

    validateUserId() {
        const userId = this.userIdInput.value.trim();
        const errorElement = this.userIdError;
        
        if (userId.length === 0) {
            errorElement.textContent = 'Introduzca su ID de Prolific';
            this.startBtn.disabled = true;
            return false;
        } else if (userId.length < 3) {
            errorElement.textContent = 'El ID debe tener al menos 3 caracteres';
            this.startBtn.disabled = true;
            return false;
        } else {
            errorElement.textContent = '';
            this.startBtn.disabled = false;
            return true;
        }
    }

    showConsentScreen() {
        if (this.texts.length === 0) {
            alert('No hay textos disponibles para el experimento.');
            return;
        }
        if (!this.validateUserId()) {
            return;
        }
        this.userId = this.userIdInput.value.trim();
        this.consentCheckbox.checked = false;
        this.consentContinueBtn.disabled = true;
        this.showScreen('consent');
    }

    validateConsent() {
        this.consentContinueBtn.disabled = !this.consentCheckbox.checked;
    }

    onVisibilityChange() {
        if (!document.hidden) return;
        if (!this.isStarted || this.isTerminated || this.experimentCompleted) return;
        this.isTerminated = true;
        const payload = this.buildTerminatedPayload();
        this.sendDataToServer(payload);
        this.showScreen('terminated');
    }

    buildTerminatedPayload() {
        return [{
            participantId: this.userId,
            Experiment: this.EXPERIMENT_ID,
            listId: this.listId,
            trialIndex: null,
            textId: null,
            textIndex: null,
            prompt: null,
            response: 'Experiment terminated: participant switched to another tab during the study.',
            responseTimestamp: new Date().toISOString(),
            completionCode: null,
            totalTexts: this.texts.length,
            sessionStart: this.sessionStart,
            sessionEnd: new Date().toISOString()
        }];
    }

    showAiPolicyScreen() {
        if (!this.consentCheckbox.checked) return;
        this.aiPolicyCheckbox.checked = false;
        this.aiPolicyContinueBtn.disabled = true;
        this.showScreen('aiPolicy');
    }

    validateAiPolicy() {
        this.aiPolicyContinueBtn.disabled = !this.aiPolicyCheckbox.checked;
    }

    startExperiment() {
        this.isStarted = true;
        this.currentIndex = 0;
        this.responses = [];
        this.sessionStart = new Date().toISOString();
        this.sessionEnd = null;
        
        this.showScreen('experiment');
        this.displayCurrentText();
    }

    showScreen(screenName) {
        // Hide all screens
        this.welcomeScreen.classList.remove('active');
        this.consentScreen.classList.remove('active');
        this.aiPolicyScreen.classList.remove('active');
        this.experimentScreen.classList.remove('active');
        this.completionScreen.classList.remove('active');
        this.debriefScreen.classList.remove('active');
        this.terminatedScreen.classList.remove('active');
        
        // Show the requested screen
        switch (screenName) {
            case 'welcome':
                this.welcomeScreen.classList.add('active');
                break;
            case 'consent':
                this.consentScreen.classList.add('active');
                break;
            case 'aiPolicy':
                this.aiPolicyScreen.classList.add('active');
                break;
            case 'experiment':
                this.experimentScreen.classList.add('active');
                break;
            case 'debrief':
                this.debriefScreen.classList.add('active');
                break;
            case 'completion':
                this.completionScreen.classList.add('active');
                break;
            case 'terminated':
                this.terminatedScreen.classList.add('active');
                break;
        }
    }

    displayCurrentText() {
        const currentText = this.texts[this.currentIndex];
        
        // Update progress
        const progress = ((this.currentIndex + 1) / this.texts.length) * 100;
        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = `${this.currentIndex + 1} / ${this.texts.length}`;
        
        // Update text content
        this.currentTextNumber.textContent = this.currentIndex + 1;
        this.textContent.textContent = currentText.text;
        
        // Clear response, reset button, and any length error
        this.responseTextarea.value = '';
        this.nextBtn.disabled = true;
        this.responseLengthError.textContent = '';
        this.responseTextarea.focus();
    }

    getResponseWordCount(text) {
        return text.trim().split(/\s+/).filter(Boolean).length;
    }

    validateResponse() {
        const response = this.responseTextarea.value.trim();
        const wordCount = this.getResponseWordCount(response);
        this.nextBtn.disabled = response.length === 0;
        if (wordCount > 2) {
            this.responseLengthError.textContent = '';
        }
    }

    nextText() {
        const response = this.responseTextarea.value.trim();
        if (this.getResponseWordCount(response) <= 2) {
            this.responseLengthError.textContent = 'La respuesta es demasiado corta. Inténtelo de nuevo.';
            return;
        }
        this.responseLengthError.textContent = '';
        
        // Save current response
        this.responses.push({
            textId: this.texts[this.currentIndex].id,
            textIndex: this.currentIndex,
            response: response,
            timestamp: new Date().toISOString()
        });
        
        // Move to next text or complete experiment
        this.currentIndex++;
        
        if (this.currentIndex < this.texts.length) {
            this.displayCurrentText();
        } else {
            this.completeExperiment();
        }
    }

    buildSubmissionPayload() {
        const completionCode = this.completionCode ? this.completionCode.textContent : this.generateCompletionCode();
        const sessionEnd = this.sessionEnd || new Date().toISOString();
        return this.responses.map((r, index) => ({
            participantId: this.userId,
            Experiment: this.EXPERIMENT_ID,
            listId: this.listId,
            trialIndex: index,
            textId: r.textId,
            textIndex: r.textIndex,
            prompt: this.texts[r.textIndex] ? this.texts[r.textIndex].text : '',
            response: r.response,
            responseTimestamp: r.timestamp,
            completionCode: completionCode,
            totalTexts: this.texts.length,
            sessionStart: this.sessionStart,
            sessionEnd: sessionEnd
        }));
    }

    completeExperiment() {
        if (this.isTerminated) return;
        this.experimentCompleted = true;
        this.sessionEnd = new Date().toISOString();
        const completionCode = this.generateCompletionCode();
        this.completionCode.textContent = completionCode;

        const payload = this.buildSubmissionPayload();
        this.sendDataToServer(payload);
        this.showScreen('debrief');
    }

    generateCompletionCode() {
        // Return a fixed, deploy-time configurable completion code
        return this.COMPLETION_CODE;
    }

    buildFeedbackPayload(feedbackText) {
        const completionCode = this.completionCode ? this.completionCode.textContent : this.generateCompletionCode();
        const sessionEnd = this.sessionEnd || new Date().toISOString();
        return [{
            participantId: this.userId,
            Experiment: this.EXPERIMENT_ID,
            listId: this.listId,
            trialIndex: null,
            textId: null,
            textIndex: null,
            prompt: null,
            response: feedbackText,
            responseTimestamp: new Date().toISOString(),
            completionCode: completionCode,
            totalTexts: this.texts.length,
            sessionStart: this.sessionStart,
            sessionEnd: sessionEnd
        }];
    }

    submitFeedback() {
        const feedbackText = this.feedbackTextarea.value.trim();
        const payload = this.buildFeedbackPayload(feedbackText);
        this.sendDataToServer(payload);
        this.feedbackSubmitBtn.disabled = true;
        this.feedbackTextarea.disabled = true;
        this.feedbackSentMsg.textContent = '¡Gracias!';
    }

    buildDebriefPayload(debriefResponse) {
        const completionCode = this.completionCode ? this.completionCode.textContent : this.generateCompletionCode();
        const sessionEnd = this.sessionEnd || new Date().toISOString();
        return [{
            participantId: this.userId,
            Experiment: this.EXPERIMENT_ID,
            listId: this.listId,
            trialIndex: null,
            textId: null,
            textIndex: null,
            prompt: 'DEBRIEF: List all languages which you speak or have studied in your life',
            response: debriefResponse,
            responseTimestamp: new Date().toISOString(),
            completionCode: completionCode,
            totalTexts: this.texts.length,
            sessionStart: this.sessionStart,
            sessionEnd: sessionEnd
        }];
    }

    submitDebrief() {
        const debriefResponse = this.debriefTextarea.value.trim();
        if (debriefResponse.length === 0) {
            this.debriefError.textContent = 'Por favor, responda a la pregunta antes de continuar.';
            return;
        }
        this.debriefError.textContent = '';
        const payload = this.buildDebriefPayload(debriefResponse);
        this.sendDataToServer(payload);
        this.showScreen('completion');
        const showDownload = this.userId === 'test';
        this.downloadBtn.disabled = !showDownload;
        this.downloadBtn.style.display = showDownload ? '' : 'none';
    }

    downloadResults() {
        const payload = this.buildSubmissionPayload();
        const dataStr = JSON.stringify(payload, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `experiment_results_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    sendDataToServer(jsonData) {
        const xhr = new XMLHttpRequest();
        const url = `https://noisy-comp-server-311aa565092d.herokuapp.com/api/submit_experiment/${String(this.EXPERIMENT_ID)}`;

        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                console.log("Success:", xhr.responseText);
            } else {
                console.error("Request failed with status:", xhr.status);
                console.error("Response:", xhr.responseText);
                console.error("Request URL:", url);
                console.error("Request data:", JSON.stringify(jsonData, null, 2));
            }
        };

        xhr.onerror = function () {
            console.error("Network error occurred while sending data");
        };

        console.log("Sending data to server:", JSON.stringify(jsonData, null, 2));
        console.log("URL:", url);

        try {
            const jsonString = JSON.stringify(jsonData);
            xhr.send(jsonString);
        } catch (error) {
            console.error("Error stringifying JSON:", error);
            console.error("Data that failed to stringify:", jsonData);
        }
    }

    // Public method to load custom CSV data
    setTexts(texts) {
        this.texts = texts;
        this.updateWelcomeScreen();
    }
}

// Initialize the experiment when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.experiment = new TextResponseExperiment();
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextResponseExperiment;
}
