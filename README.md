# Discord Bot - Military Platoon Management

A Discord bot for managing military-style platoons with role synchronization, veterancy roles, and deployment automation.

## Features

- **Platoon Management**: Organize members into different platoons with officers, instructors, and members
- **Role Synchronization**: Automatically sync Discord roles with platoon membership
- **Deploy Messages**: Generate and update formatted platoon layout messages
- **Audit Logging**: Track all administrative actions
- **Permission System**: Role-based access control for different commands
- **Multi-Server Support**: Configure role IDs for different Discord servers
- **Veterancy System**: Automatic role assignment based on member join dates

## Commands

### General Commands
- `deploy` - Shows the full platoon layout
- `$sync` - Updates all members in each platoon based on Discord roles
- `$help` - Displays help message

### Personnel Commands
- `$clear @Platoon [instructors|members|all]` - Clear personnel from a platoon

### Admin Commands (Restricted to authorized roles)
- `$$deploy true/false` - Enable or disable testing mode
- `SauceTest14405 / SauceTestend14405` - Manually toggle testing mode
- `$auditlog` - View audit log
- `$clearall` - Delete last 100 messages (requires password or admin)
- `$clearcommands` - Delete all command messages
- `$debugroles` - List all roles in the server

### Veterancy Commands
- `$checkveterancy @user` - Check veterancy status for a user
- `$assignveterancy @user` - Manually assign veterancy role to a user

### Hidden Commands
- `$nick` - Change username (restricted to specific user ID)

## Setup

### Prerequisites
- Node.js (v14 or higher)
- Discord Bot Token
- Discord Server with configured roles
- Raspberry Pi (3 or 4 recommended)
- SD card with Raspberry Pi OS
- Stable internet connection

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/discord-platoon-bot.git
   cd discord-platoon-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the bot**
   - Create a `.env` file in the root directory
   - Add your Discord bot token:
     ```
     DISCORD_TOKEN=your_bot_token_here
     ```

4. **Configure role IDs**
   - Edit `subsections.json` to match your server's role IDs
   - Update the `roleIDs` section with your server's specific role IDs

5. **Run the bot**
   ```bash
   pm2 start ecosystem.config.js
   ```

## Deployment

For 24/7 hosting, we recommend using a Raspberry Pi:

### 🚀 Raspberry Pi Deployment

| Feature | Details |
|---------|---------|
| **Cost** | One-time hardware cost |
| **Uptime** | 24/7 (dependent on your internet) |
| **Control** | Full hardware access |
| **Setup** | Medium difficulty |
| **Maintenance** | Simple updates via SSH |

### Quick Start Guide
- See `DEPLOYMENT.md` for detailed Raspberry Pi setup instructions

### Why Raspberry Pi?
- ✅ **One-time cost** - No monthly fees
- ✅ **Full control** - Your hardware, your rules
- ✅ **Privacy** - Data stays on your device
- ✅ **Learning opportunity** - Great for Linux experience
- ✅ **Expandable** - Run other services too

## Configuration

### Role IDs Setup

The bot uses role IDs stored in `subsections.json`. You need to configure:

1. **Platoon Roles**: Role IDs for each platoon
2. **Rank Roles**: Role IDs for different officer ranks
3. **Admin Roles**: Role IDs for administrative access

Example structure in `subsections.json`:
```json
{
  "roleIDs": {
    "server1": {
      "platoons": {
        "M.E.T.H.": "1234567890123456789",
        "C.A.L.I.B.R.E.": "9876543210987654321"
      },
      "ranks": {
        "Platoon Leader": "1111111111111111111",
        "Platoon Instructor": "2222222222222222222"
      }
    }
  }
}
```

### Bot Permissions

Ensure your bot has the following permissions:
- Read Messages
- Send Messages
- Manage Messages
- Manage Roles
- Read Message History
- Use Slash Commands

## File Structure

```
discord-platoon-bot/
├── index.js              # Main bot entry point
├── commands.js           # Command handlers
├── messageCleaner.js     # Message cleanup utilities
├── subsections.json      # Platoon and role configuration
├── userRoles.json        # User role mappings
├── deployMessages.json   # Deploy message tracking
├── package.json          # Node.js dependencies
├── ecosystem.config.js   # PM2 configuration for production
├── DEPLOYMENT.md         # Detailed deployment guides
├── MIGRATION-GUIDE.md    # Migration from other platforms
└── README.md            # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:
1. Check the troubleshooting section in `SETUP.md`
2. Review the deployment guide in `DEPLOYMENT.md`
3. Open an issue on GitHub with detailed information
4. Include your Node.js version and Discord bot permissions

---

**Last updated**: Test deployment with AWS Lightsail configuration (IP: 35.174.10.190)
# Deployment trigger - 06/16/2025 20:55:32

<!-- Deployment trigger - 06/18/2025 03:06:00 -->