/**
 * Main Entry Point - Application Bootstrapper
 * Initializes all services and starts the exam system
 */

// Import service classes and singletons
import { WebSocketService } from './services/websocketService.js';
import { sessionService } from './services/sessionService.js';
import { ExamService } from './services/examService.js';

// Import anti-cheat system
import { AntiCheatCore } from './anticheat/AntiCheatCore.js';

// Import main workspace
import { ExamWorkspace } from './components/ExamWorkspace.js';

// Create service instances with proper dependencies
const websocketService = new WebSocketService();
const examService = new ExamService(websocketService);

// Global application instance
let app = null;

/**
 * Initialize application
 */
async function initializeApp() {
    try {
        console.log('🚀 Starting Exam Monitor v2...');

        // Check environment
        validateEnvironment();

        // Initialize services
        console.log('📡 Initializing services...');
        await initializeServices();

        // Initialize anti-cheat
        console.log('🛡️ Initializing anti-cheat system...');
        const antiCheatCore = new AntiCheatCore(websocketService);

        // Create main workspace
        console.log('🏗️ Creating exam workspace...');
        app = new ExamWorkspace(websocketService, examService, antiCheatCore);

        // Setup global error handling
        setupErrorHandling();

        console.log('✅ Application initialized successfully!');

    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showInitializationError(error);
    }
}

/**
 * Validate browser environment
 */
function validateEnvironment() {
    // Check for required APIs
    const required = {
        'WebSocket': typeof WebSocket !== 'undefined',
        'ES6 Modules': true, // If we're here, modules work
        'LocalStorage': typeof localStorage !== 'undefined',
        'Fullscreen API': document.fullscreenEnabled !== undefined
    };

    const missing = Object.entries(required)
        .filter(([_, supported]) => !supported)
        .map(([feature]) => feature);

    if (missing.length > 0) {
        throw new Error(`Missing required features: ${missing.join(', ')}`);
    }

    console.log('✅ Environment validation passed');
}

/**
 * Initialize all services
 */
async function initializeServices() {
    // Session service handles auth state
    await sessionService.initialize();

    // WebSocket needs to connect
    await websocketService.connect();

    // ExamService doesn't have initialize method - it's ready after construction
    // Removed: await examService.initialize(websocketService, sessionService);

    console.log('✅ All services initialized');
}

/**
 * Setup global error handlers
 */
function setupErrorHandling() {
    // Handle unhandled errors
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        // Could send to server here
    });

    // Handle promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled rejection:', event.reason);
        event.preventDefault();
    });

    // Handle beforeunload
    window.addEventListener('beforeunload', (event) => {
        if (examService.isExamActive()) {
            event.preventDefault();
            event.returnValue = 'Exam in progress. Are you sure you want to leave?';
        }
    });
}

/**
 * Show initialization error to user
 */
function showInitializationError(error) {
    // NO HTML! Just work with existing DOM or console
    console.error('❌ Initialization failed:', error.message);

    // Try to find existing error container
    const errorContainer = document.getElementById('error-container') ||
        document.querySelector('.error-message');

    if (errorContainer) {
        errorContainer.textContent = `Initialization Error: ${error.message}`;
        errorContainer.style.display = 'block';
    }

    // Emit custom event for error handling
    window.dispatchEvent(new CustomEvent('app:init:error', {
        detail: { error: error.message }
    }));
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export for debugging
window.__examApp = {
    getApp: () => app,
    getServices: () => ({
        websocket: websocketService,
        session: sessionService,
        exam: examService
    }),
    version: '2.0.0'
};