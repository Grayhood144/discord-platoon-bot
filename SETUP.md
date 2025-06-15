# Setup Guide

## Prerequisites

1. **Node.js** (v14 or higher) - Download from [nodejs.org](https://nodejs.org/)
2. **Discord Bot Token** - Create a bot at [Discord Developer Portal](https://discord.com/developers/applications)
3. **Discord Server** with configured roles

## Step-by-Step Setup

### 1. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section
4. Click "Add Bot" and confirm
5. Copy the bot token (you'll need this later)
6. Under "Privileged Gateway Intents", enable:
   - Server Members Intent
   - Message Content Intent

### 2. Invite Bot to Server

1. Go to "OAuth2" → "URL Generator"
2. Select scopes: `bot` and `applications.commands`
3. Select permissions:
   - Read Messages/View Channels
   - Send Messages
   - Manage Messages
   - Read Message History
   - Use Slash Commands
4. Copy the generated URL and open it in a browser
5. Select your server and authorize the bot

### 3. Configure Role IDs

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click on each role and copy the ID
3. Update `subsections.json` with your server's role IDs:

```json
{
  "roleIDs": {
    "server1": {
      "platoons": {
        "M.E.T.H.": "your_meth_role_id",
        "C.A.L.I.B.R.E.": "your_calibre_role_id"
      },
      "ranks": {
        "Platoon Leader": "your_platoon_leader_role_id",
        "Platoon Instructor": "your_platoon_instructor_role_id"
      }
    }
  }
}
```

### 4. Environment Setup

1. Create a `.env` file in the project root
2. Add your bot token:
```
DISCORD_TOKEN=your_actual_bot_token_here
```

### 5. Install Dependencies

```bash
npm install
```

### 6. Run the Bot

```bash
node index.js
```

You should see: `✅ Logged in as YourBotName#1234`

## Configuration Files

### subsections.json
- Contains platoon definitions and role mappings
- Update role IDs to match your server
- Add/remove platoons as needed

### userRoles.json
- Automatically generated when using `$sync`
- Maps user IDs to their platoon assignments

### deployMessages.json
- Tracks deploy message IDs for updates
- Automatically managed by the bot

## Troubleshooting

### Bot won't start
- Check that your bot token is correct in `.env`
- Ensure the bot has the required permissions
- Verify Node.js version is 14 or higher

### Commands not working
- Check that the bot has the required permissions
- Verify role IDs in `subsections.json` are correct
- Ensure the bot is online in your server

### Role sync issues
- Run `$debugroles` to check role configurations
- Verify all role IDs exist in your server
- Check bot permissions for role management

## Security Notes

- Never share your bot token publicly
- Keep your `.env` file secure and never commit it to version control
- Regularly rotate your bot token if compromised
- Use role-based permissions to restrict command access

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the console output for error messages
3. Open an issue on GitHub with detailed information
4. Include your Node.js version and Discord bot permissions 