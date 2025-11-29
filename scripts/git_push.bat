@echo off
REM Usage: scripts\git_push.bat <remote-url> [commit-message]
SET "REMOTE=%~1"
SET "MSG=%~2"
IF "%REMOTE%"=="" (
  echo Error: remote URL required.
  echo Usage: %~nx0 <remote-url> [commit-message]
  exit /b 1
)
IF "%MSG%"=="" SET "MSG=Auto commit from local machine"

git init >nul 2>&1
git add .
git commit -m "%MSG%" || echo No changes to commit.
git branch -M main >nul 2>&1
git remote remove origin >nul 2>&1
git remote add origin %REMOTE%
git push -u origin main

echo.
echo ✅ Pushed to %REMOTE%
