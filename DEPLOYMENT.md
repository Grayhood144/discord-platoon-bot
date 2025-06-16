# 24/7 Discord Bot Deployment Guide

## Option 1: Railway (Recommended - Easiest)

### Step 1: Prepare Your Code
1. Make sure your `.env` file is in `.gitignore`
2. Your bot is ready to deploy!

### Step 2: Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your Discord bot repository
5. Railway will automatically detect it's a Node.js app

### Step 3: Add Environment Variables
1. In Railway dashboard, go to your project
2. Click "Variables" tab
3. Add your `DISCORD_TOKEN` environment variable
4. Copy the value from your local `.env` file

### Step 4: Deploy
1. Railway will automatically deploy when you push to GitHub
2. Your bot will be online 24/7!

---

## Option 2: Render

### Step 1: Deploy to Render
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Set build command: `npm install`
6. Set start command: `npm start`

### Step 2: Add Environment Variables
1. In Render dashboard, go to "Environment"
2. Add `DISCORD_TOKEN` with your bot token

### Step 3: Deploy
1. Click "Create Web Service"
2. Your bot will be online 24/7!

---

## Option 3: Replit

### Step 1: Create Repl
1. Go to [replit.com](https://replit.com)
2. Sign up and create a new "Node.js" repl
3. Upload your bot files or clone from GitHub

### Step 2: Add Environment Variables
1. Click the "Secrets" icon in the left sidebar
2. Add `DISCORD_TOKEN` with your bot token

### Step 3: Run
1. Click "Run" button
2. Your bot will stay online as long as the repl is active

---

## Option 4: Oracle Cloud (Most Powerful)

### Step 1: Create Oracle Account
1. Go to [oracle.com/cloud/free](https://oracle.com/cloud/free)
2. Sign up for free tier (requires credit card but won't charge)

### Step 2: Create VM
1. Create an "Always Free" VM instance
2. Choose Ubuntu as the operating system
3. Download your SSH key

### Step 3: Deploy Bot
1. SSH into your VM
2. Install Node.js: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`
3. Clone your repository: `git clone https://github.com/yourusername/discord-platoon-bot.git`
4. Install dependencies: `cd discord-platoon-bot && npm install`
5. Create `.env` file with your `DISCORD_TOKEN`
6. Run with PM2: `npm install -g pm2 && pm2 start ecosystem.config.js`
7. Set PM2 to start on boot: `pm2 startup && pm2 save`

---

## Important Notes

### Environment Variables
- **NEVER** commit your `.env` file to GitHub
- Always use the hosting platform's environment variable system
- Your bot token should be kept secret

### Monitoring
- Most platforms provide logs and monitoring
- Set up notifications for crashes if available
- Monitor your bot's uptime

### Cost
- All options above have free tiers
- Railway: $5 credit monthly (sufficient for Discord bot)
- Render: 750 hours/month (31 days)
- Replit: Free with limitations
- Oracle: Always free (most generous)

### Recommended for Beginners
1. **Railway** - Easiest setup, reliable
2. **Render** - Simple, good documentation
3. **Replit** - Web-based, no local setup needed

Choose Railway if you want the easiest experience, or Oracle Cloud if you want the most powerful free option! 