#!/bin/bash

# Change to the bot directory
cd /home/drsauce/discord-platoon-bot

# Stop any running PM2 processes
echo "Stopping any running bot processes..."
pm2 stop all
pm2 delete all

# Pull latest changes
echo "Pulling latest changes..."
git pull

# Wait 10 seconds for any updates to settle
echo "Waiting 10 seconds for updates..."
sleep 10

# Start the bot with PM2
echo "Starting bot..."
pm2 start index.js

# Keep the terminal open without creating a new shell
read -p "Press Enter to close this window..." 