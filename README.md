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
   node index.js
   ```

## Deployment

For 24/7 hosting, we recommend these reliable options:

### ðŸš€ Recommended Hosting Options

| Platform | Cost | Uptime | Setup Difficulty | Recommendation |
|----------|------|--------|------------------|----------------|
| **AWS Lightsail** | $3.50/month | 99.9% | Easy | â­ Excellent |
| **Oracle Cloud** | Free | 99.9% | Medium | â­ Best Value |
| **Render** | Free | 99.9% | Easy | â­ Great |

### Quick Start Guides
- **AWS Lightsail**: See `DEPLOYMENT.md` for detailed setup
- **Oracle Cloud**: See `MIGRATION-GUIDE.md` for free tier setup
- **Render**: See `DEPLOYMENT.md` for simple deployment

### Why These Options?
- âœ… **No peak hour restrictions** (unlike Railway)
- âœ… **Better reliability** and uptime
- âœ… **More cost-effective** than Railway ($5/month)
- âœ… **Full control** over your server
- âœ… **Easy scaling** as your bot grows

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
â”œâ”€â”€ index.js              # Main bot entry point
â”œâ”€â”€ commands.js           # Command handlers
â”œâ”€â”€ messageCleaner.js     # Message cleanup utilities
â”œâ”€â”€ subsections.json      # Platoon and role configuration
â”œâ”€â”€ userRoles.json        # User role mappings
â”œâ”€â”€ deployMessages.json   # Deploy message tracking
â”œâ”€â”€ package.json          # Node.js dependencies
â”œâ”€â”€ ecosystem.config.js   # PM2 configuration for production
â”œâ”€â”€ DEPLOYMENT.md         # Detailed deployment guides
â”œâ”€â”€ MIGRATION-GUIDE.md    # Migration from other platforms
â””â”€â”€ README.md            # This file
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
2. Review the deployment guides in `DEPLOYMENT.md`
3. Open an issue on GitHub with detailed information
4. Include your Node.js version and Discord bot permissions

---

**Last updated**: Test deployment with AWS Lightsail configuration (IP: 35.174.10.190)
# Deployment trigger - 06/16/2025 20:55:32

<!-- Deployment trigger - 06/18/2025 03:06:00 -->