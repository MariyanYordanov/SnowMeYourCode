/**
 * Monaco Editor Module - ENHANCED CONSOLE VERSION
 * Handles Monaco editor setup, code execution, and enhanced console output
 * ENHANCED: console.table(), time tracking, better formatting, error highlighting
 */

// Import socket functions
import { sendCodeUpdate } from './socket.js';
import { triggerDOMPreview, autoSwitchToDOMIfNeeded } from './tabs.js';

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
 * Initialize Monaco Editor
 */
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
                        suggest: {
                            enableExtendedKeywords: true,
                            showWords: true,
                            showSnippets: true
                        },
                        quickSuggestions: {
                            other: true,
                            comments: false,
                            strings: false
                        },
                        // NEW: Enhanced editor features
                        multiCursorModifier: 'ctrlCmd',
                        formatOnPaste: true,
                        formatOnType: true,
                        autoIndent: 'advanced',
                        tabCompletion: 'on',
                        acceptSuggestionOnEnter: 'on',
                        snippetSuggestions: 'top',
                        wordBasedSuggestions: true,
                        codeLens: true,
                        folding: true,
                        foldingStrategy: 'indentation',
                        showFoldingControls: 'mouseover',
                        matchBrackets: 'always',
                        selectionHighlight: true,
                        occurrencesHighlight: true,
                        find: {
                            seedSearchStringFromSelection: true,
                            autoFindInSelection: 'never'
                        },
                        // NEW: Performance optimizations
                        smoothScrolling: true,
                        cursorSmoothCaretAnimation: true,
                        cursorBlinking: 'blink',
                        renderLineHighlight: 'line',
                        // NEW: Accessibility improvements
                        accessibilitySupport: 'auto',
                        screenReaderAnnounceInlineSuggestion: true
                    });

                    // CRITICAL: Store editor in global state immediately
                    window.ExamApp.editor = editor;

                    // NEW: Setup language features
                    setupLanguageFeatures(editor);

                    // Setup auto-save
                    setupAutoSave(editor);

                    // Setup enhanced features integration
                    setupEditorIntegrations(editor);

                    // Setup keyboard shortcuts
                    setupKeyboardShortcuts(editor);

                    // NEW: Setup error detection and highlighting
                    setupErrorDetection(editor);

                    // NEW: Setup code quality hints
                    setupCodeQualityHints(editor);

                    console.log('✅ Enhanced Monaco Editor initialized');
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
 * NEW: Setup enhanced language features
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
            } else if (content.includes('{') && content.includes('}') &&
                (content.includes('color') || content.includes('background'))) {
                newLanguage = 'css';
            }

            const currentLanguage = editor.getModel().getLanguageId();
            if (currentLanguage !== newLanguage) {
                monaco.editor.setModelLanguage(editor.getModel(), newLanguage);
                console.log(`🔄 Language auto-detected: ${newLanguage}`);
            }
        });

        console.log('✅ Enhanced language features setup');

    } catch (error) {
        console.error('❌ Failed to setup language features:', error);
    }
}

/**
 * NEW: Setup error detection and highlighting
 */
function setupErrorDetection(editor) {
    try {
        let errorDecorations = [];

        // Real-time syntax error detection for JavaScript
        editor.onDidChangeModelContent(() => {
            clearTimeout(window.errorCheckTimeout);
            window.errorCheckTimeout = setTimeout(() => {
                const content = editor.getValue();
                const language = editor.getModel().getLanguageId();

                if (language === 'javascript') {
                    checkJavaScriptSyntax(editor, content);
                }
            }, 1000);
        });

        function checkJavaScriptSyntax(editor, code) {
            try {
                // Clear previous decorations
                errorDecorations = editor.deltaDecorations(errorDecorations, []);

                // Simple syntax check
                new Function(code);

            } catch (error) {
                // Extract line number from error
                const lineMatch = error.stack?.match(/Function:(\d+):/);
                const lineNumber = lineMatch ? parseInt(lineMatch[1]) : 1;

                // Add error decoration
                errorDecorations = editor.deltaDecorations(errorDecorations, [{
                    range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                    options: {
                        isWholeLine: true,
                        className: 'error-line',
                        glyphMarginClassName: 'error-line-glyph',
                        hoverMessage: { value: `**Syntax Error:** ${error.message}` }
                    }
                }]);
            }
        }

        console.log('✅ Error detection setup');

    } catch (error) {
        console.error('❌ Failed to setup error detection:', error);
    }
}

/**
 * NEW: Setup code quality hints
 */
function setupCodeQualityHints(editor) {
    try {
        // Add code quality markers
        editor.onDidChangeModelContent(() => {
            clearTimeout(window.qualityCheckTimeout);
            window.qualityCheckTimeout = setTimeout(() => {
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

        console.log('✅ Code quality hints setup');

    } catch (error) {
        console.error('❌ Failed to setup code quality hints:', error);
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
        console.error('❌ Failed to setup auto-save:', error);
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
            runBtn.addEventListener('click', () => {
                runCode();
                // NEW: Auto-trigger DOM preview hint
                const code = window.ExamApp.editor?.getValue() || '';
                autoSwitchToDOMIfNeeded(code);
            });
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

    } catch (error) {
        console.error('❌ Failed to setup editor controls:', error);
    }
}

/**
 * Run code in editor - ENHANCED VERSION
 */
export function runCode() {
    try {
        if (!window.ExamApp.editor) {
            console.warn('⚠️ Editor not available');
            showError('Редакторът не е готов. Моля изчакайте.');
            return;
        }

        const code = window.ExamApp.editor.getValue();
        const outputEl = document.getElementById('code-output');

        if (!outputEl) {
            console.error('❌ Output element not found');
            return;
        }

        // Clear previous output
        clearOutput();
        hideError();

        // Capture enhanced console output
        const result = captureEnhancedConsoleOutput(code);

        // Display results
        if (result.success) {
            displayEnhancedOutput(result.logs);

            // Show execution success info
            const executionTime = result.executionTime;
            showExecutionInfo(`Код изпълнен за ${executionTime}ms`);
        } else {
            showError(result.error);
            highlightErrorLine(result.lineNumber);
        }

    } catch (error) {
        console.error('❌ Code execution failed:', error);
        showError(`Грешка при изпълнение: ${error.message}`);
    }
}

/**
 * Capture enhanced console output with all console methods
 */
function captureEnhancedConsoleOutput(code) {
    try {
        const startTime = performance.now();
        const output = [];

        // Store original console methods
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            table: console.table,
            time: console.time,
            timeEnd: console.timeEnd,
            clear: console.clear,
            info: console.info
        };

        // Enhanced console.log
        console.log = function (...args) {
            output.push({
                type: 'log',
                content: args.map(arg => formatEnhancedValue(arg)).join(' '),
                timestamp: Date.now(),
                args: args
            });
            originalConsole.log.apply(console, arguments);
        };

        // Enhanced console.error
        console.error = function (...args) {
            output.push({
                type: 'error',
                content: args.map(arg => formatEnhancedValue(arg)).join(' '),
                timestamp: Date.now(),
                args: args
            });
            originalConsole.error.apply(console, arguments);
        };

        // Enhanced console.warn
        console.warn = function (...args) {
            output.push({
                type: 'warn',
                content: args.map(arg => formatEnhancedValue(arg)).join(' '),
                timestamp: Date.now(),
                args: args
            });
            originalConsole.warn.apply(console, arguments);
        };

        // Enhanced console.info
        console.info = function (...args) {
            output.push({
                type: 'info',
                content: args.map(arg => formatEnhancedValue(arg)).join(' '),
                timestamp: Date.now(),
                args: args
            });
            originalConsole.info.apply(console, arguments);
        };

        // Enhanced console.table
        console.table = function (data, columns) {
            const tableHtml = formatTableData(data, columns);
            output.push({
                type: 'table',
                content: tableHtml,
                timestamp: Date.now(),
                data: data,
                columns: columns
            });
            originalConsole.table.apply(console, arguments);
        };

        // Enhanced console.time
        console.time = function (label = 'default') {
            const timestamp = performance.now();
            consoleState.timers.set(label, timestamp);
            output.push({
                type: 'time-start',
                content: `Timer '${label}' started`,
                timestamp: Date.now(),
                label: label
            });
            originalConsole.time.apply(console, arguments);
        };

        // Enhanced console.timeEnd
        console.timeEnd = function (label = 'default') {
            const startTime = consoleState.timers.get(label);
            if (startTime !== undefined) {
                const endTime = performance.now();
                const duration = (endTime - startTime).toFixed(3);
                consoleState.timers.delete(label);

                output.push({
                    type: 'time-end',
                    content: `Timer '${label}': ${duration}ms`,
                    timestamp: Date.now(),
                    label: label,
                    duration: duration
                });
            } else {
                output.push({
                    type: 'error',
                    content: `Timer '${label}' does not exist`,
                    timestamp: Date.now()
                });
            }
            originalConsole.timeEnd.apply(console, arguments);
        };

        // Enhanced console.clear
        console.clear = function () {
            output.push({
                type: 'clear',
                content: 'Console cleared',
                timestamp: Date.now()
            });
            // Don't actually clear in exam environment
            originalConsole.clear.apply(console, arguments);
        };

        // Execute code in isolated scope
        const func = new Function(code);
        func();

        // Restore console methods
        Object.assign(console, originalConsole);

        const executionTime = (performance.now() - startTime).toFixed(2);

        // Store in history
        const outputEntry = {
            code: code,
            output: output,
            timestamp: Date.now(),
            executionTime: executionTime
        };

        consoleState.outputHistory.push(outputEntry);
        if (consoleState.outputHistory.length > consoleState.maxHistoryItems) {
            consoleState.outputHistory.shift();
        }

        return {
            success: true,
            logs: output,
            executionTime: executionTime
        };

    } catch (error) {
        // Restore console methods in case of error
        Object.assign(console, originalConsole);

        // Try to extract line number from error
        const lineNumber = extractErrorLineNumber(error, code);

        return {
            success: false,
            error: error.message,
            lineNumber: lineNumber
        };
    }
}

/**
 * Format enhanced value for display with better JSON formatting
 */
function formatEnhancedValue(arg) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';

    if (typeof arg === 'string') {
        return `"${arg}"`;
    }

    if (typeof arg === 'number' || typeof arg === 'boolean') {
        return String(arg);
    }

    if (typeof arg === 'function') {
        return `[Function: ${arg.name || 'anonymous'}]`;
    }

    if (typeof arg === 'object') {
        try {
            // Better JSON formatting with indentation
            return JSON.stringify(arg, null, 2);
        } catch (e) {
            return '[Circular Object]';
        }
    }

    return String(arg);
}

/**
 * Format table data for display
 */
function formatTableData(data, columns) {
    try {
        if (!data) return 'undefined';

        // Handle arrays
        if (Array.isArray(data)) {
            if (data.length === 0) return 'Empty Array []';

            // Simple array
            if (data.every(item => typeof item !== 'object' || item === null)) {
                return createSimpleTable(data);
            }

            // Array of objects
            return createObjectTable(data, columns);
        }

        // Handle objects
        if (typeof data === 'object') {
            return createObjectTable([data], columns);
        }

        return formatEnhancedValue(data);

    } catch (error) {
        return `[Table Error: ${error.message}]`;
    }
}

/**
 * Create simple table for primitive arrays
 */
function createSimpleTable(data) {
    let html = '<table class="console-table">';
    html += '<thead><tr><th>(index)</th><th>Value</th></tr></thead>';
    html += '<tbody>';

    data.forEach((value, index) => {
        html += `<tr><td class="table-index">${index}</td><td class="table-value">${formatEnhancedValue(value)}</td></tr>`;
    });

    html += '</tbody></table>';
    return html;
}

/**
 * Create object table for complex data
 */
function createObjectTable(data, columns) {
    if (!Array.isArray(data) || data.length === 0) {
        return 'Empty data';
    }

    // Get all keys from all objects
    const allKeys = columns || [...new Set(data.flatMap(obj =>
        obj && typeof obj === 'object' ? Object.keys(obj) : []
    ))];

    if (allKeys.length === 0) {
        return 'No properties to display';
    }

    let html = '<table class="console-table">';

    // Header
    html += '<thead><tr><th>(index)</th>';
    allKeys.forEach(key => {
        html += `<th>${escapeHtml(String(key))}</th>`;
    });
    html += '</tr></thead>';

    // Body
    html += '<tbody>';
    data.forEach((row, index) => {
        html += `<tr><td class="table-index">${index}</td>`;
        allKeys.forEach(key => {
            const value = row && typeof row === 'object' ? row[key] : undefined;
            html += `<td class="table-value">${formatEnhancedValue(value)}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';

    return html;
}

/**
 * Display enhanced output with all console types
 */
function displayEnhancedOutput(logs) {
    const outputEl = document.getElementById('code-output');
    if (!outputEl) return;

    if (logs.length === 0) {
        outputEl.innerHTML = '<div class="output-placeholder">Кодът е изпълнен успешно (няма output)</div>';
        return;
    }

    let outputHtml = '';

    logs.forEach((item, index) => {
        const className = `output-line output-${item.type}`;

        switch (item.type) {
            case 'table':
                outputHtml += `<div class="${className}">
                    <div class="output-table-wrapper">${item.content}</div>
                </div>`;
                break;

            case 'time-start':
                outputHtml += `<div class="${className}">
                    <span class="time-label">⏱️</span> ${escapeHtml(item.content)}
                </div>`;
                break;

            case 'time-end':
                outputHtml += `<div class="${className}">
                    <span class="time-label">⏹️</span> ${escapeHtml(item.content)}
                </div>`;
                break;

            case 'clear':
                outputHtml += `<div class="${className}">
                    <span class="clear-label">🧹</span> ${escapeHtml(item.content)}
                </div>`;
                break;

            case 'error':
                outputHtml += `<div class="${className}">
                    <span class="error-icon">❌</span> ${escapeHtml(item.content)}
                </div>`;
                break;

            case 'warn':
                outputHtml += `<div class="${className}">
                    <span class="warn-icon">⚠️</span> ${escapeHtml(item.content)}
                </div>`;
                break;

            case 'info':
                outputHtml += `<div class="${className}">
                    <span class="info-icon">ℹ️</span> ${escapeHtml(item.content)}
                </div>`;
                break;

            default: // log
                outputHtml += `<div class="${className}">${escapeHtml(item.content)}</div>`;
                break;
        }
    });

    outputEl.innerHTML = outputHtml;

    // Scroll to bottom
    outputEl.scrollTop = outputEl.scrollHeight;
}

/**
 * Extract error line number from error stack
 */
function extractErrorLineNumber(error, code) {
    try {
        const stack = error.stack || '';
        const lines = code.split('\n');

        // Try to find line number in stack trace
        const match = stack.match(/:(\d+):\d+/);
        if (match) {
            const lineNum = parseInt(match[1], 10);
            if (lineNum >= 1 && lineNum <= lines.length) {
                return lineNum;
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Highlight error line in editor
 */
function highlightErrorLine(lineNumber) {
    try {
        if (!window.ExamApp.editor || !lineNumber) return;

        // Remove existing decorations
        const oldDecorations = window.ExamApp.editor.deltaDecorations([], []);

        // Add error line decoration
        const newDecorations = window.ExamApp.editor.deltaDecorations(oldDecorations, [{
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
                isWholeLine: true,
                className: 'error-line',
                glyphMarginClassName: 'error-line-glyph'
            }
        }]);

        // Store decorations for later cleanup
        window.ExamApp.errorDecorations = newDecorations;

        // Scroll to error line
        window.ExamApp.editor.revealLineInCenter(lineNumber);

    } catch (error) {
        console.error('❌ Failed to highlight error line:', error);
    }
}

/**
 * Show execution info
 */
function showExecutionInfo(message) {
    try {
        const infoEl = document.getElementById('execution-info');
        if (infoEl) {
            infoEl.textContent = message;
            infoEl.style.display = 'block';

            // Hide after 3 seconds
            setTimeout(() => {
                infoEl.style.display = 'none';
            }, 3000);
        }
    } catch (error) {
        console.error('❌ Failed to show execution info:', error);
    }
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
    } catch (error) {
        console.error('❌ Code formatting failed:', error);
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
        console.error('❌ Error destroying editor:', error);
    }
}