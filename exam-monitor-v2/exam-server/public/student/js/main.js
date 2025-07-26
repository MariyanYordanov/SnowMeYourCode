import { MonacoFileManager } from './monaco-file-manager.js';
import { updateEditorIntegration, loadStarterProject } from './editor-integration.js'; 
import { SidebarManager } from './sidebar-manager.js';
import { previewManager } from './preview-manager.js';
import { HelpChat } from './help-chat.js';

import {
    setupLoginForm,
    handleLogin,
    handleLoginSuccess,
    handleSessionRestore,
    handleLoginError,
    updateStudentDisplay
} from './login.js';

import { setupSocket } from './socket.js';

import {
    initializeMonacoEditor,
    setupEditorControls,
    runCode,
    formatCode,
    clearOutput
} from './editor.js';

import {
    startExamTimer,
    handleTimeWarning,
    handleExamExpired
} from './timer.js';

import {
    setupAntiCheat,
    enterFullscreenMode,
    deactivateAntiCheat,
    initializeAdvancedAntiCheat
} from './anticheat.js';

import {
    showCompletionDialog,
    hideCustomDialogs
} from './dialogs.js';

import { setupTabs } from './tabs.js';

window.ExamApp = {
    socket: null,
    editor: null,
    fileManager: null,
    previewManager: previewManager,

    sessionId: null,
    studentName: null,
    studentClass: null,
    helpChat: null,

    examStartTime: null,
    examDuration: 3 * 60 * 60 * 1000,
    examEndTime: null,
    timeLeft: 0,
    timerInterval: null,

    isFullscreen: false,
    violationCount: 0,
    antiCheatActive: false,
    isLoggedIn: false,
    lastSaveTime: null,
    isCompletionInProgress: false,

    settings: {
        autoSave: true,
        autoSaveInterval: 30000,
        theme: 'vs-dark',
        fontSize: 14,
        wordWrap: true
    },

    showNotification: showNotification,
    showError: showError,
    updateStudentDisplay: updateStudentDisplay
};

document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    try {
        console.log('Initializing Exam Monitor App...');
        
        // Check for mobile/tablet devices and block access
        if (detectMobileDevice()) {
            blockMobileAccess();
            return; // Stop initialization
        }

        const examApp = window.ExamApp;

        updateEditorIntegration();

        setupLoginForm(examApp);

        setupSocket();

        setupAntiCheat();

        setupGlobalErrorHandler();

        preventDefaultBehaviors();

        setupWindowFunctions();

        examApp.sidebarManager = new SidebarManager();

        console.log('App initialized successfully');

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Грешка при инициализация на приложението');
    }
}

async function startExam(sessionData) {
    try {
        const examApp = window.ExamApp;

        if (!sessionData || !examApp.sessionId) {
            throw new Error('Invalid session data');
        }

        examApp.isLoggedIn = true;
        examApp.examStartTime = sessionData.examStartTime || Date.now();
        examApp.examDuration = sessionData.examDuration || (3 * 60 * 60 * 1000);
        examApp.examEndTime = new Date(examApp.examStartTime + examApp.examDuration);

        hideLoginComponent();
        showExamComponent();

        updateStudentDisplay(
            examApp.studentName,
            examApp.studentClass,
            examApp.sessionId
        );

        await initializeMonaco();

        setupTabs();

        // Initialize advanced anti-cheat modules
        initializeAdvancedAntiCheat();

        // Initialize help chat
        if (examApp.socket) {
            examApp.helpChat = new HelpChat(examApp.socket);
            examApp.helpChat.requestNotificationPermission();
        }

        // Show minimal fullscreen button
        showMinimalFullscreenButton();

        startExamTimer(sessionData.timeLeft || examApp.examDuration);

        // Възстановяваме кода за продължаващи сесии
        if (!sessionData.isNewSession && sessionData.lastCode && examApp.editor) {
            examApp.editor.setValue(sessionData.lastCode);
            
            const minutesLeft = Math.floor(sessionData.timeLeft / 60000);
            showNotification(`Сесията е възстановена. Остават ${minutesLeft} минути`, 'info');
        }

        console.log('Exam started successfully');

    } catch (error) {
        console.error('Failed to start exam:', error);
        showError('[ERROR] Грешка при стартиране на изпита');

        setTimeout(() => {
            if (window.ExamApp.isLoggedIn) {
                exitExam('start_error');
            }
        }, 3000);
    }
}

async function startFullscreenExam() {
    try {
        const success = enterFullscreenMode();
        const examApp = window.ExamApp;

        if (!success) {
            showError('Браузърът не поддържа fullscreen режим');
            return;
        }

        hidePreExamComponent();
        showExamComponent();

        updateStudentDisplay(
            examApp.studentName,
            examApp.studentClass,
            examApp.sessionId
        );

        await initializeMonaco();

        setupTabs();

        startExamTimer(examApp.examDuration);

        showNotification('Изпитът започна успешно! Успех!', 'success');

        console.log('Exam started successfully in fullscreen');

    } catch (error) {
        console.error('Failed to start fullscreen exam:', error);
        showError('[ERROR] Грешка при стартиране на изпита');
    }
}

async function initializeMonaco() {
    try {
        console.log('Initializing Monaco editor...');

        const editor = await initializeMonacoEditor();
        const examApp = window.ExamApp;

        if (!editor) {
            throw new Error('Failed to create Monaco editor');
        }

        examApp.editor = editor;

        const fileManager = new MonacoFileManager(editor);
        examApp.fileManager = fileManager;

        setupEditorControls();

        if (typeof monaco !== 'undefined') {
            setupFileManagerCommands();
    }

    if (examApp.sessionId) {
            try {
                const success = await fileManager.loadProjectStructure(examApp.sessionId);
                if (!success) {
                    console.log('No existing project found, loading starter files');
                    loadStarterProject();
                }
            } catch (error) {
                console.error('Error loading project:', error);
                loadStarterProject();
            }
        } else {
            loadStarterProject();
        }

        console.log('Monaco initialization complete');

    } catch (error) {
        console.error('Monaco initialization failed:', error);
        throw error;
    }
}

function setupFileManagerCommands() {
    try {
        const examApp = window.ExamApp;
        const fileManager = examApp.fileManager;
        const editor = examApp.editor;

        if (!fileManager || !editor || typeof monaco === 'undefined') {
            console.warn('Cannot setup file manager commands - missing dependencies');
            return;
        }

        const newFileBtn = document.getElementById('new-file-btn');
        if (newFileBtn) {
            newFileBtn.addEventListener('click', () => {
                fileManager.createNewFile();
            });
        }


        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            fileManager.saveCurrentFile();
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, () => {
            fileManager.closeCurrentFile();
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, () => {
            fileManager.createNewFile();
        });

        console.log('File manager commands setup complete');

    } catch (error) {
        console.error('Failed to setup file manager commands:', error);
    }
}

function completeExam(reason = 'unknown') {
    try {
        const examApp = window.ExamApp;
        examApp.completionInProgress = true;

        if (examApp.fileManager) {
            examApp.fileManager.saveCurrentFile();
        }

        deactivateAntiCheat();

        if (examApp.timerInterval) {
            clearInterval(examApp.timerInterval);
        }

        if (examApp.socket && examApp.socket.connected) {
            examApp.socket.emit('exam-complete', {
                sessionId: examApp.sessionId,
                reason: reason,
                timestamp: Date.now()
            });
        }

        showCompletionDialog(reason);

        setTimeout(() => {
            exitExam(reason);
        }, 3000);

    } catch (error) {
        console.error('Error completing exam:', error);
    }
}

function exitExam(reason = 'unknown') {
    try {
        const examApp = window.ExamApp;
        examApp.completionInProgress = true;

        deactivateAntiCheat();

        if (examApp.timerInterval) {
            clearInterval(examApp.timerInterval);
        }

        if (examApp.fileManager) {
            examApp.fileManager.disposeAll();
        }

        if (examApp.socket && examApp.socket.connected) {
            examApp.socket.emit('exam-complete', {
                sessionId: examApp.sessionId,
                reason: reason,
                timestamp: Date.now()
            });
        }

        examApp.isLoggedIn = false;
        examApp.antiCheatActive = false;

        setTimeout(() => {
            hideExamComponent();
            showLoginComponent();
            examApp.completionInProgress = false;
        }, 2000);

        console.log(`Exam exited: ${reason}`);

    } catch (error) {
        console.error('Error during exam exit:', error);
    }
}

function showLoginComponent() {
    const loginComponent = document.getElementById('login-component');
    if (loginComponent) {
        loginComponent.style.display = 'flex';
    }
}

function hideLoginComponent() {
    const loginComponent = document.getElementById('login-component');
    if (loginComponent) {
        loginComponent.style.display = 'none';
    }
}

function showExamComponent() {
    const examComponent = document.getElementById('exam-component');
    if (examComponent) {
        examComponent.style.display = 'block';
    }
}

function hideExamComponent() {
    const examComponent = document.getElementById('exam-component');
    if (examComponent) {
        examComponent.style.display = 'none';
    }
}

function showPreExamComponent() {
    const preExamComponent = document.getElementById('pre-exam-component');
    if (preExamComponent) {
        preExamComponent.style.display = 'flex';
    }
}

function hidePreExamComponent() {
    const preExamComponent = document.getElementById('pre-exam-component');
    if (preExamComponent) {
        preExamComponent.style.display = 'none';
    }
}

function updatePreExamDisplay(studentName, studentClass, sessionId) {
    const nameEl = document.getElementById('pre-exam-student-name');
    const classEl = document.getElementById('pre-exam-student-class');
    const sessionEl = document.getElementById('pre-exam-session-id');

    if (nameEl) nameEl.textContent = studentName || 'Неизвестен';
    if (classEl) classEl.textContent = studentClass || 'Неизвестен';
    if (sessionEl) sessionEl.textContent = sessionId || 'Неизвестен';
}

function setupPreExamButton() {
    const startBtn = document.getElementById('start-fullscreen-exam-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            startFullscreenExam();
        });
    }
}

function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showError(message) {
    showNotification(message, 'error');
}

function preventDefaultBehaviors() {
    document.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('dragstart', e => e.preventDefault());
    document.addEventListener('drop', e => e.preventDefault());

    document.addEventListener('selectstart', e => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });
}

function setupGlobalErrorHandler() {
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        showError(`Грешка: ${event.error?.message || 'Неизвестна грешка'}`);
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        showError(`Грешка: ${event.reason?.message || 'Неизвестна грешка'}`);
    });
}

function setupWindowFunctions() {
    const examApp = window.ExamApp;
    window.handleLogin = (data) => handleLogin(examApp, data);
    window.handleLoginSuccess = (data) => handleLoginSuccess(examApp, data);
    window.handleSessionRestore = (data) => handleSessionRestore(examApp, data);
    window.handleLoginError = (error) => handleLoginError(examApp, error);
    window.handleTimeWarning = handleTimeWarning;
    window.handleExamExpired = handleExamExpired;

    // Assign functions to ExamApp for external access
    examApp.startExam = startExam;
    examApp.startFullscreenExam = startFullscreenExam;
    examApp.completeExam = completeExam;
    examApp.exitExam = exitExam;
    examApp.resetLoginState = () => resetLoginState(examApp);
    examApp.getLoginState = () => getLoginState(examApp);
    examApp.getTermsAcceptanceInfo = () => getTermsAcceptanceInfo(examApp);

    // Assign functions to ExamApp for external access
    examApp.startExam = startExam;
    examApp.startFullscreenExam = startFullscreenExam;
    examApp.completeExam = completeExam;
    examApp.exitExam = exitExam;
}

/**
 * Detect if the device is mobile or tablet
 */
function detectMobileDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check for mobile devices
    const mobileKeywords = [
        'android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry',
        'iemobile', 'opera mini', 'mobile', 'tablet', 'kindle', 'silk'
    ];
    
    const isMobile = mobileKeywords.some(keyword => userAgent.includes(keyword));
    
    // Additional checks
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const smallScreen = window.innerWidth <= 768 || window.innerHeight <= 600;
    
    // Check for mobile-specific features
    const isMobileUA = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    return isMobile || (hasTouch && smallScreen) || isMobileUA;
}

/**
 * Block mobile access with error message
 */
function blockMobileAccess() {
    document.body.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 20px;
            font-family: Arial, sans-serif;
        ">
            <div style="
                background: rgba(0,0,0,0.3);
                padding: 40px;
                border-radius: 10px;
                max-width: 500px;
            ">
                <h1 style="font-size: 48px; margin-bottom: 20px;">📱❌</h1>
                <h2 style="margin-bottom: 20px;">Мобилни устройства не се поддържат</h2>
                <p style="font-size: 18px; line-height: 1.6;">
                    Изпитът може да се провежда само на лаптоп или настолен компютър.
                    <br><br>
                    Моля, използвайте компютър с:
                </p>
                <ul style="text-align: left; display: inline-block; margin: 20px 0;">
                    <li>Windows, macOS или Linux</li>
                    <li>Chrome, Firefox, Edge или Safari браузър</li>
                    <li>Минимална резолюция 1280x720</li>
                    <li>Физическа клавиатура и мишка</li>
                </ul>
                <p style="margin-top: 30px; opacity: 0.8;">
                    За въпроси се свържете с преподавателя.
                </p>
            </div>
        </div>
    `;
}

/**
 * Show minimal fullscreen button that auto-clicks after showing
 */
function showMinimalFullscreenButton() {
    // Create a subtle overlay with a single button
    const overlay = document.createElement('div');
    overlay.id = 'fullscreen-button-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        cursor: pointer;
    `;
    
    const button = document.createElement('button');
    button.style.cssText = `
        background: #4299e1;
        color: white;
        border: none;
        padding: 20px 40px;
        font-size: 24px;
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        animation: pulse 1s infinite;
    `;
    button.innerHTML = '🖥️ Започни изпита';
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
    
    overlay.appendChild(button);
    document.body.appendChild(overlay);
    
    // Make entire overlay clickable
    const startExam = async () => {
        try {
            const success = enterFullscreenMode();
            if (success) {
                overlay.remove();
                style.remove();
            }
        } catch (error) {
            console.error('Failed to enter fullscreen:', error);
            showError('Моля, разрешете fullscreen режим');
        }
    };
    
    button.addEventListener('click', startExam);
    overlay.addEventListener('click', startExam);
    
    // Auto-focus the button
    setTimeout(() => {
        button.focus();
    }, 100);
}

