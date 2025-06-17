/**
 * Networking Utilities - HTTP helpers and wrappers
 * Provides consistent API for HTTP requests
 */

// Default options for fetch
const defaultOptions = {
    credentials: 'same-origin',
    headers: {
        'Content-Type': 'application/json'
    }
};

/**
 * Enhanced fetch wrapper with error handling
 */
export async function request(url, options = {}) {
    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, config);

        // Check if response is ok
        if (!response.ok) {
            throw new HttpError(response.status, response.statusText, response);
        }

        // Parse JSON if content-type is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        return response;

    } catch (error) {
        // Re-throw HttpError
        if (error instanceof HttpError) {
            throw error;
        }

        // Network error
        throw new NetworkError('Network request failed', error);
    }
}

/**
 * HTTP methods shortcuts
 */
export const http = {
    get: (url, options = {}) =>
        request(url, { ...options, method: 'GET' }),

    post: (url, data, options = {}) =>
        request(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        }),

    put: (url, data, options = {}) =>
        request(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    delete: (url, options = {}) =>
        request(url, { ...options, method: 'DELETE' })
};

/**
 * Custom error classes
 */
export class HttpError extends Error {
    constructor(status, statusText, response) {
        super(`HTTP ${status}: ${statusText}`);
        this.name = 'HttpError';
        this.status = status;
        this.statusText = statusText;
        this.response = response;
    }
}

export class NetworkError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'NetworkError';
        this.cause = cause;
    }
}

/**
 * Retry logic for failed requests
 */
export async function retryRequest(fn, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on client errors (4xx)
            if (error instanceof HttpError && error.status < 500) {
                throw error;
            }

            // Wait before retry
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }

    throw lastError;
}

console.log('🌐 Networking utilities loaded');