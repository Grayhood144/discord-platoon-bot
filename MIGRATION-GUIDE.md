# Migration Guide: Moving to Raspberry Pi

## Why Migrate to Raspberry Pi?

A Raspberry Pi offers several advantages for hosting your Discord bot:
- ✅ One-time hardware cost (no monthly fees)
- ✅ Full control over your hardware
- ✅ No usage restrictions
- ✅ Great learning opportunity
- ✅ Can run multiple services

## Setting Up Raspberry Pi

### Step 1: Initial Setup
1. Download Raspberry Pi Imager from [raspberrypi.com/software](https://www.raspberrypi.com/software/)
2. Insert your SD card
3. Open Raspberry Pi Imager
4. Choose OS: Raspberry Pi OS (64-bit)
5. Configure:
   - Enable SSH
   - Set username and password
   - Configure WiFi (if not using ethernet)
   - Set hostname (optional)
6. Write to SD card

### Step 2: First Boot
1. Insert SD card into Raspberry Pi
2. Connect power and ethernet (if not using WiFi)
3. Wait 2-3 minutes for first boot
4. Find your Pi's IP address:
   - Check your router's connected devices
   - Use network scanner
   - Try connecting with hostname.local

### Step 3: Connect and Update
1. **SSH into your Pi**:
   ```bash
   ssh username@raspberry-pi-ip
   ```

2. **Update system**:
   ```bash
   sudo apt update
   sudo apt upgrade -y
   ```

3. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

4. **Install PM2**:
   ```bash
   sudo npm install -g pm2
   ```

### Step 4: Deploy Your Bot
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

### Step 5: Monitor Your Bot
```bash
pm2 status          # Check if bot is running
pm2 logs discord-platoon-bot  # View logs
pm2 restart discord-platoon-bot  # Restart if needed
```

## Raspberry Pi Benefits:
- **Cost**: One-time hardware cost (~$35-70)
- **Performance**: Sufficient for Discord bots
- **Control**: Complete hardware access
- **Learning**: Great Linux experience
- **Expandable**: Run other services

## Maintenance Tips

### Regular Updates
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
npm update

# Update PM2
sudo npm install -g pm2@latest
```

### Monitoring
- Use `pm2 monit` for real-time monitoring
- Check logs regularly with `pm2 logs`
- Set up monitoring alerts (optional)

### Backup
1. Back up your `.env` file
2. Use git for version control
3. Consider backing up the entire SD card

## Migration Checklist

### Before Migration:
- [ ] Order Raspberry Pi and accessories
- [ ] Download Raspberry Pi OS
- [ ] Backup your current bot data
- [ ] Test your bot locally
- [ ] Update your `.env` file
- [ ] Commit all changes to GitHub

### After Migration:
- [ ] Test all bot commands
- [ ] Verify role synchronization works
- [ ] Check deploy messages update correctly
- [ ] Monitor logs for any errors
- [ ] Set up automatic updates
- [ ] Configure UPS (optional)

## Troubleshooting

### Common Issues
1. **Bot not starting**
   - Check PM2 logs: `pm2 logs`
   - Verify Node.js version
   - Check file permissions

2. **Connection issues**
   - Test internet connection
   - Check DNS settings
   - Verify router configuration

3. **Performance issues**
   - Monitor CPU usage: `htop`
   - Check available memory
   - Monitor temperature: `vcgencmd measure_temp`

### Getting Help
1. Check Raspberry Pi documentation
2. Review PM2 documentation
3. Join Raspberry Pi forums
4. Open GitHub issues 