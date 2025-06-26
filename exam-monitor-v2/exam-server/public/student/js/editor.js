/**
 * Monaco Editor Module
 * Handles Monaco editor setup, code execution, and editor controls
 * SIMPLIFIED: Only saves last version, no backups
 */

// Import socket functions
import { sendCodeUpdate } from './socket.js';

// Auto-save timeout
let autoSaveTimeout = null;
const AUTO_SAVE_DELAY = 2000; // 2 seconds

/**
 * Initialize Monaco Editor
 */
export function initializeMonacoEditor(initialCode = '') {
    return new Promise((resolve, reject) => {
        try {
            console.log('🎨 Initializing Monaco Editor...');

            // Configure Monaco paths
            require.config({
                paths: {
                    'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs'
                }
            });

            require(['vs/editor/editor.main'], function () {
                try {
                    const defaultCode = initialCode || getDefaultCode();

                    const editor = monaco.editor.create(document.getElementById('monaco-editor'), {
                        value: defaultCode,
                        language: 'javascript',
                        theme: 'vs-dark',
                        automaticLayout: true,
                        minimap: { enabled: true },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        lineNumbers: 'on',
                        renderWhitespace: 'selection',
                        wordWrap: 'on',
                        bracketPairColorization: { enabled: true },
                        suggest: {
                            enableExtendedKeywords: true,
                            showWords: true,
                            showSnippets: true
                        },
                        quickSuggestions: {
                            other: true,
                            comments: false,
                            strings: false
                        }
                    });

                    // CRITICAL: Store editor in global state immediately
                    window.ExamApp.editor = editor;

                    // Setup auto-save
                    setupAutoSave(editor);

                    // Setup enhanced features integration
                    setupEditorIntegrations(editor);

                    // Setup keyboard shortcuts
                    setupKeyboardShortcuts(editor);

                    console.log('✅ Monaco Editor initialized successfully');
                    resolve(editor);
                } catch (error) {
                    console.error('❌ Monaco Editor creation failed:', error);
                    reject(error);
                }
            });
        } catch (error) {
            console.error('❌ Monaco Editor initialization failed:', error);
            reject(error);
        }
    });
}

/**
 * Get default code template
 */
function getDefaultCode() {
    return `// Напишете вашият JavaScript код тук
console.log("Здравей, свят!");

// Пример за функция
function решиЗадача() {
    // Вашето решение тук
    return "Готово!";
}

// Тествайте кода си
console.log(решиЗадача());`;
}

/**
 * Setup auto-save functionality
 */
function setupAutoSave(editor) {
    try {
        editor.onDidChangeModelContent(() => {
            // Clear existing timeout
            if (autoSaveTimeout) {
                clearTimeout(autoSaveTimeout);
            }

            // Set new timeout for auto-save
            autoSaveTimeout = setTimeout(() => {
                saveCode();
            }, AUTO_SAVE_DELAY);
        });

        console.log('✅ Auto-save setup completed');
    } catch (error) {
        console.error('❌ Failed to setup auto-save:', error);
    }
}

/**
 * Setup editor integrations with enhanced features
 */
function setupEditorIntegrations(editor) {
    try {
        // Integration with DOM Preview (if available)
        if (window.ExamApp.domPreviewActive) {
            editor.onDidChangeModelContent(() => {
                // Trigger preview update with debouncing
                if (window.getCurrentTab && window.getCurrentTab() === 'preview') {
                    // Preview will auto-update via its own debouncing
                }
            });
        }

        console.log('✅ Editor integrations setup completed');
    } catch (error) {
        console.error('❌ Failed to setup editor integrations:', error);
    }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts(editor) {
    try {
        // Ctrl+Enter for run
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            runCode();
        });

        // Ctrl+Shift+F for format
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
            formatCode();
        });

        console.log('⌨️ Keyboard shortcuts setup completed');
    } catch (error) {
        console.error('❌ Failed to setup keyboard shortcuts:', error);
    }
}

/**
 * Setup editor controls event handlers
 */
export function setupEditorControls(actions) {
    try {
        // Run code button
        const runBtn = document.getElementById('run-code-btn');
        if (runBtn && actions.runCode) {
            runBtn.addEventListener('click', actions.runCode);
        }

        // Format code button
        const formatBtn = document.getElementById('format-code-btn');
        if (formatBtn && actions.formatCode) {
            formatBtn.addEventListener('click', actions.formatCode);
        }

        // Clear output button
        const clearBtn = document.getElementById('clear-output-btn');
        if (clearBtn && actions.clearOutput) {
            clearBtn.addEventListener('click', actions.clearOutput);
        }

        // Theme selector
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector && actions.changeTheme) {
            themeSelector.addEventListener('change', actions.changeTheme);
        }

        console.log('✅ Editor controls setup completed');
    } catch (error) {
        console.error('❌ Failed to setup editor controls:', error);
    }
}

/**
 * Run code in editor
 */
export function runCode() {
    try {
        if (!window.ExamApp.editor) {
            console.warn('⚠️ Editor not available');
            showError('Редакторът не е готов. Моля изчакайте.');
            return;
        }

        console.log('▶️ Running code...');

        const code = window.ExamApp.editor.getValue();
        const outputEl = document.getElementById('code-output');

        if (!outputEl) {
            console.error('❌ Output element not found');
            return;
        }

        // Clear previous output
        clearOutput();
        hideError();

        // Capture console output
        const output = captureConsoleOutput(code);

        // Display results
        if (output.success) {
            displayOutput(output.logs);
        } else {
            showError(output.error);
        }

        console.log('✅ Code execution completed');
    } catch (error) {
        console.error('❌ Code execution failed:', error);
        showError(`Грешка при изпълнение: ${error.message}`);
    }
}

/**
 * Capture console output from code execution
 */
function captureConsoleOutput(code) {
    try {
        const output = [];
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn
        };

        // Override console methods
        console.log = function (...args) {
            output.push({
                type: 'log',
                content: args.map(arg => formatOutputValue(arg)).join(' ')
            });
            originalConsole.log.apply(console, arguments);
        };

        console.error = function (...args) {
            output.push({
                type: 'error',
                content: args.map(arg => formatOutputValue(arg)).join(' ')
            });
            originalConsole.error.apply(console, arguments);
        };

        console.warn = function (...args) {
            output.push({
                type: 'warn',
                content: args.map(arg => formatOutputValue(arg)).join(' ')
            });
            originalConsole.warn.apply(console, arguments);
        };

        // Execute code in isolated scope
        const func = new Function(code);
        func();

        // Restore console methods
        console.log = originalConsole.log;
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;

        return { success: true, logs: output };
    } catch (error) {
        // Restore console methods in case of error
        console.log = originalConsole.log;
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;

        return { success: false, error: error.message };
    }
}

/**
 * Format output value for display
 */
function formatOutputValue(arg) {
    if (typeof arg === 'object' && arg !== null) {
        try {
            return JSON.stringify(arg, null, 2);
        } catch (e) {
            return '[Object object]';
        }
    }
    return String(arg);
}

/**
 * Display output in console
 */
function displayOutput(logs) {
    const outputEl = document.getElementById('code-output');
    if (!outputEl) return;

    if (logs.length === 0) {
        outputEl.innerHTML = '<div class="output-placeholder">Кодът е изпълнен успешно (няма output)</div>';
        return;
    }

    const outputHtml = logs.map(item => {
        const className = `output-line output-${item.type}`;
        return `<div class="${className}">${escapeHtml(item.content)}</div>`;
    }).join('');

    outputEl.innerHTML = outputHtml;

    // Scroll to bottom
    outputEl.scrollTop = outputEl.scrollHeight;
}

/**
 * Format code in editor
 */
export function formatCode() {
    try {
        if (!window.ExamApp.editor) {
            console.warn('⚠️ Editor not available');
            showError('Редакторът не е готов. Моля изчакайте.');
            return;
        }

        window.ExamApp.editor.getAction('editor.action.formatDocument').run();
        console.log('🎨 Code formatted');
    } catch (error) {
        console.error('❌ Code formatting failed:', error);
        showError('Грешка при форматиране на кода');
    }
}

/**
 * Save code to server (SIMPLIFIED - no backups)
 */
export function saveCode() {
    try {
        if (!window.ExamApp.editor) {
            console.warn('⚠️ Editor not available');
            return false;
        }

        const code = window.ExamApp.editor.getValue();

        // Send to server via socket
        const success = sendCodeUpdate(code, 'main.js');

        if (success) {
            updateLastSaved();
            console.log('💾 Code saved successfully');
        } else {
            console.warn('⚠️ Failed to save code - not connected');
        }

        return success;
    } catch (error) {
        console.error('❌ Code save failed:', error);
        return false;
    }
}

/**
 * Clear output display
 */
export function clearOutput() {
    try {
        const outputEl = document.getElementById('code-output');
        if (outputEl) {
            outputEl.innerHTML = '<div class="output-placeholder">Резултатът от вашия код ще се покаже тук...</div>';
        }
        hideError();
    } catch (error) {
        console.error('❌ Failed to clear output:', error);
    }
}

/**
 * Change editor theme
 */
export function changeTheme(event) {
    try {
        if (!window.ExamApp.editor) {
            console.warn('⚠️ Editor not available');
            return;
        }

        const theme = event.target ? event.target.value : event;
        monaco.editor.setTheme(theme);
        console.log(`🎨 Theme changed to: ${theme}`);
    } catch (error) {
        console.error('❌ Theme change failed:', error);
    }
}

/**
 * Update last saved timestamp
 */
function updateLastSaved() {
    try {
        const now = new Date().toLocaleTimeString('bg-BG');
        const lastSavedEl = document.getElementById('last-saved');

        if (lastSavedEl) {
            lastSavedEl.textContent = `Последно запазване: ${now}`;
        }

        window.ExamApp.lastSaveTime = Date.now();
    } catch (error) {
        console.error('❌ Failed to update last saved:', error);
    }
}

/**
 * Show error in error panel
 */
function showError(message) {
    try {
        const errorPanel = document.getElementById('error-panel');
        const errorContent = document.getElementById('error-content');

        if (errorPanel && errorContent) {
            errorContent.textContent = message;
            errorPanel.style.display = 'block';
        }

        console.error('Error shown to user:', message);
    } catch (error) {
        console.error('❌ Failed to show error:', error);
    }
}

/**
 * Hide error panel
 */
function hideError() {
    try {
        const errorPanel = document.getElementById('error-panel');
        if (errorPanel) {
            errorPanel.style.display = 'none';
        }
    } catch (error) {
        console.error('❌ Failed to hide error:', error);
    }
}

/**
 * Escape HTML for safe display
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get current editor content
 */
export function getEditorContent() {
    if (!window.ExamApp.editor) {
        return '';
    }

    try {
        return window.ExamApp.editor.getValue();
    } catch (error) {
        console.error('❌ Failed to get editor content:', error);
        return '';
    }
}

/**
 * Set editor content
 */
export function setEditorContent(content) {
    if (!window.ExamApp.editor) {
        console.warn('⚠️ Editor not available');
        return false;
    }

    try {
        window.ExamApp.editor.setValue(content || '');
        return true;
    } catch (error) {
        console.error('❌ Failed to set editor content:', error);
        return false;
    }
}

/**
 * Focus editor
 */
export function focusEditor() {
    if (!window.ExamApp.editor) {
        console.warn('⚠️ Editor not available');
        return false;
    }

    try {
        window.ExamApp.editor.focus();
        return true;
    } catch (error) {
        console.error('❌ Failed to focus editor:', error);
        return false;
    }
}

/**
 * Resize editor
 */
export function resizeEditor() {
    if (!window.ExamApp.editor) {
        return;
    }

    try {
        window.ExamApp.editor.layout();
    } catch (error) {
        console.error('❌ Failed to resize editor:', error);
    }
}

/**
 * Destroy editor and cleanup
 */
export function destroyEditor() {
    try {
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = null;
        }

        if (window.ExamApp.editor) {
            window.ExamApp.editor.dispose();
            window.ExamApp.editor = null;
        }

        console.log('🧹 Editor destroyed and cleaned up');
    } catch (error) {
        console.error('❌ Error destroying editor:', error);
    }
}