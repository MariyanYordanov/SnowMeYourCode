# Exam Monitor v2.0 - Project Documentation

## Project Idea and Purpose
The "Exam Monitor v2.0" project is a JavaScript-based exam monitoring system with an anti-cheat mechanism. Its core idea is to enforce a fullscreen mode during exams and detect any attempts to leave the window's focus. Upon detection of a violation, the system is designed to terminate the exam without the possibility of re-entry, ensuring exam integrity.

## Approach to Problem Solving
The project addresses identified issues by:
1.  **Centralizing Server-Side Control:** Shifting critical functions, such as forced exam termination, from the client to the server to prevent client-side manipulation.
2.  **Improving Client-Server Communication:** Ensuring more detailed violation information is sent from the client to the server.
3.  **Enhancing User Experience on Violations:** Redirecting students to an informative page if the window cannot be closed directly.
4.  **Reviewing and Removing Potential Vulnerabilities:** Evaluating functions like `emergencyResetViolations` for security implications.
5.  **Improving Code Quality:** Minimizing reliance on global objects and externalizing hardcoded values into configuration files.

## Identified Issues (as of current documentation)
1.  **Client-side Exam Termination:** The `anticheat.js` script terminates the exam on the client side, which is susceptible to manipulation, and `window.close()` can be blocked by browsers.
2.  **Lack of Server-side Forced Termination on Violation:** `WebSocketHandler.mjs` logs suspicious activity but does not initiate a forced server-side termination of the exam.
3.  **Global `window.ExamApp` Object:** Reliance on a global object for application state leads to maintainability and testing challenges.
4.  **Hardcoded Values:** Exam duration and grace period are hardcoded in `SessionManager.mjs`, limiting configuration flexibility.
5.  **`emergencyResetViolations` Function:** The presence of this function in `anticheat.js` suggests a potential backdoor or debugging function, posing a security risk if not properly managed.

## Implemented Changes (as of current documentation)
*   **Centralized Forced Exam Termination on the Server:** Modified `modules/WebSocketHandler.mjs` to trigger server-side exam termination upon receiving a `suspicious-activity` event.
*   **Improved Client-Server Communication for Violations & Enhanced Client-side `terminateExamDirectly` (Fallback):**
    *   `public/student/js/anticheat.js` was modified to make `terminateExamDirectly` a no-op on the client, logging a warning instead. Direct calls to `terminateExamDirectly` from `handleFullscreenViolation` and `handleVisibilityChange` were removed.
    *   `public/student/js/socket.js` was updated to use `showViolationExitDialog` from `dialogs.js` to display a message to the student and then call `window.exitExam` upon `forceDisconnect`.
*   **Removed `emergencyResetViolations`:** The `emergencyResetViolations` function was removed from `public/student/js/anticheat.js`.
*   **Hardcoded Values (Configuration):** `modules/SessionManager.mjs` now reads `exam.duration` and `security.sessionSecurity.gracePeriod` from `config/exam-config.json`.
*   **General Code Quality and Consistency Improvements (Minimizing `window.ExamApp` usage):** Several client-side JavaScript files were refactored to minimize direct references to the global `window.ExamApp` object by introducing local `examApp` variables within functions:
    *   `public/student/js/login.js`:
        - Modified `setupLoginForm`, `handleLogin`, `handleLoginSuccess`, `handleLoginError`, `handleSessionRestore`, `resetLoginState`, `getLoginState`, `getTermsAcceptanceInfo` to accept `examApp` as an argument.
        - Updated event listeners in `setupLoginForm` to pass `examApp` to `handleLogin`.
        - Modified `handleLogin` to pass `examApp` to `handleLoginSuccess` and `handleLoginError`.
    *   `public/student/js/main.js`:
        - Updated calls to `setupLoginForm()` and `setupSocket()` to `setupLoginForm(examApp)` and `setupSocket(examApp)`.
        - Adjusted assignments to `window.handleLogin`, `window.handleLoginSuccess`, `window.handleSessionRestore`, `window.handleLoginError` in `setupWindowFunctions` to correctly pass `examApp` to the imported functions.
        - Added `resetLoginState`, `getLoginState`, `getTermsAcceptanceInfo` to `examApp` in `setupWindowFunctions`.
    *   `public/student/js/timer.js`
    *   `public/student/js/anticheat.js`
    *   `public/student/js/socket.js`
    *   `public/student/js/editor.js`
*   **Addressed `iframe` Sandbox Warning:** The `sandbox` attribute of the `<iframe>` element in `public/student/index.html` was expanded to `allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock allow-downloads allow-modals` to resolve a console warning and ensure necessary functionality while maintaining security.
  - Admin Account: Username: admin, Password: exam-admin-2024
  - Teacher Account: Username: teacher, Password: teacher-pass-2024