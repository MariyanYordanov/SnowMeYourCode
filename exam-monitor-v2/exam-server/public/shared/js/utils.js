/**
 * Shared Utilities
 * DOM helpers, formatters, and common functions
 */

// DOM utilities
export const DOM = {
    /**
     * Create element with attributes
     */
    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);

        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else {
                element.setAttribute(key, value);
            }
        });

        if (content) {
            element.innerHTML = content;
        }

        return element;
    },

    /**
     * Remove element safely
     */
    removeElement(selector) {
        const element = typeof selector === 'string'
            ? document.querySelector(selector)
            : selector;

        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    },

    /**
     * Add event listener with cleanup tracking
     */
    addListener(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        return () => element.removeEventListener(event, handler, options);
    }
};

// Time formatting utilities  
export const Time = {
    /**
     * Format milliseconds to HH:MM:SS
     */
    formatDuration(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    /**
     * Format timestamp to readable string
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('bg-BG');
    },

    /**
     * Get time ago string
     */
    timeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}ч назад`;
        if (minutes > 0) return `${minutes}мин назад`;
        return `${seconds}сек назад`;
    }
};

// Template utilities
export const Template = {
    /**
     * Simple template replacement
     */
    populate(template, data) {
        let result = template;

        // Handle conditional blocks {{#key}}...{{/key}}
        Object.keys(data).forEach(key => {
            const value = data[key];

            if (typeof value === 'boolean') {
                const regex = new RegExp(`{{#${key}}}(.*?){{/${key}}}`, 'gs');
                result = result.replace(regex, value ? '$1' : '');
            }
        });

        // Handle simple substitutions {{key}}
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, data[key] || '');
        });

        // Clean up remaining template syntax
        result = result.replace(/{{[^}]+}}/g, '');

        return result;
    }
};

// Validation utilities
export const Validation = {
    /**
     * Validate Bulgarian name
     */
    isValidBulgarianName(name) {
        if (!name || typeof name !== 'string') return false;

        const trimmed = name.trim();
        const parts = trimmed.split(/\s+/);

        if (parts.length < 2) return false;

        const cyrillicPattern = /^[А-Яа-я\s]+$/;
        return cyrillicPattern.test(trimmed) && parts.every(part => part.length >= 2);
    },

    /**
     * Validate class name
     */
    isValidClassName(className) {
        if (!className || typeof className !== 'string') return false;
        return /^[0-9]{1,2}[А-Я]$/.test(className.trim());
    }
};

// Storage utilities
export const Storage = {
    /**
     * Safe localStorage operations
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Storage set failed:', error);
            return false;
        }
    },

    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Storage get failed:', error);
            return defaultValue;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Storage remove failed:', error);
            return false;
        }
    }
};

console.log('🔧 Utils loaded');