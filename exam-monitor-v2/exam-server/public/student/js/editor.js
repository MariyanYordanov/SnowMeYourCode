/**
 * Monaco Editor Module - ENHANCED CONSOLE VERSION
 * Handles Monaco editor setup, code execution, and enhanced console output
 * ENHANCED: console.table(), time tracking, better formatting, error highlighting
 */

// Import socket functions
import { sendCodeUpdate } from './socket.js';

// Auto-save timeout
let autoSaveTimeout = null;
const AUTO_SAVE_DELAY = 2000; // 2 seconds

// Console enhancement state
const consoleState = {
    timers: new Map(), // For console.time() tracking
    outputHistory: [], // For console history
    maxHistoryItems: 100
};

/**
 * Enhanced Monaco Editor initialization with additional features
 */
export function initializeMonacoEditor(initialCode = '') {
    return new Promise((resolve, reject) => {
        try {
            // Configure Monaco paths
            require.config({
                paths: {
                    'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs'
                }
            });

            require(['vs/editor/editor.main'], function () {
                try {
                    const defaultCode = initialCode || getDefaultCode();
                    const examApp = window.ExamApp;

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
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: true,
                        parameterHints: { enabled: true },
                        folding: true,
                        formatOnPaste: false,
                        formatOnType: false,
                        autoClosingBrackets: 'languageDefined',
                        autoClosingQuotes: 'languageDefined',
                        autoSurround: 'languageDefined',
                        autoIndent: 'advanced',
                        dragAndDrop: true,
                        smoothScrolling: true,
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: true,
                        contextmenu: true,
                        links: true,
                        colorDecorators: true,
                        inlineSuggest: { enabled: true },
                        suggest: {
                            showWords: true,
                            showVariables: true,
                            showFunctions: true,
                            showConstants: true,
                            showClasses: true,
                            showInterfaces: true,
                            insertMode: 'replace',
                            filterGraceful: true,
                            localityBonus: true,
                            shareSuggestSelections: true,
                            showIcons: true,
                            maxVisibleSuggestions: 12
                        },
                        acceptSuggestionOnCommitCharacter: true,
                        acceptSuggestionOnEnter: 'on',
                        tabCompletion: 'on',
                        wordBasedSuggestions: true,
                        semanticHighlighting: { enabled: true },
                        occurrencesHighlight: true,
                        codeLens: true,
                        inlayHints: { enabled: true },
                        hover: { enabled: true, delay: 300 },
                        definitionLinkOpensInPeek: true,
                        quickSuggestionsDelay: 10,
                        suggestSelection: 'first',
                        suggestFontSize: 14,
                        suggestLineHeight: 20,
                        tabSize: 2,
                        insertSpaces: true,
                        detectIndentation: true,
                        trimAutoWhitespace: true,
                        largeFileOptimizations: true,
                        renderValidationDecorations: 'on',
                        diffEditorCodeComparison: false,
                        accessibilitySupport: 'auto',
                        screenReaderAnnounceInlineSuggestion: true
                    });

                    // CRITICAL: Store editor in global state immediately
                    examApp.editor = editor;

                    // Setup language features
                    setupLanguageFeatures(editor);

                    // Setup auto-save
                    setupAutoSave(editor);

                    // Setup enhanced features integration
                    setupEditorIntegrations(editor);

                    // Setup keyboard shortcuts
                    setupKeyboardShortcuts(editor);

                    // Setup error detection and highlighting
                    setupErrorDetection(editor);

                    // Setup code quality hints
                    setupCodeQualityHints(editor);

                    console.log('Enhanced Monaco Editor initialized');
                    resolve(editor);

                } catch (error) {
                    console.error('Monaco Editor creation failed:', error);
                    reject(error);
                }
            });

        } catch (error) {
            console.error('Monaco Editor initialization failed:', error);
            reject(error);
        }
    });
}

/**
 * Setup enhanced language features
 */
function setupLanguageFeatures(editor) {
    try {
        // Add HTML and CSS language support
        monaco.languages.register({ id: 'html' });
        monaco.languages.register({ id: 'css' });

        // Auto-detect language based on content
        editor.onDidChangeModelContent(() => {
            const content = editor.getValue().trim().toLowerCase();
            let newLanguage = 'javascript';

            if (content.includes('<html') || content.includes('<div') || /^<[a-z]/.test(content)) {
                newLanguage = 'html';
            } else if (content.includes('body {') || content.includes('.class') || /^[.#]/.test(content)) {
                newLanguage = 'css';
            }

            const currentLanguage = editor.getModel().getLanguageId();
            if (currentLanguage !== newLanguage) {
                monaco.editor.setModelLanguage(editor.getModel(), newLanguage);
            }
        });

    } catch (error) {
        console.error('Failed to setup language features:', error);
    }
}

/**
 * Setup error detection and highlighting
 */
function setupErrorDetection(editor) {
    try {
        const examApp = window.ExamApp;
        // This will be triggered after code execution
        window.highlightErrorLine = (lineNumber) => {
            if (!editor || lineNumber < 1) return;

            // Remove previous error decorations
            if (examApp.errorDecorations) {
                editor.deltaDecorations(examApp.errorDecorations, []);
            }

            // Add new error decoration
            examApp.errorDecorations = editor.deltaDecorations([], [
                {
                    range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                    options: {
                        isWholeLine: true,
                        className: 'error-line',
                        glyphMarginClassName: 'error-glyph'
                    }
                }
            ]);

            // Scroll to error line
            editor.revealLineInCenter(lineNumber);
        };

    } catch (error) {
        console.error('Failed to setup error detection:', error);
    }
}

/**
 * Setup code quality hints
 */
function setupCodeQualityHints(editor) {
    try {
        let qualityCheckTimeout;

        editor.onDidChangeModelContent(() => {
            clearTimeout(qualityCheckTimeout);
            qualityCheckTimeout = setTimeout(() => {
                const content = editor.getValue();
                checkCodeQuality(editor, content);
            }, 2000);
        });

        function checkCodeQuality(editor, code) {
            const model = editor.getModel();
            const markers = [];

            // Check for console.log usage
            const consoleLogMatches = code.match(/console\.log/g);
            if (consoleLogMatches && consoleLogMatches.length > 5) {
                markers.push({
                    severity: monaco.MarkerSeverity.Info,
                    message: 'Consider reducing console.log usage for cleaner code',
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 1
                });
            }

            // Check for missing semicolons (simple check)
            const lines = code.split('\n');
            lines.forEach((line, index) => {
                const trimmed = line.trim();
                if (trimmed &&
                    !trimmed.endsWith(';') &&
                    !trimmed.endsWith('{') &&
                    !trimmed.endsWith('}') &&
                    !trimmed.startsWith('//') &&
                    !trimmed.startsWith('/*') &&
                    trimmed.length > 10) {

                    markers.push({
                        severity: monaco.MarkerSeverity.Warning,
                        message: 'Consider adding semicolon',
                        startLineNumber: index + 1,
                        startColumn: line.length,
                        endLineNumber: index + 1,
                        endColumn: line.length + 1
                    });
                }
            });

            monaco.editor.setModelMarkers(model, 'quality', markers);
        }

        console.log('Code quality hints setup');

    } catch (error) {
        console.error('Failed to setup code quality hints:', error);
    }
}

/**
 * Get default code template with enhanced console examples
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
console.log(решиЗадача());

// Enhanced Console Examples:
// console.table([1, 2, 3, 4, 5]);
// console.time("timer1");
// console.timeEnd("timer1");`;
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

    } catch (error) {
        console.error('Failed to setup auto-save:', error);
    }
}

/**
 * Setup editor integrations with enhanced features
 */
function setupEditorIntegrations(editor) {
    try {
        editor.onDidChangeModelContent(() => {
            // Trigger preview update with debouncing
            if (window.getCurrentTab && window.getCurrentTab() === 'preview') {
                // Preview will auto-update via its own debouncing
            }
        });
    } catch (error) {
        console.error('Failed to setup editor integrations:', error);
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

    } catch (error) {
        console.error('Failed to setup keyboard shortcuts:', error);
    }
}

/**
 * Setup editor controls event handlers
 * FIXED VERSION - не изисква actions параметър
 */
export function setupEditorControls() {
    try {
        // Run code button
        const runBtn = document.getElementById('run-btn');
        if (runBtn) {
            runBtn.addEventListener('click', () => {
                runCode();
            });
            console.log('Run button setup complete');
        } else {
            console.warn('Run button not found');
        }

        // Format code button
        const formatBtn = document.getElementById('format-btn');
        if (formatBtn) {
            formatBtn.addEventListener('click', () => {
                formatCode();
            });
        }

        // Clear console button - КОРИГИРАН ID
        const clearBtn = document.getElementById('clear-console');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                clearOutput();
            });
        }

        // Save button
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                saveCode();
            });
        }

        // Theme selector
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.addEventListener('change', (e) => {
                changeTheme(e);
            });
        }

        console.log('Editor controls setup completed');

    } catch (error) {
        console.error('Failed to setup editor controls:', error);
    }
}

/**
 * Run code in editor - FIXED VERSION WITH SESSION HANDLING
 */
export async function runCode() {
    try {
        const examApp = window.ExamApp;
        const editor = examApp?.editor;
        if (!editor) {
            console.error('Editor not initialized');
            showError('Редакторът не е готов');
            return;
        }

        const code = editor.getValue();
        const sessionId = examApp?.sessionId;

        if (!sessionId) {
            console.error('No valid session ID');
            showError('Няма валидна сесия. Моля влезте отново.');
            return;
        }

        // Clear console before execution
        clearOutput();

        // Show loading state
        const runBtn = document.getElementById('run-btn');
        if (runBtn) {
            runBtn.disabled = true;
            runBtn.innerHTML = '⏳ Running...';
        }

        // ВАЖНО: Проверка за console output
        const consoleOutput = document.getElementById('console-output');
        if (!consoleOutput) {
            console.error('Console output element not found');
            showError('Console панелът не е намерен');
            return;
        }

        // Show execution start
        consoleOutput.innerHTML = '<div class="console-info">Изпълнение на кода...</div>';

        try {
            // Локално изпълнение (докато practice server не работи)
            const originalConsole = {
                log: console.log,
                error: console.error,
                warn: console.warn,
                info: console.info
            };

            const outputs = [];

            console.log = (...args) => {
                outputs.push({ type: 'log', args });
                originalConsole.log(...args);
            };
            console.error = (...args) => {
                outputs.push({ type: 'error', args });
                originalConsole.error(...args);
            };
            console.warn = (...args) => {
                outputs.push({ type: 'warn', args });
                originalConsole.warn(...args);
            };
            console.info = (...args) => {
                outputs.push({ type: 'info', args });
                originalConsole.info(...args);
            };

            // Изпълняваме кода
            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
            const func = new AsyncFunction(code);
            await func();

            // Възстановяваме console
            Object.assign(console, originalConsole);

            // Форматираме изхода
            if (outputs.length > 0) {
                displayExecutionResult(outputs);
            } else {
                consoleOutput.innerHTML = '<div style="color: #666;">Кодът се изпълни без изход в конзолата</div>';
            }

        } catch (error) {
            displayError(error.message);
        }

        // Save code after execution
        saveCode();

    } catch (error) {
        console.error('Execution error:', error);
        displayError('Грешка при изпълнение: ' + error.message);
    } finally {
        // Reset button state
        const runBtn = document.getElementById('run-btn');
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.innerHTML = '▶ Run';
        }
    }
}

/**
 * Display execution result in console
 */
function displayExecutionResult(outputs) {
    const consoleOutput = document.getElementById('console-output');
    if (!consoleOutput) return;

    let htmlOutput = '';

    outputs.forEach(output => {
        const content = output.args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');

        switch (output.type) {
            case 'error':
                htmlOutput += `<div class="console-error">${escapeHtml(content)}</div>`;
                break;
            case 'warn':
                htmlOutput += `<div class="console-warn">${escapeHtml(content)}</div>`;
                break;
            case 'info':
                htmlOutput += `<div class="console-info">${escapeHtml(content)}</div>`;
                break;
            default:
                htmlOutput += `<div class="console-log">${escapeHtml(content)}</div>`;
        }
    });

    consoleOutput.innerHTML = htmlOutput;
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

/**
 * Display error in console
 */
function displayError(error) {
    const consoleOutput = document.getElementById('console-output');
    if (consoleOutput) {
        consoleOutput.innerHTML = `<div class="console-error">
            <strong>Грешка:</strong><br>
            ${escapeHtml(error)}
        </div>`;
    }
}

/**
 * Show execution info
 */
function showExecutionInfo(info) {
    const executionInfo = document.getElementById('execution-info');
    if (executionInfo) {
        executionInfo.textContent = info;
        executionInfo.style.display = 'block';

        setTimeout(() => {
            executionInfo.style.display = 'none';
        }, 5000);
    }
}

/**
 * Format table output for console
 */
function formatTableOutput(data) {
    try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            let table = '<table class="console-table">';
            // Get headers
            const headers = Object.keys(parsed[0] || {});
            table += '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
            // Add rows
            parsed.forEach(row => {
                table += '<tr>' + headers.map(h => `<td>${row[h]}</td>`).join('') + '</tr>';
            });
            table += '</table>';
            return table;
        }
    } catch (e) {
        // Fall back to plain text
    }
    return escapeHtml(data);
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
 * Format code in editor
 */
export function formatCode() {
    try {
        const examApp = window.ExamApp;
        if (!examApp.editor) {
            console.warn('Editor not available');
            showError('Редакторът не е готов.');
            return;
        }

        examApp.editor.getAction('editor.action.formatDocument').run();
    } catch (error) {
        console.error('Code formatting failed:', error);
        showError('Грешка при форматиране на кода');
    }
}

/**
 * Save code to server
 */
export function saveCode() {
    try {
        const examApp = window.ExamApp;
        if (!examApp.editor) {
            return false;
        }

        const code = examApp.editor.getValue();

        // Send to server via socket
        const success = sendCodeUpdate(code, 'main.js');

        if (success) {
            updateLastSaved();
        }

        return success;
    } catch (error) {
        console.error('Code save failed:', error);
        return false;
    }
}

/**
 * Clear output display
 */
export function clearOutput() {
    try {
        const outputEl = document.getElementById('console-output');
        if (outputEl) {
            outputEl.innerHTML = '';
        }
        const examApp = window.ExamApp;
        // Clear error line highlighting
        if (examApp.editor && examApp.errorDecorations) {
            examApp.editor.deltaDecorations(examApp.errorDecorations, []);
            examApp.errorDecorations = [];
        }

        hideError();

        // Hide execution info
        const infoEl = document.getElementById('execution-info');
        if (infoEl) {
            infoEl.style.display = 'none';
        }

    } catch (error) {
        console.error('Failed to clear output:', error);
    }
}

/**
 * Change editor theme
 */
export function changeTheme(event) {
    try {
        const examApp = window.ExamApp;
        if (!examApp.editor) {
            console.warn('Editor not available');
            return;
        }

        const theme = event.target ? event.target.value : event;
        monaco.editor.setTheme(theme);
        console.log(`Editor theme changed to: ${theme}`);

    } catch (error) {
        console.error('Failed to change theme:', error);
    }
}

/**
 * Update last saved timestamp
 */
function updateLastSaved() {
    try {
        const examApp = window.ExamApp;
        examApp.lastSaveTime = Date.now();
        const lastSavedEl = document.getElementById('last-saved');
        if (lastSavedEl) {
            lastSavedEl.textContent = `Запазено: ${new Date().toLocaleTimeString('bg-BG')}`;
        }
    } catch (error) {
        console.error('Failed to update last saved:', error);
    }
}

/**
 * Show error notification
 */
function showError(message) {
    const examApp = window.ExamApp;
    if (examApp?.showError) {
        examApp.showError(message);
    } else {
        console.error(message);
    }
}

/**
 * Hide error display
 */
function hideError() {
    const errorEl = document.getElementById('error-display');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

/**
 * Get editor value
 */
export function getEditorValue() {
    const examApp = window.ExamApp;
    if (!examApp.editor) {
        return '';
    }

    try {
        return examApp.editor.getValue();
    } catch (error) {
        console.error('Failed to get editor value:', error);
        return '';
    }
}

/**
 * Set editor value
 */
export function setEditorValue(value) {
    const examApp = window.ExamApp;
    if (!examApp.editor) {
        return false;
    }

    try {
        examApp.editor.setValue(value);
        return true;
    } catch (error) {
        console.error('Failed to set editor value:', error);
        return false;
    }
}

/**
 * Focus editor
 */
export function focusEditor() {
    const examApp = window.ExamApp;
    if (!examApp.editor) {
        return false;
    }

    try {
        examApp.editor.focus();
        return true;
    } catch (error) {
        console.error('Failed to focus editor:', error);
        return false;
    }
}

/**
 * Resize editor
 */
export function resizeEditor() {
    const examApp = window.ExamApp;
    if (!examApp.editor) {
        return;
    }

    try {
        examApp.editor.layout();
    } catch (error) {
        console.error('Failed to resize editor:', error);
    }
}

/**
 * Get console history (for debugging)
 */
export function getConsoleHistory() {
    return consoleState.outputHistory;
}

/**
 * Clear console history
 */
export function clearConsoleHistory() {
    consoleState.outputHistory = [];
    consoleState.timers.clear();
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

        // Clear console state
        clearConsoleHistory();
        const examApp = window.ExamApp;
        if (examApp.editor) {
            examApp.editor.dispose();
            examApp.editor = null;
        }

    } catch (error) {
        console.error('Error destroying editor:', error);
    }
}