@echo off
REM ======================================================================
REM  STUDENT EXAM LAUNCHER - JUST DOUBLE-CLICK!
REM  This file starts Chrome in exam mode automatically
REM ======================================================================

setlocal

REM ⚠️ IMPORTANT: Edit this line with your teacher's IP address!
set TEACHER_IP=192.168.2.1

echo ========================================
echo    STARTING EXAM - PLEASE WAIT...
echo ========================================
echo.

REM Check if Chrome exists
set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
if not exist "%CHROME_PATH%" (
    echo [ERROR] Chrome not found!
    echo Please install Google Chrome first.
    echo.
    pause
    exit /b 1
)

REM Check if teacher server is reachable
echo Connecting to exam server...
curl -s --connect-timeout 3 http://%TEACHER_IP%:8080 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Cannot connect to exam server!
    echo Please check:
    echo   1. Are you connected to the exam Wi-Fi?
    echo   2. Is the teacher's computer turned on?
    echo   3. Is the IP address correct? Current: %TEACHER_IP%
    echo.
    pause
    exit /b 1
)

echo [OK] Connected to exam server!
echo.

REM Close existing Chrome
taskkill /F /IM chrome.exe >nul 2>&1
timeout /t 1 /nobreak >nul

REM Start Chrome in exam mode
echo Starting Chrome in exam mode...
echo.
echo INSTRUCTIONS:
echo   1. Enter your NAME and CLASS
echo   2. Accept the exam terms (checkbox)
echo   3. Click 'Enter Fullscreen' button
echo   4. DO NOT exit fullscreen during exam!
echo.
echo WARNING: To exit: Press Alt+F4 AFTER exam is finished
echo.

start "" "%CHROME_PATH%" ^
    --kiosk ^
    --fullscreen ^
    --disable-pinch ^
    --overscroll-history-navigation=0 ^
    --disable-blink-features=OverscrollCustomization ^
    --disable-infobars ^
    --no-first-run ^
    --no-default-browser-check ^
    "http://%TEACHER_IP%:8080/student"

echo [OK] Exam started successfully!
echo.
echo Good luck!
timeout /t 3 /nobreak >nul
