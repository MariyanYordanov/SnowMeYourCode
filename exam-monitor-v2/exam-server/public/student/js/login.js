export function setupLoginForm() {
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

        loginBtn.addEventListener('click', handleLogin);

        [studentName, studentClass].forEach(input => {
            input.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    handleLogin();
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

export function handleLogin() {
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

        window.ExamApp.studentName = name;
        window.ExamApp.studentClass = studentClass;
        window.ExamApp.termsAccepted = termsAccepted;
        window.ExamApp.termsAcceptedAt = Date.now();

        if (window.ExamApp.socket && window.ExamApp.socket.connected) {
            window.ExamApp.socket.emit('student-join', {
                studentName: name,
                studentClass: studentClass,
                termsAccepted: termsAccepted,
                termsAcceptedAt: window.ExamApp.termsAcceptedAt
            });
        } else {
            showLoginStatus('Няма връзка със сървъра', 'error');
            setLoginButtonState(false);
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginStatus('Грешка при влизане', 'error');
        setLoginButtonState(false);
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

export function handleLoginSuccess(data) {
    try {
        console.log('Login successful:', data);

        window.ExamApp.sessionId = data.sessionId;
        window.ExamApp.examStartTime = data.examStartTime || Date.now();
        window.ExamApp.isLoggedIn = true;

        showLoginStatus('Успешен вход! Стартиране на изпита...', 'success');

        localStorage.setItem('examSession', JSON.stringify({
            sessionId: data.sessionId,
            studentName: window.ExamApp.studentName,
            studentClass: window.ExamApp.studentClass,
            examStartTime: window.ExamApp.examStartTime,
            examEndTime: data.examEndTime
        }));

        setTimeout(() => {
            if (window.startExam) {
                window.startExam(data);
            }
        }, 1000);

    } catch (error) {
        console.error('Error handling login success:', error);
        showLoginStatus('Грешка при стартиране на изпита', 'error');
    }
}

export function handleLoginError(error) {
    console.error('Login error:', error);

    const errorMessage = error.message || error.error || 'Грешка при влизане';
    showLoginStatus(errorMessage, 'error');

    setLoginButtonState(false);
}

export function handleSessionRestore(sessionData) {
    try {
        console.log('Restoring session:', sessionData);

        window.ExamApp.studentName = sessionData.studentName;
        window.ExamApp.studentClass = sessionData.studentClass;
        window.ExamApp.sessionId = sessionData.sessionId;
        window.ExamApp.examStartTime = sessionData.examStartTime;
        window.ExamApp.isLoggedIn = true;

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

export function resetLoginState() {
    try {
        window.ExamApp.studentName = null;
        window.ExamApp.studentClass = null;
        window.ExamApp.sessionId = null;
        window.ExamApp.examStartTime = null;
        window.ExamApp.termsAccepted = false;
        window.ExamApp.termsAcceptedAt = null;

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

export function getTermsAcceptanceInfo() {
    return {
        accepted: window.ExamApp.termsAccepted || false,
        acceptedAt: window.ExamApp.termsAcceptedAt || null,
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