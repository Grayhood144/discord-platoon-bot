#!/bin/bash

# Wait for network to be available
sleep 30

# Change to the bot directory
cd /home/pi/discord-platoon-bot/

# Pull latest changes
git pull

# Start the bot with PM2
pm2 start 