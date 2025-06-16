@echo off
echo Starting Discord Platoon Bot with PM2...

REM Check if PM2 is installed
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo PM2 is not installed. Installing PM2 globally...
    npm install -g pm2
)

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

REM Start the bot with PM2
pm2 start ecosystem.config.js

echo Bot started! Use 'pm2 status' to check status
echo Use 'pm2 logs discord-platoon-bot' to view logs
echo Use 'pm2 stop discord-platoon-bot' to stop the bot
echo Use 'pm2 restart discord-platoon-bot' to restart the bot
pause 