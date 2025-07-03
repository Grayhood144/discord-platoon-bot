// Useless change to trigger redeploy
// commands.js
const fs = require('fs');
const subsections = require('./subsections.json');
const userRoles = require('./userRoles.json');
const deployPath = './deployMessages.json';
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

let auditLog = [];
let testingMode = false;

// Veterancy role IDs
const VETERANCY_ROLES = {
  '1st Degree': '1323429003264266251',  // 1 year or more
  '2nd Degree': '1323429224169607309',  // 9 months
  '3rd Degree': '1323429658133532813',  // 6 months
  '4th Degree': '1323430282119876728',  // 3 months
  '5th Degree': '1323430587410813039'   // 1 month
};

const WARRANT_OFFICER_ROLE = '1378985570289844314'; // Chief Warrant Officer role ID
const OFFICER_ROLE = '1305992733835399238'; // - - - - OFC - - - - role ID

// Role IDs for ranks
const RANK_ROLES = {
  'private': '1295543139808968737',
  'pfc': '1322687587420475475',
  'lance': '1322687344423342161'
};

// Role IDs for roles to remove
const REMOVE_ROLES = {
  'cadet': '1295543221530787870',
  'trainee': '1295546993736679536',
  'tra': '1305993273386729532'
};

// Role IDs for additional roles to add
const ADD_ROLES = {
  'ens': '1305992787220496424',
  'member': '1305993742083166250',
  'enlisted': '1295545358767755336',
  'dashes': '1305993620049887323'
};

function saveJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function formatName(user, guild = null) {
  if (guild && user.id) {
    const member = guild.members.cache.get(user.id);
    if (member && member.displayName) {
      return `${member.displayName}`;
    }
  }
  return `${user.username}`;
}

function hasRole(member, ids) {
  return member.roles.cache.some(role => ids.includes(role.id));
}

function addToAuditLog(action) {
  auditLog.push(`${new Date().toISOString()} - ${action}`);
  if (auditLog.length > 100) {
    auditLog = auditLog.slice(-100);
  }
}

// Function to calculate member veterancy and assign appropriate role
async function checkAndAssignVeterancy(member, guild) {
  try {
    const joinDate = member.joinedAt;
    if (!joinDate) {
      console.log(`Could not determine join date for ${member.user.username}`);
      return null;
    }

    const now = new Date();
    const timeInServer = now - joinDate;
    const monthsInServer = Math.floor(timeInServer / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
    const daysInServer = Math.floor(timeInServer / (1000 * 60 * 60 * 24));

    let appropriateRole = null;
    let veterancyLevel = 'None';

    // Determine appropriate veterancy role
    if (monthsInServer >= 12) {
      appropriateRole = VETERANCY_ROLES['1st Degree'];
      veterancyLevel = '1st Degree';
    } else if (monthsInServer >= 9) {
      appropriateRole = VETERANCY_ROLES['2nd Degree'];
      veterancyLevel = '2nd Degree';
    } else if (monthsInServer >= 6) {
      appropriateRole = VETERANCY_ROLES['3rd Degree'];
      veterancyLevel = '3rd Degree';
    } else if (monthsInServer >= 3) {
      appropriateRole = VETERANCY_ROLES['4th Degree'];
      veterancyLevel = '4th Degree';
    } else if (monthsInServer >= 1) {
      appropriateRole = VETERANCY_ROLES['5th Degree'];
      veterancyLevel = '5th Degree';
    }

    // Remove all existing veterancy roles
    for (const roleId of Object.values(VETERANCY_ROLES)) {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
      }
    }

    // Add appropriate veterancy role
    if (appropriateRole) {
      await member.roles.add(appropriateRole);
      console.log(`✅ Assigned ${veterancyLevel} veterancy to ${member.user.username}`);
    }

    return {
      member: member.user.username,
      joinDate: joinDate.toISOString().split('T')[0],
      daysInServer,
      monthsInServer,
      veterancyLevel,
      roleAssigned: appropriateRole ? true : false
    };

  } catch (error) {
    console.error(`Error checking veterancy for ${member.user.username}:`, error);
    return null;
  }
}

// Function to get role IDs from the JSON structure
function getRoleIDs(server = 'server1') {
  const roleIDs = subsections.roleIDs?.[server];
  if (!roleIDs) {
    console.warn(`Role IDs for server '${server}' not found, using fallback values`);
    return {
      admin: [
        '1378997615613710368', // @S
        '1305992733835399238', // @- - - - OFC - - - -
        '1378985570289844314'  // @Chief Warrant Officer
      ],
      sync: [
        '1305992733835399238', // @- - - - OFC - - - -
        '1379535329735872512', // blank name role
        '1295544720222589069', // @Junior Officer
        '603550636545540096'   // Grayson
      ],
      platoonLeader: '1383651441121689661',
      platoonInstructor: '1383651620969250928'
    };
  }
  
  return {
    admin: [
      roleIDs.ranks?.S || '1378997615613710368',
      roleIDs.ranks?.['- - - - OFC - - - -'] || '1305992733835399238',
      roleIDs.ranks?.['Chief Warrant Officer'] || '1378985570289844314'
    ],
    sync: [
      roleIDs.ranks?.['- - - - OFC - - - -'] || '1305992733835399238',
      '1379535329735872512', // blank name role (not in JSON)
      roleIDs.ranks?.['Junior Lieutenant'] || '1295544720222589069',
      '603550636545540096'   // Grayson (user ID, not role)
    ],
    platoonLeader: roleIDs.ranks?.['Platoon Leader'] || '1383651441121689661',
    platoonInstructor: roleIDs.ranks?.['Platoon Instructor'] || '1383651620969250928'
  };
}

async function updateDeployMessage(client, fallbackChannel = null) {
  let deployData = {};
  try {
    deployData = JSON.parse(fs.readFileSync(deployPath, 'utf8'));
  } catch {
    deployData = {};
  }

  const introText = subsections._intro || '**Clan Subsections:**\n\n> No intro text found.\n';
  const layoutParts = [];

  // Get the guild from the fallback channel or from the stored channel
  let guild = null;
  if (fallbackChannel) {
    guild = fallbackChannel.guild;
  } else if (deployData.channelId) {
    try {
      const channel = await client.channels.fetch(deployData.channelId);
      guild = channel.guild;
    } catch (error) {
      console.error('Could not fetch guild for deploy message:', error);
    }
  }

  for (const [name, data] of Object.entries(subsections)) {
    if (name === '_intro') continue;

    const officerNames = await Promise.all(
      (data.officer || []).map(async id => {
        try {
          if (guild) {
            const member = await guild.members.fetch(id);
            return `<@${id}>`;
          } else {
            const user = await client.users.fetch(id);
            return `<@${id}>`;
          }
        } catch {
          return `@Unknown-${id}`;
        }
      })
    );

    const instructorNames = await Promise.all(
      (data.instructors || []).map(async id => {
        try {
          if (guild) {
            const member = await guild.members.fetch(id);
            return `<@${id}>`;
          } else {
            const user = await client.users.fetch(id);
            return `<@${id}>`;
          }
        } catch {
          return `@Unknown-${id}`;
        }
      })
    );

    const memberNames = await Promise.all(
      (data.members || []).map(async id => {
        try {
          if (guild) {
            const member = await guild.members.fetch(id);
            return formatName(member.user, guild);
          } else {
            const user = await client.users.fetch(id);
            return formatName(user);
          }
        } catch {
          return `@Unknown-${id}`;
        }
      })
    );

    // Add extra spacing for specific platoons
    const extraSpacing = (data.label === 'C.A.L.I.B.R.E.' || data.label === 'G.E.N.E.V.A.') ? '\n' : '';

    layoutParts.push(
      `\n\n**${data.label}**\n*${data.fullName}*\n\n**Officers:** ${officerNames.join(', ') || 'None'}\n**Instructors:** ${instructorNames.join(', ') || 'None'}\n**Members:** ${memberNames.join(', ') || 'None'}${extraSpacing}`
    );
  }

  // Split into exactly 2 messages
  const totalParts = layoutParts.length;
  const midPoint = Math.ceil(totalParts / 2);
  
  const firstMessageParts = layoutParts.slice(0, midPoint);
  const secondMessageParts = layoutParts.slice(midPoint);
  
  const firstMessage = `${introText}${firstMessageParts.join('\n')}`;
  const secondMessage = secondMessageParts.join('\n');

  try {
    if (deployData.channelId && deployData.messageId) {
      const targetChannel = await client.channels.fetch(deployData.channelId);
      
      // Update first message
      const oldMsg = await targetChannel.messages.fetch(deployData.messageId);
      await oldMsg.edit(firstMessage);
      
      // Handle second message
      if (deployData.secondMessageId) {
        try {
          const secondMsg = await targetChannel.messages.fetch(deployData.secondMessageId);
          await secondMsg.edit(secondMessage);
        } catch (error) {
          // Second message doesn't exist, create it
          const sent = await targetChannel.send(secondMessage);
          saveJSON(deployPath, {
            channelId: targetChannel.id,
            messageId: deployData.messageId,
            secondMessageId: sent.id
          });
        }
      } else {
        // Create second message for the first time
        const sent = await targetChannel.send(secondMessage);
        saveJSON(deployPath, {
          channelId: targetChannel.id,
          messageId: deployData.messageId,
          secondMessageId: sent.id
        });
      }
      
      console.log(`✅ Deploy messages updated in channel ${deployData.channelId}, 2 messages sent`);
    } else {
      throw new Error('No existing deploy message found');
    }
  } catch (error) {
    console.log(`⚠️ Could not update existing deploy message: ${error.message}`);
    if (fallbackChannel) {
      const sent1 = await fallbackChannel.send(firstMessage);
      const sent2 = await fallbackChannel.send(secondMessage);
      saveJSON(deployPath, {
        channelId: fallbackChannel.id,
        messageId: sent1.id,
        secondMessageId: sent2.id
      });
      console.log(`✅ New deploy messages created in channel ${fallbackChannel.id}, 2 messages sent`);
    } else {
      throw new Error('No fallback channel provided for new deploy message');
    }
  }
}

module.exports = {
  commands: async (message, client) => {
    if (
      !message.content.startsWith('$') &&
      !message.content.startsWith('$$') &&
      !message.content.startsWith('SauceTest') &&
      !message.content.startsWith('deploy')
    ) return;

    const args = message.content.trim().split(/ +/);
    const cmd = args.shift();

    const author = message.member;
    const authorID = message.author.id;

    const ADMIN_IDS = getRoleIDs().admin;
    const SYNC_ACCESS = getRoleIDs().sync;

    // Get platoon leader roles from JSON structure
    const roleIDs = getRoleIDs();
    const PLATOON_LEADER_ROLES = {};
    if (subsections.roleIDs?.server1?.platoons) {
      for (const [platoonName, roleID] of Object.entries(subsections.roleIDs.server1.platoons)) {
        PLATOON_LEADER_ROLES[platoonName] = roleID;
      }
    }

    // New role IDs for Platoon positions
    const PLATOON_LEADER_ROLE = getRoleIDs().platoonLeader;
    const PLATOON_INSTRUCTOR_ROLE = getRoleIDs().platoonInstructor;

    const isAdmin = hasRole(author, ADMIN_IDS) || authorID === '603550636545540096';

    switch (cmd) {
      case '$help': {
        const helpText = `**Subsection Bot Command List**\n\n` +
          `**General Commands**\n` +
          `• \`deploy\` — Shows the full subsection layout.\n` +
          `• \`$sync\` — Updates all members in each subsection based on Discord roles.\n` +
          `• \`$help\` — Displays this help message.\n\n` +
          
          `**Veterancy Commands**\n` +
          `• \`$veterancy @user\` — Check and assign veterancy role for a specific user\n` +
          `• \`$veterancy all\` — Check and assign veterancy roles for all members\n` +
          `• \`$veterancy check @user\` — Check veterancy status without assigning roles\n\n` +
          
          `**Automatic Features**\n` +
          `• New members automatically receive TRA, Cadet, and Trainee roles\n` +
          `• Daily role check at 9:00 AM UTC ensures all members have required roles\n` +
          `• Dr. Sauce responds to messages containing "sauce" or when pinged (30% chance)\n\n` +
          
          `**Admin Commands** (Restricted to @S or Admins)\n` +
          `• \`$$deploy true/false\` — Enable or disable testing mode.\n` +
          `• \`SauceTest14405 / SauceTestend14405\` — Manually toggle testing mode.\n` +
          `• \`$auditlog\` — View audit log.\n` +
          `• \`$clearall\` — Deletes last 100 messages (requires password or admin).\n` +
          `• \`$clearcommands\` — Deletes all command messages.\n` +
          `• \`$debugroles\` — List all roles in the server.\n` +
          `• \`$eval @user rank\` — Promote a member to a specific rank.`;
        
        const sentMsg = await message.channel.send(helpText);
        setTimeout(() => sentMsg.delete().catch(() => {}), 60000);
        break;
      }

      case '$sync': {
        if (!hasRole(author, SYNC_ACCESS) && authorID !== '603550636545540096') {
          const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
          setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
          break;
        }

        try {
        await message.guild.members.fetch(); // fetch full member list
        const allMembers = message.guild.members.cache;
          
          let syncReport = [];
          let totalMembersFound = 0;

        for (const [subName, sub] of Object.entries(subsections)) {
          if (subName === '_intro') continue;

          const roleID = sub.roleID;

          const members = [];
          const officers = [];
          const instructors = [];

            // Check if roles exist in the server
            const subsectionRole = message.guild.roles.cache.get(roleID);
            const platoonLeaderRole = message.guild.roles.cache.get(PLATOON_LEADER_ROLE);
            const platoonInstructorRole = message.guild.roles.cache.get(PLATOON_INSTRUCTOR_ROLE);
            
            if (!subsectionRole) {
              syncReport.push(`⚠️ Role not found for ${subName}: ${roleID}`);
              continue;
            }

          allMembers.forEach(member => {
              const hasSubsectionRole = member.roles.cache.has(roleID);
              const hasPlatoonLeaderRole = member.roles.cache.has(PLATOON_LEADER_ROLE);
              const hasPlatoonInstructorRole = member.roles.cache.has(PLATOON_INSTRUCTOR_ROLE);

              if (hasSubsectionRole) {
              userRoles[member.id] = subName;
                totalMembersFound++;

                // Check if they have platoon leadership roles
                if (hasPlatoonLeaderRole) {
                officers.push(member.id);
                } else if (hasPlatoonInstructorRole) {
                instructors.push(member.id);
                } else {
                  // Only add to members if they don't have leadership roles
                  members.push(member.id);
              }
            }
          });

          sub.members = members;
          sub.officer = officers;
          sub.instructors = instructors;

            syncReport.push(`📊 ${subName}: ${officers.length} officers, ${instructors.length} instructors, ${members.length} members`);
        }

        saveJSON('./subsections.json', subsections);
        saveJSON('./userRoles.json', userRoles);

          addToAuditLog(`${formatName(message.author, message.guild)} synced all subsections`);

          // Create buttons for vet role sync option
          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('sync_vet_yes')
                .setLabel('Yes, sync vet roles')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId('sync_vet_no')
                .setLabel('No, skip vet roles')
                .setStyle(ButtonStyle.Secondary)
            );

          const syncMsg = await message.channel.send({
            content: `✅ Sync complete! Found ${totalMembersFound} total members.\n\n${syncReport.join('\n')}\n\nWould you like to sync veteran roles as well?`,
            components: [row]
          });

          // Create a button collector
          const collector = syncMsg.createMessageComponentCollector({ time: 60000 });

          collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
              await i.reply({ content: 'Only the person who initiated the sync can use these buttons.', ephemeral: true });
              return;
            }

            if (i.customId === 'sync_vet_yes') {
              await i.update({ content: '🔄 Starting veteran role sync...', components: [] });
              
              let processedCount = 0;
              const totalMembers = allMembers.size;
              
              for (const member of allMembers.values()) {
                processedCount++;
                
                // Update progress message less frequently
                if (processedCount === 1 || processedCount === totalMembers || processedCount % 20 === 0) {
                  await syncMsg.edit({
                    content: `🔄 Syncing veteran roles... (${processedCount}/${totalMembers})`
                  });
                }

                await checkAndAssignVeterancy(member, message.guild);
              }

              await syncMsg.edit({ 
                content: `✅ Veteran role sync complete! Processed ${totalMembers} members.`
              });

              addToAuditLog(`${formatName(message.author, message.guild)} synced veteran roles`);
            } else if (i.customId === 'sync_vet_no') {
              await i.update({
                content: `✅ Sync complete! Found ${totalMembersFound} total members.\n\n${syncReport.join('\n')}\n\n*Skipped veteran role sync.*`,
                components: []
              });
            }
          });

          collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
              await syncMsg.edit({
                content: `✅ Sync complete! Found ${totalMembersFound} total members.\n\n${syncReport.join('\n')}\n\n*Veteran role sync option expired.*`,
                components: []
              });
            }
          });

          // Update deploy message
          await updateDeployMessage(client, message.channel);

          // Auto-update deploy message after sync
          try {
            await updateDeployMessage(client);
          } catch (error) {
            console.error('Auto-deploy update error:', error);
          }
        } catch (error) {
          console.error('Sync error:', error);
          const errorMsg = await message.channel.send(`❌ Error syncing subsections: ${error.message}`);
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
        }
        break;
      }

      case 'deploy': {
        try {
          await updateDeployMessage(client, message.channel);
          const successMsg = await message.channel.send('✅ Deploy message updated successfully.');
          setTimeout(() => successMsg.delete().catch(() => {}), 5000);
        } catch (error) {
          console.error('Deploy error:', error);
          const errorMsg = await message.channel.send(`❌ Error updating deploy message: ${error.message}`);
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
        }
        break;
      }

      case '$clear': {
        if (!isAdmin) {
          const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
          break;
        }

        const [section, target] = args;
        
        if (!subsections[section]) {
          const errorMsg = await message.channel.send('❌ Subsection not found.');
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
          break;
        }

        if (target === 'all') {
          subsections[section].officer = [];
          subsections[section].instructors = [];
          subsections[section].members = [];
          addToAuditLog(`${formatName(message.author, message.guild)} cleared all personnel from ${section}`);
        } else if (['officers', 'instructors', 'members'].includes(target)) {
          const key = target === 'officers' ? 'officer' : target;
          subsections[section][key] = [];
          addToAuditLog(`${formatName(message.author, message.guild)} cleared ${target} from ${section}`);
        } else {
          const errorMsg = await message.channel.send('❌ Invalid target. Use: officers, instructors, members, or all');
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
        break;
      }

        saveJSON('./subsections.json', subsections);
        const successMsg = await message.channel.send(`✅ Cleared ${target} in ${section}.`);
        setTimeout(() => successMsg.delete().catch(() => {}), 10000);
        break;
      }

      case '$auditlog': {
        if (!isAdmin) {
          const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
          break;
        }

        const recentLogs = auditLog.slice(-10);
        const logText = recentLogs.length > 0 
          ? `**Audit Log (Last 10):**\n${recentLogs.join('\n')}`
          : '**Audit Log:** No recent activity.';
        
        const logMsg = await message.channel.send(logText);
        setTimeout(() => logMsg.delete().catch(() => {}), 10000);
        break;
      }

      case '$clearall': {
        if (!isAdmin && !message.content.includes('2430114')) {
          const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
          break;
        }

        try {
        const msgs = await message.channel.messages.fetch({ limit: 100 });
          const toDelete = msgs.filter(msg => 
            msg.author.id === client.user.id ||
            msg.content.includes('2430114') ||
            msg.content.startsWith('$') ||
            msg.content.startsWith('$$') ||
            msg.content.startsWith('SauceTest') ||
            msg.content.startsWith('deploy')
          );

          if (toDelete.size > 0) {
            await message.channel.bulkDelete(toDelete);
            addToAuditLog(`${formatName(message.author, message.guild)} cleared ${toDelete.size} messages`);
          }
        } catch (error) {
          console.error('Clearall error:', error);
          const errorMsg = await message.channel.send('❌ Error clearing messages.');
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
        }
        break;
      }

      case '$clearcommands': {
        if (!isAdmin) {
          const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
          break;
        }

        try {
        const msgs = await message.channel.messages.fetch({ limit: 100 });
          const toDelete = msgs.filter(msg => 
            msg.content.startsWith('$') || 
            msg.content.startsWith('$$') ||
            msg.content.startsWith('SauceTest') ||
            msg.content.startsWith('deploy')
          );

          if (toDelete.size > 0) {
            await message.channel.bulkDelete(toDelete);
            addToAuditLog(`${formatName(message.author, message.guild)} cleared ${toDelete.size} command messages`);
          }
        } catch (error) {
          console.error('Clearcommands error:', error);
          const errorMsg = await message.channel.send('❌ Error clearing command messages.');
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
          }
        break;
      }

      case '$$deploy': {
        if (!isAdmin) {
          const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
          break;
        }

        testingMode = args[0] === 'true';
        const statusMsg = await message.channel.send(`🧪 Testing mode is now ${testingMode ? 'enabled' : 'disabled'}.`);
        setTimeout(() => statusMsg.delete().catch(() => {}), 10000);
        addToAuditLog(`${formatName(message.author, message.guild)} ${testingMode ? 'enabled' : 'disabled'} testing mode`);
        break;
      }

      case 'SauceTest14405': {
        if (!isAdmin) {
          const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
          break;
        }

        testingMode = true;
        const statusMsg = await message.channel.send('🧪 Testing mode activated.');
        setTimeout(() => statusMsg.delete().catch(() => {}), 10000);
        addToAuditLog(`${formatName(message.author, message.guild)} activated testing mode`);
        break;
      }

      case 'SauceTestend14405': {
        if (!isAdmin) {
          const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
          break;
        }

        testingMode = false;
        const statusMsg = await message.channel.send('🧪 Testing mode ended.');
        setTimeout(() => statusMsg.delete().catch(() => {}), 10000);
        addToAuditLog(`${formatName(message.author, message.guild)} ended testing mode`);
        break;
      }

      case '$veterancy': {
        if (!hasRole(author, SYNC_ACCESS) && authorID !== '603550636545540096') {
          const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
          setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
          break;
        }

        const target = args[0];
        const isCheckOnly = args[1] === 'check';

        if (!target) {
          const errorMsg = await message.channel.send('❌ Please specify a user (@user) or "all" to check all members.');
          setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
          break;
        }

        try {
          if (target === 'all') {
            // Check veterancy for all members
            await message.guild.members.fetch();
            const allMembers = message.guild.members.cache;
            
            const statusMsg = await message.channel.send('🔄 Checking veterancy for all members... This may take a moment.');
            
            let processedCount = 0;
            let assignedCount = 0;
            const results = [];

            for (const [memberId, member] of allMembers) {
              if (member.user.bot) continue; // Skip bots
              
              const result = await checkAndAssignVeterancy(member, message.guild);
              if (result) {
                processedCount++;
                if (result.roleAssigned) assignedCount++;
                
                if (isCheckOnly) {
                  results.push(`${result.member}: ${result.monthsInServer} months (${result.veterancyLevel})`);
                } else {
                  results.push(`${result.member}: ${result.monthsInServer} months → ${result.veterancyLevel}`);
                }
              }
            }

            const reportText = isCheckOnly 
              ? `📊 **Veterancy Check Results**\n\n${results.slice(0, 20).join('\n')}${results.length > 20 ? `\n\n... and ${results.length - 20} more members` : ''}\n\n**Total checked:** ${processedCount}`
              : `✅ **Veterancy Assignment Complete**\n\n${results.slice(0, 20).join('\n')}${results.length > 20 ? `\n\n... and ${results.length - 20} more members` : ''}\n\n**Total processed:** ${processedCount}\n**Roles assigned:** ${assignedCount}`;

            await statusMsg.edit(reportText);
            setTimeout(() => statusMsg.delete().catch(() => {}), 30000);

            addToAuditLog(`${formatName(message.author, message.guild)} ${isCheckOnly ? 'checked' : 'assigned'} veterancy for all members`);

          } else {
            // Check veterancy for specific user
            const userId = target.replace(/[<@!>]/g, '');
            const member = message.guild.members.cache.get(userId);
            
            if (!member) {
              const errorMsg = await message.channel.send('❌ User not found in this server.');
              setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
              break;
            }

            const result = await checkAndAssignVeterancy(member, message.guild);
            
            if (result) {
              const actionText = isCheckOnly ? 'checked' : 'assigned';
              const roleText = isCheckOnly ? '' : (result.roleAssigned ? `\n✅ **Role assigned:** ${result.veterancyLevel}` : '\n❌ **No role assigned** (under 1 month)');
              
              const resultText = `📊 **Veterancy ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}**\n\n**Member:** ${result.member}\n**Join Date:** ${result.joinDate}\n**Time in Server:** ${result.monthsInServer} months (${result.daysInServer} days)\n**Veterancy Level:** ${result.veterancyLevel}${roleText}`;
              
              const successMsg = await message.channel.send(resultText);
              setTimeout(() => successMsg.delete().catch(() => {}), 15000);

              addToAuditLog(`${formatName(message.author, message.guild)} ${actionText} veterancy for ${result.member}`);
            } else {
              const errorMsg = await message.channel.send('❌ Could not determine veterancy for this user.');
              setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
            }
          }
        } catch (error) {
          console.error('Veterancy error:', error);
          const errorMsg = await message.channel.send(`❌ Error processing veterancy: ${error.message}`);
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
        }
        break;
      }

      case '$debugroles': {
        if (!isAdmin) {
          const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
          break;
        }

        try {
          // Get version information
          const packageJson = require('./package.json');
          const botVersion = packageJson.version;
          const nodeVersion = process.version;
          const discordJsVersion = packageJson.dependencies['discord.js'];
          
          const allRoles = message.guild.roles.cache;
          const roleList = [];
          
          // Add version information at the top
          roleList.push(`**🤖 Bot Version Information:**`);
          roleList.push(`• Bot Version: ${botVersion}`);
          roleList.push(`• Node.js Version: ${nodeVersion}`);
          roleList.push(`• Discord.js Version: ${discordJsVersion}`);
          roleList.push(`• Testing Mode: ${testingMode ? 'Enabled' : 'Disabled'}`);
          roleList.push(`• Server: ${message.guild.name} (${message.guild.id})`);
          roleList.push(`• Members: ${message.guild.memberCount}`);
          
          // Check subsection roles
          roleList.push('\n**Subsection Roles:**');
          for (const [subName, sub] of Object.entries(subsections)) {
            if (subName === '_intro') continue;
            const role = allRoles.get(sub.roleID);
            if (role) {
              roleList.push(`✅ ${subName}: ${role.name} (${role.id})`);
            } else {
              roleList.push(`❌ ${subName}: Role not found (${sub.roleID})`);
            }
          }
          
          roleList.push('\n**Platoon Leader Roles:**');
          for (const [subName, roleID] of Object.entries(PLATOON_LEADER_ROLES)) {
            const role = allRoles.get(roleID);
            if (role) {
              roleList.push(`✅ ${subName}: ${role.name} (${role.id})`);
            } else {
              roleList.push(`❌ ${subName}: Role not found (${roleID})`);
            }
          }
          
          roleList.push('\n**Platoon Leadership Roles:**');
          const platoonLeaderRole = allRoles.get(PLATOON_LEADER_ROLE);
          const platoonInstructorRole = allRoles.get(PLATOON_INSTRUCTOR_ROLE);
          
          if (platoonLeaderRole) {
            roleList.push(`✅ Platoon Leader: ${platoonLeaderRole.name} (${platoonLeaderRole.id})`);
          } else {
            roleList.push(`❌ Platoon Leader: Role not found (${PLATOON_LEADER_ROLE})`);
          }
          
          if (platoonInstructorRole) {
            roleList.push(`✅ Platoon Instructor: ${platoonInstructorRole.name} (${platoonInstructorRole.id})`);
          } else {
            roleList.push(`❌ Platoon Instructor: Role not found (${PLATOON_INSTRUCTOR_ROLE})`);
          }
          
          roleList.push('\n**Admin Roles:**');
          for (const roleID of ADMIN_IDS) {
            const role = allRoles.get(roleID);
            if (role) {
              roleList.push(`✅ Admin: ${role.name} (${role.id})`);
            } else {
              roleList.push(`❌ Admin: Role not found (${roleID})`);
            }
          }
          
          roleList.push('\n**Sync Access Roles:**');
          for (const roleID of SYNC_ACCESS) {
            const role = allRoles.get(roleID);
            if (role) {
              roleList.push(`✅ Sync: ${role.name} (${role.id})`);
            } else {
              roleList.push(`❌ Sync: Role not found (${roleID})`);
            }
          }

          // Add veterancy roles
          roleList.push('\n**Veterancy Roles:**');
          for (const [degree, roleID] of Object.entries(VETERANCY_ROLES)) {
            const role = allRoles.get(roleID);
            if (role) {
              roleList.push(`✅ ${degree}: ${role.name} (${role.id})`);
            } else {
              roleList.push(`❌ ${degree}: Role not found (${roleID})`);
            }
          }

          const debugMsg = await message.channel.send(roleList.join('\n'));
          setTimeout(() => debugMsg.delete().catch(() => {}), 30000);
        } catch (error) {
          console.error('Debug roles error:', error);
          const errorMsg = await message.channel.send(`❌ Error checking roles: ${error.message}`);
          setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
        }
        break;
      }

      case '$eval': {
        // Check if the user is a warrant officer or - - - - OFC - - - -
        if (!hasRole(author, [WARRANT_OFFICER_ROLE, OFFICER_ROLE])) {
          const errorMsg = await message.channel.send('❌ You do not have permission to use this command. Only Warrant Officers and - - - - OFC - - - - can use this command.');
          setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
          break;
        }

        // Check command format
        if (args.length !== 2) {
          const errorMsg = await message.channel.send('❌ Invalid command format. Use: `$eval @user rank` where rank is private, pfc, or lance');
          setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
          break;
        }

        // Parse arguments
        const userMention = args[0];
        const rank = args[1].toLowerCase();
        
        // Validate rank
        if (!['private', 'pfc', 'lance'].includes(rank)) {
          const errorMsg = await message.channel.send('❌ Invalid rank. Must be one of: private, pfc, lance');
          setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
          break;
        }

        try {
          // Get the target user
          const userID = userMention.replace(/[<@!>]/g, '');
          const targetMember = await message.guild.members.fetch(userID);

          // Check if user has Cadet role
          if (!hasRole(targetMember, [REMOVE_ROLES.cadet])) {
            const errorMsg = await message.channel.send('❌ This command can only be used on members with the Cadet role.');
            setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
            break;
          }

          // Remove old roles
          for (const roleID of Object.values(REMOVE_ROLES)) {
            if (targetMember.roles.cache.has(roleID)) {
              await targetMember.roles.remove(roleID);
            }
          }

          // Add new rank role
          await targetMember.roles.add(RANK_ROLES[rank]);

          // Add additional roles
          for (const roleID of Object.values(ADD_ROLES)) {
            await targetMember.roles.add(roleID);
          }

          // Log the promotion
          const successMsg = await message.channel.send(`✅ Successfully promoted ${targetMember.user.tag} to ${rank.toUpperCase()}`);
          setTimeout(() => successMsg.delete().catch(() => {}), 5000);
          
          // Add to audit log
          addToAuditLog(`${formatName(message.author, message.guild)} promoted ${formatName(targetMember.user, message.guild)} to ${rank.toUpperCase()}`);
        } catch (error) {
          console.error('Eval command error:', error);
          const errorMsg = await message.channel.send(`❌ Error executing command: ${error.message}`);
          setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
        }
        break;
      }

      // HIDDEN: $nick command for owner only
      case '$nick': {
        if (authorID !== '603550636545540096') break; // Only allow owner
        const newNick = args.join(' ').trim();
        if (!newNick) {
          await message.reply('❌ Please provide a nickname. Usage: `$nick <nickname>`');
          break;
        }
        try {
          await message.member.setNickname(newNick);
          await message.reply(`✅ Nickname changed to **${newNick}**`);
        } catch (err) {
          await message.reply('❌ Failed to change nickname. Do I have the right permissions?');
        }
        break;
      }
    }
  }
};