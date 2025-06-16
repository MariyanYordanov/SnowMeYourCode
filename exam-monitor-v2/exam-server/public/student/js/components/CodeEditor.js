/**
 * CodeEditor Component - Pure behavior for existing code editor
 * Works with existing textarea element in index.html
 */
export class CodeEditor {
    constructor(examService) {
        this.examService = examService;
        this.isEnabled = false;
        this.lastSavedCode = '';
        this.hasUnsavedChanges = false;
        this.callbacks = new Map();

        // Cache existing DOM elements from index.html
        this.elements = {
            editor: document.getElementById('code-editor'),
            saveBtn: document.getElementById('save-code-btn'),
            runBtn: document.getElementById('run-code-btn'),
            formatBtn: document.getElementById('format-code-btn')
        };

        this.validateElements();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        console.log('📝 CodeEditor component initialized');
    }

    /**
     * Validate that required DOM elements exist
     */
    validateElements() {
        if (!this.elements.editor) {
            throw new Error('CodeEditor requires #code-editor element in DOM');
        }
        if (!this.elements.saveBtn) {
            throw new Error('CodeEditor requires #save-code-btn element in DOM');
        }
        if (!this.elements.runBtn) {
            throw new Error('CodeEditor requires #run-code-btn element in DOM');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Code change detection
        this.elements.editor.addEventListener('input', () => {
            this.handleCodeChange();
        });

        // Button click handlers
        this.elements.saveBtn.addEventListener('click', () => {
            this.saveCode();
        });

        this.elements.runBtn.addEventListener('click', () => {
            this.runCode();
        });

        if (this.elements.formatBtn) {
            this.elements.formatBtn.addEventListener('click', () => {
                this.formatCode();
            });
        }

        // Focus and blur handling
        this.elements.editor.addEventListener('focus', () => {
            this.emit('editorFocused');
        });

        this.elements.editor.addEventListener('blur', () => {
            this.emit('editorBlurred');
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        this.elements.editor.addEventListener('keydown', (e) => {
            // Ctrl+S - Save
            if (e.ctrlKey && e.code === 'KeyS') {
                e.preventDefault();
                this.saveCode();
            }

            // Ctrl+Enter - Run
            if (e.ctrlKey && e.code === 'Enter') {
                e.preventDefault();
                this.runCode();
            }

            // Alt+F - Format (if format button exists)
            if (e.altKey && e.code === 'KeyF' && this.elements.formatBtn) {
                e.preventDefault();
                this.formatCode();
            }

            // Tab support - insert 4 spaces
            if (e.code === 'Tab') {
                e.preventDefault();
                this.insertTab();
            }
        });
    }

    /**
     * Handle code changes
     */
    handleCodeChange() {
        if (!this.isEnabled) return;

        const currentCode = this.getCode();
        this.hasUnsavedChanges = currentCode !== this.lastSavedCode;

        // Update save button state
        this.updateSaveButtonState();

        // Notify exam service of code change
        this.examService.updateCode(currentCode);

        this.emit('codeChanged', {
            code: currentCode,
            hasUnsavedChanges: this.hasUnsavedChanges
        });
    }

    /**
     * Save code
     */
    saveCode() {
        if (!this.isEnabled) return;

        const code = this.getCode();
        const success = this.examService.saveCode(code);

        if (success) {
            this.lastSavedCode = code;
            this.hasUnsavedChanges = false;
            this.updateSaveButtonState();
            this.showSaveIndicator('saved');
            this.emit('codeSaved', { code });
            console.log('💾 Code saved manually');
        } else {
            this.showSaveIndicator('error');
            this.emit('saveError');
        }
    }

    /**
     * Run code (delegates to parent for console handling)
     */
    runCode() {
        if (!this.isEnabled) return;

        const code = this.getCode();
        this.emit('runCode', { code });
        console.log('▶️ Running code');
    }

    /**
     * Format code with basic indentation
     */
    formatCode() {
        if (!this.isEnabled) return;

        const code = this.getCode();
        const formatted = this.formatJavaScript(code);
        this.setCode(formatted);
        this.emit('codeFormatted', { code: formatted });
        console.log('🎨 Code formatted');
    }

    /**
     * Basic JavaScript formatting
     */
    formatJavaScript(code) {
        const lines = code.split('\n');
        let indentLevel = 0;
        const formattedLines = [];

        lines.forEach(line => {
            const trimmed = line.trim();

            // Decrease indent for closing braces
            if (trimmed.includes('}')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            // Add indentation
            if (trimmed) {
                formattedLines.push('    '.repeat(indentLevel) + trimmed);
            } else {
                formattedLines.push('');
            }

            // Increase indent for opening braces
            if (trimmed.includes('{')) {
                indentLevel++;
            }
        });

        return formattedLines.join('\n');
    }

    /**
     * Insert tab (4 spaces) at cursor position
     */
    insertTab() {
        const editor = this.elements.editor;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const spaces = '    ';

        // Insert spaces
        const value = editor.value;
        editor.value = value.substring(0, start) + spaces + value.substring(end);

        // Move cursor
        editor.selectionStart = editor.selectionEnd = start + spaces.length;

        // Trigger change event
        this.handleCodeChange();
    }

    /**
     * Update save button state
     */
    updateSaveButtonState() {
        if (this.hasUnsavedChanges) {
            this.elements.saveBtn.classList.add('has-changes');
            this.elements.saveBtn.textContent = '💾 Save*';
        } else {
            this.elements.saveBtn.classList.remove('has-changes');
            this.elements.saveBtn.textContent = '💾 Save';
        }
    }

    /**
     * Show save indicator
     */
    showSaveIndicator(type) {
        const originalText = this.elements.saveBtn.textContent;

        switch (type) {
            case 'saved':
                this.elements.saveBtn.textContent = '✅ Saved';
                this.elements.saveBtn.classList.add('save-success');
                break;
            case 'error':
                this.elements.saveBtn.textContent = '❌ Error';
                this.elements.saveBtn.classList.add('save-error');
                break;
        }

        setTimeout(() => {
            this.elements.saveBtn.textContent = originalText;
            this.elements.saveBtn.classList.remove('save-success', 'save-error');
        }, 2000);
    }

    /**
     * Get current code
     */
    getCode() {
        return this.elements.editor.value;
    }

    /**
     * Set code content
     */
    setCode(code) {
        this.elements.editor.value = code;
        this.lastSavedCode = code;
        this.hasUnsavedChanges = false;
        this.updateSaveButtonState();
        this.emit('codeSet', { code });
    }

    /**
     * Enable editor
     */
    enable() {
        this.isEnabled = true;
        this.elements.editor.disabled = false;
        this.elements.saveBtn.disabled = false;
        this.elements.runBtn.disabled = false;
        if (this.elements.formatBtn) {
            this.elements.formatBtn.disabled = false;
        }
        this.emit('editorEnabled');
    }

    /**
     * Disable editor
     */
    disable() {
        this.isEnabled = false;
        this.elements.editor.disabled = true;
        this.elements.saveBtn.disabled = true;
        this.elements.runBtn.disabled = true;
        if (this.elements.formatBtn) {
            this.elements.formatBtn.disabled = true;
        }
        this.emit('editorDisabled');
    }

    /**
     * Focus editor
     */
    focus() {
        this.elements.editor.focus();
    }

    /**
     * Check if has unsaved changes
     */
    hasUnsaved() {
        return this.hasUnsavedChanges;
    }

    /**
     * Get editor stats
     */
    getStats() {
        const code = this.getCode();
        return {
            lines: code.split('\n').length,
            characters: code.length,
            words: code.split(/\s+/).filter(word => word.length > 0).length
        };
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
                    console.error(`❌ CodeEditor callback error for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Destroy component
     */
    destroy() {
        this.disable();
        this.callbacks.clear();
        console.log('🧹 CodeEditor destroyed');
    }
}