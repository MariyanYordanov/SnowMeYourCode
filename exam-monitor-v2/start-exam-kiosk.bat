@echo off
REM ======================================================================
REM  EXAM MONITOR v2.0 - KIOSK MODE STARTUP SCRIPT (Windows)
REM  This script launches Chrome in full kiosk mode for maximum security
REM ======================================================================

setlocal enabledelayedexpansion

echo ========================================
echo    EXAM MONITOR v2.0 - KIOSK MODE
echo ========================================
echo.

REM Configuration
set EXAM_SERVER_URL=http://localhost:8080/student
set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
set CHROME_USER_DATA=%TEMP%\exam-chrome-profile-%RANDOM%

REM Check if Chrome exists
if not exist "%CHROME_PATH%" (
    echo [ERROR] Chrome not found at: %CHROME_PATH%
    echo Please install Google Chrome
    pause
    exit /b 1
)
echo [OK] Chrome found: %CHROME_PATH%

REM Check if exam server is running
echo Checking if exam server is running...
curl -s --connect-timeout 2 http://localhost:8080 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Exam server is NOT running!
    echo Please start the server first:
    echo    cd exam-monitor-v2
    echo    npm run dev
    pause
    exit /b 1
)
echo [OK] Exam server is running

REM Kill existing Chrome processes
echo Closing existing Chrome instances...
taskkill /F /IM chrome.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo [OK] Chrome processes closed

REM Start Chrome in kiosk mode
echo ========================================
echo Starting KIOSK MODE...
echo ========================================
echo.
echo INSTRUCTIONS:
echo   1. Browser will open in FULLSCREEN automatically
echo   2. Login with your name and class
echo   3. Accept the exam terms
echo   4. Click 'Enter Fullscreen' button
echo   5. Exam will start - DO NOT exit fullscreen!
echo.
echo WARNING: To exit KIOSK mode: Press Alt+F4
echo.
echo Starting in 3 seconds...
timeout /t 3 /nobreak >nul

start "" "%CHROME_PATH%" ^
    --kiosk ^
    --fullscreen ^
    --disable-pinch ^
    --overscroll-history-navigation=0 ^
    --disable-features=TranslateUI ^
    --disable-blink-features=OverscrollCustomization ^
    --disable-infobars ^
    --disable-session-crashed-bubble ^
    --disable-restore-session-state ^
    --disable-component-extensions-with-background-pages ^
    --disable-background-networking ^
    --disable-sync ^
    --disable-default-apps ^
    --no-first-run ^
    --no-default-browser-check ^
    --disable-hang-monitor ^
    --disable-prompt-on-repost ^
    --disable-client-side-phishing-detection ^
    --disable-offer-store-unmasked-wallet-cards ^
    --disable-offer-upload-credit-cards ^
    --disable-speech-api ^
    --disable-file-system ^
    --disable-presentation-api ^
    --disable-permissions-api ^
    --user-data-dir="%CHROME_USER_DATA%" ^
    "%EXAM_SERVER_URL%"

echo [OK] Chrome started in KIOSK mode
echo.
echo Press any key to cleanup and exit...
pause >nul

REM Cleanup
taskkill /F /IM chrome.exe >nul 2>&1
rd /s /q "%CHROME_USER_DATA%" >nul 2>&1

echo ========================================
echo Exam session ended
echo ========================================
