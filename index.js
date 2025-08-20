// index.js
const { Client, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { joinVoiceChannel } = require('@discordjs/voice');

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

// Channel IDs
const GENERAL_CHANNEL_ID = '1295508021585117247';

// Random VC check interval (1 hour)
const VC_CHECK_INTERVAL = 60 * 60 * 1000;

// Function to perform random VC interaction
async function checkRandomVCInteraction(guild) {
  try {
    // Get all voice channels
    const voiceChannels = guild.channels.cache.filter(channel => channel.type === 2); // 2 is voice channel type

    // Get all members in voice channels
    let membersInVC = [];
    for (const [_, channel] of voiceChannels) {
      for (const [_, member] of channel.members) {
        // Skip bots
        if (!member.user.bot) {
          membersInVC.push({
            member: member,
            channel: channel
          });
        }
      }
    }

    // If no one is in VC, return
    if (membersInVC.length === 0) return;

    // 1 in 10 chance for each member
    for (const { member, channel } of membersInVC) {
      if (Math.random() < 0.1) { // 10% chance
        // Get the general channel
        const generalChannel = guild.channels.cache.get(GENERAL_CHANNEL_ID);
        if (!generalChannel) continue;

        // Join their voice channel
        const connection = joinVoiceChannel({
          channelId: channel.id,
          guildId: guild.id,
          adapterCreator: guild.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false
        });

        // Send first message
        await generalChannel.send(`${member} (Helldivers 2 maybe, ${member}?)`);

        // Wait 15 seconds
        setTimeout(async () => {
          // Send second message
          await generalChannel.send(`(${member} gotta piss.)`);
          // Disconnect
          connection.destroy();
        }, 15000);

        // Log the interaction
        console.log(`Performed random VC interaction with ${member.user.tag}`);
      }
    }
  } catch (error) {
    console.error('Error in random VC interaction:', error);
  }
}

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
      // Clear existing messages
      console.log('🧹 Clearing organization channel...');
      try {
        let messages;
        do {
          messages = await orgChannel.messages.fetch({ limit: 100 });
          if (messages.size > 0) {
            try {
              await orgChannel.bulkDelete(messages);
            } catch (bulkError) {
              // If bulk delete fails (messages too old), delete one by one
              console.log('⚠️ Some messages too old for bulk delete, deleting individually...');
              for (const message of messages.values()) {
                try {
                  await message.delete();
                } catch (deleteError) {
                  console.error('Error deleting message:', deleteError);
                }
              }
            }
          }
        } while (messages.size === 100);
        console.log('✅ Channel cleared');
      } catch (clearError) {
        console.error('Error clearing channel:', clearError);
      }

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

    // Set up hourly random VC check for each guild
    setInterval(() => {
      client.guilds.cache.forEach(guild => {
        checkRandomVCInteraction(guild);
      });
    }, VC_CHECK_INTERVAL);

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
