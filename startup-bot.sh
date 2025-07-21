#!/bin/bash

# Change to the bot directory
cd /home/drsauce/discord-platoon-bot

# Pull latest changes
git pull

# Wait 10 seconds for any updates to settle
echo "Waiting 10 seconds for updates..."
sleep 10

# Start the bot with PM2
pm2 start index.js

# Keep the terminal open without creating a new shell
read -p "Press Enter to close this window..." 