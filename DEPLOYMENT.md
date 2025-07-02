# Discord Bot Deployment Guide

## Raspberry Pi Deployment (Recommended)

### Why Raspberry Pi?
- **One-time cost**: No monthly fees
- **Full control**: Complete access to your hardware
- **Reliable**: Run 24/7 from your home
- **Easy to maintain**: Simple updates and monitoring
- **Great for Discord bots**: Perfect for small to medium bots

### Prerequisites
1. Raspberry Pi (3 or 4 recommended)
2. SD card with Raspberry Pi OS installed
3. Stable internet connection
4. Power supply
5. (Optional) Ethernet cable for better reliability

### Step 1: Initial Setup
1. Install Raspberry Pi OS using Raspberry Pi Imager
2. Enable SSH during installation
3. Configure WiFi (if not using ethernet)
4. Connect to your Pi via SSH

### Step 2: Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Step 3: Deploy Your Bot
1. **Clone your repository**:
   ```bash
   git clone https://github.com/yourusername/discord-platoon-bot.git
   cd discord-platoon-bot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   nano .env
   # Add: DISCORD_TOKEN=your_bot_token_here
   ```

4. **Start with PM2**:
   ```bash
   pm2 start ecosystem.config.js
   pm2 startup
   pm2 save
   ```

### Step 4: Monitor Your Bot
```bash
pm2 status          # Check if bot is running
pm2 logs discord-platoon-bot  # View logs
pm2 restart discord-platoon-bot  # Restart if needed
```

### Raspberry Pi Benefits:
- **Cost-effective**: One-time hardware cost
- **Full control**: Complete access to your system
- **Privacy**: Your data stays on your hardware
- **Learning**: Great for learning Linux and server management
- **Expandable**: Can run other services alongside your bot

### Important Notes

#### Environment Variables
- **NEVER** commit your `.env` file to GitHub
- Keep your bot token secure

#### Maintenance
1. Regularly update your system:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
2. Monitor your bot's logs:
   ```bash
   pm2 logs discord-platoon-bot
   ```
3. Set up automatic restarts if needed:
   ```bash
   pm2 startup
   pm2 save
   ```

#### Backup
1. Regularly backup your bot's data
2. Consider using git for version control
3. Keep a copy of your .env file in a secure location

---

## Troubleshooting

### Common Issues
1. **Bot not starting**: Check logs with `pm2 logs`
2. **Connection issues**: Verify internet connection
3. **Permission errors**: Check file permissions
4. **Memory issues**: Monitor with `pm2 monit`

### Getting Help
1. Check the troubleshooting section in `SETUP.md`
2. Review error logs in the `logs` directory
3. Open an issue on GitHub with detailed information
4. Include your Node.js version and Discord bot permissions 