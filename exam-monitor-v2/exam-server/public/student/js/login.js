/**
 * Student Login Module
 * Handles login form, validation, and student authentication
 */

/**
 * Setup login form event handlers
 */
export function setupLoginForm() {
    try {
        const loginBtn = document.getElementById('login-btn');
        const studentName = document.getElementById('student-name');
        const studentClass = document.getElementById('student-class');

        if (!loginBtn || !studentName || !studentClass) {
            console.error('Login form elements not found');
            return false;
        }

        // Login button handler
        loginBtn.addEventListener('click', handleLogin);

        // Enter key support
        [studentName, studentClass].forEach(input => {
            input.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    handleLogin();
                }
            });
        });

        console.log('✅ Login form initialized');
        return true;
    } catch (error) {
        console.error('❌ Failed to setup login form:', error);
        return false;
    }
}

/**
 * Handle login button click
 */
export function handleLogin() {
    try {
        const name = document.getElementById('student-name').value.trim();
        const studentClass = document.getElementById('student-class').value;

        // Validation
        if (!validateLoginInput(name, studentClass)) {
            return;
        }

        // Show loading state
        showLoginStatus('Влизане в изпита...', 'info');
        setLoginButtonState(true); // Disable button

        // Store student info in global state
        window.ExamApp.studentName = name;
        window.ExamApp.studentClass = studentClass;

        // Send login request via WebSocket
        if (window.ExamApp.socket && window.ExamApp.socket.connected) {
            window.ExamApp.socket.emit('student-join', {
                studentName: name,
                studentClass: studentClass
            });
        } else {
            showLoginStatus('Няма връзка със сървъра', 'error');
            setLoginButtonState(false); // Re-enable button
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        showLoginStatus('Грешка при влизане', 'error');
        setLoginButtonState(false);
    }
}

/**
 * Validate login input
 */
function validateLoginInput(name, studentClass) {
    if (!name || !studentClass) {
        showLoginStatus('Моля въведете име и изберете клас', 'error');
        return false;
    }

    if (name.length < 3) {
        showLoginStatus('Името трябва да е поне 3 символа', 'error');
        return false;
    }

    // Check for valid Bulgarian characters
    const cyrillicPattern = /^[А-Яа-я\s]+$/;
    if (!cyrillicPattern.test(name)) {
        showLoginStatus('Името трябва да съдържа само български букви', 'error');
        return false;
    }

    // Check name format (at least first and last name)
    const nameParts = name.split(/\s+/);
    if (nameParts.length < 2) {
        showLoginStatus('Моля въведете име и фамилия', 'error');
        return false;
    }

    // Each name part must be at least 2 characters
    for (const part of nameParts) {
        if (part.length < 2) {
            showLoginStatus('Всяка част от името трябва да е поне 2 символа', 'error');
            return false;
        }
    }

    return true;
}

/**
 * Show login status message
 */
export function showLoginStatus(message, type) {
    try {
        const statusEl = document.getElementById('login-status');
        if (!statusEl) {
            console.error('Login status element not found');
            return;
        }

        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;

        console.log(`Login status: ${type} - ${message}`);
    } catch (error) {
        console.error('❌ Failed to show login status:', error);
    }
}

/**
 * Set login button state (enabled/disabled)
 */
function setLoginButtonState(disabled) {
    try {
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.disabled = disabled;
            loginBtn.textContent = disabled ? 'Влизане...' : '🚀 Влез в изпита';
        }
    } catch (error) {
        console.error('❌ Failed to set login button state:', error);
    }
}

/**
 * Handle successful login response
 */
export function handleLoginSuccess(data) {
    try {
        console.log('✅ Login successful:', data);

        // Update global state
        window.ExamApp.sessionId = data.sessionId;
        window.ExamApp.examStartTime = Date.now();

        // Show success message
        showLoginStatus('Влизане успешно! Стартиране на изпита...', 'success');

        // Start exam after short delay
        setTimeout(() => {
            if (window.ExamApp.startExam) {
                window.ExamApp.startExam(data);
            }
        }, 1500);
    } catch (error) {
        console.error('❌ Failed to handle login success:', error);
        showLoginStatus('Грешка при стартиране на изпита', 'error');
        setLoginButtonState(false);
    }
}

/**
 * Handle session restore response
 */
export function handleSessionRestore(data) {
    try {
        console.log('🔄 Session restored:', data);

        // Update global state
        window.ExamApp.sessionId = data.sessionId;

        // Show restore message
        showLoginStatus(data.message, 'success');

        // Start exam after short delay
        setTimeout(() => {
            if (window.ExamApp.startExam) {
                window.ExamApp.startExam(data);
            }
        }, 1500);
    } catch (error) {
        console.error('❌ Failed to handle session restore:', error);
        showLoginStatus('Грешка при възстановяване на сесията', 'error');
        setLoginButtonState(false);
    }
}

/**
 * Handle login error response
 */
export function handleLoginError(data) {
    try {
        console.error('❌ Login error:', data);

        // Show error message
        showLoginStatus(data.message, 'error');

        // Re-enable login button
        setLoginButtonState(false);

        // Clear stored data
        window.ExamApp.studentName = null;
        window.ExamApp.studentClass = null;
    } catch (error) {
        console.error('❌ Failed to handle login error:', error);
    }
}

/**
 * Update student display in exam interface
 */
export function updateStudentDisplay(studentName, studentClass, sessionId) {
    try {
        const nameEl = document.getElementById('student-name-display');
        const classEl = document.getElementById('student-class-display');
        const sessionEl = document.getElementById('session-id-display');

        if (nameEl) nameEl.textContent = studentName || 'Неизвестен';
        if (classEl) classEl.textContent = studentClass || 'Неизвестен';
        if (sessionEl) sessionEl.textContent = sessionId || 'Неизвестен';

        console.log(`📋 Student display updated: ${studentName} (${studentClass}) - ${sessionId}`);
    } catch (error) {
        console.error('❌ Failed to update student display:', error);
    }
}

/**
 * Clear login form
 */
export function clearLoginForm() {
    try {
        const studentName = document.getElementById('student-name');
        const studentClass = document.getElementById('student-class');
        const statusEl = document.getElementById('login-status');

        if (studentName) studentName.value = '';
        if (studentClass) studentClass.value = '';
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.className = 'status-message';
        }

        setLoginButtonState(false);

        console.log('🧹 Login form cleared');
    } catch (error) {
        console.error('❌ Failed to clear login form:', error);
    }
}

/**
 * Reset login state
 */
export function resetLoginState() {
    try {
        // Clear global state
        window.ExamApp.studentName = null;
        window.ExamApp.studentClass = null;
        window.ExamApp.sessionId = null;
        window.ExamApp.examStartTime = null;

        // Clear form
        clearLoginForm();

        // Show login container, hide exam container
        const loginContainer = document.getElementById('login-container');
        const examContainer = document.getElementById('exam-container');

        if (loginContainer) loginContainer.style.display = 'flex';
        if (examContainer) examContainer.style.display = 'none';

        console.log('🔄 Login state reset');
    } catch (error) {
        console.error('❌ Failed to reset login state:', error);
    }
}

/**
 * Get current login state
 */
export function getLoginState() {
    return {
        studentName: window.ExamApp.studentName,
        studentClass: window.ExamApp.studentClass,
        sessionId: window.ExamApp.sessionId,
        isLoggedIn: window.ExamApp.isLoggedIn,
        examStartTime: window.ExamApp.examStartTime
    };
}

/**
 * Format student name consistently
 */
export function formatStudentName(name) {
    if (!name || typeof name !== 'string') {
        return '';
    }

    return name
        .trim()
        .replace(/\s+/g, ' ') // Multiple spaces to single
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Validate student class
 */
export function validateStudentClass(studentClass) {
    const validClasses = ['11А', '11Б', '12А', '12Б'];
    return validClasses.includes(studentClass);
}

/**
 * Auto-fill login form (for testing)
 */
export function autoFillLoginForm(name, studentClass) {
    try {
        const nameInput = document.getElementById('student-name');
        const classSelect = document.getElementById('student-class');

        if (nameInput) nameInput.value = name;
        if (classSelect) classSelect.value = studentClass;

        console.log(`🤖 Auto-filled login form: ${name} (${studentClass})`);
    } catch (error) {
        console.error('❌ Failed to auto-fill login form:', error);
    }
}