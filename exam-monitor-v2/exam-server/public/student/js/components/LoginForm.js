/**
 * LoginForm Component - Pure behavior for existing login form
 * Works with existing DOM elements in index.html
 */
import { Validation } from '/shared/js/utils.js';

export class LoginForm {
    constructor(websocketService) {
        this.websocketService = websocketService;
        this.isLoading = false;
        this.callbacks = new Map();

        // Cache existing DOM elements from index.html
        this.elements = {
            nameInput: document.getElementById('student-name'),
            classInput: document.getElementById('student-class'),
            submitButton: document.getElementById('login-btn'),
            statusDiv: document.getElementById('login-status')
        };

        this.validateElements();
        this.setupEventListeners();
        console.log('📝 LoginForm component initialized');
    }

    /**
     * Validate that required DOM elements exist
     */
    validateElements() {
        const required = ['nameInput', 'classInput', 'submitButton', 'statusDiv'];
        const missing = required.filter(key => !this.elements[key]);

        if (missing.length > 0) {
            console.error('❌ Missing DOM elements:', missing);
            throw new Error(`LoginForm requires DOM elements: ${missing.join(', ')}`);
        }
    }

    /**
     * Setup event listeners for existing form
     */
    setupEventListeners() {
        // Form submission
        this.elements.submitButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Real-time validation
        this.elements.nameInput.addEventListener('input', () => {
            this.validateInput(this.elements.nameInput, 'name');
        });

        this.elements.classInput.addEventListener('input', () => {
            this.validateInput(this.elements.classInput, 'class');
        });

        // Enter key handling
        [this.elements.nameInput, this.elements.classInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSubmit();
                }
            });
        });
    }

    /**
     * Handle form submission
     */
    async handleSubmit() {
        if (this.isLoading) return;

        const name = this.elements.nameInput.value.trim();
        const studentClass = this.elements.classInput.value.trim();

        // Validate inputs
        const validation = this.validateInputs(name, studentClass);
        if (!validation.isValid) {
            this.showStatus(validation.message, 'error');
            return;
        }

        this.setLoading(true);
        this.showStatus('Logging into exam...', 'loading');

        try {
            // Store values for potential retry
            this.lastInputs = { name, studentClass };

            // Send login request
            this.websocketService.studentLogin(name, studentClass);
            this.emit('loginAttempt', { name, studentClass });

        } catch (error) {
            console.error('❌ Login submission error:', error);
            this.handleLoginError({ message: 'Възникна грешка при влизане' });
        }
    }

    /**
     * Validate inputs
     */
    validateInputs(name, studentClass) {
        if (!name || !studentClass) {
            return {
                isValid: false,
                message: 'Моля въведете име и клас!'
            };
        }

        if (!Validation.isValidBulgarianName(name)) {
            return {
                isValid: false,
                message: 'Името трябва да съдържа само български букви и интервали'
            };
        }

        if (!Validation.isValidClassName(studentClass)) {
            return {
                isValid: false,
                message: 'Класът трябва да е във формат 11А, 12Б и т.н.'
            };
        }

        return { isValid: true };
    }

    /**
     * Validate single input and update styling
     */
    validateInput(input, type) {
        const value = input.value.trim();
        let isValid = true;

        if (type === 'name' && value) {
            isValid = Validation.isValidBulgarianName(value);
        } else if (type === 'class' && value) {
            isValid = Validation.isValidClassName(value);
        }

        // Update input styling via CSS classes
        input.classList.toggle('invalid', !isValid && value.length > 0);
    }

    /**
     * Handle successful login
     */
    handleLoginSuccess(data, type = 'new') {
        const message = type === 'restored'
            ? data.message
            : 'Login successful! Entering exam mode...';

        this.showStatus(message, 'success');
        this.emit('loginSuccess', { data, type });
    }

    /**
     * Handle login error
     */
    handleLoginError(errorData) {
        this.setLoading(false);
        this.showStatus(errorData.message, 'error');
        this.emit('loginError', errorData);
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;
        this.elements.submitButton.disabled = loading;

        if (loading) {
            this.elements.submitButton.textContent = 'Logging in...';
            this.elements.submitButton.classList.add('loading');
        } else {
            this.elements.submitButton.textContent = 'Enter Exam';
            this.elements.submitButton.classList.remove('loading');
        }
    }

    /**
     * Show status message
     */
    showStatus(message, type) {
        this.elements.statusDiv.textContent = message;
        this.elements.statusDiv.className = `login-status ${type}`;
        this.elements.statusDiv.style.display = 'block';

        if (type === 'success') {
            setTimeout(() => {
                this.elements.statusDiv.style.display = 'none';
            }, 3000);
        }
    }

    /**
     * Get form values
     */
    getValues() {
        return {
            name: this.elements.nameInput.value.trim(),
            studentClass: this.elements.classInput.value.trim()
        };
    }

    /**
     * Clear form
     */
    clear() {
        this.elements.nameInput.value = '';
        this.elements.classInput.value = '';
        this.elements.statusDiv.style.display = 'none';
        this.setLoading(false);
    }

    /**
     * Event subscription
     */
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }

    /**
     * Emit event
     */
    emit(event, data = {}) {
        if (this.callbacks.has(event)) {
            this.callbacks.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ LoginForm callback error for ${event}:`, error);
                }
            });
        }
    }
}