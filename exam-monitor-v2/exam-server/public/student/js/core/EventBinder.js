/**
 * Event Binding Helpers
 * Replaces inline onclick handlers with proper event listeners
 * Provides clean event management for template components
 */

export class EventBinder {
    static bindings = new Map();
    static boundElements = new WeakSet();

    /**
     * Bind events to elements with data attributes
     * @param {HTMLElement} container - Container to search for bindable elements
     */
    static bindEvents(container = document) {
        try {
            // Find all elements with data-event attributes
            const elements = container.querySelectorAll('[data-event]');

            elements.forEach(element => {
                // Skip if already bound
                if (this.boundElements.has(element)) {
                    return;
                }

                this.bindElementEvents(element);
                this.boundElements.add(element);
            });

            console.log(`Bound events for ${elements.length} elements`);

        } catch (error) {
            console.error('Failed to bind events:', error);
        }
    }

    /**
     * Bind events for a single element
     * @param {HTMLElement} element - Element to bind events to
     */
    static bindElementEvents(element) {
        try {
            const eventType = element.dataset.event;
            const handlerName = element.dataset.handler;
            const paramsData = element.dataset.params;

            if (!eventType || !handlerName) {
                console.warn('Element missing event type or handler:', element);
                return;
            }

            // Parse parameters
            let params = {};
            if (paramsData) {
                try {
                    params = JSON.parse(paramsData);
                } catch (e) {
                    console.warn('Invalid params JSON:', paramsData);
                }
            }

            // Get handler function
            const handler = this.bindings.get(handlerName);
            if (!handler) {
                console.warn(`Handler not found: ${handlerName}`);
                return;
            }

            // Add event listener
            element.addEventListener(eventType, (event) => {
                try {
                    handler(event, params, element);
                } catch (error) {
                    console.error(`Error in event handler ${handlerName}:`, error);
                }
            });

        } catch (error) {
            console.error('Failed to bind element events:', error);
        }
    }

    /**
     * Register event handler
     * @param {string} name - Handler name
     * @param {Function} handler - Handler function
     */
    static register(name, handler) {
        if (typeof handler !== 'function') {
            console.error(`Handler must be a function: ${name}`);
            return;
        }

        this.bindings.set(name, handler);
        console.log(`Event handler registered: ${name}`);
    }

    /**
     * Register multiple handlers at once
     * @param {Object} handlers - Object map of name -> handler function
     */
    static registerHandlers(handlers) {
        Object.entries(handlers).forEach(([name, handler]) => {
            this.register(name, handler);
        });
    }

    /**
     * Unregister event handler
     * @param {string} name - Handler name
     */
    static unregister(name) {
        this.bindings.delete(name);
        console.log(`Event handler unregistered: ${name}`);
    }

    /**
     * Get registered handler
     * @param {string} name - Handler name
     * @returns {Function|null} - Handler function
     */
    static getHandler(name) {
        return this.bindings.get(name) || null;
    }

    /**
     * Check if handler is registered
     * @param {string} name - Handler name
     * @returns {boolean}
     */
    static hasHandler(name) {
        return this.bindings.has(name);
    }

    /**
     * Bind events with delegation (for dynamic content)
     * @param {HTMLElement} container - Container element
     * @param {string} selector - CSS selector for target elements
     * @param {string} eventType - Event type (click, change, etc.)
     * @param {string} handlerName - Registered handler name
     * @param {Object} params - Additional parameters
     */
    static bindDelegatedEvent(container, selector, eventType, handlerName, params = {}) {
        try {
            const handler = this.bindings.get(handlerName);
            if (!handler) {
                console.warn(`Handler not found for delegation: ${handlerName}`);
                return;
            }

            container.addEventListener(eventType, (event) => {
                const target = event.target.closest(selector);
                if (target) {
                    try {
                        handler(event, params, target);
                    } catch (error) {
                        console.error(`Error in delegated handler ${handlerName}:`, error);
                    }
                }
            });

            console.log(`Delegated event bound: ${eventType} on ${selector} -> ${handlerName}`);

        } catch (error) {
            console.error('Failed to bind delegated event:', error);
        }
    }

    /**
     * Initialize standard exam system event handlers
     */
    static initializeStandardHandlers() {
        // Student login handlers
        this.register('handleLogin', (event, params, element) => {
            event.preventDefault();

            // Get form data
            const name = document.getElementById('student-name')?.value;
            const studentClass = document.getElementById('student-class')?.value;
            const termsAccepted = document.getElementById('terms-agreement')?.checked;

            // Validate and trigger login
            if (window.ExamApp && window.ExamApp.handleLoginSubmit) {
                window.ExamApp.handleLoginSubmit(name, studentClass, termsAccepted);
            }
        });

        // Code execution handlers
        this.register('runCode', () => {
            if (window.ExamApp && window.ExamApp.runCode) {
                window.ExamApp.runCode();
            }
        });

        this.register('formatCode', () => {
            if (window.ExamApp && window.ExamApp.formatCode) {
                window.ExamApp.formatCode();
            }
        });

        this.register('clearOutput', () => {
            if (window.ExamApp && window.ExamApp.clearOutput) {
                window.ExamApp.clearOutput();
            }
        });

        // Tab switching handlers
        this.register('switchTab', (event, params) => {
            const tabName = params.tab;
            if (window.ExamApp && window.ExamApp.switchTab) {
                window.ExamApp.switchTab(tabName);
            }
        });

        // MDN section handlers
        this.register('showMDNSection', (event, params) => {
            const section = params.section;
            if (window.ExamApp && window.ExamApp.showMDNSection) {
                window.ExamApp.showMDNSection(section);
            }
        });

        // Exam control handlers
        this.register('finishExam', () => {
            if (window.ExamApp && window.ExamApp.finishExam) {
                window.ExamApp.finishExam();
            }
        });

        // Layout control handlers
        this.register('togglePanel', (event, params) => {
            const panel = params.panel;
            if (window.ExamApp && window.ExamApp.togglePanel) {
                window.ExamApp.togglePanel(panel);
            }
        });

        console.log('Standard event handlers initialized');
    }

    /**
     * Clean up all event bindings
     */
    static cleanup() {
        this.bindings.clear();
        console.log('Event bindings cleaned up');
    }

    /**
     * Rebind events for dynamic content
     * @param {HTMLElement} container - Container with new content
     */
    static rebindEvents(container) {
        this.bindEvents(container);
    }
}