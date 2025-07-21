#!/bin/bash

# Change to the bot directory
cd /home/drsauce/discord-platoon-bot

# Fix all permissions first
sudo chown -R drsauce:drsauce .
sudo chmod -R 755 .

# Stop any running PM2 processes
echo "Stopping any running bot processes..."
pm2 stop all
pm2 delete all

# Force pull latest changes
echo "Forcing latest changes..."
sudo git fetch --all
sudo git reset --hard origin/master

# Fix permissions again after git
sudo chown -R drsauce:drsauce .
sudo chmod -R 755 .

# Start the bot with PM2
echo "Starting bot..."
pm2 start index.js --force

# Keep running but don't need terminal interaction
tail -f /dev/null 