export function setupLoginForm(examApp) {
    try {
        const loginBtn = document.getElementById('login-btn');
        const studentName = document.getElementById('student-name');
        const studentClass = document.getElementById('student-class');
        const termsContent = document.querySelector('.terms-content');
        const termsAgreement = document.getElementById('terms-agreement');

        if (!loginBtn || !studentName || !studentClass) {
            console.error('Required form elements not found');
            return false;
        }

        if (!termsAgreement) {
            console.warn('Terms agreement checkbox not found, continuing without it');
        }

        loginBtn.addEventListener('click', () => handleLogin(examApp));

        [studentName, studentClass].forEach(input => {
            input.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    handleLogin(examApp);
                }
            });
        });

        if (termsAgreement) {
            termsAgreement.addEventListener('change', handleTermsAgreement);
            termsAgreement.addEventListener('change', validateLoginForm);
        }

        [studentName, studentClass].forEach(input => {
            input.addEventListener('change', validateLoginForm);
            input.addEventListener('input', validateLoginForm);
        });

        validateLoginForm();

        console.log('Login form initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to setup login form:', error);
        return false;
    }
}

function handleTermsAgreement() {
    try {
        const termsAgreement = document.getElementById('terms-agreement');
        const isAgreed = termsAgreement?.checked;

        console.log(`Terms agreement: ${isAgreed ? 'accepted' : 'declined'}`);
        validateLoginForm();

    } catch (error) {
        console.error('Error handling terms agreement:', error);
    }
}

function validateLoginForm() {
    try {
        const studentName = document.getElementById('student-name');
        const studentClass = document.getElementById('student-class');
        const termsAgreement = document.getElementById('terms-agreement');
        const loginBtn = document.getElementById('login-btn');

        if (!studentName || !studentClass || !loginBtn) {
            return false;
        }

        const name = studentName.value.trim();
        const selectedClass = studentClass.value;
        const isAgreed = termsAgreement ? termsAgreement.checked : true;

        const isNameValid = name.length >= 3;
        const isClassValid = selectedClass !== '';
        const isTermsAccepted = isAgreed;

        const isFormValid = isNameValid && isClassValid && isTermsAccepted;

        loginBtn.disabled = !isFormValid;

        if (!isTermsAccepted && termsAgreement) {
            loginBtn.textContent = 'Моля приемете условията';
        } else if (!isNameValid || !isClassValid) {
            loginBtn.textContent = 'Попълнете данните';
        } else {
            loginBtn.textContent = 'Влез в изпита';
        }

        return isFormValid;

    } catch (error) {
        console.error('Error validating login form:', error);
        return false;
    }
}

export async function handleLogin(examApp) {
    try {
        const name = document.getElementById('student-name').value.trim();
        const studentClass = document.getElementById('student-class').value;
        const termsAgreement = document.getElementById('terms-agreement');
        const termsAccepted = termsAgreement ? termsAgreement.checked : true;

        if (!validateLoginInput(name, studentClass, termsAccepted)) {
            return;
        }

        showLoginStatus('Влизане в изпита...', 'info');
        setLoginButtonState(true);

        examApp.studentName = name;
        examApp.studentClass = studentClass;
        examApp.termsAccepted = termsAccepted;
        examApp.termsAcceptedAt = Date.now();

        // ПЪРВО: HTTP login за express session
        try {
            const response = await fetch('/api/student-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    studentName: name,
                    studentClass: studentClass
                })
            });

            const result = await response.json();

            if (!result.success) {
                handleLoginError(examApp, result.message || 'Грешка при влизане');
                return;
            }

            // No need to emit 'student-join' here, HTTP login already handled session creation/restoration.
            // The WebSocket connection is already established and will be used for real-time updates.
            // Proceed directly to handling login success.
            handleLoginSuccess(examApp, result);

        } catch (error) {
            console.error('HTTP login error:', error);
            handleLoginError(examApp, 'Грешка при връзка със сървъра');
        }

    } catch (error) {
        console.error('Login error:', error);
        handleLoginError(examApp, 'Грешка при влизане');
    }
}

function validateLoginInput(name, studentClass, termsAccepted) {
    if (!name || !studentClass) {
        showLoginStatus('Моля въведете име и изберете клас', 'error');
        return false;
    }

    if (!termsAccepted) {
        showLoginStatus('Моля приемете условията на изпита', 'error');
        return false;
    }

    if (name.length < 3) {
        showLoginStatus('Името трябва да е поне 3 символа', 'error');
        return false;
    }

    const cyrillicPattern = /^[А-Яа-я\s]+$/;
    if (!cyrillicPattern.test(name)) {
        showLoginStatus('Името трябва да съдържа само български букви', 'error');
        return false;
    }

    const validClasses = ['11А', '11Б', '12А', '12Б'];
    if (!validClasses.includes(studentClass)) {
        showLoginStatus('Невалиден клас', 'error');
        return false;
    }

    return true;
}

function showLoginStatus(message, type = 'info') {
    const statusEl = document.getElementById('login-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;
        statusEl.style.display = 'block';
    }
}

function setLoginButtonState(disabled) {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.disabled = disabled;
        if (!disabled) {
            validateLoginForm();
        }
    }
}

export function handleLoginSuccess(examApp, data) {
    try {
        console.log('Login successful:', data);

        examApp.sessionId = data.sessionId;
        examApp.examStartTime = data.examStartTime || Date.now();
        examApp.isLoggedIn = true;
        console.log(`handleLoginSuccess: examApp.isLoggedIn set to true. Session ID: ${examApp.sessionId}`);

        showLoginStatus('Успешен вход! Стартиране на изпита...', 'success');

        localStorage.setItem('examSession', JSON.stringify({
            sessionId: data.sessionId,
            studentName: examApp.studentName,
            studentClass: examApp.studentClass,
            examStartTime: examApp.examStartTime,
            examEndTime: data.examEndTime
        }));

        setTimeout(() => {
            if (examApp.startExam) {
                examApp.startExam(data);
            }
        }, 1000);

    } catch (error) {
        console.error('Error handling login success:', error);
        showLoginStatus('Грешка при стартиране на изпита', 'error');
    }
}

export function handleLoginError(examApp, error) {
    console.error('Login error:', error);

    const errorMessage = error.message || error.error || 'Грешка при влизане';
    showLoginStatus(errorMessage, 'error');

    setLoginButtonState(false);
}

export function handleSessionRestore(examApp, sessionData) {
    try {
        console.log('Restoring session:', sessionData);

        examApp.studentName = sessionData.studentName;
        examApp.studentClass = sessionData.studentClass;
        examApp.sessionId = sessionData.sessionId;
        examApp.examStartTime = sessionData.examStartTime;
        examApp.isLoggedIn = true;

        setTimeout(() => {
            if (window.startExam) {
                window.startExam(sessionData);
            }
        }, 500);

    } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('examSession');
    }
}

export function updateStudentDisplay(studentName, studentClass, sessionId) {
    try {
        const elements = {
            '.student-name': studentName,
            '.student-class': studentClass,
            '.session-id': sessionId
        };

        for (const [selector, value] of Object.entries(elements)) {
            const el = document.querySelector(selector);
            if (el) {
                el.textContent = value || 'Неизвестен';
            }
        }

        console.log(`Student display updated: ${studentName} (${studentClass}) - ${sessionId}`);
    } catch (error) {
        console.error('Failed to update student display:', error);
    }
}

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

        console.log('Login form cleared');
    } catch (error) {
        console.error('Failed to clear login form:', error);
    }
}

export function resetLoginState(examApp) {
    try {
        examApp.studentName = null;
        examApp.studentClass = null;
        examApp.sessionId = null;
        examApp.examStartTime = null;
        examApp.termsAccepted = false;
        examApp.termsAcceptedAt = null;

        clearLoginForm();

        const loginContainer = document.getElementById('login-component');
        const examContainer = document.getElementById('exam-component');

        if (loginContainer) loginContainer.style.display = 'flex';
        if (examContainer) examContainer.style.display = 'none';

        console.log('Login state reset');
    } catch (error) {
        console.error('Failed to reset login state:', error);
    }
}

export function getLoginState(examApp) {
    return {
        studentName: examApp.studentName,
        studentClass: examApp.studentClass,
        sessionId: examApp.sessionId,
        isLoggedIn: examApp.isLoggedIn,
        examStartTime: examApp.examStartTime,
        termsAccepted: examApp.termsAccepted,
        termsAcceptedAt: examApp.termsAcceptedAt
    };
}

export function getTermsAcceptanceInfo(examApp) {
    return {
        accepted: examApp.termsAccepted || false,
        acceptedAt: examApp.termsAcceptedAt || null,
        timestamp: Date.now()
    };
}

export function formatStudentName(name) {
    if (!name || typeof name !== 'string') {
        return '';
    }

    return name
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

export function validateStudentClass(studentClass) {
    const validClasses = ['11А', '11Б', '12А', '12Б'];
    return validClasses.includes(studentClass);
}