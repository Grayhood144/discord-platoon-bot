// index.js
const { Client, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const handleMessageCleanup = require('./messageCleaner');
const commandModule = require('./commands');
const drSauce = require('./drSauce');

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

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Check if Dr. Sauce should respond
  if (drSauce.shouldDrSauceRespond(message)) {
    const response = drSauce.generateDrSauceResponse();
    await message.channel.send(response);
    return;
  }

  await handleMessageCleanup(message, client);
  await commandModule.commands(message, client);
});

client.login(process.env.DISCORD_TOKEN);
