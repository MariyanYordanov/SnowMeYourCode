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
                    window.ExamApp.editor = editor;

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
        // This will be triggered after code execution
        window.highlightErrorLine = (lineNumber) => {
            if (!editor || lineNumber < 1) return;

            // Remove previous error decorations
            if (window.ExamApp.errorDecorations) {
                editor.deltaDecorations(window.ExamApp.errorDecorations, []);
            }

            // Add new error decoration
            window.ExamApp.errorDecorations = editor.deltaDecorations([], [
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
        // Run code button - търси по различни ID-та
        const runBtn = document.getElementById('run-btn') ||
            document.getElementById('run-code-btn') ||
            document.querySelector('button[id*="run"]');
        if (runBtn) {
            runBtn.addEventListener('click', () => {
                runCode();
            });
            console.log('Run button setup complete');
        } else {
            console.warn('Run button not found');
        }

        // Format code button
        const formatBtn = document.getElementById('format-btn') ||
            document.getElementById('format-code-btn') ||
            document.querySelector('button[id*="format"]');
        if (formatBtn) {
            formatBtn.addEventListener('click', () => {
                formatCode();
            });
        }

        // Clear output button
        const clearBtn = document.getElementById('clear-btn') ||
            document.getElementById('clear-output-btn') ||
            document.querySelector('button[id*="clear"]');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                clearOutput();
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
        const editor = window.ExamApp?.editor;
        if (!editor) {
            console.error('Editor not initialized');
            showError('Редакторът не е готов');
            return;
        }

        const code = editor.getValue();
        const sessionId = window.ExamApp?.sessionId;

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

        // Show execution start
        const outputEl = document.getElementById('console-output');
        if (outputEl) {
            outputEl.innerHTML = '<div class="console-info">Изпълнение на кода...</div>';
        }

        // Execute code with sessionId
        const response = await fetch('/proxy/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Important for session cookies
            body: JSON.stringify({
                code: code,
                sessionId: sessionId // Include sessionId in request body
            })
        });

        const result = await response.json();

        if (response.ok && result.output) {
            // Display output
            displayExecutionResult(result.output);

            // Show execution time if available
            if (result.executionTime) {
                showExecutionInfo(`Изпълнено за ${result.executionTime}ms`);
            }
        } else {
            // Display error
            const errorMsg = result.error || result.message || 'Грешка при изпълнение';
            displayError(errorMsg);

            // If it's a session error, show more details
            if (errorMsg.includes('SESSION_REQUIRED') || errorMsg.includes('No valid session')) {
                showError('Сесията е изтекла. Моля влезте отново.');
            }
        }

        // Save code after execution
        saveCode();

    } catch (error) {
        console.error('Execution error:', error);
        displayError('Грешка при връзка със сървъра: ' + error.message);
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
function displayExecutionResult(output) {
    const consoleOutput = document.getElementById('console-output');
    if (consoleOutput) {
        // Parse and format output
        const lines = output.split('\n');
        const formattedOutput = lines.map(line => {
            // Check for console.table, console.error etc.
            if (line.startsWith('[TABLE]')) {
                return formatTableOutput(line.substring(7));
            } else if (line.startsWith('[ERROR]')) {
                return `<span class="console-error">${escapeHtml(line.substring(7))}</span>`;
            } else if (line.startsWith('[WARN]')) {
                return `<span class="console-warn">${escapeHtml(line.substring(6))}</span>`;
            } else if (line.startsWith('[INFO]')) {
                return `<span class="console-info">${escapeHtml(line.substring(6))}</span>`;
            } else {
                return escapeHtml(line);
            }
        }).join('<br>');

        consoleOutput.innerHTML = formattedOutput;
    }
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
        if (!window.ExamApp.editor) {
            console.warn('Editor not available');
            showError('Редакторът не е готов.');
            return;
        }

        window.ExamApp.editor.getAction('editor.action.formatDocument').run();
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
        if (!window.ExamApp.editor) {
            return false;
        }

        const code = window.ExamApp.editor.getValue();

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

        // Clear error line highlighting
        if (window.ExamApp.editor && window.ExamApp.errorDecorations) {
            window.ExamApp.editor.deltaDecorations(window.ExamApp.errorDecorations, []);
            window.ExamApp.errorDecorations = [];
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
        if (!window.ExamApp.editor) {
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
        window.ExamApp.lastSaveTime = Date.now();
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
    if (window.ExamApp?.showError) {
        window.ExamApp.showError(message);
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
    if (!window.ExamApp.editor) {
        return '';
    }

    try {
        return window.ExamApp.editor.getValue();
    } catch (error) {
        console.error('Failed to get editor value:', error);
        return '';
    }
}

/**
 * Set editor value
 */
export function setEditorValue(value) {
    if (!window.ExamApp.editor) {
        return false;
    }

    try {
        window.ExamApp.editor.setValue(value);
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
    if (!window.ExamApp.editor) {
        return false;
    }

    try {
        window.ExamApp.editor.focus();
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
    if (!window.ExamApp.editor) {
        return;
    }

    try {
        window.ExamApp.editor.layout();
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

        if (window.ExamApp.editor) {
            window.ExamApp.editor.dispose();
            window.ExamApp.editor = null;
        }

    } catch (error) {
        console.error('Error destroying editor:', error);
    }
}