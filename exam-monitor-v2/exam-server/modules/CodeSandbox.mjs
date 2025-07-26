/**
 * Code Execution Sandbox
 * Provides secure isolated environment for student code execution
 */

export class CodeSandbox {
    constructor() {
        this.restrictedAPIs = [
            'ExamApp',
            'socket',
            'sessionId',
            'terminateExam',
            'violationCount',
            'antiCheatActive',
            'completeExam',
            'examEndTime',
            'examDuration'
        ];
        
        this.allowedGlobals = [
            'console',
            'Math',
            'Date',
            'JSON',
            'Array',
            'Object',
            'String',
            'Number',
            'Boolean',
            'RegExp',
            'Error',
            'setTimeout',
            'setInterval',
            'clearTimeout',
            'clearInterval',
            'Promise',
            'fetch'
        ];
        
        this.executionTimeout = 5000; // 5 seconds
        this.memoryLimit = 50 * 1024 * 1024; // 50MB
    }

    /**
     * Create secure execution context
     */
    createSecureContext() {
        const context = {
            // Console methods with output capture
            console: {
                log: (...args) => this.captureOutput('log', args),
                error: (...args) => this.captureOutput('error', args),
                warn: (...args) => this.captureOutput('warn', args),
                info: (...args) => this.captureOutput('info', args),
                debug: (...args) => this.captureOutput('debug', args),
                table: (data) => this.captureTable(data),
                time: (label) => this.startTimer(label),
                timeEnd: (label) => this.endTimer(label),
                clear: () => this.clearOutput(),
                group: (label) => this.captureOutput('group', [label]),
                groupEnd: () => this.captureOutput('groupEnd', []),
                count: (label) => this.incrementCounter(label),
                assert: (condition, ...args) => {
                    if (!condition) {
                        this.captureOutput('error', ['Assertion failed:', ...args]);
                    }
                }
            },

            // Safe Math object
            Math: { ...Math },

            // Safe Date constructor
            Date: Date,

            // JSON methods
            JSON: {
                parse: JSON.parse,
                stringify: JSON.stringify
            },

            // Array and Object constructors
            Array: Array,
            Object: Object,
            String: String,
            Number: Number,
            Boolean: Boolean,
            RegExp: RegExp,
            Error: Error,

            // Safe timer functions (with limits)
            setTimeout: (fn, delay) => this.createSafeTimer(fn, delay, false),
            setInterval: (fn, delay) => this.createSafeTimer(fn, delay, true),
            clearTimeout: (id) => this.clearSafeTimer(id),
            clearInterval: (id) => this.clearSafeTimer(id),

            // Limited Promise support
            Promise: Promise,

            // Sandboxed fetch (restricted domains)
            fetch: (...args) => this.sandboxedFetch(...args)
        };

        return context;
    }

    /**
     * Execute student code in sandbox
     */
    async executeCode(code, options = {}) {
        const startTime = Date.now();
        const output = [];
        const timers = new Map();
        const counters = new Map();
        let timerIdCounter = 1;

        // Reset sandbox state
        this.output = output;
        this.timers = timers;
        this.counters = counters;
        this.timerIdCounter = timerIdCounter;

        try {
            // Validate code before execution
            const validation = this.validateCode(code);
            if (!validation.safe) {
                return {
                    success: false,
                    error: `Security violation: ${validation.reason}`,
                    output: [],
                    executionTime: 0
                };
            }

            // Create isolated execution environment
            const context = this.createSecureContext();

            // Wrap code in function to prevent global pollution
            const wrappedCode = this.wrapCode(code);

            // Create execution function
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            const executor = new AsyncFunction(...Object.keys(context), wrappedCode);

            // Execute with timeout
            const result = await Promise.race([
                executor(...Object.values(context)),
                this.createTimeoutPromise()
            ]);

            const executionTime = Date.now() - startTime;

            // Clear any remaining timers
            this.cleanupTimers();

            return {
                success: true,
                result: result,
                output: this.output,
                executionTime: executionTime,
                memoryUsage: this.estimateMemoryUsage()
            };

        } catch (error) {
            this.cleanupTimers();
            
            const executionTime = Date.now() - startTime;
            
            return {
                success: false,
                error: this.sanitizeError(error),
                output: this.output,
                executionTime: executionTime
            };
        }
    }

    /**
     * Validate code for security issues
     */
    validateCode(code) {
        // Check for restricted API access
        for (const api of this.restrictedAPIs) {
            const patterns = [
                new RegExp(`window\\.${api}`, 'i'),
                new RegExp(`globalThis\\.${api}`, 'i'),
                new RegExp(`self\\.${api}`, 'i'),
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

        // Check for dangerous eval patterns
        const dangerousPatterns = [
            /\beval\s*\(/i,
            /\bFunction\s*\(/i,
            /\bnew\s+Function/i,
            /\bdocument\./i,
            /\bwindow\./i,
            /\bglobalThis\./i,
            /\bprocess\./i,
            /\brequire\s*\(/i,
            /\bimport\s*\(/i,
            /\b__proto__/i,
            /\bconstructor\s*\./i
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(code)) {
                return {
                    safe: false,
                    reason: `Dangerous pattern detected: ${pattern.source}`
                };
            }
        }

        // Check code length
        if (code.length > 100000) {
            return {
                safe: false,
                reason: 'Code too long (max 100KB)'
            };
        }

        return { safe: true };
    }

    /**
     * Wrap code to prevent global access
     */
    wrapCode(code) {
        return `
            "use strict";
            (function() {
                // Prevent access to global scope
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
     * Capture console output
     */
    captureOutput(type, args) {
        const formattedArgs = args.map(arg => this.formatValue(arg));
        this.output.push({
            type: type,
            content: formattedArgs,
            timestamp: Date.now()
        });
    }

    /**
     * Capture console.table output
     */
    captureTable(data) {
        this.output.push({
            type: 'table',
            content: this.formatTableData(data),
            timestamp: Date.now()
        });
    }

    /**
     * Format table data for display
     */
    formatTableData(data) {
        if (!data) return [];

        if (Array.isArray(data)) {
            return data.map((item, index) => ({
                index: index,
                value: this.formatValue(item)
            }));
        }

        if (typeof data === 'object') {
            return Object.entries(data).map(([key, value]) => ({
                key: key,
                value: this.formatValue(value)
            }));
        }

        return [{ value: this.formatValue(data) }];
    }

    /**
     * Format value for output
     */
    formatValue(value) {
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

    /**
     * Timer management
     */
    startTimer(label) {
        this.timers.set(label || 'default', Date.now());
    }

    endTimer(label) {
        const startTime = this.timers.get(label || 'default');
        if (startTime) {
            const duration = Date.now() - startTime;
            this.captureOutput('info', [`${label || 'default'}: ${duration}ms`]);
            this.timers.delete(label || 'default');
        }
    }

    /**
     * Counter management
     */
    incrementCounter(label) {
        const current = this.counters.get(label || 'default') || 0;
        const newCount = current + 1;
        this.counters.set(label || 'default', newCount);
        this.captureOutput('info', [`${label || 'default'}: ${newCount}`]);
    }

    /**
     * Clear output
     */
    clearOutput() {
        this.output.length = 0;
        this.output.push({
            type: 'clear',
            content: ['Console was cleared'],
            timestamp: Date.now()
        });
    }

    /**
     * Create safe timer
     */
    createSafeTimer(fn, delay, isInterval) {
        const id = this.timerIdCounter++;
        
        if (this.timers.size >= 10) {
            throw new Error('Too many timers (max 10)');
        }

        const timerId = isInterval ? 
            setInterval(() => {
                try {
                    fn();
                } catch (e) {
                    this.captureOutput('error', ['Timer error:', e.message]);
                }
            }, Math.max(delay, 10)) :
            setTimeout(() => {
                try {
                    fn();
                } catch (e) {
                    this.captureOutput('error', ['Timer error:', e.message]);
                }
                this.timers.delete(id);
            }, Math.max(delay, 10));

        this.timers.set(id, timerId);
        return id;
    }

    /**
     * Clear safe timer
     */
    clearSafeTimer(id) {
        const timerId = this.timers.get(id);
        if (timerId) {
            clearTimeout(timerId);
            clearInterval(timerId);
            this.timers.delete(id);
        }
    }

    /**
     * Cleanup all timers
     */
    cleanupTimers() {
        this.timers.forEach(timerId => {
            clearTimeout(timerId);
            clearInterval(timerId);
        });
        this.timers.clear();
    }

    /**
     * Sandboxed fetch with domain restrictions
     */
    async sandboxedFetch(url, options = {}) {
        // Only allow localhost and exam practice server
        const allowedHosts = [
            'localhost',
            '127.0.0.1',
            'localhost:3030',
            '127.0.0.1:3030'
        ];

        try {
            const urlObj = new URL(url, window.location.origin);
            const host = urlObj.host || urlObj.hostname;
            
            if (!allowedHosts.some(allowed => host === allowed || host.endsWith(allowed))) {
                throw new Error(`Fetch blocked: ${host} is not allowed`);
            }

            // Limit request size
            if (options.body && options.body.length > 1024 * 1024) {
                throw new Error('Request body too large (max 1MB)');
            }

            return fetch(url, {
                ...options,
                // Override potentially dangerous options
                credentials: 'same-origin',
                mode: 'cors'
            });

        } catch (error) {
            throw new Error(`Sandboxed fetch error: ${error.message}`);
        }
    }

    /**
     * Create timeout promise
     */
    createTimeoutPromise() {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Code execution timeout (${this.executionTimeout}ms)`));
            }, this.executionTimeout);
        });
    }

    /**
     * Estimate memory usage
     */
    estimateMemoryUsage() {
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

    /**
     * Sanitize error messages
     */
    sanitizeError(error) {
        const message = error.message || 'Unknown error';
        
        // Remove file paths and line numbers that could reveal system info
        const sanitized = message
            .replace(/at file:\/\/\/.*?\//g, 'at ')
            .replace(/\(file:\/\/\/.*?\)/g, '()')
            .replace(/at .*?\.js:\d+:\d+/g, 'at <anonymous>')
            .replace(/at Object\.<anonymous>/g, 'at <anonymous>');

        return sanitized;
    }

    /**
     * Get sandbox configuration
     */
    getConfig() {
        return {
            executionTimeout: this.executionTimeout,
            memoryLimit: this.memoryLimit,
            allowedGlobals: this.allowedGlobals,
            restrictedAPIs: this.restrictedAPIs
        };
    }

    /**
     * Set sandbox configuration
     */
    setConfig(config) {
        if (config.executionTimeout) {
            this.executionTimeout = Math.min(config.executionTimeout, 10000); // Max 10s
        }
        if (config.memoryLimit) {
            this.memoryLimit = Math.min(config.memoryLimit, 100 * 1024 * 1024); // Max 100MB
        }
    }
}

export default CodeSandbox;