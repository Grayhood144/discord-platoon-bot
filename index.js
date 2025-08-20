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

// Member role ID
const MEMBER_ROLE_ID = '1305992733835399238'; // - - - - OFC - - - - role ID

// Organization channel ID for deploy message
const ORGANIZATION_CHANNEL_ID = '1336126211264352298';

// Role sync interval (24 hours)
const ROLE_SYNC_INTERVAL = 24 * 60 * 60 * 1000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  try {
    // Initial deployment in organization channel
    console.log('🔄 Running initial deployment...');
    const orgChannel = await client.channels.fetch(ORGANIZATION_CHANNEL_ID);
    if (orgChannel) {
      await commandModule.updateDeployMessage(client, orgChannel);
      console.log('✅ Initial deployment complete');
    }

    // Initial role sync
    console.log('🔄 Running initial role sync...');
    const guilds = client.guilds.cache;
    for (const guild of guilds.values()) {
      await commandModule.commands({ 
        content: '$sync',
        guild: guild,
        channel: orgChannel,
        author: client.user,
        member: guild.members.cache.get(client.user.id)
      }, client);
    }
    console.log('✅ Initial role sync complete');

    // Set up daily role sync
    setInterval(async () => {
      console.log('🔄 Running scheduled role sync...');
      for (const guild of guilds.values()) {
        await commandModule.commands({
          content: '$sync',
          guild: guild,
          channel: orgChannel,
          author: client.user,
          member: guild.members.cache.get(client.user.id)
        }, client);
      }
      console.log('✅ Scheduled role sync complete');
    }, ROLE_SYNC_INTERVAL);

  } catch (error) {
    console.error('Error in startup procedures:', error);
  }
  
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
    // Skip bots
    if (member.user.bot) return;

    // If they have any role other than @everyone, they're not a new member
    if (member.roles.cache.size > 1) {
      return;
    }

    // If they don't have any roles (except @everyone), assign them new member roles
    for (const [roleName, roleId] of Object.entries(NEW_MEMBER_ROLES)) {
      await member.roles.add(roleId);
      console.log(`✅ Assigned ${roleName} role to ${member.user.username}`);
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
