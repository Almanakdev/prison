@echo off
REM ============================================================
REM  Black Bull Prison - push to GitHub
REM  Double-click this file to commit and upload your changes.
REM ============================================================

cd /d "%~dp0"

echo.
echo === Black Bull Prison : uploading to GitHub ===
echo Repo: https://github.com/Almanakdev/prison
echo.

git add -A

REM commit (won't fail the script if there's nothing to commit)
git commit -m "Update Black Bull Prison" || echo (nothing new to commit)

echo.
echo Pushing to origin/main...
git push origin main

echo.
echo === Done. If it asked for a password, use a GitHub Personal Access Token. ===
pause
