# Replit Setup Guide for Discord Bot

## Step 1: Environment Variables (Secrets)
1. In your Replit, click the **"Secrets"** icon in the left sidebar (looks like a lock 🔒)
2. Click **"New Secret"**
3. Add your Discord bot token:
   - **Key**: `DISCORD_TOKEN`
   - **Value**: Your actual bot token (the long string from Discord Developer Portal)
4. Click **"Add Secret"**

## Step 2: Install Dependencies
1. In the **"Shell"** tab at the bottom, run:
   ```bash
   npm install
   ```

## Step 3: Run the Bot
1. Click the **"Run"** button at the top
2. Your bot should start and you'll see "✅ Logged in as [Bot Name]" in the console

## Step 4: Keep It Running 24/7
Replit has a feature called **"Always On"** for paid plans, but for free:
- Your repl will stay active as long as you have it open in a browser tab
- You can use **UptimeRobot** (free) to ping your repl every 5 minutes to keep it alive

### UptimeRobot Setup (Free):
1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Sign up for free account
3. Add a new monitor:
   - **Monitor Type**: HTTP(s)
   - **URL**: Your Replit URL (looks like `https://your-repl-name.your-username.repl.co`)
   - **Check Interval**: 5 minutes
4. This will ping your repl every 5 minutes to keep it alive

## Step 5: Check Your Bot is Working
1. Go to your Discord server
2. Try a command like `$help` or `$deploy`
3. Your bot should respond!

## Troubleshooting:
- **"Cannot find module"**: Run `npm install` in the shell
- **"Invalid token"**: Check your secret is named exactly `DISCORD_TOKEN`
- **Bot not responding**: Check the console for error messages

## Railway vs Replit Comparison:

### Replit Pros:
- ✅ You already have it set up
- ✅ Web-based IDE (no local setup)
- ✅ Easy to edit code directly
- ✅ Free tier available
- ✅ Built-in terminal and debugging

### Replit Cons:
- ❌ Free tier has limitations
- ❌ May sleep after inactivity (need UptimeRobot)
- ❌ Less reliable than Railway

### Railway Pros:
- ✅ More reliable 24/7 uptime
- ✅ Better performance
- ✅ Automatic deployments from GitHub
- ✅ Better monitoring and logs

### Railway Cons:
- ❌ Need to set up from scratch
- ❌ Requires GitHub repository

## Recommendation:
Since you already have it on Replit, **start there first**! It's perfect for testing and development. If you find Replit's limitations annoying (like the sleeping issue), then move to Railway for better reliability.

Want me to help you get it running on Replit right now? 