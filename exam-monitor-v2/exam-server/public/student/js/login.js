export function setupTermsAgreement() {
    try {
        const termsAgreement = document.getElementById('terms-agreement');
        const continueBtn = document.getElementById('continue-to-login-btn');

        if (!termsAgreement || !continueBtn) {
            console.error('Terms agreement elements not found');
            return false;
        }

        // Enable/disable continue button based on checkbox
        termsAgreement.addEventListener('change', () => {
            continueBtn.disabled = !termsAgreement.checked;
        });

        // Handle transition to login screen
        continueBtn.addEventListener('click', () => {
            // Hide terms screen
            const termsComponent = document.getElementById('terms-component');
            if (termsComponent) termsComponent.style.display = 'none';

            // Show login screen
            const loginComponent = document.getElementById('login-component');
            if (loginComponent) loginComponent.style.display = 'block';
        });

        console.log('Terms agreement initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to setup terms agreement:', error);
        return false;
    }
}

export function setupLoginForm(examApp) {
    try {
        const loginBtn = document.getElementById('login-btn');
        const studentName = document.getElementById('student-name');
        const studentClass = document.getElementById('student-class');

        if (!loginBtn || !studentName || !studentClass) {
            console.error('Required form elements not found');
            return false;
        }

        loginBtn.addEventListener('click', () => handleLogin(examApp));

        // Setup cascading dropdown - when class changes, load students for that class
        studentClass.addEventListener('change', async () => {
            const selectedClass = studentClass.value;
            await loadStudentsForClass(selectedClass);
            validateLoginForm();
        });

        studentName.addEventListener('change', validateLoginForm);

        // Handle enter key on name select
        studentName.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                handleLogin(examApp);
            }
        });

        validateLoginForm();

        console.log('Login form initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to setup login form:', error);
        return false;
    }
}

// Load students for a specific class from server
async function loadStudentsForClass(selectedClass) {
    const studentNameSelect = document.getElementById('student-name');

    if (!selectedClass) {
        studentNameSelect.innerHTML = '<option value="">-- First select a class --</option>';
        studentNameSelect.disabled = true;
        return;
    }

    try {
        studentNameSelect.innerHTML = '<option value="">Loading students...</option>';
        studentNameSelect.disabled = true;

        const response = await fetch(`/api/students/${encodeURIComponent(selectedClass)}`);
        const data = await response.json();

        if (data.success && data.students && data.students.length > 0) {
            studentNameSelect.innerHTML = '<option value="">Select Your Name</option>';
            data.students.forEach(student => {
                const option = document.createElement('option');
                option.value = student;
                option.textContent = student;
                studentNameSelect.appendChild(option);
            });
            studentNameSelect.disabled = false;
        } else {
            studentNameSelect.innerHTML = '<option value="">No students found</option>';
            studentNameSelect.disabled = true;
        }
    } catch (error) {
        console.error('Failed to load students:', error);
        studentNameSelect.innerHTML = '<option value="">Error loading students</option>';
        studentNameSelect.disabled = true;
    }
}

function validateLoginForm() {
    try {
        const studentName = document.getElementById('student-name');
        const studentClass = document.getElementById('student-class');
        const loginBtn = document.getElementById('login-btn');

        if (!studentName || !studentClass || !loginBtn) {
            return false;
        }

        const name = studentName.value;
        const selectedClass = studentClass.value;

        const isNameValid = name && name !== '';
        const isClassValid = selectedClass && selectedClass !== '';

        const isFormValid = isNameValid && isClassValid;

        loginBtn.disabled = !isFormValid;

        if (!isClassValid) {
            loginBtn.textContent = 'Select a class';
        } else if (!isNameValid) {
            loginBtn.textContent = 'Select a student';
        } else {
            loginBtn.textContent = 'Start Exam';
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

        if (!validateLoginInput(name, studentClass)) {
            return;
        }

        showLoginStatus('Logging in...', 'info');
        setLoginButtonState(true);

        examApp.studentName = name;
        examApp.studentClass = studentClass;
        examApp.termsAccepted = true;
        examApp.termsAcceptedAt = Date.now();

        // ПЪРВО: HTTP login за express session
        try {
            console.log('Attempting HTTP login...', { name, studentClass });
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

            console.log('HTTP Response:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('HTTP Error:', response.status, errorText);
                handleLoginError(examApp, `Server error: ${response.status} - ${errorText.substring(0, 100)}`);
                return;
            }

            const result = await response.json();
            console.log('Login result:', result);

            if (!result.success) {
                console.error('Login failed:', result.message);
                handleLoginError(examApp, result.message || 'Login error');
                return;
            }

            handleLoginSuccess(examApp, result);

        } catch (error) {
            console.error('HTTP login error:', error);
            handleLoginError(examApp, 'Server connection error');
        }

    } catch (error) {
        console.error('Login error:', error);
        handleLoginError(examApp, 'Login error');
    }
}

function validateLoginInput(name, studentClass) {
    if (!name || !studentClass) {
        showLoginStatus('Please select a class and student', 'error');
        return false;
    }

    const validClasses = ['11А', '11Б', '12А', '12Б'];
    if (!validClasses.includes(studentClass)) {
        showLoginStatus('Invalid class', 'error');
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

        // CRITICAL: Send student-join event to establish socket.studentInfo on server
        // This is required for chat system and other socket-based features
        if (examApp.socket && examApp.socket.connected) {
            console.log('[LOGIN] Sending student-join event to server');
            examApp.socket.emit('student-join', {
                studentName: examApp.studentName,
                studentClass: examApp.studentClass
            });
        }

        showLoginStatus('Login successful! Starting exam...', 'success');


        setTimeout(() => {
            if (examApp.startExam) {
                examApp.startExam(data);
            }
        }, 1000);

    } catch (error) {
        console.error('Error handling login success:', error);
        showLoginStatus('Error starting exam', 'error');
    }
}

export function handleLoginError(examApp, error) {
    console.error('Login error:', error);

    const errorMessage = error.message || error.error || 'Login error';
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
            '.student-class': studentClass
        };

        for (const [selector, value] of Object.entries(elements)) {
            const el = document.querySelector(selector);
            if (el) {
                el.textContent = value || 'Unknown';
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
        const statusEl = document.getElementById('login-status');

        if (studentName) studentName.value = '';
        if (studentClass) studentClass.value = '';
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

        const termsComponent = document.getElementById('terms-component');
        const loginComponent = document.getElementById('login-component');
        const examComponent = document.getElementById('exam-component');

        if (termsComponent) termsComponent.style.display = 'flex';
        if (loginComponent) loginComponent.style.display = 'none';
        if (examComponent) examComponent.style.display = 'none';

        // Reset terms checkbox
        const termsAgreement = document.getElementById('terms-agreement');
        if (termsAgreement) termsAgreement.checked = false;

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