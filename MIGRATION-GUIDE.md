# Migration Guide: Moving Away from Railway

## Why Migrate?

Railway's limitations during peak hours can be frustrating. Here are better alternatives that offer:
- ✅ No peak hour restrictions
- ✅ Better uptime reliability
- ✅ More generous free tiers
- ✅ Better performance

## Option 1: AWS Lightsail (Excellent Choice!) ⭐

### Why AWS Lightsail?
- **Very affordable**: Starting at $3.50/month for 512MB RAM
- **Reliable**: AWS infrastructure with 99.9% uptime
- **No peak hour restrictions**
- **Easy to use**: Simple dashboard, one-click deployments
- **Scalable**: Easy to upgrade as your bot grows
- **Great for Discord bots**: Perfect resource allocation

### Step 1: Create AWS Account
1. Go to [aws.amazon.com/lightsail](https://aws.amazon.com/lightsail)
2. Sign up for AWS account (requires credit card)
3. Navigate to Lightsail console

### Step 2: Create Instance
1. Click "Create instance"
2. Choose your options:
   - **Platform**: Linux/Unix
   - **Blueprint**: Ubuntu 22.04 LTS
   - **Instance plan**: $3.50/month (512MB RAM, 1 vCPU, 20GB SSD)
   - **Name**: `discord-bot`
3. Click "Create instance"

### Step 3: Connect to Your Instance
1. Wait for instance to start (green checkmark)
2. Click on your instance name
3. Go to "Connect" tab
4. Use the browser-based SSH or download SSH key

### Step 4: Deploy Your Bot
1. **SSH into your instance** (via browser or terminal):
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-ip
   ```

2. **Update system and install Node.js**:
   ```bash
   sudo apt update
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install PM2** (process manager):
   ```bash
   sudo npm install -g pm2
   ```

4. **Clone your repository**:
   ```bash
   git clone https://github.com/yourusername/discord-platoon-bot.git
   cd discord-platoon-bot
   ```

5. **Install dependencies**:
   ```bash
   npm install
   ```

6. **Create environment file**:
   ```bash
   nano .env
   # Add: DISCORD_TOKEN=your_bot_token_here
   ```

7. **Start with PM2**:
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

### Lightsail Benefits:
- **Cost**: $3.50/month (cheaper than Railway's $5)
- **Performance**: Better than Railway during peak hours
- **Control**: Full server access
- **Monitoring**: Built-in metrics and alerts
- **Backups**: Automatic daily backups included

---

## Option 2: Oracle Cloud Free Tier (Best Value)

### Why Oracle Cloud?
- **Completely FREE forever** (no credit card charges)
- **2 AMD VMs** with 1GB RAM each
- **24GB storage** per VM
- **99.9% uptime** guarantee
- **No peak hour restrictions**

### Step 1: Create Oracle Account
1. Go to [oracle.com/cloud/free](https://oracle.com/cloud/free)
2. Sign up for free tier (requires credit card verification but won't charge)
3. Choose your region (pick closest to you)

### Step 2: Create VM Instance
1. In Oracle Cloud Console, go to "Compute" → "Instances"
2. Click "Create Instance"
3. Choose "Always Free" options:
   - **Name**: `discord-bot-vm`
   - **Image**: Canonical Ubuntu 22.04
   - **Shape**: VM.Standard.A1.Flex (Always Free)
   - **Memory**: 6GB
   - **OCPUs**: 1
4. Create SSH key pair and download it
5. Click "Create"

### Step 3: Deploy Your Bot
1. **SSH into your VM**:
   ```bash
   ssh -i your-key.pem ubuntu@your-vm-ip
   ```

2. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install PM2** (process manager):
   ```bash
   sudo npm install -g pm2
   ```

4. **Clone your repository**:
   ```bash
   git clone https://github.com/yourusername/discord-platoon-bot.git
   cd discord-platoon-bot
   ```

5. **Install dependencies**:
   ```bash
   npm install
   ```

6. **Create environment file**:
   ```bash
   nano .env
   # Add: DISCORD_TOKEN=your_bot_token_here
   ```

7. **Start with PM2**:
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

---

## Option 3: Render (Simple Alternative)

### Why Render?
- **Free tier**: 750 hours/month (31 days)
- **Easy setup**: Similar to Railway but more reliable
- **No peak hour restrictions**
- **Automatic deployments**

### Step 1: Deploy to Render
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repository

### Step 2: Configure Service
- **Name**: `discord-platoon-bot`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free

### Step 3: Add Environment Variables
1. Go to "Environment" tab
2. Add variable:
   - **Key**: `DISCORD_TOKEN`
   - **Value**: Your bot token

### Step 4: Deploy
1. Click "Create Web Service"
2. Render will automatically deploy your bot
3. Your bot will be online 24/7!

---

## Option 4: Fly.io (Developer Friendly)

### Why Fly.io?
- **Generous free tier**
- **Global edge deployment**
- **Great performance**
- **No peak hour restrictions**

### Step 1: Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login and Deploy
```bash
fly auth login
fly launch
# Follow the prompts
fly deploy
```

### Step 3: Set Environment Variables
```bash
fly secrets set DISCORD_TOKEN=your_bot_token_here
```

---

## Migration Checklist

### Before Migration:
- [ ] Backup your current bot data
- [ ] Test your bot locally
- [ ] Update your `.env` file
- [ ] Commit all changes to GitHub

### After Migration:
- [ ] Test all bot commands
- [ ] Verify role synchronization works
- [ ] Check deploy messages update correctly
- [ ] Monitor logs for any errors
- [ ] Update your team about the new hosting

### Remove Railway:
- [ ] Go to Railway dashboard
- [ ] Delete your project
- [ ] Cancel your subscription
- [ ] Save money! 💰

---

## Cost Comparison

| Platform | Monthly Cost | Uptime | Peak Hour Limits | Recommendation |
|----------|-------------|---------|------------------|----------------|
| AWS Lightsail | $3.50 | 99.9% | ✅ No | ⭐ Excellent |
| Oracle Cloud | $0 | 99.9% | ✅ No | ⭐ Best Value |
| Render | $0 | 99.9% | ✅ No | ⭐ Great |
| Fly.io | $0 | 99.9% | ✅ No | ⭐ Great |
| Railway | $5 | 99% | ❌ Yes | ⚠️ Avoid |

---

## Support

If you need help with migration:
1. Check the platform-specific documentation
2. Review error logs
3. Test commands one by one
4. Ask for help in Discord developer communities

## Recommendation

**AWS Lightsail is an excellent choice!** It's:
- ✅ Cheaper than Railway ($3.50 vs $5)
- ✅ More reliable during peak hours
- ✅ Better performance
- ✅ Easy to manage
- ✅ Scalable as your bot grows

The setup is straightforward and you'll have full control over your server. Perfect for Discord bots!

Want me to help you set up Lightsail specifically? 