#!/bin/bash

# Make sure we're running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with sudo"
    sudo "$0" "$@"
    exit $?
fi

# Change to the bot directory
cd /home/drsauce/discord-platoon-bot

# Ensure script and directory have correct permissions
chown -R drsauce:drsauce .
chmod -R 755 .
chmod +x startup-bot.sh

# Stop any running PM2 processes
echo "Stopping any running bot processes..."
sudo -u drsauce pm2 stop all
sudo -u drsauce pm2 delete all

# Force pull latest changes
echo "Forcing latest changes..."
git fetch --all
git reset --hard origin/master

# Ensure new files have correct permissions
chown -R drsauce:drsauce .
chmod -R 755 .
chmod +x startup-bot.sh

# Wait 10 seconds for any updates to settle
echo "Waiting 10 seconds for updates..."
sleep 10

# Start the bot with PM2 as drsauce user
echo "Starting bot..."
sudo -u drsauce pm2 start index.js --force

# Keep the terminal open without creating a new shell
read -p "Press Enter to close this window..." 