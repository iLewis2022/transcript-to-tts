@echo off
echo Installing TTS Protocol Handler...

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with administrator privileges...
) else (
    echo ERROR: This script requires administrator privileges.
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Install the protocol handler
echo Installing tts:// protocol handler...
regedit /s "%~dp0tts-protocol.reg"

if %errorLevel% == 0 (
    echo ✅ TTS protocol handler installed successfully!
    echo You can now use tts://launch links to start the TTS processor.
) else (
    echo ❌ Failed to install protocol handler.
)

echo.
echo Press any key to exit...
pause >nul 