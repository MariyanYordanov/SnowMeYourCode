/**
 * Component Loading System
 * Manages loading and rendering of UI components using TemplateEngine
 * Handles component lifecycle and data binding
 */

import { TemplateEngine } from './TemplateEngine.js';
import { EventBinder } from './EventBinder.js';

export class ComponentLoader {
    static components = new Map();
    static loadedComponents = new Map();

    /**
     * Register component class
     * @param {string} name - Component name
     * @param {Function} componentClass - Component class constructor
     */
    static register(name, componentClass) {
        this.components.set(name, componentClass);
        console.log(`Component registered: ${name}`);
    }

    /**
     * Load and render component
     * @param {string} name - Component name
     * @param {string} containerId - Container element ID
     * @param {Object} data - Component data
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Component instance
     */
    static async renderComponent(name, containerId, data = {}, options = {}) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container not found: ${containerId}`);
            }

            // Load template if not loaded
            if (!TemplateEngine.isLoaded(name)) {
                await TemplateEngine.loadTemplate(name, `${name}.html`);
            }

            // Render template with data
            const html = TemplateEngine.render(name, data);
            if (!html) {
                throw new Error(`Failed to render template: ${name}`);
            }

            // Insert into DOM
            container.innerHTML = html;

            // Bind events for the new content
            EventBinder.bindEvents(container);

            // Initialize component JS if exists
            const ComponentClass = this.components.get(name);
            let componentInstance = null;

            if (ComponentClass) {
                componentInstance = new ComponentClass(container, data, options);
                this.loadedComponents.set(`${name}-${containerId}`, componentInstance);
                console.log(`Component initialized: ${name} in ${containerId}`);
            }

            // Trigger component loaded event
            this.triggerComponentEvent('component-loaded', {
                name,
                containerId,
                data,
                instance: componentInstance
            });

            return componentInstance;

        } catch (error) {
            console.error(`Failed to render component ${name}:`, error);
            this.showErrorComponent(containerId, error.message);
            return null;
        }
    }

    /**
     * Update component data and re-render
     * @param {string} name - Component name
     * @param {string} containerId - Container element ID
     * @param {Object} newData - New data to render
     * @returns {Promise<void>}
     */
    static async updateComponent(name, containerId, newData) {
        try {
            const componentKey = `${name}-${containerId}`;
            const instance = this.loadedComponents.get(componentKey);

            // Update instance data if exists
            if (instance && instance.updateData) {
                instance.updateData(newData);
            }

            // Re-render component
            await this.renderComponent(name, containerId, newData);

        } catch (error) {
            console.error(`Failed to update component ${name}:`, error);
        }
    }

    /**
     * Unload component
     * @param {string} name - Component name
     * @param {string} containerId - Container element ID
     */
    static unloadComponent(name, containerId) {
        try {
            const componentKey = `${name}-${containerId}`;
            const instance = this.loadedComponents.get(componentKey);

            // Call cleanup if exists
            if (instance && instance.destroy) {
                instance.destroy();
            }

            // Remove from loaded components
            this.loadedComponents.delete(componentKey);

            // Clear container
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
            }

            // Trigger component unloaded event
            this.triggerComponentEvent('component-unloaded', {
                name,
                containerId
            });

            console.log(`Component unloaded: ${name} from ${containerId}`);

        } catch (error) {
            console.error(`Failed to unload component ${name}:`, error);
        }
    }

    /**
     * Show component and hide others
     * @param {string} name - Component to show
     * @param {string} containerId - Container element ID
     * @param {Object} data - Component data
     */
    static async showComponent(name, containerId, data = {}) {
        try {
            // Hide all other components
            this.hideAllComponents();

            // Show target container
            const container = document.getElementById(containerId);
            if (container) {
                container.style.display = 'block';

                // Render component if not already rendered
                await this.renderComponent(name, containerId, data);
            }

        } catch (error) {
            console.error(`Failed to show component ${name}:`, error);
        }
    }

    /**
     * Hide all components
     */
    static hideAllComponents() {
        const containers = document.querySelectorAll('.component-container');
        containers.forEach(container => {
            container.style.display = 'none';
        });
    }

    /**
     * Get component instance
     * @param {string} name - Component name
     * @param {string} containerId - Container element ID
     * @returns {Object|null} - Component instance
     */
    static getComponent(name, containerId) {
        const componentKey = `${name}-${containerId}`;
        return this.loadedComponents.get(componentKey) || null;
    }

    /**
     * Check if component is loaded
     * @param {string} name - Component name
     * @param {string} containerId - Container element ID
     * @returns {boolean}
     */
    static isComponentLoaded(name, containerId) {
        const componentKey = `${name}-${containerId}`;
        return this.loadedComponents.has(componentKey);
    }

    /**
     * Show error component
     * @param {string} containerId - Container element ID
     * @param {string} errorMessage - Error message
     */
    static showErrorComponent(containerId, errorMessage) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="component-error">
                    <h3>Component Error</h3>
                    <p>${TemplateEngine.escapeHtml(errorMessage)}</p>
                    <button onclick="location.reload()">Reload Page</button>
                </div>
            `;
        }
    }

    /**
     * Trigger component event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event details
     */
    static triggerComponentEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    /**
     * Initialize all components on page
     * @returns {Promise<void>}
     */
    static async initializeAll() {
        try {
            // Preload standard templates
            await TemplateEngine.preloadStandardTemplates();

            // Load login form by default
            await this.showComponent('login-form', 'login-component');

            console.log('All components initialized');

        } catch (error) {
            console.error('Failed to initialize components:', error);
        }
    }

    /**
     * Clean up all components
     */
    static cleanup() {
        // Destroy all loaded components
        for (const [key, instance] of this.loadedComponents) {
            if (instance && instance.destroy) {
                instance.destroy();
            }
        }

        // Clear maps
        this.loadedComponents.clear();

        console.log('All components cleaned up');
    }
}