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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.Reaction]
});

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  // Set up reaction collectors
  await commandModule.setupStoredReactionCollectors(client);
  
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
    // If they have the member role, don't give them new member roles
    if (member.roles.cache.has(MEMBER_ROLE_ID)) {
      return;
    }

    // Check if member already has any of the new member roles
    const hasAnyRole = Object.values(NEW_MEMBER_ROLES).some(roleId => 
      member.roles.cache.has(roleId)
    );

    // If they already have one of the roles, skip assignment
    if (hasAnyRole) {
      return;
    }

    // If they don't have any of the roles, assign them
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
ota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.
0|discord-platoon-bot  |     at APIError.generate (C:\Users\Grays\FilingCabinet\node_modules\openai\error.js:63:20)
0|discord-platoon-bot  |     at OpenAI.makeStatusError (C:\Users\Grays\FilingCabinet\node_modules\openai\core.js:302:33)
0|discord-platoon-bot  |     at OpenAI.makeRequest (C:\Users\Grays\FilingCabinet\node_modules\openai\core.js:346:30)
0|discord-platoon-bot  |     at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
0|discord-platoon-bot  |     at async Object.handleAIConversation (C:\Users\Grays\FilingCabinet\aiHandler.js:65:24)
0|discord-platoon-bot  |     at async Client.<anonymous> (C:\Users\Grays\FilingCabinet\index.js:111:24) {
0|discord-platoon-bot  |   status: 429,
0|discord-platoon-bot  |   headers: {
0|discord-platoon-bot  |     'alt-svc': 'h3=":443"; ma=86400',
0|discord-platoon-bot  |     'cf-cache-status': 'DYNAMIC',
0|discord-platoon-bot  |     'cf-ray': '95ac24b4fb1a7483-MIA',
0|discord-platoon-bot  |     connection: 'keep-alive',
0|discord-platoon-bot  |     'content-length': '337',
0|discord-platoon-bot  |     'content-type': 'application/json; charset=utf-8',
0|discord-platoon-bot  |     date: 'Sun, 06 Jul 2025 03:51:24 GMT',
0|discord-platoon-bot  |     server: 'cloudflare',
0|discord-platoon-bot  |     'set-cookie': '__cf_bm=bRB1_S6tB6luEGu7kxtSCpkixSF3jrZgvPYik92Hl5k-1751773884-1.0.1.1-q98gjc5C1GGqko7w1OwGHTctCqRX.08T20Ujcf6Tdy5nq14QNZIxKXABMlimCb4b7911r22LNjuhPLm0gJf44TWeonwSilUMG8OwnlS.QX8; path=/; expires=Sun, 06-Jul-25 04:21:24 GMT; domain=.api.openai.com; HttpOnly; Secure; SameSite=None, _cfuvid=EDWbOct7OMdI55RcaJoCq9vrjoC12Ndd5PtAZEW3vbk-1751773884061-0.0.1.1-604800000; path=/; domain=.api.openai.com; HttpOnly; Secure; SameSite=None',
0|discord-platoon-bot  |     'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
0|discord-platoon-bot  |     vary: 'Origin',
0|discord-platoon-bot  |     'x-content-type-options': 'nosniff',
0|discord-platoon-bot  |     'x-request-id': 'req_79bb2c936b149db97dcaa1491c68a230'
0|discord-platoon-bot  |   },
0|discord-platoon-bot  |   request_id: 'req_79bb2c936b149db97dcaa1491c68a230',
0|discord-platoon-bot  |   error: {
0|discord-platoon-bot  |     message: 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.',
0|discord-platoon-bot  |     type: 'insufficient_quota',
0|discord-platoon-bot  |     param: null,
0|discord-platoon-bot  |     code: 'insufficient_quota'
0|discord-platoon-bot  |   },
0|discord-platoon-bot  |   code: 'insufficient_quota',
0|discord-platoon-bot  |   param: null,
0|discord-platoon-bot  |   type: 'insufficient_quota'
0|discord-platoon-bot  | }
0|discord-platoon-bot  | 2025-07-05T23:51:34: Error in AI conversation: RateLimitError: 429 You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.
0|discord-platoon-bot  |     at APIError.generate (C:\Users\Grays\FilingCabinet\node_modules\openai\error.js:63:20)
0|discord-platoon-bot  |     at OpenAI.makeStatusError (C:\Users\Grays\FilingCabinet\node_modules\openai\core.js:302:33)
0|discord-platoon-bot  |     at OpenAI.makeRequest (C:\Users\Grays\FilingCabinet\node_modules\openai\core.js:346:30)
0|discord-platoon-bot  |     at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
0|discord-platoon-bot  |     at async Object.handleAIConversation (C:\Users\Grays\FilingCabinet\aiHandler.js:65:24)
0|discord-platoon-bot  |     at async Client.<anonymous> (C:\Users\Grays\FilingCabinet\index.js:111:24) {
0|discord-platoon-bot  |   status: 429,
0|discord-platoon-bot  |   headers: {
0|discord-platoon-bot  |     'alt-svc': 'h3=":443"; ma=86400',
0|discord-platoon-bot  |     'cf-cache-status': 'DYNAMIC',
0|discord-platoon-bot  |     'cf-ray': '95ac250668d3742d-MIA',
0|discord-platoon-bot  |     connection: 'keep-alive',
0|discord-platoon-bot  |     'content-length': '337',
0|discord-platoon-bot  |     'content-type': 'application/json; charset=utf-8',
0|discord-platoon-bot  |     date: 'Sun, 06 Jul 2025 03:51:36 GMT',
0|discord-platoon-bot  |     server: 'cloudflare',
0|discord-platoon-bot  |     'set-cookie': '__cf_bm=non8XsmZadw.QUBwsKtFOr6WmEhAZJ9Uco7d9kDLJZQ-1751773896-1.0.1.1-rK7HCrtiPJwTT2jxwfBcuYHmMJyAl_DrmVNhwTacjnhsw5Dv6jvpZEaj5cGzHA9ORC1ATEjRSXY.ArptGTIaBhePqsqqEm6PXrwNnXTvAXw; path=/; expires=Sun, 06-Jul-25 04:21:36 GMT; domain=.api.openai.com; HttpOnly; Secure; SameSite=None, _cfuvid=bX57jSTvZGCRK7Xtm.cV2E6xXoAL103AF9SowuGZH_s-1751773896805-0.0.1.1-604800000; path=/; domain=.api.openai.com; HttpOnly; Secure; SameSite=None',
0|discord-platoon-bot  |     'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
0|discord-platoon-bot  |     vary: 'Origin',
0|discord-platoon-bot  |     'x-content-type-options': 'nosniff',
0|discord-platoon-bot  |     'x-request-id': 'req_1223d37dac28ec2bde48cccf3559c0e5'
0|discord-platoon-bot  |   },
0|discord-platoon-bot  |   request_id: 'req_1223d37dac28ec2bde48cccf3559c0e5',
0|discord-platoon-bot  |   error: {
0|discord-platoon-bot  |     message: 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.',
0|discord-platoon-bot  |     type: 'insufficient_quota',
0|discord-platoon-bot  |     param: null,
0|discord-platoon-bot  |     code: 'insufficient_quota'
0|discord-platoon-bot  |   },
0|discord-platoon-bot  |   code: 'insufficient_quota',
0|discord-platoon-bot  |   param: null,
0|discord-platoon-bot  |   type: 'insufficient_quota'
0|discord-platoon-bot  | }
