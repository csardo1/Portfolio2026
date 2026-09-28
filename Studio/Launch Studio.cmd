@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install Node.js 24 LTS, then launch Studio again.
  pause
  exit /b 1
)
node "%~dp0app\scripts\launch.mjs"
if errorlevel 1 pause
