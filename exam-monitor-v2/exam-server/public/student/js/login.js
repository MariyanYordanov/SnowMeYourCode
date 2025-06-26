/**
 * Enhanced Login Module with Terms Agreement
 * Handles login form, validation, terms agreement, and student authentication
 */

/**
 * Setup login form event handlers with terms agreement
 */
export function setupLoginForm() {
    try {
        const loginBtn = document.getElementById('login-btn');
        const studentName = document.getElementById('student-name');
        const studentClass = document.getElementById('student-class');
        const termsContent = document.getElementById('terms-content');
        const termsAgreement = document.getElementById('terms-agreement');

        // REMOVED: termsToggle check - no longer needed
        if (!loginBtn || !studentName || !studentClass || !termsContent || !termsAgreement) {
            console.error('Login form elements not found');
            console.log('Found elements:', {
                loginBtn: !!loginBtn,
                studentName: !!studentName,
                studentClass: !!studentClass,
                termsContent: !!termsContent,
                termsAgreement: !!termsAgreement
            });
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

        // REMOVED: Terms toggle functionality - no longer needed

        // Terms agreement checkbox
        termsAgreement.addEventListener('change', handleTermsAgreement);

        // Form validation on input changes
        [studentName, studentClass, termsAgreement].forEach(input => {
            input.addEventListener('change', validateLoginForm);
            input.addEventListener('input', validateLoginForm);
        });

        // Initial validation
        validateLoginForm();

        console.log('✅ Enhanced login form with terms agreement initialized');
        return true;
    } catch (error) {
        console.error('❌ Failed to setup login form:', error);
        return false;
    }
}

/**
 * Handle terms toggle (expand/collapse)
 */
function handleTermsToggle() {
    try {
        const termsToggle = document.getElementById('terms-toggle');
        const termsContent = document.getElementById('terms-content');

        if (!termsToggle || !termsContent) return;

        const isExpanded = termsContent.style.display !== 'none';

        if (isExpanded) {
            // Collapse terms
            termsContent.style.display = 'none';
            termsContent.classList.remove('expanded');
            termsToggle.textContent = '📖 Покажи условията';
            termsToggle.classList.remove('expanded');
        } else {
            // Expand terms
            termsContent.style.display = 'block';
            termsContent.classList.add('expanded');
            termsToggle.textContent = '📖 Скрий условията';
            termsToggle.classList.add('expanded');

            // Scroll terms into view
            setTimeout(() => {
                termsContent.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }, 100);
        }

        console.log(`📋 Terms ${isExpanded ? 'collapsed' : 'expanded'}`);
    } catch (error) {
        console.error('❌ Error handling terms toggle:', error);
    }
}

/**
 * Handle terms agreement checkbox change
 */
function handleTermsAgreement() {
    try {
        const termsAgreement = document.getElementById('terms-agreement');
        const isAgreed = termsAgreement?.checked;

        console.log(`📋 Terms agreement: ${isAgreed ? 'accepted' : 'declined'}`);

        // Validate form after agreement change
        validateLoginForm();

        // REMOVED: Auto-collapse logic - terms are always visible now

    } catch (error) {
        console.error('❌ Error handling terms agreement:', error);
    }
}

/**
 * Validate login form (enhanced with terms validation)
 */
function validateLoginForm() {
    try {
        const studentName = document.getElementById('student-name');
        const studentClass = document.getElementById('student-class');
        const termsAgreement = document.getElementById('terms-agreement');
        const loginBtn = document.getElementById('login-btn');

        if (!studentName || !studentClass || !termsAgreement || !loginBtn) {
            return false;
        }

        const name = studentName.value.trim();
        const selectedClass = studentClass.value;
        const isAgreed = termsAgreement.checked;

        // Validation criteria
        const isNameValid = name.length >= 3;
        const isClassValid = selectedClass !== '';
        const isTermsAccepted = isAgreed;

        const isFormValid = isNameValid && isClassValid && isTermsAccepted;

        // Update button state
        loginBtn.disabled = !isFormValid;

        // Update button text based on validation
        if (!isTermsAccepted) {
            loginBtn.textContent = '📋 Моля приемете условията';
        } else if (!isNameValid || !isClassValid) {
            loginBtn.textContent = '📝 Попълнете данните';
        } else {
            loginBtn.textContent = '🚀 Влез в изпита';
        }

        return isFormValid;

    } catch (error) {
        console.error('❌ Error validating login form:', error);
        return false;
    }
}

/**
 * Handle login button click (enhanced with terms validation)
 */
export function handleLogin() {
    try {
        const name = document.getElementById('student-name').value.trim();
        const studentClass = document.getElementById('student-class').value;
        const termsAgreement = document.getElementById('terms-agreement').checked;

        // Enhanced validation including terms
        if (!validateLoginInput(name, studentClass, termsAgreement)) {
            return;
        }

        // Show loading state
        showLoginStatus('Влизане в изпита...', 'info');
        setLoginButtonState(true); // Disable button

        // Store student info in global state
        window.ExamApp.studentName = name;
        window.ExamApp.studentClass = studentClass;
        window.ExamApp.termsAccepted = true;
        window.ExamApp.termsAcceptedAt = Date.now();

        // Send login request via WebSocket
        if (window.ExamApp.socket && window.ExamApp.socket.connected) {
            window.ExamApp.socket.emit('student-join', {
                studentName: name,
                studentClass: studentClass,
                termsAccepted: true,
                termsAcceptedAt: window.ExamApp.termsAcceptedAt
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
 * Validate login input (enhanced with terms validation)
 */
function validateLoginInput(name, studentClass, termsAccepted) {
    if (!name || !studentClass) {
        showLoginStatus('Моля въведете име и изберете клас', 'error');
        return false;
    }

    if (!termsAccepted) {
        showLoginStatus('Моля приемете условията на изпита', 'error');
        // Auto-expand terms if not accepted
        const termsContent = document.getElementById('terms-content');
        const termsToggle = document.getElementById('terms-toggle');
        if (termsContent && termsToggle && termsContent.style.display === 'none') {
            handleTermsToggle();
        }
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

            if (disabled) {
                loginBtn.textContent = 'Влизане...';
            } else {
                // Reset to appropriate text based on validation
                validateLoginForm();
            }
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
        window.ExamApp.termsAccepted = false;
        window.ExamApp.termsAcceptedAt = null;
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
        const termsAgreement = document.getElementById('terms-agreement');
        const statusEl = document.getElementById('login-status');

        if (studentName) studentName.value = '';
        if (studentClass) studentClass.value = '';
        if (termsAgreement) termsAgreement.checked = false;
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.className = 'status-message';
        }

        setLoginButtonState(false);
        validateLoginForm();

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
        window.ExamApp.termsAccepted = false;
        window.ExamApp.termsAcceptedAt = null;

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
        examStartTime: window.ExamApp.examStartTime,
        termsAccepted: window.ExamApp.termsAccepted,
        termsAcceptedAt: window.ExamApp.termsAcceptedAt
    };
}

/**
 * Get terms acceptance info (for server logging)
 */
export function getTermsAcceptanceInfo() {
    return {
        accepted: window.ExamApp.termsAccepted || false,
        acceptedAt: window.ExamApp.termsAcceptedAt || null,
        timestamp: Date.now()
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
        const termsCheckbox = document.getElementById('terms-agreement');

        if (nameInput) nameInput.value = name;
        if (classSelect) classSelect.value = studentClass;
        if (termsCheckbox) termsCheckbox.checked = true;

        // Trigger validation
        validateLoginForm();

        console.log(`🤖 Auto-filled login form: ${name} (${studentClass})`);
    } catch (error) {
        console.error('❌ Failed to auto-fill login form:', error);
    }
}