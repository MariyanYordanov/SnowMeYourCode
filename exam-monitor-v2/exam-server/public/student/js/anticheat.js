// SECURITY: Development mode ENABLED for localhost debugging
// DevTools are ALWAYS allowed on localhost for debugging
const DEVELOPMENT_MODE = true; // Always enabled for debugging

export function setupAntiCheat() {
    try {
        if (DEVELOPMENT_MODE) {
            console.log('Development mode - LIMITED protection (dev=true detected)');
            console.warn('DEVELOPMENT MODE ACTIVE - NOT FOR PRODUCTION USE!');
            setupLimitedAntiCheat();
        } else {
            console.log('Production mode - FULL protection active');
            setupFullscreenMonitoring();
            setupFocusMonitoring();
        }
        console.log('Anti-cheat initialized');
        return true;
    } catch (error) {
        console.error('Failed to setup anti-cheat:', error);
        return false;
    }
}

function setupLimitedAntiCheat() {
    // In development mode, only monitor critical violations
    setupFullscreenMonitoring();
    // Skip focus monitoring to allow DevTools
    console.log('Limited anti-cheat for development');
}

export function activateAntiCheat() {
    try {
        const examApp = window.ExamApp;
        if (!examApp.isFullscreen) {
            console.warn('Cannot activate anti-cheat - not in fullscreen mode');
            return false;
        }

        examApp.antiCheatActive = true;
        examApp.antiCheatActivationTime = Date.now(); // Store activation time for grace period

        // Add CSS class to body for red screen warning
        document.body.classList.add('anti-cheat-active');

        console.log('Anti-cheat activated');
        return true;
    } catch (error) {
        console.error('Failed to activate anti-cheat:', error);
        return false;
    }
}

export function deactivateAntiCheat() {
    try {
        const examApp = window.ExamApp;
        examApp.antiCheatActive = false;
    } catch (error) {
        console.error('Error deactivating anti-cheat:', error);
    }
}

export function setupFullscreenMonitoring() {
    try {
        const fullscreenEvents = [
            'fullscreenchange',
            'webkitfullscreenchange',
            'mozfullscreenchange',
            'MSFullscreenChange'
        ];

        fullscreenEvents.forEach(eventName => {
            document.addEventListener(eventName, handleFullscreenChange);
        });

    } catch (error) {
        console.error('Failed to setup fullscreen monitoring:', error);
    }
}

export function setupFocusMonitoring() {
    try {
        // Monitor window focus/blur
        window.addEventListener('blur', handleFocusLoss);
        window.addEventListener('focus', handleFocusGain);
        
        // Monitor visibility changes (tab switching)
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // AGGRESSIVE: Monitor keyboard events in CAPTURE phase for maximum interception
        document.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('keyup', handleKeyUp, true);
        
        // SYSTEM-LEVEL: Add multiple layers of key event interception
        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('keyup', handleKeyUp, true);
        
        // CAPTURE ALL: Override at document level with highest priority
        document.documentElement.addEventListener('keydown', handleKeyDown, true);
        document.documentElement.addEventListener('keyup', handleKeyUp, true);
        
        // BODY LEVEL: Additional layer
        document.body.addEventListener('keydown', handleKeyDown, true);
        document.body.addEventListener('keyup', handleKeyUp, true);
        
        // Monitor window resize and screen changes
        window.addEventListener('resize', handleWindowResize);
        
        // Monitor screen resolution changes
        if (screen && screen.orientation) {
            screen.orientation.addEventListener('change', handleOrientationChange);
        }
        
        // Monitor mouse movement for multi-monitor detection
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);
        
        // Block dangerous mouse events
        document.addEventListener('mousedown', handleMouseDown, true);
        document.addEventListener('mouseup', handleMouseUp, true);
        document.addEventListener('contextmenu', handleContextMenu, true);
        document.addEventListener('selectstart', handleSelectStart, true);
        document.addEventListener('dragstart', handleDragStart, true);
        
        // Start aggressive focus polling
        startAggressiveFocusPolling();

        // DISABLED: Mouse lock causes cursor to disappear
        // initializeMouseLock();

        // AGGRESSIVE: Apply CSS-based blocking
        applyCSSBlockingRules();
        
        console.log('AGGRESSIVE FOCUS MONITORING ESTABLISHED - NO ESCAPE!');
    } catch (error) {
        console.error('Failed to setup focus monitoring:', error);
    }
}

export function enterFullscreenMode() {
    try {
        const element = document.documentElement;

        if (element.requestFullscreen) {
            element.requestFullscreen({ navigationUI: "hide" });
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        } else {
            console.warn('Fullscreen API not supported');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Failed to enter fullscreen:', error);
        return false;
    }
}

function handleFullscreenChange() {
    try {
        const examApp = window.ExamApp;

        // CRITICAL: Stop processing if exam is over
        if (examApp.completionInProgress || !examApp.isLoggedIn) {
            console.log('Exam is over - ignoring fullscreen change');
            return;
        }

        const isFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );

        const wasFullscreen = examApp.isFullscreen;
        examApp.isFullscreen = isFullscreen;

        if (isFullscreen) {
            updateFullscreenStatus('Fullscreen активен');

            // Remove fullscreen-exited class when re-entering fullscreen
            document.body.classList.remove('fullscreen-exited');

            if (!wasFullscreen && examApp.isLoggedIn && !examApp.antiCheatActive) {
                console.log('Fullscreen entered - activating anti-cheat');
                activateAntiCheat();

                // Show subtle notification that exam has started
                if (typeof showNotification === 'function') {
                    showNotification('Изпитът започна успешно!', 'success');
                }
            }
        } else {
            updateFullscreenStatus('Fullscreen неактивен');

            if (wasFullscreen &&
                examApp.isLoggedIn &&
                examApp.antiCheatActive &&
                !examApp.completionInProgress) {

                // Add fullscreen-exited class to trigger red screen overlay
                document.body.classList.add('fullscreen-exited');

                // Увеличаваме брояча на опити
                if (!examApp.fullscreenExitAttempts) {
                    examApp.fullscreenExitAttempts = 0;
                }
                examApp.fullscreenExitAttempts++;

                console.log(`FULLSCREEN EXIT DETECTED - Attempt ${examApp.fullscreenExitAttempts}/3`);

                // Report fullscreen exit to teacher FIRST (before blocking)
                if (examApp.fullscreenExitAttempts >= 3) {
                    // Send critical violation to server FIRST
                    reportViolation('fullscreen_exit_violation', {
                        severity: 'critical',
                        attemptNumber: examApp.fullscreenExitAttempts,
                        maxAttempts: 3
                    });

                    // THEN mark exam as over to block further events
                    examApp.completionInProgress = true;
                    examApp.isLoggedIn = false;
                    examApp.antiCheatActive = false;
                    console.log('3rd attempt - exam termination initiated');
                } else {
                    // For attempts 1 and 2
                    reportViolation('fullscreen_exit', {
                        severity: 'high',
                        attemptNumber: examApp.fullscreenExitAttempts,
                        maxAttempts: 3
                    });

                    // Show warning dialog
                    showFullscreenExitWarning(examApp.fullscreenExitAttempts);
                }
            }
        }
    } catch (error) {
        console.error('Error handling fullscreen change:', error);
    }
}

function handleFocusLoss() {
    const examApp = window.ExamApp;
    
    if (examApp.antiCheatActive && !examApp.completionInProgress) {
        console.log('WINDOW BLUR DETECTED (Alt+Tab/Cmd+Tab) - TERMINATING EXAM');
        reportViolation('focus_loss');
    }
}

function handleFocusGain() {
    console.log('Window regained focus');
}

function handleVisibilityChange() {
    const examApp = window.ExamApp;
    
    if (examApp.antiCheatActive && !examApp.completionInProgress) {
        if (document.hidden) {
            console.log('TAB HIDDEN DETECTED - TERMINATING EXAM');
            reportViolation('tab_hidden');
        }
    }
}

function handleKeyDown(event) {
    const examApp = window.ExamApp;
    
    if (!examApp.antiCheatActive || examApp.completionInProgress) {
        return;
    }
    
    // AGGRESSIVE MODE: Block ALL modifier combinations first
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        
        // Check if we're in Monaco editor context
        const isInEditor = isInEditorContext(event.target);
        
        // WHITELIST: Only allow essential editor combinations
        const allowedEditorCombos = [
            // Basic editing
            { ctrl: true, key: 'c' },           // Copy
            { ctrl: true, key: 'v' },           // Paste
            { ctrl: true, key: 'x' },           // Cut
            { ctrl: true, key: 'z' },           // Undo
            { ctrl: true, key: 'y' },           // Redo
            { ctrl: true, key: 'a' },           // Select All
            { ctrl: true, key: 's' },           // Save (for auto-save)
            
            // Monaco editor specific
            { ctrl: true, key: 'f' },           // Find
            { ctrl: true, key: 'h' },           // Replace
            { ctrl: true, key: 'g' },           // Go to line
            { ctrl: true, key: 'd' },           // Add selection to next find match
            { ctrl: true, shift: true, key: 'l' }, // Select all occurrences
            { ctrl: true, key: '/' },           // Toggle comment
            { ctrl: true, shift: true, key: 'f' }, // Format document
            { ctrl: true, shift: true, key: 'o' }, // Organize imports
            
            // Navigation
            { ctrl: true, key: 'ArrowLeft' },   // Word navigation
            { ctrl: true, key: 'ArrowRight' },  // Word navigation
            { ctrl: true, key: 'Home' },        // Line start
            { ctrl: true, key: 'End' },         // Line end
            { shift: true, key: 'ArrowUp' },    // Selection
            { shift: true, key: 'ArrowDown' },  // Selection
            { shift: true, key: 'ArrowLeft' },  // Selection
            { shift: true, key: 'ArrowRight' }, // Selection
            
            // macOS equivalents
            { meta: true, key: 'c' },           // Copy Mac
            { meta: true, key: 'v' },           // Paste Mac
            { meta: true, key: 'x' },           // Cut Mac
            { meta: true, key: 'z' },           // Undo Mac
            { meta: true, key: 'y' },           // Redo Mac
            { meta: true, key: 'a' },           // Select All Mac
            { meta: true, key: 's' },           // Save Mac
        ];
        
        // Check if current combination is allowed
        let isAllowed = false;
        if (isInEditor) {
            for (const combo of allowedEditorCombos) {
                const match = (!combo.ctrl || event.ctrlKey) &&
                             (!combo.alt || event.altKey) &&
                             (!combo.shift || event.shiftKey) &&
                             (!combo.meta || event.metaKey) &&
                             (combo.key === event.key);
                             
                if (match) {
                    isAllowed = true;
                    break;
                }
            }
        }
        
        // BLOCK EVERYTHING ELSE WITH MODIFIERS
        if (!isAllowed) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            console.log(`AGGRESSIVE BLOCK: ${getKeyComboString(event)} - Custom combo blocked`);
            reportViolation('custom_key_combination');
            return;
        }
    }
    
    // Block function keys except F12 (for DevTools debugging)
    const functionKeys = [
        'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11',
        'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20', 'F21', 'F22', 'F23', 'F24'
    ];

    if (functionKeys.includes(event.key) || functionKeys.includes(event.code)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.log(`FUNCTION KEY BLOCKED: ${event.key}`);
        reportViolation('function_key_attempt');
        return;
    }
    
    // Block ALL system keys - ZERO mercy
    const systemKeys = [
        'Meta', 'OS', 'Super',           // Windows/Cmd key
        'ContextMenu', 'Apps',           // Menu key
        'PrintScreen', 'Print',          // Print Screen
        'Pause', 'Break',                // Pause/Break
        'Insert', 'Help',                // Insert/Help
        'VolumeUp', 'VolumeDown', 'VolumeMute',  // Media keys
        'MediaPlayPause', 'MediaStop', 'MediaTrackNext', 'MediaTrackPrevious',
        'Escape'                         // ESC key - NO ESCAPE!
    ];
    
    if (systemKeys.includes(event.key) || systemKeys.includes(event.code)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.log(`SYSTEM KEY DESTROYED: ${event.key}`);
        reportViolation('system_key_attempt');
        return;
    }
    
    // Block standalone modifier keys
    if (['Control', 'Alt', 'Shift', 'Meta', 'AltGraph'].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.log(`MODIFIER KEY BLOCKED: ${event.key}`);
        reportViolation('modifier_key_attempt');
        return;
    }
}

/**
 * Check if target is in Monaco editor context
 */
function isInEditorContext(target) {
    if (!target) return false;
    
    return target.closest('.monaco-editor') ||
           target.closest('#monaco-editor') ||
           target.closest('.view-line') ||
           target.closest('.monaco-scrollable-element') ||
           target.id === 'monaco-editor' ||
           target.className?.includes('monaco');
}

/**
 * Get human-readable key combination string
 */
function getKeyComboString(event) {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    parts.push(event.key);
    return parts.join('+');
}

/**
 * Apply aggressive CSS-based blocking rules
 */
function applyCSSBlockingRules() {
    const examApp = window.ExamApp;
    
    if (!examApp.antiCheatActive) return;
    
    // Create and inject aggressive CSS
    const style = document.createElement('style');
    style.id = 'aggressive-anti-cheat-css';
    style.textContent = `
        /* DISABLE ALL SELECTION OUTSIDE EDITOR */
        * {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
        }
        
        /* ALLOW SELECTION ONLY IN MONACO EDITOR */
        .monaco-editor, .monaco-editor *, 
        #monaco-editor, #monaco-editor *,
        input, textarea {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
        
        /* DISABLE DRAG AND DROP GLOBALLY */
        * {
            -webkit-user-drag: none !important;
            -moz-user-drag: none !important;
            user-drag: none !important;
            draggable: false !important;
        }
        
        /* DISABLE ZOOM AND SCALING */
        body {
            zoom: 1 !important;
            -webkit-transform: scale(1) !important;
            -moz-transform: scale(1) !important;
            transform: scale(1) !important;
            -webkit-user-scalable: no !important;
            -moz-user-scalable: no !important;
            user-scalable: no !important;
        }
        
        /* HIDE SCROLLBARS TO PREVENT ESCAPE */
        ::-webkit-scrollbar {
            width: 8px !important;
            height: 8px !important;
        }
        
        ::-webkit-scrollbar-track {
            background: transparent !important;
        }
        
        ::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.3) !important;
            border-radius: 4px !important;
        }
        
        /* DISABLE OUTLINE AND FOCUS RINGS THAT COULD BE EXPLOITED */
        *:focus {
            outline: none !important;
            box-shadow: none !important;
        }
        
        /* ALLOW FOCUS ONLY IN EDITOR */
        .monaco-editor *:focus,
        #monaco-editor *:focus,
        input:focus, textarea:focus,
        button:focus {
            outline: 1px solid #007acc !important;
        }
        
        /* DISABLE POINTER EVENTS ON POTENTIAL ESCAPE ELEMENTS */
        iframe:not(.monaco-editor iframe) {
            pointer-events: none !important;
        }
        
        /* PREVENT CONTEXT MENU STYLING TRICKS */
        ::selection {
            background: rgba(0, 122, 204, 0.3) !important;
        }
        
        ::-moz-selection {
            background: rgba(0, 122, 204, 0.3) !important;
        }
        
        /* DISABLE PRINT STYLES */
        @media print {
            * {
                display: none !important;
            }
            
            body::before {
                content: "PRINTING DISABLED DURING EXAM" !important;
                display: block !important;
                font-size: 24px !important;
                text-align: center !important;
                color: red !important;
            }
        }
        
        /* FULLSCREEN ENFORCEMENT - Removed to avoid conflicts with base.css red screen */
        /* Red screen warning handled by base.css body.anti-cheat-active:not(:fullscreen)::before */
        
        /* PREVENT MANIPULATION OF ANTI-CHEAT ELEMENTS */
        #aggressive-anti-cheat-css {
            display: none !important;
            visibility: hidden !important;
        }
    `;
    
    // Insert CSS into head
    document.head.appendChild(style);
    
    // PROTECT THE CSS FROM BEING REMOVED
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const removedNodes = Array.from(mutation.removedNodes);
                if (removedNodes.some(node => node.id === 'aggressive-anti-cheat-css')) {
                    console.log('ANTI-CHEAT CSS TAMPERED - TERMINATING EXAM');
                    reportViolation('css_tampering');
                }
            }
        });
    });
    
    observer.observe(document.head, { childList: true });
    
    console.log('AGGRESSIVE CSS BLOCKING RULES APPLIED');
}

function handleKeyUp(event) {
    // Prevent default for ESC on keyup too
    if (event.key === 'Escape' || event.keyCode === 27) {
        event.preventDefault();
        event.stopPropagation();
    }
}

function handleWindowResize() {
    const examApp = window.ExamApp;
    
    if (!examApp.antiCheatActive || examApp.completionInProgress) {
        return;
    }
    
    // Store initial dimensions when anti-cheat starts
    if (!examApp.initialDimensions) {
        examApp.initialDimensions = {
            width: window.innerWidth,
            height: window.innerHeight,
            screenWidth: screen.width,
            screenHeight: screen.height
        };
        return;
    }
    
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    const initial = examApp.initialDimensions;
    
    // Check for significant size changes (more than 50px difference)
    const widthDiff = Math.abs(currentWidth - initial.width);
    const heightDiff = Math.abs(currentHeight - initial.height);
    
    if (widthDiff > 50 || heightDiff > 50) {
        console.log(`WINDOW RESIZE DETECTED: ${initial.width}x${initial.height} → ${currentWidth}x${currentHeight}`);
        reportViolation('window_resize');
    }
}

function handleOrientationChange() {
    const examApp = window.ExamApp;
    
    if (examApp.antiCheatActive && !examApp.completionInProgress) {
        console.log('SCREEN ORIENTATION CHANGE DETECTED - TERMINATING EXAM');
        reportViolation('orientation_change');
    }
}

function handleMouseMove(event) {
    const examApp = window.ExamApp;
    
    if (!examApp.antiCheatActive || examApp.completionInProgress) {
        return;
    }
    
    // Track mouse position for multi-monitor detection
    const x = event.clientX;
    const y = event.clientY;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Check if mouse is near screen edges (could indicate moving to another monitor)
    const edgeThreshold = 5;
    const nearLeftEdge = x <= edgeThreshold;
    const nearRightEdge = x >= windowWidth - edgeThreshold;
    const nearTopEdge = y <= edgeThreshold;
    const nearBottomEdge = y >= windowHeight - edgeThreshold;
    
    if (nearTopEdge && !examApp.mouseWarnedTop) {
        examApp.mouseWarnedTop = true;
        console.warn('Mouse near top edge - potential macOS menu bar access');
        
        // On macOS, aggressive detection for menu bar access
        if (navigator.platform.toLowerCase().includes('mac')) {
            // If mouse stays at top edge for more than 500ms, terminate
            examApp.topEdgeTimer = setTimeout(() => {
                if (examApp.antiCheatActive && !examApp.completionInProgress) {
                    console.log('MACOS MENU BAR ACCESS DETECTED - TERMINATING EXAM');
                    reportViolation('macos_menubar_access');
                }
            }, 500);
        }
        
        // Reset warning after 2 seconds
        setTimeout(() => {
            examApp.mouseWarnedTop = false;
            if (examApp.topEdgeTimer) {
                clearTimeout(examApp.topEdgeTimer);
                examApp.topEdgeTimer = null;
            }
        }, 2000);
    }
    
    // Cancel top edge timer if mouse moves away from top
    if (!nearTopEdge && examApp.topEdgeTimer) {
        clearTimeout(examApp.topEdgeTimer);
        examApp.topEdgeTimer = null;
    }
    
    // Store last mouse position
    examApp.lastMousePosition = { x, y, timestamp: Date.now() };
}

function handleMouseLeave(event) {
    const examApp = window.ExamApp;
    
    if (!examApp.antiCheatActive || examApp.completionInProgress) {
        return;
    }
    
    // Mouse left the window - potential multi-monitor movement
    console.log('MOUSE LEFT WINDOW - Potential multi-monitor access');
    
    // Give a short grace period in case it's accidental
    setTimeout(() => {
        if (examApp.antiCheatActive && !examApp.completionInProgress) {
            // Check if mouse is still outside after grace period
            if (document.querySelector(':hover') === null) {
                console.log('MOUSE OUTSIDE WINDOW CONFIRMED - TERMINATING EXAM');
                reportViolation('mouse_outside_window');
            }
        }
    }, 1000); // 1 second grace period
}

/**
 * Aggressive focus polling - checks every 100ms
 */
function startAggressiveFocusPolling() {
    const examApp = window.ExamApp;
    let lastFocusState = document.hasFocus();
    let lastVisibilityState = document.visibilityState;
    let consecutiveFailures = 0;
    
    examApp.focusPollingInterval = setInterval(() => {
        if (!examApp.antiCheatActive || examApp.completionInProgress) {
            return;
        }
        
        const currentFocus = document.hasFocus();
        const currentVisibility = document.visibilityState;
        
        // Detect focus loss
        if (lastFocusState && !currentFocus) {
            console.log('AGGRESSIVE FOCUS LOSS DETECTED');
            reportViolation('aggressive_focus_loss');
            return;
        }
        
        // Detect visibility change
        if (lastVisibilityState === 'visible' && currentVisibility === 'hidden') {
            console.log('AGGRESSIVE VISIBILITY LOSS DETECTED');
            reportViolation('aggressive_visibility_loss');
            return;
        }
        
        // Additional checks for edge cases
        try {
            // Check if window is the active element
            if (document.activeElement === null) {
                consecutiveFailures++;
                if (consecutiveFailures >= 3) {
                    console.log('ACTIVE ELEMENT LOST - SUSPICIOUS ACTIVITY');
                    reportViolation('active_element_lost');
                    return;
                }
            } else {
                consecutiveFailures = 0;
            }
            
            // Check window dimensions haven't changed suspiciously
            // Skip dimension checks for first 10 seconds after fullscreen activation
            const timeSinceActivation = Date.now() - (examApp.antiCheatActivationTime || 0);
            const skipDimensionCheck = timeSinceActivation < 10000; // 10 seconds grace period
            
            if (!skipDimensionCheck) {
                const currentDimensions = {
                    innerWidth: window.innerWidth,
                    innerHeight: window.innerHeight,
                    outerWidth: window.outerWidth,
                    outerHeight: window.outerHeight
                };
                
                if (examApp.lastDimensions) {
                    const widthDiff = Math.abs(currentDimensions.innerWidth - examApp.lastDimensions.innerWidth);
                    const heightDiff = Math.abs(currentDimensions.innerHeight - examApp.lastDimensions.innerHeight);
                    
                    // Only report if change is significant AND we're not in fullscreen transition
                    if ((widthDiff > 200 || heightDiff > 200) && examApp.isFullscreen) {
                        console.log(`SUSPICIOUS DIMENSION CHANGE: ${JSON.stringify(examApp.lastDimensions)} → ${JSON.stringify(currentDimensions)}`);
                        reportViolation('suspicious_dimension_change');
                        return;
                    }
                }
                
                examApp.lastDimensions = currentDimensions;
            }
            
        } catch (error) {
            console.warn('Focus polling error:', error);
        }
        
        lastFocusState = currentFocus;
        lastVisibilityState = currentVisibility;
        
    }, 100); // Check every 100ms
    
    console.log('Aggressive focus polling started (100ms intervals)');
}

/**
 * Initialize mouse lock to trap cursor
 */
function initializeMouseLock() {
    const examApp = window.ExamApp;
    
    // Set up pointer lock change events
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    
    // Webkit/Firefox compatibility
    document.addEventListener('webkitpointerlockchange', handlePointerLockChange);
    document.addEventListener('webkitpointerlockerror', handlePointerLockError);
    document.addEventListener('mozpointerlockchange', handlePointerLockChange);
    document.addEventListener('mozpointerlockerror', handlePointerLockError);
    
    console.log('Mouse lock system initialized');
}

/**
 * Request pointer lock on fullscreen entry
 */
function requestMouseLock() {
    const examApp = window.ExamApp;
    
    if (!examApp.antiCheatActive) return;
    
    try {
        const element = document.documentElement;
        
        // Try different browser implementations
        if (element.requestPointerLock) {
            element.requestPointerLock();
        } else if (element.webkitRequestPointerLock) {
            element.webkitRequestPointerLock();
        } else if (element.mozRequestPointerLock) {
            element.mozRequestPointerLock();
        }
        
        console.log('Mouse lock requested');
        
    } catch (error) {
        console.warn('Mouse lock request failed:', error);
    }
}

/**
 * Handle pointer lock changes
 */
function handlePointerLockChange() {
    const examApp = window.ExamApp;
    
    if (!examApp.antiCheatActive || examApp.completionInProgress) {
        return;
    }
    
    const lockedElement = document.pointerLockElement || 
                         document.webkitPointerLockElement || 
                         document.mozPointerLockElement;
    
    if (lockedElement) {
        console.log('Mouse locked successfully');
        examApp.mouseLocked = true;
    } else {
        console.log('MOUSE LOCK LOST - POTENTIAL ESCAPE ATTEMPT');
        examApp.mouseLocked = false;
        
        // If we lost mouse lock during active exam, it's suspicious
        if (examApp.antiCheatActive && examApp.isFullscreen) {
            // Try to re-acquire lock immediately
            setTimeout(() => {
                if (examApp.antiCheatActive && !examApp.completionInProgress) {
                    requestMouseLock();
                }
            }, 100);
            
            // If mouse lock is lost multiple times, terminate
            examApp.mouseLockLossCount = (examApp.mouseLockLossCount || 0) + 1;
            if (examApp.mouseLockLossCount >= 3) {
                console.log('REPEATED MOUSE LOCK LOSS - TERMINATING EXAM');
                reportViolation('mouse_lock_lost');
            }
        }
    }
}

/**
 * Handle pointer lock errors
 */
function handlePointerLockError() {
    const examApp = window.ExamApp;
    
    console.warn('Mouse lock error occurred');
    
    if (examApp.antiCheatActive && !examApp.completionInProgress) {
        // Some browsers don't support pointer lock, so don't terminate immediately
        console.log('Mouse lock not supported on this browser');
    }
}

/**
 * Handle mouse down events - block dangerous buttons
 */
function handleMouseDown(event) {
    const examApp = window.ExamApp;
    
    if (!examApp.antiCheatActive || examApp.completionInProgress) {
        return;
    }
    
    // Block middle mouse button (wheel click)
    if (event.button === 1) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.log('MIDDLE MOUSE BUTTON BLOCKED');
        reportViolation('middle_mouse_button');
        return false;
    }
    
    // Block right mouse button
    if (event.button === 2) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.log('RIGHT MOUSE BUTTON BLOCKED');
        reportViolation('right_mouse_button');
        return false;
    }
    
    // Block mouse buttons 4 and 5 (back/forward)
    if (event.button === 3 || event.button === 4) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.log('NAVIGATION MOUSE BUTTON BLOCKED');
        reportViolation('navigation_mouse_button');
        return false;
    }
}

/**
 * Handle mouse up events
 */
function handleMouseUp(event) {
    const examApp = window.ExamApp;
    
    if (!examApp.antiCheatActive || examApp.completionInProgress) {
        return;
    }
    
    // Block all non-left mouse buttons on mouse up too
    if (event.button !== 0) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
    }
}

/**
 * Block context menu (right-click menu)
 */
function handleContextMenu(event) {
    const examApp = window.ExamApp;
    
    if (!examApp.antiCheatActive || examApp.completionInProgress) {
        return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    console.log('CONTEXT MENU BLOCKED');
    reportViolation('context_menu_attempt');
    return false;
}

/**
 * Block text selection
 */
function handleSelectStart(event) {
    const examApp = window.ExamApp;
    
    if (!examApp.antiCheatActive || examApp.completionInProgress) {
        return;
    }
    
    // Allow selection only in Monaco editor
    const target = event.target;
    const isInEditor = target.closest('.monaco-editor') || 
                      target.closest('#monaco-editor') ||
                      target.closest('input') ||
                      target.closest('textarea');
    
    if (!isInEditor) {
        event.preventDefault();
        event.stopPropagation();
        console.log('TEXT SELECTION BLOCKED (outside editor)');
        return false;
    }
}

/**
 * Block drag and drop
 */
function handleDragStart(event) {
    const examApp = window.ExamApp;
    
    if (!examApp.antiCheatActive || examApp.completionInProgress) {
        return;
    }
    
    // Allow drag only in Monaco editor for code editing
    const target = event.target;
    const isInEditor = target.closest('.monaco-editor') || target.closest('#monaco-editor');
    
    if (!isInEditor) {
        event.preventDefault();
        event.stopPropagation();
        console.log('DRAG AND DROP BLOCKED');
        reportViolation('drag_drop_attempt');
        return false;
    }
}

function reportViolation(violationType, customDetails = {}) {
    try {
        const examApp = window.ExamApp;

        // CRITICAL: Don't report violations if exam is over
        if (examApp.completionInProgress || !examApp.isLoggedIn) {
            console.log('Exam is over - not reporting violation:', violationType);
            return;
        }

        if (examApp.socket && examApp.socket.connected) {
            // Merge custom details with defaults
            const details = {
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                severity: customDetails.severity || 'critical',
                ...customDetails
            };

            examApp.socket.emit('suspicious-activity', {
                sessionId: examApp.sessionId,
                activityType: violationType,
                details: details,
                timestamp: Date.now()
            });
        }

        console.warn('Violation reported:', violationType, customDetails);

    } catch (error) {
        console.error('Failed to report violation:', error);
    }
}

function updateFullscreenStatus(text) {
    try {
        const statusEl = document.getElementById('fullscreen-status');
        if (statusEl) {
            statusEl.textContent = text;
        }
    } catch (error) {
        console.error('Failed to update fullscreen status:', error);
    }
}

export function getAntiCheatStatus() {
    const examApp = window.ExamApp;
    return {
        antiCheatActive: examApp.antiCheatActive,
        isFullscreen: examApp.isFullscreen,
        completionInProgress: examApp.completionInProgress
    };
}

export function checkFullscreenStatus() {
    const fullscreenStatus = {
        standard: !!document.fullscreenElement,
        webkit: !!document.webkitFullscreenElement,
        moz: !!document.mozFullScreenElement,
        ms: !!document.msFullscreenElement,
        combined: !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        )
    };

    console.log('Fullscreen status check:', fullscreenStatus);
    return fullscreenStatus;
}

// Remove the advanced anti-cheat initialization
export function initializeAdvancedAntiCheat() {
    // No longer needed - keeping function for compatibility
    console.log('Simple anti-cheat mode active');
    return true;
}

/**
 * Show fullscreen exit warning with continue/exit buttons
 * Updates attempt counter and sets up button handlers
 * On 3rd attempt: terminate exam via server force-disconnect
 */
function showFullscreenExitWarning(attemptNumber) {
    const maxAttempts = 3;

    // Update attempt counter in the overlay
    const attemptCounter = document.getElementById('attempt-counter');
    if (attemptCounter) {
        attemptCounter.textContent = attemptNumber;
    }

    if (attemptNumber >= maxAttempts) {
        console.log('MAX FULLSCREEN EXIT ATTEMPTS REACHED - Server will force-disconnect');
        // Server handles termination after 3rd attempt
        // Overlay remains visible until server disconnects
    } else {
        // CSS red screen with buttons is already visible
        console.log(`Fullscreen exit attempt ${attemptNumber}/${maxAttempts} - Red screen with buttons active`);

        // Setup button event listeners (only once)
        setupFullscreenWarningButtons();
    }
}

/**
 * Setup event listeners for fullscreen warning buttons
 */
function setupFullscreenWarningButtons() {
    const continueBtn = document.getElementById('continue-exam-btn');
    const exitBtn = document.getElementById('exit-exam-btn');

    // Remove existing listeners to prevent duplicates
    if (continueBtn) {
        continueBtn.replaceWith(continueBtn.cloneNode(true));
    }
    if (exitBtn) {
        exitBtn.replaceWith(exitBtn.cloneNode(true));
    }

    // Get fresh references after cloning
    const freshContinueBtn = document.getElementById('continue-exam-btn');
    const freshExitBtn = document.getElementById('exit-exam-btn');

    // Continue button: re-enter fullscreen
    if (freshContinueBtn) {
        freshContinueBtn.addEventListener('click', () => {
            console.log('Student chose to continue exam - re-entering fullscreen');
            enterFullscreenMode();
        });
    }

    // Exit button: complete exam
    if (freshExitBtn) {
        freshExitBtn.addEventListener('click', async () => {
            console.log('Student chose to exit exam');
            const examApp = window.ExamApp;
            examApp.completionInProgress = true;

            // Call completeExam function from main.js
            if (typeof window.completeExam === 'function') {
                await window.completeExam();
            } else {
                console.error('completeExam function not available');
            }
        });
    }
}