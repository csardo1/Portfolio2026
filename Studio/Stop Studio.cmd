@echo off
cd /d "%~dp0app"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required to stop the local Studio server.
  pause
  exit /b 1
)
node "%~dp0..\Portfolio\Site\scripts\stop-local.mjs" studio
if errorlevel 1 (
  pause
  exit /b 1
)
pause
