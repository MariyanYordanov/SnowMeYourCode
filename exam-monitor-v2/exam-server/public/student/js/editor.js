/**
 * Monaco Editor Module - ENHANCED CONSOLE VERSION
 * Handles Monaco editor setup, code execution, and enhanced console output
 * ENHANCED: console.table(), time tracking, better formatting, error highlighting
 */

// Import socket functions
import { sendCodeUpdate } from './socket.js';

// Auto-save timeout
let autoSaveTimeout = null;
const AUTO_SAVE_DELAY = 1000; 

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
            // Wait for Monaco loader to be ready (using global waitForMonaco from index.html)
            if (typeof window.waitForMonaco === 'function') {
                window.waitForMonaco(() => {
                    // Monaco is now loaded, initialize the editor
                    createMonacoEditor(initialCode, resolve, reject);
                });
            } else if (typeof require !== 'undefined') {
                // Fallback: require is already available
                require(['vs/editor/editor.main'], function () {
                    createMonacoEditor(initialCode, resolve, reject);
                });
            } else {
                reject(new Error('Monaco loader not available. Please ensure loader.min.js is loaded.'));
            }
        } catch (error) {
            console.error('Monaco Editor initialization failed:', error);
            reject(error);
        }
    });
}

/**
 * Create Monaco editor instance
 */
function createMonacoEditor(initialCode, resolve, reject) {
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
    return `
    // Write your code here
    console.log("Hello, world!");
    `;
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

        // Start Server button
        const startServerBtn = document.getElementById('start-server-btn');
        if (startServerBtn) {
            startServerBtn.addEventListener('click', () => {
                startExpressServer();
            });
            console.log('Start Server button setup complete');
        }

        // Save button (for Safe Browser mode where Ctrl+S is blocked)
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (window.ExamApp?.fileManager) {
                    window.ExamApp.fileManager.saveCurrentFile();
                }
            });
            console.log('Save button setup complete');
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
            showError('Editor is not ready');
            return;
        }

        const code = editor.getValue();
        const sessionId = examApp?.sessionId;

        if (!sessionId) {
            console.error('No valid session ID');
            showError('No valid session. Please log in again.');
            return;
        }

        // Show loading state
        const runBtn = document.getElementById('run-btn');
        if (runBtn) {
            runBtn.disabled = true;
            runBtn.innerHTML = 'Running...';
        }

        // Execute code using BottomPanel terminal
        if (examApp?.bottomPanel) {
            examApp.bottomPanel.executeCode(code);
            examApp.bottomPanel.switchTab('console'); // Auto-switch to console tab
        } else {
            console.error('BottomPanel not initialized');
        }

        // Save code after execution
        saveCode();

    } catch (error) {
        console.error('Execution error:', error);
        displayError('Execution error: ' + error.message);
    } finally {
        // Reset button state
        const runBtn = document.getElementById('run-btn');
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.innerHTML = 'Run';
        }
    }
}

// Display functions removed - now handled by DevTools UI

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
            showError('Editor is not ready.');
            return;
        }

        examApp.editor.getAction('editor.action.formatDocument').run();
    } catch (error) {
        console.error('Code formatting failed:', error);
        showError('Error formatting code');
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
        const currentFile = examApp.fileManager?.currentFile || 'main.js';

        // Send to server via socket with correct filename
        const success = sendCodeUpdate(code, currentFile);

        if (success) {
            updateLastSaved();
            // Mark file as saved (cyan color) in tab
            if (examApp.fileManager) {
                examApp.fileManager.markFileAsSaved(currentFile);
            }
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
        // Clear DevTools console instead
        if (window.devToolsUI) {
            window.devToolsUI.clearConsole();
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
 * Update last saved timestamp
 */
function updateLastSaved() {
    try {
        const examApp = window.ExamApp;
        examApp.lastSaveTime = Date.now();
        const lastSavedEl = document.getElementById('last-saved');
        if (lastSavedEl) {
            lastSavedEl.textContent = `Saved: ${new Date().toLocaleTimeString('en-US')}`;
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
 * Show success notification
 */
function showSuccess(message) {
    const examApp = window.ExamApp;
    if (examApp?.showSuccess) {
        examApp.showSuccess(message);
    } else {
        console.log(message);
        // Show in DevTools console
        if (window.devToolsUI) {
            window.devToolsUI.addConsoleMessage('info', [message]);
        }
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

/**
 * Secure Code Execution Sandbox
 */
async function executeSafeCode(code) {
    const startTime = Date.now();
    const output = [];
    const timers = new Map();
    const counters = new Map();

    try {
        // Validate code before execution
        const validation = validateStudentCode(code);
        if (!validation.safe) {
            return {
                success: false,
                error: `Security violation: ${validation.reason}`,
                output: [],
                executionTime: 0
            };
        }

        // Create secure execution context
        const context = createSecureContext(output, timers, counters);

        // Wrap code to prevent global access
        const wrappedCode = wrapStudentCode(code);

        // Create execution function
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const executor = new AsyncFunction(...Object.keys(context), wrappedCode);

        // Execute with timeout (5 seconds)
        const result = await Promise.race([
            executor(...Object.values(context)),
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Code execution timeout (5s)')), 5000);
            })
        ]);

        // Clean up timers
        timers.forEach(timerId => {
            clearTimeout(timerId);
            clearInterval(timerId);
        });

        const executionTime = Date.now() - startTime;

        return {
            success: true,
            result: result,
            output: output,
            executionTime: executionTime,
            memoryUsage: getMemoryUsage()
        };

    } catch (error) {
        // Clean up on error
        timers.forEach(timerId => {
            clearTimeout(timerId);
            clearInterval(timerId);
        });

        const executionTime = Date.now() - startTime;
        
        return {
            success: false,
            error: sanitizeErrorMessage(error.message),
            output: output,
            executionTime: executionTime
        };
    }
}

/**
 * Validate student code for security issues
 */
function validateStudentCode(code) {
    const restrictedAPIs = [
        'ExamApp', 'socket', 'sessionId', 'terminateExam', 
        'violationCount', 'antiCheatActive', 'completeExam',
        'examEndTime', 'examDuration'
    ];

    // Check for restricted API access
    for (const api of restrictedAPIs) {
        const patterns = [
            new RegExp(`window\\.${api}`, 'i'),
            new RegExp(`\\b${api}\\b`, 'i')
        ];

        for (const pattern of patterns) {
            if (pattern.test(code)) {
                return {
                    safe: false,
                    reason: `Access to restricted API: ${api}`
                };
            }
        }
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
        /\beval\s*\(/i,
        /\bFunction\s*\(/i,
        /\bnew\s+Function/i,
        /\bdocument\./i,
        /\bwindow\./i,
        /\bglobalThis\./i,
        /\b__proto__/i,
        /\bconstructor\s*\./i
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
            return {
                safe: false,
                reason: `Dangerous pattern detected`
            };
        }
    }

    if (code.length > 100000) {
        return {
            safe: false,
            reason: 'Code too long (max 100KB)'
        };
    }

    return { safe: true };
}

/**
 * Create secure execution context
 */
function createSecureContext(output, timers, counters) {
    return {
        // Enhanced console methods with output capture
        console: {
            log: (...args) => captureOutput(output, 'log', args),
            error: (...args) => captureOutput(output, 'error', args),
            warn: (...args) => captureOutput(output, 'warn', args),
            info: (...args) => captureOutput(output, 'info', args),
            debug: (...args) => captureOutput(output, 'debug', args),
            table: (data) => captureTable(output, data),
            time: (label) => startTimer(timers, label),
            timeEnd: (label) => endTimer(timers, output, label),
            timeLog: (label, ...data) => timeLog(timers, output, label, data),
            clear: () => clearConsoleOutput(output),
            count: (label) => incrementCounter(counters, output, label),
            countReset: (label) => resetCounter(counters, output, label),
            group: (label) => captureGroup(output, 'group', label),
            groupCollapsed: (label) => captureGroup(output, 'groupCollapsed', label),
            groupEnd: () => captureGroupEnd(output),
            assert: (condition, ...args) => captureAssert(output, condition, args),
            trace: (...args) => captureTrace(output, args),
            dir: (object) => captureDir(output, object),
            dirxml: (object) => captureDirXML(output, object),
            memory: () => captureMemory(output),
            profile: (name) => captureProfile(output, 'start', name),
            profileEnd: (name) => captureProfile(output, 'end', name)
        },

        // Safe globals
        Math: { ...Math },
        Date: Date,
        JSON: { parse: JSON.parse, stringify: JSON.stringify },
        Array: Array,
        Object: Object,
        String: String,
        Number: Number,
        Boolean: Boolean,
        RegExp: RegExp,
        Error: Error,
        Promise: Promise,

        // Limited timer functions
        setTimeout: (fn, delay) => createSafeTimer(timers, fn, delay, false),
        setInterval: (fn, delay) => createSafeTimer(timers, fn, delay, true),
        clearTimeout: (id) => clearSafeTimer(timers, id),
        clearInterval: (id) => clearSafeTimer(timers, id)
    };
}

/**
 * Wrap student code to prevent global access
 */
function wrapStudentCode(code) {
    return `
        "use strict";
        (function() {
            // Block access to global scope
            const window = undefined;
            const globalThis = undefined;
            const global = undefined;
            const self = undefined;
            const document = undefined;
            const location = undefined;
            const navigator = undefined;
            
            // Execute user code
            return (async function() {
                ${code}
            })();
        })()
    `;
}

/**
 * Helper functions for sandbox
 */
function captureOutput(output, type, args) {
    output.push({
        type: type,
        content: args.map(formatValue),
        timestamp: Date.now()
    });
}

function captureTable(output, data) {
    output.push({
        type: 'table',
        content: formatTableData(data),
        timestamp: Date.now()
    });
}

function formatValue(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'function') return '[Function]';
    
    try {
        return JSON.stringify(value, null, 2);
    } catch (e) {
        return '[Object]';
    }
}

function formatTableData(data) {
    if (!data) return [];

    if (Array.isArray(data)) {
        return data.map((item, index) => ({
            index: index,
            value: formatValue(item)
        }));
    }

    if (typeof data === 'object') {
        return Object.entries(data).map(([key, value]) => ({
            key: key,
            value: formatValue(value)
        }));
    }

    return [{ value: formatValue(data) }];
}

function startTimer(timers, label) {
    timers.set(label || 'default', Date.now());
}

function endTimer(timers, output, label) {
    const startTime = timers.get(label || 'default');
    if (startTime) {
        const duration = Date.now() - startTime;
        captureOutput(output, 'info', [`${label || 'default'}: ${duration}ms`]);
        timers.delete(label || 'default');
    }
}

function incrementCounter(counters, output, label) {
    const current = counters.get(label || 'default') || 0;
    const newCount = current + 1;
    counters.set(label || 'default', newCount);
    captureOutput(output, 'info', [`${label || 'default'}: ${newCount}`]);
}

function resetCounter(counters, output, label) {
    counters.set(label || 'default', 0);
    captureOutput(output, 'info', [`${label || 'default'}: 0`]);
}

function timeLog(timers, output, label, data) {
    const startTime = timers.get(label || 'default');
    if (startTime) {
        const duration = Date.now() - startTime;
        const args = [`${label || 'default'}: ${duration}ms`];
        if (data && data.length > 0) {
            args.push(...data.map(formatValue));
        }
        captureOutput(output, 'info', args);
    }
}

function captureGroup(output, type, label) {
    output.push({
        type: type,
        content: [label || 'Group'],
        timestamp: Date.now(),
        groupLevel: getGroupLevel(output) + 1
    });
}

function captureGroupEnd(output) {
    const currentLevel = getGroupLevel(output);
    if (currentLevel > 0) {
        output.push({
            type: 'groupEnd',
            content: ['Group End'],
            timestamp: Date.now(),
            groupLevel: currentLevel - 1
        });
    }
}

function getGroupLevel(output) {
    let level = 0;
    for (let i = output.length - 1; i >= 0; i--) {
        const entry = output[i];
        if (entry.type === 'group' || entry.type === 'groupCollapsed') {
            level++;
        } else if (entry.type === 'groupEnd') {
            level--;
        }
    }
    return Math.max(0, level);
}

function captureAssert(output, condition, args) {
    if (!condition) {
        const message = args.length > 0 ? args.map(formatValue) : ['Assertion failed'];
        output.push({
            type: 'error',
            content: ['Assertion failed:', ...message],
            timestamp: Date.now()
        });
    }
}

function captureTrace(output, args) {
    const stack = new Error().stack || 'Stack trace not available';
    const stackLines = stack.split('\n').slice(2, 8); // Get relevant stack lines
    
    output.push({
        type: 'trace',
        content: args.length > 0 ? args.map(formatValue) : ['Trace'],
        timestamp: Date.now(),
        stack: stackLines.map(line => line.trim())
    });
}

function captureDir(output, object) {
    let formattedObject;
    
    try {
        if (object === null || object === undefined) {
            formattedObject = String(object);
        } else if (typeof object === 'object') {
            formattedObject = {
                type: Object.prototype.toString.call(object),
                properties: Object.getOwnPropertyNames(object).slice(0, 20), // Limit to first 20 properties
                values: {}
            };
            
            // Get property values (safely)
            for (const prop of formattedObject.properties) {
                try {
                    const value = object[prop];
                    formattedObject.values[prop] = typeof value === 'function' ? 
                        '[Function]' : 
                        formatValue(value);
                } catch (e) {
                    formattedObject.values[prop] = '[Getter/Setter]';
                }
            }
        } else {
            formattedObject = formatValue(object);
        }
    } catch (e) {
        formattedObject = '[Object inspection failed]';
    }
    
    output.push({
        type: 'dir',
        content: [formattedObject],
        timestamp: Date.now()
    });
}

function captureDirXML(output, object) {
    let xmlRepresentation;
    
    try {
        if (object && object.nodeType) {
            // DOM element
            xmlRepresentation = object.outerHTML || object.textContent || '[DOM Node]';
        } else if (object && typeof object === 'object') {
            // Convert object to XML-like representation
            xmlRepresentation = objectToXML(object);
        } else {
            xmlRepresentation = formatValue(object);
        }
    } catch (e) {
        xmlRepresentation = '[XML representation failed]';
    }
    
    output.push({
        type: 'dirxml',
        content: [xmlRepresentation],
        timestamp: Date.now()
    });
}

function objectToXML(obj, depth = 0) {
    if (depth > 3) return '[Max depth reached]'; // Prevent infinite recursion
    
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (typeof obj !== 'object') return formatValue(obj);
    
    const indent = '  '.repeat(depth);
    const type = Object.prototype.toString.call(obj).slice(8, -1);
    
    if (Array.isArray(obj)) {
        const items = obj.slice(0, 10).map((item, index) => 
            `${indent}  <item index="${index}">${objectToXML(item, depth + 1)}</item>`
        ).join('\n');
        return `<${type}>\n${items}\n${indent}</${type}>`;
    } else {
        const props = Object.entries(obj).slice(0, 10).map(([key, value]) => 
            `${indent}  <${key}>${objectToXML(value, depth + 1)}</${key}>`
        ).join('\n');
        return `<${type}>\n${props}\n${indent}</${type}>`;
    }
}

function captureMemory(output) {
    let memoryInfo = { available: false };
    
    try {
        if (performance.memory) {
            memoryInfo = {
                available: true,
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100,
                unit: 'MB'
            };
        }
    } catch (e) {
        memoryInfo.error = 'Memory API not available';
    }
    
    output.push({
        type: 'memory',
        content: [memoryInfo],
        timestamp: Date.now()
    });
}

function captureProfile(output, action, name) {
    const profileName = name || 'Profile';
    const message = action === 'start' ? 
        `Profile "${profileName}" started` : 
        `Profile "${profileName}" ended`;
    
    output.push({
        type: 'profile',
        content: [message],
        timestamp: Date.now(),
        action: action,
        profileName: profileName
    });
}

function clearConsoleOutput(output) {
    output.length = 0;
    output.push({
        type: 'clear',
        content: ['Console was cleared'],
        timestamp: Date.now()
    });
}

function createSafeTimer(timers, fn, delay, isInterval) {
    if (timers.size >= 10) {
        throw new Error('Too many timers (max 10)');
    }

    const timerId = isInterval ? 
        setInterval(() => {
            try { fn(); } catch (e) { /* ignore timer errors */ }
        }, Math.max(delay, 10)) :
        setTimeout(() => {
            try { fn(); } catch (e) { /* ignore timer errors */ }
        }, Math.max(delay, 10));

    timers.set(timerId, timerId);
    return timerId;
}

function clearSafeTimer(timers, id) {
    if (timers.has(id)) {
        clearTimeout(id);
        clearInterval(id);
        timers.delete(id);
    }
}

function getMemoryUsage() {
    try {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
    } catch (e) {
        // Ignore memory API errors
    }
    return null;
}

function sanitizeErrorMessage(message) {
    return message
        .replace(/at file:\/\/\/.*?\//g, 'at ')
        .replace(/\(file:\/\/\/.*?\)/g, '()')
        .replace(/at .*?\.js:\d+:\d+/g, 'at <anonymous>');
}

// Display helper functions removed - now handled by DevTools UI

/**
 * Show execution statistics
 */
function showExecutionStats(result) {
    const statsEl = document.getElementById('execution-stats');
    if (!statsEl) return;
    
    let html = `<div class="execution-stats">`;
    html += `<span>${result.executionTime}ms</span>`;
    
    if (result.memoryUsage) {
        const memMB = Math.round(result.memoryUsage.used / 1024 / 1024);
        html += `<span>${memMB}MB</span>`;
    }
    
    html += `<span>${result.output.length} outputs</span>`;
    html += `</div>`;
    
    statsEl.innerHTML = html;
    statsEl.style.display = 'block';
}

// Export sandbox function for global access
window.executeSafeCode = executeSafeCode;

/**
 * Check if code is Node.js server code
 */
function isNodeJSCode(code) {
    // Check for Node.js specific patterns
    const nodePatterns = [
        /\brequire\s*\(\s*['"]/,  // require('module')
        /\bmodule\.exports\s*=/,  // module.exports = 
        /\bexports\.\w+\s*=/,    // exports.something = 
        /\bprocess\.\w+/,        // process.env, process.argv
        /\b__dirname\b/,         // __dirname
        /\b__filename\b/,        // __filename
        /\bapp\.listen\s*\(/,    // app.listen(
        /\bexpress\s*\(\s*\)/,   // express()
        /\bmongoose\./,          // mongoose.
        /\bBuffer\./,            // Buffer.
        /\bfs\./,                // fs.
        /\bpath\./,              // path.
        /\bhttp\./,              // http.
        /\bhttps\./,             // https.
        /\burl\./,               // url.
        /\bos\./,                // os.
        /\bcrypto\./,            // crypto.
        /\butil\./,              // util.
        /\bevents\./,            // events.
        /\bstream\./,            // stream.
        /\bquerystring\./,       // querystring.
        /\bzlib\./,              // zlib.
        /\bchild_process\./,     // child_process.
        /\bcluster\./,           // cluster.
        /\bworker_threads\./,    // worker_threads.
        /from\s+['"]express['"]/, // from 'express'
        /from\s+['"]mongoose['"]/, // from 'mongoose'
        /import.*from\s+['"]fs['"]/, // import from 'fs'
        /import.*from\s+['"]path['"]/, // import from 'path'
    ];
    
    return nodePatterns.some(pattern => pattern.test(code));
}

/**
 * Start Express server for current student
 */
export async function startExpressServer() {
    try {
        const examApp = window.ExamApp;
        const sessionId = examApp?.sessionId;

        if (!sessionId) {
            showError('No valid session. Please log in again.');
            return;
        }

        const startServerBtn = document.getElementById('start-server-btn');
        if (startServerBtn) {
            startServerBtn.disabled = true;
            startServerBtn.textContent = 'Starting...';
        }

        // Save current code before starting server
        const editor = examApp?.editor;
        if (editor) {
            const currentCode = editor.getValue();
            // Auto-save current code with correct filename
            if (examApp?.sessionId) {
                const currentFile = examApp.fileManager?.currentFile || 'main.js';
                sendCodeUpdate(currentCode, currentFile);
            }
        }

        console.log('Starting Express server...');

        const response = await fetch('/api/project/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionId })
        });

        const result = await response.json();

        if (result.success) {
            showSuccess(`Server started on ${result.url}`);
            
            // Update button to show server is running
            if (startServerBtn) {
                startServerBtn.textContent = 'Server Running';
                startServerBtn.disabled = false;
                startServerBtn.classList.remove('btn-success');
                startServerBtn.classList.add('btn-warning');
                
                // Change to stop server functionality
                startServerBtn.onclick = () => stopExpressServer();
            }

            // DO NOT auto-open in new tab - anti-cheat will terminate exam!
            // Show URL in console instead
            if (window.devToolsUI) {
                window.devToolsUI.addConsoleMessage('info', [`Server URL: ${result.url} (Use Preview button or copy URL)`]);
            }

        } else {
            showError(`Server start failed: ${result.error}`);
            if (startServerBtn) {
                startServerBtn.disabled = false;
                startServerBtn.textContent = 'Start Server';
            }
        }

    } catch (error) {
        console.error('Error starting Express server:', error);
        showError('Failed to start server');
        
        const startServerBtn = document.getElementById('start-server-btn');
        if (startServerBtn) {
            startServerBtn.disabled = false;
            startServerBtn.textContent = 'Start Server';
        }
    }
}

/**
 * Stop Express server for current student
 */
export async function stopExpressServer() {
    try {
        const examApp = window.ExamApp;
        const sessionId = examApp?.sessionId;

        if (!sessionId) {
            showError('No valid session. Please log in again.');
            return;
        }

        const startServerBtn = document.getElementById('start-server-btn');
        if (startServerBtn) {
            startServerBtn.disabled = true;
            startServerBtn.textContent = 'Stopping...';
        }

        console.log('Stopping Express server...');

        const response = await fetch('/api/project/stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionId })
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Server stopped');
            
            // Reset button to start server
            if (startServerBtn) {
                startServerBtn.textContent = 'Start Server';
                startServerBtn.disabled = false;
                startServerBtn.classList.remove('btn-warning');
                startServerBtn.classList.add('btn-success');
                
                // Change back to start server functionality
                startServerBtn.onclick = () => startExpressServer();
            }

        } else {
            showError(`Stop failed: ${result.error}`);
            if (startServerBtn) {
                startServerBtn.disabled = false;
                startServerBtn.textContent = 'Server Running';
            }
        }

    } catch (error) {
        console.error('Error stopping Express server:', error);
        showError('Failed to stop server');
        
        const startServerBtn = document.getElementById('start-server-btn');
        if (startServerBtn) {
            startServerBtn.disabled = false;
            startServerBtn.textContent = 'Server Running';
        }
    }
}