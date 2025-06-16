/**
 * ConsoleOutput Component - Manages code execution and output display
 * Works with existing DOM elements, no HTML creation
 */
export class ConsoleOutput {
    constructor(outputElement, config = {}) {
        if (!outputElement) {
            throw new Error('ConsoleOutput requires an output element');
        }

        this.outputElement = outputElement;
        this.config = {
            maxOutputLines: 100,
            clearOnRun: true,
            showTimestamps: false,
            ...config
        };

        this.state = {
            outputs: [],
            isExecuting: false,
            originalConsole: {
                log: console.log,
                error: console.error,
                warn: console.warn
            }
        };

        this.initialize();
    }

    /**
     * Initialize the component
     */
    initialize() {
        // Set initial placeholder
        this.showPlaceholder();

        console.log('🖥️ ConsoleOutput initialized');
    }

    /**
     * Execute code and capture output
     */
    execute(code) {
        if (this.state.isExecuting) {
            console.warn('Code is already executing');
            return;
        }

        this.state.isExecuting = true;
        this.state.outputs = [];

        if (this.config.clearOnRun) {
            this.clear();
        }

        // Override console methods
        this.hijackConsole();

        try {
            // Execute the code
            const result = eval(code);

            // If code returns a value, log it
            if (result !== undefined) {
                this.addOutput('log', `→ ${result}`);
            }

            // If no output was generated
            if (this.state.outputs.length === 0) {
                this.showMessage('Code executed without output', 'info');
            } else {
                this.render();
            }

        } catch (error) {
            this.addOutput('error', `Error: ${error.message}`);
            this.render();
        } finally {
            // Restore console
            this.restoreConsole();
            this.state.isExecuting = false;
        }
    }

    /**
     * Hijack console methods to capture output
     */
    hijackConsole() {
        console.log = (...args) => {
            this.addOutput('log', args.join(' '));
            this.state.originalConsole.log.apply(console, args);
        };

        console.error = (...args) => {
            this.addOutput('error', args.join(' '));
            this.state.originalConsole.error.apply(console, args);
        };

        console.warn = (...args) => {
            this.addOutput('warn', args.join(' '));
            this.state.originalConsole.warn.apply(console, args);
        };
    }

    /**
     * Restore original console methods
     */
    restoreConsole() {
        console.log = this.state.originalConsole.log;
        console.error = this.state.originalConsole.error;
        console.warn = this.state.originalConsole.warn;
    }

    /**
     * Add output line
     */
    addOutput(type, content) {
        this.state.outputs.push({
            type,
            content,
            timestamp: Date.now()
        });

        // Limit output lines
        if (this.state.outputs.length > this.config.maxOutputLines) {
            this.state.outputs.shift();
        }
    }

    /**
     * Render outputs to DOM
     */
    render() {
        // Clear current content
        this.outputElement.innerHTML = '';

        // Add each output line
        this.state.outputs.forEach(output => {
            const line = document.createElement('div');
            line.className = `output-line output-${output.type}`;

            if (this.config.showTimestamps) {
                const time = new Date(output.timestamp).toLocaleTimeString();
                line.textContent = `[${time}] ${output.content}`;
            } else {
                line.textContent = output.content;
            }

            this.outputElement.appendChild(line);
        });

        // Scroll to bottom
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }

    /**
     * Clear output
     */
    clear() {
        this.state.outputs = [];
        this.showPlaceholder();
    }

    /**
     * Show placeholder message
     */
    showPlaceholder() {
        this.outputElement.innerHTML = '';
        const placeholder = document.createElement('div');
        placeholder.className = 'output-placeholder';
        placeholder.textContent = 'Your code output will appear here...\nUse console.log() to display results.';
        this.outputElement.appendChild(placeholder);
    }

    /**
     * Show a message
     */
    showMessage(message, type = 'info') {
        this.outputElement.innerHTML = '';
        const msgElement = document.createElement('div');
        msgElement.className = `output-message output-${type}`;
        msgElement.textContent = message;
        this.outputElement.appendChild(msgElement);
    }

    /**
     * Get output history
     */
    getHistory() {
        return [...this.state.outputs];
    }

    /**
     * Export output as text
     */
    exportAsText() {
        return this.state.outputs
            .map(o => `[${o.type.toUpperCase()}] ${o.content}`)
            .join('\n');
    }
}