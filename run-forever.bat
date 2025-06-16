@echo off
title Discord Platoon Bot - Running 24/7
echo Starting Discord Platoon Bot...
echo This will keep running and restart the bot if it crashes
echo Press Ctrl+C to stop

:loop
echo [%date% %time%] Starting bot...
node index.js
echo [%date% %time%] Bot stopped or crashed. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto loop 