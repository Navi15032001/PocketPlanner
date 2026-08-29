@echo off
echo ===================================================
echo 🚀 Pushing PocketPlanner Updates to Live App...
echo ===================================================
cd /d "%~dp0"

echo 1. Staging all changed files...
"scratch\git\cmd\git.exe" add .

echo 2. Committing changes...
set /p commit_msg="Enter update note (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Updated PocketPlanner features and UI

"scratch\git\cmd\git.exe" commit -m "%commit_msg%"

echo 3. Pushing to GitHub (Auto-deploys to Netlify and Render)...
"scratch\git\cmd\git.exe" push origin main

echo.
echo ===================================================
echo ✅ SUCCESS! Your live app will update in ~10 seconds.
echo ===================================================
pause
