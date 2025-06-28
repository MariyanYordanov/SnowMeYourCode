/**
 * Custom Template Engine - Vanilla JS Solution
 * Lightweight templating system without external dependencies
 * Supports variable replacement, conditionals, loops, and partials
 */

export class TemplateEngine {
    static templates = new Map();
    static basePath = 'html/';

    /**
     * Load template from file
     * @param {string} name - Template name
     * @param {string} path - Template file path
     * @returns {Promise<string>} - Template HTML content
     */
    static async loadTemplate(name, path) {
        try {
            const fullPath = this.basePath + path;
            const response = await fetch(fullPath);

            if (!response.ok) {
                throw new Error(`Failed to load template: ${response.status} ${response.statusText}`);
            }

            const html = await response.text();
            this.templates.set(name, html);

            console.log(`Template loaded: ${name} from ${fullPath}`);
            return html;
        } catch (error) {
            console.error(`Failed to load template ${name}:`, error);
            return '';
        }
    }

    /**
     * Render template with data
     * @param {string} templateName - Name of loaded template
     * @param {Object} data - Data to inject into template
     * @returns {string} - Rendered HTML
     */
    static render(templateName, data = {}) {
        const template = this.templates.get(templateName);
        if (!template) {
            console.error(`Template not found: ${templateName}`);
            return '';
        }

        return this.processTemplate(template, data);
    }

    /**
     * Process template string with data
     * @param {string} template - Template HTML string
     * @param {Object} data - Data object
     * @returns {string} - Processed HTML
     */
    static processTemplate(template, data) {
        let html = template;

        // Simple variable replacement: {{variable}}
        html = html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? this.escapeHtml(String(data[key])) : '';
        });

        // Raw variable replacement (no escaping): {{{variable}}}
        html = html.replace(/\{\{\{(\w+)\}\}\}/g, (match, key) => {
            return data[key] !== undefined ? String(data[key]) : '';
        });

        // Conditional blocks: {{#if condition}}...{{/if}}
        html = html.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
            const value = data[key];
            return value ? this.processTemplate(content, data) : '';
        });

        // Negative conditional blocks: {{#unless condition}}...{{/unless}}
        html = html.replace(/\{\{#unless (\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (match, key, content) => {
            const value = data[key];
            return !value ? this.processTemplate(content, data) : '';
        });

        // Loop blocks: {{#each array}}...{{/each}}
        html = html.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, key, content) => {
            const array = data[key];
            if (!Array.isArray(array)) return '';

            return array.map((item, index) => {
                const itemData = {
                    ...data,
                    ...item,
                    index: index,
                    first: index === 0,
                    last: index === array.length - 1
                };
                return this.processTemplate(content, itemData);
            }).join('');
        });

        // Include partials: {{> componentName}}
        html = html.replace(/\{\{> (\w+)\}\}/g, (match, componentName) => {
            const component = this.templates.get(componentName);
            if (component) {
                return this.processTemplate(component, data);
            }
            console.warn(`Partial not found: ${componentName}`);
            return '';
        });

        return html;
    }

    /**
     * Load multiple templates at once
     * @param {Object} templateMap - Map of name -> path
     * @returns {Promise<void>}
     */
    static async loadTemplates(templateMap) {
        const promises = Object.entries(templateMap).map(([name, path]) => {
            return this.loadTemplate(name, path);
        });

        try {
            await Promise.all(promises);
            console.log(`Loaded ${promises.length} templates successfully`);
        } catch (error) {
            console.error('Failed to load some templates:', error);
        }
    }

    /**
     * Clear template cache
     */
    static clearCache() {
        this.templates.clear();
        console.log('Template cache cleared');
    }

    /**
     * Get list of loaded templates
     * @returns {string[]} - Array of template names
     */
    static getLoadedTemplates() {
        return Array.from(this.templates.keys());
    }

    /**
     * Check if template is loaded
     * @param {string} name - Template name
     * @returns {boolean}
     */
    static isLoaded(name) {
        return this.templates.has(name);
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    static escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Set base path for templates
     * @param {string} path - Base path
     */
    static setBasePath(path) {
        this.basePath = path.endsWith('/') ? path : path + '/';
        console.log(`Template base path set to: ${this.basePath}`);
    }

    /**
     * Preload all standard templates
     * @returns {Promise<void>}
     */
    static async preloadStandardTemplates() {
        const standardTemplates = {
            'login-form': 'login-form.html',
            'exam-workspace': 'exam-workspace.html',
            'console-panel': 'console-panel.html',
            'violation-screen': 'violation-screen.html'
        };

        await this.loadTemplates(standardTemplates);
    }
}