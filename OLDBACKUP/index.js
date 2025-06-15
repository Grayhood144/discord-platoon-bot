const { Client, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const handleMessageCleanup = require('./messageCleaner');
const commandModule = require('./commands');
const subsections = require('./subsections.json');
const userRoles = require('./userRoles.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// Triggered when the bot becomes ready
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Message handling
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Clean messages based on criteria
  await handleMessageCleanup(message, client);

  // Extract command and run handler
  const args = message.content.trim().split(/\s+/);
  const command = args[0];

  if (commandModule.commands.has(command)) {
    await commandModule.commands.get(command)(client, message, args);
  }
});

client.login(process.env.DISCORD_TOKEN);
