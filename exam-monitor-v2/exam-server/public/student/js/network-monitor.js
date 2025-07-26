/**
 * Network Monitor - DevTools Simulation
 * Intercepts and displays network requests
 */

export class NetworkMonitor {
    constructor() {
        this.requests = [];
        this.maxRequests = 100;
        this.isMonitoring = false;
        this.filters = {
            method: 'all',
            status: 'all',
            type: 'all'
        };
        
        this.init();
    }

    /**
     * Initialize network monitoring
     */
    init() {
        this.interceptFetch();
        this.interceptXHR();
        console.log('📡 Network Monitor initialized');
    }

    /**
     * Start monitoring
     */
    start() {
        this.isMonitoring = true;
        console.log('📡 Network monitoring started');
    }

    /**
     * Stop monitoring
     */
    stop() {
        this.isMonitoring = false;
        console.log('📡 Network monitoring stopped');
    }

    /**
     * Intercept fetch requests
     */
    interceptFetch() {
        const originalFetch = window.fetch;
        
        window.fetch = async (url, options = {}) => {
            const requestId = this.generateRequestId();
            const startTime = performance.now();
            
            if (this.isMonitoring) {
                this.logRequest(requestId, {
                    url: url,
                    method: options.method || 'GET',
                    headers: options.headers || {},
                    body: options.body,
                    type: 'fetch',
                    startTime: startTime
                });
            }

            try {
                const response = await originalFetch(url, options);
                const endTime = performance.now();
                const duration = endTime - startTime;

                if (this.isMonitoring) {
                    this.logResponse(requestId, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: this.headersToObject(response.headers),
                        duration: duration,
                        size: this.estimateResponseSize(response),
                        endTime: endTime
                    });
                }

                return response;
            } catch (error) {
                const endTime = performance.now();
                const duration = endTime - startTime;

                if (this.isMonitoring) {
                    this.logError(requestId, {
                        error: error.message,
                        duration: duration,
                        endTime: endTime
                    });
                }

                throw error;
            }
        };
    }

    /**
     * Intercept XMLHttpRequest
     */
    interceptXHR() {
        const originalXHR = window.XMLHttpRequest;
        const self = this;
        
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const requestId = self.generateRequestId();
            let startTime;
            let requestData = {};

            // Override open method
            const originalOpen = xhr.open;
            xhr.open = function(method, url, async, user, password) {
                requestData = {
                    method: method,
                    url: url,
                    async: async !== false,
                    type: 'xhr'
                };
                return originalOpen.apply(this, arguments);
            };

            // Override send method
            const originalSend = xhr.send;
            xhr.send = function(body) {
                startTime = performance.now();
                requestData.body = body;
                requestData.startTime = startTime;

                if (self.isMonitoring) {
                    self.logRequest(requestId, requestData);
                }

                return originalSend.apply(this, arguments);
            };

            // Handle response
            xhr.addEventListener('readystatechange', function() {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    const endTime = performance.now();
                    const duration = startTime ? endTime - startTime : 0;

                    if (self.isMonitoring) {
                        if (xhr.status >= 200 && xhr.status < 400) {
                            self.logResponse(requestId, {
                                status: xhr.status,
                                statusText: xhr.statusText,
                                headers: self.parseResponseHeaders(xhr.getAllResponseHeaders()),
                                duration: duration,
                                size: xhr.responseText ? xhr.responseText.length : 0,
                                endTime: endTime
                            });
                        } else {
                            self.logError(requestId, {
                                error: `HTTP ${xhr.status} ${xhr.statusText}`,
                                duration: duration,
                                endTime: endTime
                            });
                        }
                    }
                }
            });

            xhr.addEventListener('error', function() {
                const endTime = performance.now();
                const duration = startTime ? endTime - startTime : 0;

                if (self.isMonitoring) {
                    self.logError(requestId, {
                        error: 'Network Error',
                        duration: duration,
                        endTime: endTime
                    });
                }
            });

            return xhr;
        };
    }

    /**
     * Log request start
     */
    logRequest(requestId, requestData) {
        const request = {
            id: requestId,
            url: requestData.url,
            method: requestData.method,
            type: requestData.type,
            startTime: requestData.startTime,
            headers: requestData.headers || {},
            body: requestData.body,
            status: 'pending',
            timestamp: Date.now()
        };

        this.requests.unshift(request);
        this.trimRequests();
        this.notifyUI('request-started', request);
    }

    /**
     * Log response
     */
    logResponse(requestId, responseData) {
        const request = this.requests.find(r => r.id === requestId);
        if (request) {
            Object.assign(request, {
                status: responseData.status,
                statusText: responseData.statusText,
                responseHeaders: responseData.headers,
                duration: responseData.duration,
                size: responseData.size,
                endTime: responseData.endTime,
                completed: true
            });

            this.notifyUI('request-completed', request);
        }
    }

    /**
     * Log error
     */
    logError(requestId, errorData) {
        const request = this.requests.find(r => r.id === requestId);
        if (request) {
            Object.assign(request, {
                status: 'error',
                error: errorData.error,
                duration: errorData.duration,
                endTime: errorData.endTime,
                completed: true
            });

            this.notifyUI('request-error', request);
        }
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Convert Headers object to plain object
     */
    headersToObject(headers) {
        const obj = {};
        if (headers && headers.forEach) {
            headers.forEach((value, key) => {
                obj[key] = value;
            });
        }
        return obj;
    }

    /**
     * Parse XHR response headers
     */
    parseResponseHeaders(headerStr) {
        const headers = {};
        if (!headerStr) return headers;

        headerStr.split('\r\n').forEach(line => {
            const parts = line.split(': ');
            if (parts.length === 2) {
                headers[parts[0]] = parts[1];
            }
        });

        return headers;
    }

    /**
     * Estimate response size
     */
    estimateResponseSize(response) {
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
            return parseInt(contentLength, 10);
        }
        return 0; // Unknown size
    }

    /**
     * Trim old requests
     */
    trimRequests() {
        if (this.requests.length > this.maxRequests) {
            this.requests = this.requests.slice(0, this.maxRequests);
        }
    }

    /**
     * Get filtered requests
     */
    getFilteredRequests() {
        return this.requests.filter(request => {
            if (this.filters.method !== 'all' && request.method !== this.filters.method) {
                return false;
            }
            
            if (this.filters.status !== 'all') {
                if (this.filters.status === 'success' && (request.status < 200 || request.status >= 300)) {
                    return false;
                }
                if (this.filters.status === 'error' && request.status !== 'error' && (request.status >= 200 && request.status < 300)) {
                    return false;
                }
            }

            if (this.filters.type !== 'all' && request.type !== this.filters.type) {
                return false;
            }

            return true;
        });
    }

    /**
     * Set filters
     */
    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
        this.notifyUI('filters-changed', this.filters);
    }

    /**
     * Clear all requests
     */
    clear() {
        this.requests = [];
        this.notifyUI('requests-cleared');
    }

    /**
     * Get request by ID
     */
    getRequest(requestId) {
        return this.requests.find(r => r.id === requestId);
    }

    /**
     * Get statistics
     */
    getStats() {
        const completed = this.requests.filter(r => r.completed);
        const errors = this.requests.filter(r => r.status === 'error');
        const pending = this.requests.filter(r => !r.completed);

        const totalDuration = completed.reduce((sum, r) => sum + (r.duration || 0), 0);
        const avgDuration = completed.length > 0 ? totalDuration / completed.length : 0;

        const totalSize = completed.reduce((sum, r) => sum + (r.size || 0), 0);

        return {
            total: this.requests.length,
            completed: completed.length,
            errors: errors.length,
            pending: pending.length,
            avgDuration: Math.round(avgDuration),
            totalSize: totalSize,
            totalDuration: Math.round(totalDuration)
        };
    }

    /**
     * Export requests as HAR format
     */
    exportHAR() {
        const har = {
            log: {
                version: "1.2",
                creator: {
                    name: "Exam Monitor Network Monitor",
                    version: "1.0"
                },
                entries: this.requests.map(request => ({
                    startedDateTime: new Date(request.timestamp).toISOString(),
                    time: request.duration || 0,
                    request: {
                        method: request.method,
                        url: request.url,
                        headers: Object.entries(request.headers || {}).map(([name, value]) => ({ name, value })),
                        bodySize: request.body ? request.body.length : 0
                    },
                    response: {
                        status: typeof request.status === 'number' ? request.status : 0,
                        statusText: request.statusText || '',
                        headers: Object.entries(request.responseHeaders || {}).map(([name, value]) => ({ name, value })),
                        bodySize: request.size || 0
                    }
                }))
            }
        };

        return JSON.stringify(har, null, 2);
    }

    /**
     * Notify UI of changes
     */
    notifyUI(event, data) {
        const customEvent = new CustomEvent('network-monitor', {
            detail: { event, data }
        });
        document.dispatchEvent(customEvent);
    }

    /**
     * Format duration for display
     */
    formatDuration(ms) {
        if (ms < 1000) {
            return `${Math.round(ms)}ms`;
        } else {
            return `${(ms / 1000).toFixed(2)}s`;
        }
    }

    /**
     * Format size for display
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get status class for styling
     */
    getStatusClass(status) {
        if (typeof status === 'number') {
            if (status >= 200 && status < 300) return 'status-success';
            if (status >= 300 && status < 400) return 'status-redirect';
            if (status >= 400 && status < 500) return 'status-client-error';
            if (status >= 500) return 'status-server-error';
        }
        if (status === 'error') return 'status-error';
        if (status === 'pending') return 'status-pending';
        return 'status-unknown';
    }
}

export default NetworkMonitor;