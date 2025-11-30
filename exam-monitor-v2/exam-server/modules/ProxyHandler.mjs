import { createProxyMiddleware } from 'http-proxy-middleware';

export class ProxyHandler {
    constructor(practiceServerPort, sessionManager = null) {
        this.practiceServerPort = practiceServerPort;
        this.sessionManager = sessionManager;
        this.target = `http://localhost:${practiceServerPort}`;

        // Create the proxy middleware
        this.middleware = this.createMiddleware();

        console.log(`Proxy handler initialized for practice server on port ${practiceServerPort}`);
    }

    /**
     * Create proxy middleware with session handling
     */
    createMiddleware() {
        return [
            // Session validation middleware
            this.validateSession.bind(this),

            // Proxy middleware
            createProxyMiddleware({
                target: this.target,
                changeOrigin: true,
                timeout: 30000,
                proxyTimeout: 30000,

                // Add student ID header
                onProxyReq: (proxyReq, req, res) => {
                    this.onProxyRequest(proxyReq, req, res);
                },

                // Handle responses
                onProxyRes: (proxyRes, req, res) => {
                    this.onProxyResponse(proxyRes, req, res);
                },

                // Handle errors
                onError: (err, req, res) => {
                    this.onProxyError(err, req, res);
                },

                // Logging
                logLevel: 'warn'
            })
        ];
    }

    /**
     * Validate student session before proxying
     */
    async validateSession(req, res, next) {
        try {
            // Check if student has valid session
            const studentId = req.session?.studentId;
            const studentName = req.session?.studentName;
            const studentClass = req.session?.studentClass;

            if (!studentId || !studentName || !studentClass) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'No valid session. Please login first.',
                    code: 'SESSION_REQUIRED'
                });
            }

            // Validate session is still active (if SessionManager is available)
            if (this.sessionManager) {
                const session = this.sessionManager.sessions.get(studentId);

                if (!session) {
                    return res.status(401).json({
                        error: 'Session not found',
                        message: 'Session expired or invalid. Please login again.',
                        code: 'SESSION_EXPIRED'
                    });
                }

                // Check if exam time expired
                const timeLeft = this.sessionManager.calculateRemainingTime(session);
                if (timeLeft <= 0) {
                    await this.sessionManager.expireSession(studentId);
                    return res.status(403).json({
                        error: 'Exam expired',
                        message: 'Exam time has expired.',
                        code: 'EXAM_EXPIRED'
                    });
                }

                // Update last activity
                await this.sessionManager.updateSessionActivity(studentId, {
                    apiCall: {
                        method: req.method,
                        url: req.url,
                        timestamp: Date.now()
                    }
                });
            }

            // Add student info to request for proxy
            req.studentInfo = {
                sessionId: studentId,
                name: studentName,
                class: studentClass
            };

            // Log API call
            console.log(`API Call: ${studentName} (${studentClass}) - ${req.method} ${req.url}`);

            next();

        } catch (error) {
            console.error('Session validation error:', error);
            res.status(500).json({
                error: 'Server error',
                message: 'Internal server error during session validation',
                code: 'SERVER_ERROR'
            });
        }
    }

    /**
     * Handle outgoing proxy request
     */
    onProxyRequest(proxyReq, req, res) {
        try {
            // Add student ID header for practice server
            if (req.studentInfo?.sessionId) {
                proxyReq.setHeader('X-Student-ID', req.studentInfo.sessionId);
                proxyReq.setHeader('X-Student-Name', req.studentInfo.name);
                proxyReq.setHeader('X-Student-Class', req.studentInfo.class);
            }

            // Add request timestamp
            proxyReq.setHeader('X-Request-Timestamp', Date.now().toString());

            // Ensure proper content type for JSON requests
            if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
                if (!proxyReq.getHeader('Content-Type')) {
                    proxyReq.setHeader('Content-Type', 'application/json');
                }
            }

            // Log proxy request details
            const logData = {
                studentId: req.studentInfo?.sessionId,
                method: req.method,
                url: req.url,
                headers: this.sanitizeHeaders(proxyReq.getHeaders()),
                timestamp: Date.now()
            };

            console.log(`Proxying: ${req.method} ${req.url} for student ${req.studentInfo?.name}`);

        } catch (error) {
            console.error('Proxy request error:', error);
        }
    }

    /**
     * Handle proxy response
     */
    onProxyResponse(proxyRes, req, res) {
        try {
            // Add security headers
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-XSS-Protection', '1; mode=block');

            // Log response
            const logData = {
                studentId: req.studentInfo?.sessionId,
                method: req.method,
                url: req.url,
                statusCode: proxyRes.statusCode,
                responseTime: Date.now(),
                contentType: proxyRes.headers['content-type']
            };

            if (proxyRes.statusCode >= 400) {
                console.warn(`Proxy error response: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
            } else {
                console.log(`Proxy success: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
            }

        } catch (error) {
            console.error('Proxy response error:', error);
        }
    }

    /**
     * Handle proxy errors
     */
    onProxyError(err, req, res) {
        console.error(`Proxy error for ${req.method} ${req.url}:`, err.message);

        // Don't send response if already sent
        if (res.headersSent) {
            return;
        }

        // Determine error type and response
        let statusCode = 502;
        let errorMessage = 'Practice server unavailable';
        let errorCode = 'PRACTICE_SERVER_ERROR';

        if (err.code === 'ECONNREFUSED') {
            errorMessage = 'Practice server is not running';
            errorCode = 'SERVER_OFFLINE';
        } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
            statusCode = 504;
            errorMessage = 'Practice server timeout';
            errorCode = 'SERVER_TIMEOUT';
        } else if (err.code === 'ENOTFOUND') {
            errorMessage = 'Practice server not found';
            errorCode = 'SERVER_NOT_FOUND';
        }

        res.status(statusCode).json({
            error: 'Proxy Error',
            message: errorMessage,
            code: errorCode,
            studentId: req.studentInfo?.sessionId,
            timestamp: Date.now()
        });

        // Log error for debugging
        if (req.studentInfo) {
            console.error(`Proxy error for student ${req.studentInfo.name}: ${err.message}`);
        }
    }

    /**
     * Sanitize headers for logging (remove sensitive data)
     */
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };

        // Remove sensitive headers
        delete sanitized.authorization;
        delete sanitized.cookie;
        delete sanitized['x-api-key'];

        return sanitized;
    }

    /**
     * Get proxy statistics
     */
    getProxyStats() {
        // Note: This would need to be implemented with actual tracking
        return {
            target: this.target,
            isHealthy: true, // Would need health check implementation
            totalRequests: 0, // Would need request counter
            errorRate: 0, // Would need error tracking
            averageResponseTime: 0 // Would need response time tracking
        };
    }

    /**
     * Health check for practice server
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.target}/health`, {
                method: 'GET',
                timeout: 5000
            });

            return {
                healthy: response.ok,
                status: response.status,
                timestamp: Date.now()
            };

        } catch (error) {
            console.warn('Practice server health check failed:', error.message);
            return {
                healthy: false,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Create specific route handlers for different API patterns
     */
    createRouteHandler(route, options = {}) {
        return createProxyMiddleware({
            target: this.target,
            changeOrigin: true,
            pathRewrite: options.pathRewrite || {},

            onProxyReq: (proxyReq, req, res) => {
                this.onProxyRequest(proxyReq, req, res);

                // Apply route-specific modifications
                if (options.onProxyReq) {
                    options.onProxyReq(proxyReq, req, res);
                }
            },

            onProxyRes: (proxyRes, req, res) => {
                this.onProxyResponse(proxyRes, req, res);

                // Apply route-specific response handling
                if (options.onProxyRes) {
                    options.onProxyRes(proxyRes, req, res);
                }
            },

            onError: this.onProxyError.bind(this)
        });
    }

    /**
     * Block certain API endpoints for security
     */
    createBlockedEndpointHandler(blockedPaths = []) {
        return (req, res, next) => {
            const isBlocked = blockedPaths.some(path => req.url.startsWith(path));

            if (isBlocked) {
                console.warn(`Blocked API access: ${req.studentInfo?.name} tried to access ${req.url}`);

                // Log suspicious activity if SessionManager is available
                if (this.sessionManager && req.studentInfo?.sessionId) {
                    this.sessionManager.updateSessionActivity(req.studentInfo.sessionId, {
                        suspicious: `Blocked API access: ${req.url}`
                    });
                }

                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Access to this endpoint is not allowed during exam',
                    code: 'ENDPOINT_BLOCKED'
                });
            }

            next();
        };
    }

    /**
     * Rate limiting middleware
     */
    createRateLimitHandler(maxRequests = 100, windowMs = 60000) {
        const requestCounts = new Map();

        return (req, res, next) => {
            const studentId = req.studentInfo?.sessionId;
            if (!studentId) return next();

            const now = Date.now();
            const windowStart = now - windowMs;

            // Get or create request history for student
            let requests = requestCounts.get(studentId) || [];

            // Remove old requests outside the window
            requests = requests.filter(timestamp => timestamp > windowStart);

            // Check if limit exceeded
            if (requests.length >= maxRequests) {
                console.warn(`Rate limit exceeded: ${req.studentInfo.name} (${requests.length} requests)`);

                return res.status(429).json({
                    error: 'Too Many Requests',
                    message: 'API rate limit exceeded',
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: Math.ceil(windowMs / 1000)
                });
            }

            // Add current request
            requests.push(now);
            requestCounts.set(studentId, requests);

            next();
        };
    }
}