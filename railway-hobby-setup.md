# Railway Hobby Tier Setup Guide

## Perfect Choice! 🎉
Railway hobby tier ($5/month credit) is ideal for Discord bots:
- ✅ More than enough for 24/7 bot operation
- ✅ Reliable uptime
- ✅ Automatic deployments
- ✅ Great monitoring

## Step 1: Deploy to Railway

### Option A: From GitHub (Recommended)
1. **Push your code to GitHub** (if not already done)
2. Go to [railway.app](https://railway.app)
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your Discord bot repository
5. Railway will auto-detect it's a Node.js app

### Option B: Direct Upload
1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from Template"**
3. Choose **"Node.js"** template
4. Upload your bot files or connect your repo

## Step 2: Configure Environment Variables
1. In your Railway project dashboard, click **"Variables"** tab
2. Add your Discord bot token:
   - **Key**: `DISCORD_TOKEN`
   - **Value**: Your actual bot token from Discord Developer Portal
3. Click **"Add Variable"**

## Step 3: Deploy Settings
Railway will automatically:
- ✅ Install dependencies (`npm install`)
- ✅ Start your bot (`npm start`)
- ✅ Monitor and restart if needed

## Step 4: Monitor Your Bot
1. **Logs**: Click **"Deployments"** → **"View Logs"** to see bot activity
2. **Status**: Your bot will show as "Running" when online
3. **Uptime**: Railway provides 99.9% uptime guarantee

## Step 5: Test Your Bot
1. Go to your Discord server
2. Try commands like `$help`, `$deploy`, `$sync`
3. Your bot should respond immediately!

## Cost Breakdown (Hobby Tier)
- **Discord Bot**: ~$0.50-1.00/month
- **Remaining Credit**: $4-4.50 for other projects
- **Perfect for**: Multiple Discord bots or other small projects

## Railway Advantages for Discord Bots:
- ✅ **Automatic restarts** if bot crashes
- ✅ **Zero downtime** deployments
- ✅ **Built-in monitoring** and logs
- ✅ **Environment variable** management
- ✅ **GitHub integration** for easy updates

## Troubleshooting:
- **Bot not responding**: Check logs in Railway dashboard
- **"Invalid token"**: Verify `DISCORD_TOKEN` variable is set correctly
- **Build errors**: Check if all dependencies are in `package.json`

## Pro Tips:
1. **Enable notifications** in Railway for deployment status
2. **Set up GitHub webhooks** for automatic deployments
3. **Monitor usage** in Railway dashboard to stay within $5 limit

## Next Steps:
1. Deploy your bot following the steps above
2. Test all your commands (`$help`, `$deploy`, `$sync`, etc.)
3. Monitor logs to ensure everything works
4. Your bot will now run 24/7! 🚀

Need help with any specific step? 