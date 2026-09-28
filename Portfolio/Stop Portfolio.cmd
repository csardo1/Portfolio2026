@echo off
cd /d "%~dp0Site"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required to stop the local portfolio server.
  pause
  exit /b 1
)
node "%~dp0Site\scripts\stop-local.mjs" portfolio
if errorlevel 1 (
  pause
  exit /b 1
)
pause
