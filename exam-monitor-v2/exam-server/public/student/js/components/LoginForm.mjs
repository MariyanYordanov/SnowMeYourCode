/**
 * LoginForm Component - Student login UI
 * Handles login form interactions and validation
 */
import { Validation } from '../shared/js/utils.js';

export class LoginForm {
    constructor(container, websocketService) {
        this.container = container;
        this.websocketService = websocketService;
        this.isLoading = false;
        this.callbacks = new Map();

        this.elements = {
            form: null,
            nameInput: null,
            classInput: null,
            submitButton: null,
            statusDiv: null
        };

        this.render();
        this.setupEventListeners();
        console.log('📝 LoginForm component initialized');
    }

    /**
     * Render login form
     */
    render() {
        this.container.innerHTML = `
            <div class="login-form">
                <h2>Programming Exam Login</h2>
                <p class="login-subtitle">Enter your details to begin the exam</p>

                <form id="student-login-form">
                    <input 
                        type="text" 
                        id="student-name" 
                        placeholder="Full Name (e.g., Ivan Ivanov)" 
                        autocomplete="off"
                        required
                    >
                    <input 
                        type="text" 
                        id="student-class" 
                        placeholder="Class (e.g., 11А)" 
                        autocomplete="off"
                        required
                    >
                    <button type="submit" id="login-btn" class="login-btn">
                        Enter Exam
                    </button>
                </form>

                <div id="login-status" class="login-status"></div>

                <div class="fullscreen-notice">
                    <strong>🔒 Security Notice:</strong> The exam will switch to fullscreen mode for security.
                    Attempting to exit fullscreen or switch applications will trigger security warnings.
                </div>
            </div>
        `;

        this.cacheElements();
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements.form = this.container.querySelector('#student-login-form');
        this.elements.nameInput = this.container.querySelector('#student-name');
        this.elements.classInput = this.container.querySelector('#student-class');
        this.elements.submitButton = this.container.querySelector('#login-btn');
        this.elements.statusDiv = this.container.querySelector('#login-status');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Form submission
        this.elements.form.addEventListener('submit', (e) => {
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
     * Validate single input
     */
    validateInput(input, type) {
        const value = input.value.trim();
        let isValid = true;

        if (type === 'name' && value) {
            isValid = Validation.isValidBulgarianName(value);
        } else if (type === 'class' && value) {
            isValid = Validation.isValidClassName(value);
        }

        // Update input styling
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
            this.elements.submitButton.innerHTML = `
                <div class="loading-spinner"></div>
                Logging in...
            `;
        } else {
            this.elements.submitButton.innerHTML = 'Enter Exam';
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
        this.elements.form.reset();
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