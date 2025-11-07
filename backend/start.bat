@echo off
echo ========================================
echo LinkedIn Scraper Backend Server
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting server on http://localhost:4000
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

node app.js
