@echo off
echo ============================================
echo  FAX Watcher Agent - Setup
echo ============================================
echo.

set AGENT_DIR=%~dp0
set NODE_PATH=node

echo Agent directory: %AGENT_DIR%
echo.

%NODE_PATH% --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found. Please install Node.js first.
    echo Download: https://nodejs.org
    pause
    exit /b 1
)

echo Node.js found:
%NODE_PATH% --version
echo.

echo --- SECURITY SETUP ---
echo The API key will be stored as a system environment variable.
echo.
set /p FAX_KEY="Enter your FAX_API_KEY: "
if "%FAX_KEY%"=="" (
    echo WARNING: No API key entered.
    echo You can set it later with: setx FAX_API_KEY "your-key" /M
) else (
    setx FAX_API_KEY "%FAX_KEY%" /M
    echo FAX_API_KEY has been set.
)

echo.
echo Creating scheduled task: FaxWatcherAgent
schtasks /create /tn "FaxWatcherAgent" /tr "\"%NODE_PATH%\" \"%AGENT_DIR%index.js\"" /sc minute /mo 5 /ru SYSTEM /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Task created successfully!
    echo   Name: FaxWatcherAgent
    echo   Schedule: Every 5 minutes
    echo   Script: %AGENT_DIR%index.js
    echo.
    echo IMPORTANT: Edit config.json to set watchFolder and apiUrl.
) else (
    echo.
    echo ERROR: Failed to create task. Try running as Administrator.
)

echo.
pause
