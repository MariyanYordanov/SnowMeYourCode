/**
 * Main Application Entry Point
 * Initializes Template Engine system and coordinates all modules
 */

// Import Template Engine system
import { TemplateEngine } from './core/TemplateEngine.js';
import { ComponentLoader } from './core/ComponentLoader.js';
import { EventBinder } from './core/EventBinder.js';

// Import existing components
import './components/main.js';

/**
 * Initialize Template Engine system
 */
async function initializeTemplateSystem() {
    try {
        console.log('Initializing Template Engine system...');

        // Set correct base path for templates (relative to student/html/)
        TemplateEngine.setBasePath('modules/');

        // Initialize standard event handlers
        EventBinder.initializeStandardHandlers();

        // Load all templates
        await TemplateEngine.preloadStandardTemplates();

        // Initialize components
        await ComponentLoader.initializeAll();

        // Initialize adaptive layout manager if available
        try {
            const { initializeAdaptiveLayout } = await import('./core/layout.js');
            initializeAdaptiveLayout();
            console.log('Adaptive layout initialized');
        } catch (error) {
            console.warn('Layout module not available, skipping:', error.message);
        }

        console.log('Template Engine system initialized successfully');

    } catch (error) {
        console.error('Failed to initialize Template Engine system:', error);

        // Fallback: show error message
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.innerHTML = `
                <div style="padding: 40px; text-align: center; color: red;">
                    <h2>Failed to load exam system</h2>
                    <p>Error: ${error.message}</p>
                    <button onclick="location.reload()">Reload Page</button>
                    <details style="margin-top: 20px; text-align: left;">
                        <summary>Technical Details</summary>
                        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">
Error: ${error.message}
Stack: ${error.stack}

Template base path: ${TemplateEngine.basePath}
Loaded templates: ${TemplateEngine.getLoadedTemplates().join(', ')}
                        </pre>
                    </details>
                </div>
            `;
        }
    }
}

/**
 * Start initialization when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTemplateSystem);
} else {
    initializeTemplateSystem();
}

/**
 * Expose Template System for main.js integration
 */
window.TemplateSystem = {
    TemplateEngine,
    ComponentLoader,
    EventBinder
};