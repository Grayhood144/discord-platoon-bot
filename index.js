// index.js
const { Client, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const handleMessageCleanup = require('./messageCleaner');
const commandModule = require('./commands');
const drSauce = require('./drSauce');

// Role IDs for new members
const NEW_MEMBER_ROLES = {
  'tra': '1305993273386729532',
  'cadet': '1295543221530787870',
  'trainee': '1295546993736679536'
};

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
  
  // Set up daily role check at 9:00 AM UTC
  const now = new Date();
  const target = new Date();
  target.setUTCHours(9, 0, 0, 0);
  if (now > target) target.setDate(target.getDate() + 1);
  
  const timeUntilFirstCheck = target.getTime() - now.getTime();
  
  // Schedule first check
  setTimeout(() => {
    checkAllMemberRoles();
    // Then schedule it to run every 24 hours
    setInterval(checkAllMemberRoles, 24 * 60 * 60 * 1000);
  }, timeUntilFirstCheck);

  // Start the bump reminder
  setInterval(async () => {
    try {
      const channel = await client.channels.fetch('1305956807155515402');
      if (channel) {
        await channel.send('/bump');
        console.log('Sent bump command');
      }
    } catch (error) {
      console.error('Error sending bump command:', error);
    }
  }, 60 * 60 * 1000); // 1 hour in milliseconds
});

// Function to check and assign roles for a single member
async function checkAndAssignNewMemberRoles(member) {
  try {
    for (const [roleName, roleId] of Object.entries(NEW_MEMBER_ROLES)) {
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId);
        console.log(`✅ Assigned ${roleName} role to ${member.user.username}`);
      }
    }
  } catch (error) {
    console.error(`Error assigning roles to ${member.user.username}:`, error);
  }
}

// Function to check all members' roles
async function checkAllMemberRoles() {
  console.log('🔄 Starting daily role check...');
  try {
    const guilds = client.guilds.cache;
    for (const guild of guilds.values()) {
      const members = await guild.members.fetch();
      for (const member of members.values()) {
        if (!member.user.bot) {
          await checkAndAssignNewMemberRoles(member);
        }
      }
    }
    console.log('✅ Daily role check completed');
  } catch (error) {
    console.error('Error during daily role check:', error);
  }
}

// Handle new member joins
client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;
  await checkAndAssignNewMemberRoles(member);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Check if Dr. Sauce should respond
  const response = drSauce.shouldDrSauceRespond(message);
  if (response) {
    const drSauceResponse = drSauce.generateDrSauceResponse(response);
    await message.channel.send(drSauceResponse);
    return;
  }

  await handleMessageCleanup(message, client);
  await commandModule.commands(message, client);
});

client.login(process.env.DISCORD_TOKEN);
