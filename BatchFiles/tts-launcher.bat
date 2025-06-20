@echo off
echo Starting TTS Campaign Processor...
cd /d "C:\aiprojects\transcript-to-TTS"

REM Start the server in background
echo Starting server...
start /min npm run dev

REM Wait for server to start (5 seconds should be enough)
echo Waiting for server to start...
timeout /t 5 /nobreak >nul

REM Open browser
echo Opening browser...
start "" "http://localhost:3000"

echo TTS Campaign Processor launched!