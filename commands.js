// commands.js
const fs = require('fs');
const subsections = require('./subsections.json');
const userRoles = require('./userRoles.json');
const deployPath = './deployMessages.json';
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { handlePlay, handleSkip, handleQueue } = require('./musicHandler');
const { exec } = require('child_process');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const path = require('path');

function saveJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function formatName(user, guild = null) {
  if (!user) return 'Unknown User';
  if (guild && guild.members.cache.has(user.id)) {
    return guild.members.cache.get(user.id).displayName;
  }
  return user.username;
}

function hasRole(member, ids) {
  return member.roles.cache.some(role => ids.includes(role.id));
}

function addToAuditLog(action) {
  console.log(`[AUDIT] ${action}`);
}

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

// Veterancy role IDs
const VETERANCY_ROLES = {
  '1st Degree': '1323429003264266251',  // 1 year or more
  '2nd Degree': '1323429224169607309',  // 9 months
  '3rd Degree': '1323429658133532813',  // 6 months
  '4th Degree': '1323430282119876728',  // 3 months
  '5th Degree': '1323430587410813039'   // 1 month
};

const AUTO_CLEANUP_INTERVAL = 3600000; // 1 hour in milliseconds

async function automaticRoleCleanup(guild) {
  try {
    // Fetch all guild members
    await guild.members.fetch();
    const members = guild.members.cache;
    
    let fixedCount = 0;
    
    // Process each member
    for (const [memberId, member] of members) {
      if (member.user.bot) continue; // Skip bots
      
      // Check for inappropriate role combinations
      const hasOfficerRole = member.roles.cache.has(OFFICER_ROLE);
      const hasWarrantRole = member.roles.cache.has(WARRANT_OFFICER_ROLE);
      const hasEnlistedRole = member.roles.cache.has(ADD_ROLES.enlisted);
      const hasMemberRole = member.roles.cache.has(ADD_ROLES.member);
      const hasAmbassadorRole = member.roles.cache.has(AMBASSADOR_ROLE);
      
      // If they have officer/warrant/enlisted/member/ambassador roles, they shouldn't have new member roles
      if (hasOfficerRole || hasWarrantRole || hasEnlistedRole || hasMemberRole || hasAmbassadorRole) {
        let rolesRemoved = false;
        for (const [roleName, roleId] of Object.entries(REMOVE_ROLES)) {
          if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            rolesRemoved = true;
          }
        }
        if (rolesRemoved) fixedCount++;
      }
    }

    if (fixedCount > 0) {
      console.log(`[Auto Cleanup] Fixed roles for ${fixedCount} members`);
      addToAuditLog(`Automatic role cleanup fixed ${fixedCount} members`);
    }
  } catch (error) {
    console.error('[Auto Cleanup] Error:', error);
  }
}

const WARRANT_OFFICER_ROLE = '1378985570289844314'; // Chief Warrant Officer role ID
const OFFICER_ROLE = '1305992733835399238'; // - - - - OFC - - - - role ID
const AMBASSADOR_ROLE = '1322117528297934949'; // Ambassador to the Khanate role ID

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

const JUNIOR_OFFICER_ROLE = '1295544720222589069'; // Junior Lieutenant role ID
const ORGANIZATION_ROLE = '1295545358767755336'; // Organization role ID

// Funny delete messages with casual Reynolds-style humor
const DELETE_MESSAGES = [
  "Just performed some message deletion surgery! And this time I only set three things on fire... progress!",
  "Breaking news: Local doctor discovers revolutionary message deletion technique. Side effects may include excessive sarcasm!",
  "You know what they say - the best medicine is deleting messages and making jokes about it! *winks at camera*",
  "I'd make a joke about my medical degree, but like these messages, it's probably best we pretend it never existed!",
  "Messages deleted with the precision of... well, me after WAY too much coffee. But hey, it worked!",
  "Plot twist: The messages were the disease all along! *casually juggles medical supplies*",
  "Congratulations! You've witnessed the most chaotic message cleanup since my last 'totally authorized' experiment!",
  "Not saying I'm the best at deleting messages, but I'm definitely the most entertaining at failing upwards!",
  "Messages eliminated! And unlike my attempts at being a serious doctor, this actually worked!",
  "Maximum effort! *trips over medical equipment while messages dramatically vanish*"
];

// Add after DELETE_MESSAGES array
const SAUCE_STORIES = [
  // Existing stories
  "Dr. Sauce once tried to perform surgery with a pizza cutter, claiming it was 'innovative medical technology.' The patient was a teddy bear, thankfully.",
  "Legend has it that Dr. Sauce got his medical license from a cereal box. He still proudly displays it next to his 'World's Okayest Doctor' mug.",
  "During his last performance review, Dr. Sauce demonstrated his 'revolutionary' healing technique - throwing band-aids at people from across the room. His accuracy was... questionable.",
  "Dr. Sauce was once found giving a detailed medical lecture to a room full of rubber ducks. He claims they were his most attentive audience yet.",
  "In an attempt to improve hospital efficiency, Dr. Sauce installed a slip-n-slide in the hallway. The resulting chaos is still mentioned in staff meetings.",
  "Dr. Sauce's latest research paper was titled 'Why Everything Can Be Fixed With Duct Tape: A Medical Perspective.' It was rejected by every medical journal, surprisingly.",
  "During a power outage, Dr. Sauce tried to power the medical equipment with a hamster wheel. The hamster quit after day one, citing 'unrealistic work expectations.'",
  "Dr. Sauce's attempt at organizing medical records involved sorting files by 'vibes' and 'how cool the patient's name sounded.' The administration was not impressed.",
  "In his spare time, Dr. Sauce practices medicine by playing Operation. He consistently loses to the buzzer but insists it's 'rigged.'",
  "Dr. Sauce once diagnosed a computer virus as the common cold and prescribed it chicken soup. IT was not amused.",
  "During a staff meeting, Dr. Sauce presented his new medical theory that laughter is the best medicine by telling dad jokes for two hours straight. Three nurses resigned.",
  "Dr. Sauce's solution to long waiting times was to install a 'time machine' (just a cardboard box with Christmas lights). Surprisingly, patients did report feeling like time went faster.",
  "When asked about his qualifications, Dr. Sauce proudly showed off his collection of medical drama DVDs, claiming they were 'basically the same as medical school.'",
  "Dr. Sauce's attempt at modernizing the hospital involved replacing all the chairs with exercise balls. The resulting chaos lasted exactly 3.5 minutes.",
  "In his latest medical breakthrough, Dr. Sauce discovered that all his patients felt better after he stopped trying to help them. He calls it 'preventative doctor avoidance.'",

  // New stories
  "Dr. Sauce's experimental 'music therapy' consisted of him playing kazoo covers of pop songs. The patients recovered quickly, if only to escape the noise.",
  "After watching a spy movie, Dr. Sauce started writing prescriptions in invisible ink. The pharmacists now keep a UV light and decoder ring at the counter.",
  "Dr. Sauce once tried to cure writer's cramp by teaching a patient to write with their toes. The resulting handwriting was actually an improvement.",
  "In an effort to make the waiting room more entertaining, Dr. Sauce installed a ball pit. He now spends most consultations fishing patients out of it.",
  "Dr. Sauce's attempt at creating a healthy cafeteria menu involved replacing all food with different flavored jello. The jello rebellion of 2023 is now hospital legend.",
  "During a slow day, Dr. Sauce tried to teach the MRI machine to sing. The resulting sounds were mistaken for a new form of diagnostic warning.",
  "Dr. Sauce's solution to running out of hand sanitizer was to install tiny water guns filled with soap at every doorway. The janitors are still finding soap in the ceiling.",
  "After binge-watching ninja movies, Dr. Sauce started delivering test results via paper airplane. His accuracy has improved to a solid 23%.",
  "Dr. Sauce once convinced the entire pediatric ward that medicine tastes bad because the germs are actually tiny dragons that only like spicy food.",
  "In an attempt to make hospital gowns more fashionable, Dr. Sauce added sequins and LED lights. The resulting power surge took out three floors.",
  "Dr. Sauce's idea of improving patient mobility involved installing a zipline between departments. The insurance company had some questions.",
  "During a particularly boring shift, Dr. Sauce reorganized the pharmacy alphabetically by how difficult the medications were to pronounce.",
  "Dr. Sauce's solution to hospital parking problems was to introduce a valet service using only unicycles. It went exactly as well as you'd expect.",
  "After watching too many superhero movies, Dr. Sauce started wearing a cape to surgeries. It got caught in an automatic door seven times in one day.",
  "Dr. Sauce's attempt at creating a new patient tracking system involved giving everyone party horns to honk when they needed assistance.",
  "In the name of efficiency, Dr. Sauce tried to teach the hospital's therapy dogs to take blood pressure readings. They were great at comfort, terrible at mathematics.",
  "Dr. Sauce once replaced all the water coolers with chocolate milk fountains, claiming it was 'for calcium deficiency prevention.'",
  "During a heatwave, Dr. Sauce converted the hospital lobby into a makeshift beach, complete with inflatable palm trees and a kiddie pool filled with ice cubes.",
  "Dr. Sauce's interpretation of 'paperless office' was to communicate exclusively through interpretive dance. The resulting chaos lasted three memorable hours.",
  "After watching a cooking show, Dr. Sauce started presenting medical diagnoses as if he was judging a cooking competition. 'Your blood pressure is... elevated!'",
  "Dr. Sauce's solution to noisy hospital corridors was to require everyone to move by either tiptoeing or moonwalking. The resulting dance-offs were legendary.",
  "In an attempt to make X-rays more fun, Dr. Sauce added googly eyes to all the machines. Patients reported feeling judged by their own skeletons.",
  "Dr. Sauce once tried to implement a 'bring your pet to work day.' It ended when someone brought in their pet giraffe.",
  "To improve hospital navigation, Dr. Sauce created a treasure map system with riddles. Three patients and two doctors are still trying to find the cafeteria.",
  "Dr. Sauce's attempt at creating a hospital radio station consisted entirely of him making beeping noises and humming the theme from M*A*S*H.",
  "During a slow night shift, Dr. Sauce taught himself ventriloquism to make the mannequins in the training room tell dad jokes.",
  "Dr. Sauce once replaced all the elevator music with his own beatbox versions of classical music. Mozart has never sounded quite the same.",
  "In an effort to reduce stress, Dr. Sauce installed a 'compliment cannon' that would shoot out nice messages. The paper cuts were an unforeseen complication.",
  "Dr. Sauce's solution to long meetings was to require everyone to speak in rhymes. The quarterly budget review became surprisingly entertaining.",
  "After watching a documentary about penguins, Dr. Sauce insisted on sliding down hallways on his belly to 'conserve energy.' The wax budget tripled.",
  "Dr. Sauce once attempted to create a hospital-wide game of musical chairs during shift changes. The resulting chaos is now part of the employee orientation video.",
  "In the spirit of recycling, Dr. Sauce started using old x-rays as mood lighting in the break room. The gothic atmosphere did wonders for coffee breaks.",
  "Dr. Sauce's attempt at creating a hospital mascot involved him dressing up as 'Captain Bandaid,' complete with a utility belt full of lollipops.",
  "During a particularly creative moment, Dr. Sauce replaced all the 'Exit' signs with 'Plot Twist' signs. The fire marshal was not impressed.",
  "Dr. Sauce once tried to implement a hospital-wide game of Marco Polo to help people find their way around. Three departments are still playing."
];

// Function to get a random Sauce story
function getRandomSauceStory() {
  return SAUCE_STORIES[Math.floor(Math.random() * SAUCE_STORIES.length)];
}

// Bot version and changelog
const BOT_VERSION = {
  version: "2.4.0",
  lastUpdated: "2024-03-23",
  recentChanges: [
    "Restricted subfaction role assignment to officers and instructors",
    "Added requirement to mention users for subfaction role assignment",
    "Prevented self-assignment of subfaction roles",
    "Standardized message cleanup timeouts",
    "Updated help messages and error notifications"
  ]
};

// Message cleanup timeouts (in milliseconds)
const TIMEOUTS = {
  ERROR_MESSAGE: 10000,    // 10 seconds for error messages
  HELP_MESSAGE: 30000,     // 30 seconds for help messages
  STATUS_MESSAGE: 15000,   // 15 seconds for status updates
  COMMAND_MESSAGE: 5000    // 5 seconds for command acknowledgments
};

// Important role IDs to check
const IMPORTANT_ROLES = {
  'TRA': '1305993273386729532',
  'Cadet': '1295543221530787870',
  'Trainee': '1295546993736679536'
};

// Subfaction roles
const SUBFACTION_ROLES = {
  'METH': {
    name: 'M.E.T.H.',
    id: '1336145646779891732'
  },
  'ARMOR': {
    name: 'A.R.M.O.R.',
    id: '1336145407444783177'
  },
  'DIESEL': {
    name: 'D.I.E.S.E.L.',
    id: '1336145474721419345'
  },
  'STATIC': {
    name: 'S.T.A.T.I.C.',
    id: '1383685207311384616'
  },
  'RETICLE': {
    name: 'R.E.T.I.C.L.E.',
    id: '1336145271213527140'
  },
  'STALKER': {
    name: 'S.T.A.L.K.E.R.',
    id: '1336145558917615637'
  },
  'GENEVA': {
    name: 'G.E.N.E.V.A.',
    id: '1336145717978468352'
  }
};

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

async function assignFactionRole(member, faction, message) {
  // Verify the role exists
  const roleToAdd = message.guild.roles.cache.get(faction.id);
  if (!roleToAdd) {
    await message.channel.send(`*Scratches head* I can't find the role for ${faction.name}. Please notify an admin!`);
    return;
  }

  // Check if they already have this role
  if (member.roles.cache.has(faction.id)) {
    await message.channel.send(`${getRandomSauceStory()}\n\nOh right, about your request - you're already in ${faction.name}! No changes needed. 🏥`);
    return;
  }

  // Remove all other subfaction roles
  let removedRoles = [];
  for (const otherFaction of Object.values(SUBFACTION_ROLES)) {
    if (member.roles.cache.has(otherFaction.id)) {
      await member.roles.remove(otherFaction.id);
      removedRoles.push(otherFaction.name);
    }
  }

  // Add the selected role
  await member.roles.add(faction.id);

  // Add the organization role if they don't have it
  if (!member.roles.cache.has(ORGANIZATION_ROLE)) {
    await member.roles.add(ORGANIZATION_ROLE);
  }

  // Send success message
  let successMessage = `${getRandomSauceStory()}\n\nAnyway, you've been assigned to ${faction.name}! 🎉`;
  if (removedRoles.length > 0) {
    successMessage += `\n*Note: Removed from ${removedRoles.join(', ')}*`;
  }
  await message.channel.send(successMessage);

  // Add to audit log
  let auditMessage = `${formatName(member.user, message.guild)} selected the ${faction.name} subfaction`;
  if (removedRoles.length > 0) {
    auditMessage += ` (removed from ${removedRoles.join(', ')})`;
  }
  addToAuditLog(auditMessage);
}

const commands = async (message, client) => {
  // Start automatic role cleanup when bot processes first message
  if (!global.cleanupInterval) {
    global.cleanupInterval = setInterval(() => {
      if (message.guild) {
        automaticRoleCleanup(message.guild);
      }
    }, AUTO_CLEANUP_INTERVAL);
    
    // Run initial cleanup
    if (message.guild) {
      automaticRoleCleanup(message.guild);
    }
  }

  // Check for Joe/Biden mentions with 3% chance
  const content = message.content.toLowerCase();
  if ((content.includes('joe') || content.includes('biden')) && Math.random() < 0.03) {
    await message.channel.send('AIIIIIIIIIIRRRRRRRRRRRRRRRPPPPPPPPPORRRRRRRRRRTTTTTTTTSSSSSSSSSS');
    return;
  }

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
        `• \`$help\` — Displays this help message.\n` +
        `• \`$version\` — Shows current bot version and recent updates.\n\n` +
        
        `**Music Commands** (Requires DJ Role)\n` +
        `• \`$play <url/search>\` — Play music from YouTube or Spotify\n` +
        `   - Works with YouTube videos\n` +
        `   - Works with Spotify tracks, playlists, and albums\n` +
        `   - Can search by name: "$play never gonna give you up"\n` +
        `   - Must be in a voice channel\n` +
        `• \`$skip\` — Skip the current song\n` +
        `• \`$queue\` — Show the current music queue\n\n` +
        
        `**Veterancy Commands**\n` +
        `• \`$veterancy @user\` — Check and assign veterancy role for a specific user\n` +
        `• \`$veterancy all\` — Check and assign veterancy roles for all members\n` +
        `• \`$veterancy check @user\` — Check veterancy status without assigning roles\n\n` +
        
        `**Message Management**\n` +
        `• \`$delete 5/10/50\` — Delete messages (Lieutenant+ only)\n\n` +
        
        `**Automatic Features**\n` +
        `• New members automatically receive TRA, Cadet, and Trainee roles\n` +
        `• Daily role check at 9:00 AM UTC ensures all members have required roles\n\n` +
        
        `**Admin Commands** (Restricted to @S or Admins)\n` +
        `• \`$$deploy true/false\` — Enable or disable testing mode.\n` +
        `• \`SauceTest14405 / SauceTestend14405\` — Manually toggle testing mode.\n` +
        `• \`$auditlog\` — View audit log.\n` +
        `• \`$clearall\` — Deletes last 100 messages (requires password or admin).\n` +
        `• \`$clearcommands\` — Deletes all command messages.\n` +
        `• \`$debugroles\` — List all roles in the server.\n` +
        `• \`$eval @user rank\` — Promote a member to a specific rank.\n` +
        `• \`$reaction\` — Create an organization role selector (Dr. Sauce only).\n` +
        `• \`$fixed\` — Remove Cadet/TRA/Trainee roles from members (Dr. Sauce only).\n` +
        `• \`$logs\` — Show recent bot logs (auto-deletes after 2 minutes).`;
      
      const sentMsg = await message.channel.send(helpText);
      setTimeout(() => sentMsg.delete().catch(() => {}), TIMEOUTS.HELP_MESSAGE);
      break;
    }

    case '$sync': {
      if (!hasRole(author, SYNC_ACCESS) && authorID !== '603550636545540096') {
        const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
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
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
      }
      break;
    }

    case 'deploy': {
      try {
        await updateDeployMessage(client, message.channel);
        const successMsg = await message.channel.send('✅ Deploy message updated successfully.');
        setTimeout(() => successMsg.delete().catch(() => {}), TIMEOUTS.COMMAND_MESSAGE);
      } catch (error) {
        console.error('Deploy error:', error);
        const errorMsg = await message.channel.send(`❌ Error updating deploy message: ${error.message}`);
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
      }
      break;
    }

    case '$clear': {
      if (!isAdmin) {
        const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      const [section, target] = args;
      
      if (!subsections[section]) {
        const errorMsg = await message.channel.send('❌ Subsection not found.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
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
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
      break;
    }

      saveJSON('./subsections.json', subsections);
      const successMsg = await message.channel.send(`✅ Cleared ${target} in ${section}.`);
      setTimeout(() => successMsg.delete().catch(() => {}), TIMEOUTS.COMMAND_MESSAGE);
      break;
    }

    case '$auditlog': {
      if (!isAdmin) {
        const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      const recentLogs = auditLog.slice(-10);
      const logText = recentLogs.length > 0 
        ? `**Audit Log (Last 10):**\n${recentLogs.join('\n')}`
        : '**Audit Log:** No recent activity.';
      
      const logMsg = await message.channel.send(logText);
      setTimeout(() => logMsg.delete().catch(() => {}), TIMEOUTS.COMMAND_MESSAGE);
      break;
    }

    case '$clearall': {
      if (!isAdmin && !message.content.includes('2430114')) {
        const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      try {
        const msgs = await message.channel.messages.fetch({ limit: 100 });
        const toDelete = msgs.filter(msg => {
          // Skip messages that are discussing subsections or bot functionality
          if (msg.content.toLowerCase().includes('subsection') && 
              (msg.content.toLowerCase().includes('level 50') || 
               msg.content.toLowerCase().includes('m.e.t.h.') || 
               msg.content.toLowerCase().includes('medic'))) {
            return false;
          }
          
          return msg.author.id === client.user.id ||
                 msg.content.includes('2430114') ||
                 msg.content.startsWith('$') ||
                 msg.content.startsWith('$$') ||
                 msg.content.startsWith('SauceTest') ||
                 msg.content.startsWith('deploy');
        });

        if (toDelete.size > 0) {
          await message.channel.bulkDelete(toDelete);
          addToAuditLog(`${formatName(message.author, message.guild)} cleared ${toDelete.size} messages`);
        }
      } catch (error) {
        console.error('Clearall error:', error);
        const errorMsg = await message.channel.send('❌ Error clearing messages.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
      }
      break;
    }

    case '$clearcommands': {
      if (!isAdmin) {
        const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
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
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        }
      break;
    }

    case '$$deploy': {
      if (!isAdmin) {
        const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      testingMode = args[0] === 'true';
      const statusMsg = await message.channel.send(`🧪 Testing mode is now ${testingMode ? 'enabled' : 'disabled'}.`);
      setTimeout(() => statusMsg.delete().catch(() => {}), TIMEOUTS.COMMAND_MESSAGE);
      addToAuditLog(`${formatName(message.author, message.guild)} ${testingMode ? 'enabled' : 'disabled'} testing mode`);
      break;
    }

    case 'SauceTest14405': {
      if (!isAdmin) {
        const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      testingMode = true;
      const statusMsg = await message.channel.send('🧪 Testing mode activated.');
      setTimeout(() => statusMsg.delete().catch(() => {}), TIMEOUTS.COMMAND_MESSAGE);
      addToAuditLog(`${formatName(message.author, message.guild)} activated testing mode`);
      break;
    }

    case 'SauceTestend14405': {
      if (!isAdmin) {
        const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      testingMode = false;
      const statusMsg = await message.channel.send('🧪 Testing mode ended.');
      setTimeout(() => statusMsg.delete().catch(() => {}), TIMEOUTS.COMMAND_MESSAGE);
      addToAuditLog(`${formatName(message.author, message.guild)} ended testing mode`);
      break;
    }

    case '$veterancy': {
      if (!hasRole(author, SYNC_ACCESS) && authorID !== '603550636545540096') {
        const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      const target = args[0];
      const isCheckOnly = args[1] === 'check';

      if (!target) {
        const errorMsg = await message.channel.send('❌ Please specify a user (@user) or "all" to check all members.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
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
          setTimeout(() => statusMsg.delete().catch(() => {}), TIMEOUTS.STATUS_MESSAGE);

          addToAuditLog(`${formatName(message.author, message.guild)} ${isCheckOnly ? 'checked' : 'assigned'} veterancy for all members`);

        } else {
          // Check veterancy for specific user
          const userId = target.replace(/[<@!>]/g, '');
          const member = message.guild.members.cache.get(userId);
          
          if (!member) {
            const errorMsg = await message.channel.send('❌ User not found in this server.');
            setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
            break;
          }

          const result = await checkAndAssignVeterancy(member, message.guild);
          
          if (result) {
            const actionText = isCheckOnly ? 'checked' : 'assigned';
            const roleText = isCheckOnly ? '' : (result.roleAssigned ? `\n✅ **Role assigned:** ${result.veterancyLevel}` : '\n❌ **No role assigned** (under 1 month)');
            
            const resultText = `📊 **Veterancy ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}**\n\n**Member:** ${result.member}\n**Join Date:** ${result.joinDate}\n**Time in Server:** ${result.monthsInServer} months (${result.daysInServer} days)\n**Veterancy Level:** ${result.veterancyLevel}${roleText}`;
            
            const successMsg = await message.channel.send(resultText);
            setTimeout(() => successMsg.delete().catch(() => {}), TIMEOUTS.COMMAND_MESSAGE);

            addToAuditLog(`${formatName(message.author, message.guild)} ${actionText} veterancy for ${result.member}`);
          } else {
            const errorMsg = await message.channel.send('❌ Could not determine veterancy for this user.');
            setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
          }
        }
      } catch (error) {
        console.error('Veterancy error:', error);
        const errorMsg = await message.channel.send(`❌ Error processing veterancy: ${error.message}`);
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
      }
      break;
    }

    case '$version': {
      try {
        const versionEmbed = {
          color: 0x1E90FF,
          title: '🤖 Dr. Sauce Bot Version Info',
          fields: [
            {
              name: 'Current Version',
              value: `v${BOT_VERSION.version}`,
              inline: true
            },
            {
              name: 'Last Updated',
              value: BOT_VERSION.lastUpdated,
              inline: true
            },
            {
              name: 'Recent Updates',
              value: BOT_VERSION.recentChanges.slice(0, 5).map(change => `• ${change}`).join('\n')
            }
          ],
          footer: {
            text: 'Use $help to see all available commands'
          }
        };

        const versionMsg = await message.channel.send({ embeds: [versionEmbed] });
        setTimeout(() => versionMsg.delete().catch(() => {}), TIMEOUTS.COMMAND_MESSAGE);
        // Delete the original command
        await message.delete().catch(() => {});
      } catch (error) {
        console.error('Version command error:', error);
        const errorMsg = await message.channel.send('❌ Error displaying version info.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
      }
      break;
    }

    case '$debugroles': {
      if (!isAdmin) {
        const errorMsg = await message.channel.send('❌ You do not have permission to use this command.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      try {
        const roles = message.guild.roles.cache;
        let roleList = '**Bot Version Info:**\n';
        roleList += `Version: ${BOT_VERSION.version}\n`;
        roleList += `Last Updated: ${BOT_VERSION.lastUpdated}\n\n`;
        
        roleList += '**Recent Changes:**\n';
        BOT_VERSION.recentChanges.forEach(change => {
          roleList += `• ${change}\n`;
        });
        
        // Administrative Roles
        roleList += '\n**Administrative Roles:**\n';
        getRoleIDs().admin.forEach(roleId => {
          const role = roles.get(roleId);
          if (role) {
            roleList += `✅ ${role.name} (${role.id})\n`;
          } else {
            roleList += `❌ Role not found (${roleId})\n`;
          }
        });

        // Special Roles
        roleList += '\n**Special Roles:**\n';
        const specialRoles = {
          'Ambassador to the Khanate': AMBASSADOR_ROLE,
          'Organization': ORGANIZATION_ROLE,
          'Junior Officer': JUNIOR_OFFICER_ROLE,
          'Warrant Officer': WARRANT_OFFICER_ROLE,
          'Officer': OFFICER_ROLE,
          'Platoon Leader': getRoleIDs().platoonLeader,
          'Platoon Instructor': getRoleIDs().platoonInstructor
        };

        for (const [roleName, roleId] of Object.entries(specialRoles)) {
          const role = roles.get(roleId);
          if (role) {
            roleList += `✅ ${roleName}: ${role.name} (${role.id})\n`;
          } else {
            roleList += `❌ ${roleName}: Role not found (${roleId})\n`;
          }
        }

        // New Member Roles (roles that get removed)
        roleList += '\n**New Member Roles:**\n';
        for (const [roleName, roleId] of Object.entries(REMOVE_ROLES)) {
          const role = roles.get(roleId);
          if (role) {
            roleList += `✅ ${roleName.toUpperCase()}: ${role.name} (${role.id})\n`;
          } else {
            roleList += `❌ ${roleName.toUpperCase()}: Role not found (${roleId})\n`;
          }
        }

        // Additional Roles (roles that get added)
        roleList += '\n**Additional Roles:**\n';
        for (const [roleName, roleId] of Object.entries(ADD_ROLES)) {
          const role = roles.get(roleId);
          if (role) {
            roleList += `✅ ${roleName.toUpperCase()}: ${role.name} (${role.id})\n`;
          } else {
            roleList += `❌ ${roleName.toUpperCase()}: Role not found (${roleId})\n`;
          }
        }

        // Rank Roles
        roleList += '\n**Rank Roles:**\n';
        for (const [rankName, roleId] of Object.entries(RANK_ROLES)) {
          const role = roles.get(roleId);
          if (role) {
            roleList += `✅ ${rankName.toUpperCase()}: ${role.name} (${role.id})\n`;
          } else {
            roleList += `❌ ${rankName.toUpperCase()}: Role not found (${roleId})\n`;
          }
        }

        // Veterancy Roles
        roleList += '\n**Veterancy Roles:**\n';
        for (const [degreeName, roleId] of Object.entries(VETERANCY_ROLES)) {
          const role = roles.get(roleId);
          if (role) {
            roleList += `✅ ${degreeName}: ${role.name} (${role.id})\n`;
          } else {
            roleList += `❌ ${degreeName}: Role not found (${roleId})\n`;
          }
        }

        // Subfaction Roles
        roleList += '\n**Subfaction Roles:**\n';
        for (const [factionName, faction] of Object.entries(SUBFACTION_ROLES)) {
          const role = roles.get(faction.id);
          if (role) {
            roleList += `✅ ${faction.emoji} ${faction.name}: ${role.name} (${role.id})\n`;
          } else {
            roleList += `❌ ${faction.emoji} ${faction.name}: Role not found (${faction.id})\n`;
          }
        }

        // Send in chunks if needed
        if (roleList.length > 2000) {
          const chunks = roleList.match(/.{1,1900}/g);
          let chunkMessages = [];
          for (const chunk of chunks) {
            const msg = await message.channel.send(chunk);
            chunkMessages.push(msg);
          }
          // Delete chunks after 30 seconds
          setTimeout(() => {
            chunkMessages.forEach(msg => msg.delete().catch(() => {}));
          }, 30000);
        } else {
          const msg = await message.channel.send(roleList);
          setTimeout(() => msg.delete().catch(() => {}), TIMEOUTS.COMMAND_MESSAGE);
        }

        // Delete the original command
        await message.delete().catch(() => {});
      } catch (error) {
        console.error('Debug roles error:', error);
        const errorMsg = await message.channel.send(`❌ Error listing roles: ${error.message}`);
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
      }
      break;
    }

    case '$eval': {
      // Check if the user is a warrant officer or - - - - OFC - - - -
      if (!hasRole(author, [WARRANT_OFFICER_ROLE, OFFICER_ROLE])) {
        const errorMsg = await message.channel.send(`❌ ${getRandomSauceStory()}\n\nOh, and by the way, you can't use this command. Only Warrant Officers and - - - - OFC - - - - can do that.`);
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      // Check command format
      if (args.length !== 2) {
        const errorMsg = await message.channel.send('❌ Invalid command format. Use: `$eval @user rank` where rank is private, pfc, or lance');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      // Parse arguments
      const userMention = args[0];
      const rank = args[1].toLowerCase();
      
      // Validate rank
      if (!['private', 'pfc', 'lance'].includes(rank)) {
        const errorMsg = await message.channel.send('❌ Invalid rank. Must be one of: private, pfc, lance');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      try {
        // Get the target user
        const userID = userMention.replace(/[<@!>]/g, '');
        const targetMember = await message.guild.members.fetch(userID);

        // Check if user has Cadet role
        if (!hasRole(targetMember, [REMOVE_ROLES.cadet])) {
          const errorMsg = await message.channel.send('❌ This command can only be used on members with the Cadet role.');
          setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
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
        setTimeout(() => successMsg.delete().catch(() => {}), TIMEOUTS.COMMAND_MESSAGE);
        
        // Add to audit log
        addToAuditLog(`${formatName(message.author, message.guild)} promoted ${formatName(targetMember.user, message.guild)} to ${rank.toUpperCase()}`);
      } catch (error) {
        console.error('Eval command error:', error);
        const errorMsg = await message.channel.send(`❌ Error executing command: ${error.message}`);
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
      }
      break;
    }

    case '$reticle': 
    case '$calibre':
    case '$armor':
    case '$diesel':
    case '$stalker':
    case '$meth':
    case '$geneva':
    case '$static': {
      try {
        // Check if user has permission to assign roles
        const hasPermission = hasRole(author, [WARRANT_OFFICER_ROLE, PLATOON_INSTRUCTOR_ROLE, OFFICER_ROLE]);
        if (!hasPermission) {
          const errorMsg = await message.channel.send(getRandomSauceStory() + "\n\nOh, by the way, only Warrant Officers, Platoon Instructors, and Officers can assign subfaction roles!");
          setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
          break;
        }

        // Check if a user was mentioned
        const targetMember = message.mentions.members.first();
        if (!targetMember) {
          const errorMsg = await message.channel.send(getRandomSauceStory() + "\n\nHmm, you need to mention a user to assign them to a subfaction! Example: $meth @user");
          setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
          break;
        }

        // Prevent self-assignment
        if (targetMember.id === author.id) {
          const errorMsg = await message.channel.send(getRandomSauceStory() + "\n\nHey, you can't assign roles to yourself! Ask another officer to help you out.");
          setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
          break;
        }

        const faction = SUBFACTION_ROLES[cmd.substring(1).toUpperCase()];
        await assignFactionRole(targetMember, faction, message);
        // Delete the original command message
        await message.delete().catch(() => {});
      } catch (error) {
        console.error(`Error assigning ${cmd} role:`, error);
        const errorMsg = await message.channel.send('*Drops clipboard* Something went wrong! Please try again later.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
      }
      break;
    }

    case '$factions': {
      try {
        let helpText = '**Available Faction Commands:**\n\n';
        helpText += '*Note: Only Warrant Officers, Platoon Instructors, and Officers can assign subfaction roles.*\n\n';
        Object.values(SUBFACTION_ROLES).forEach(faction => {
          helpText += `\`$${faction.name.toLowerCase().replace(/\./g, '')} @user\` - Assign user to ${faction.name}\n`;
        });
        helpText += '\n*Note: Members can only be in one faction at a time.*';
        const helpMsg = await message.channel.send(helpText);
        setTimeout(() => helpMsg.delete().catch(() => {}), TIMEOUTS.HELP_MESSAGE);
        // Delete the original command message
        await message.delete().catch(() => {});
      } catch (error) {
        console.error('Error showing faction help:', error);
        const errorMsg = await message.channel.send('*Drops clipboard* Something went wrong! Please try again later.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
      }
      break;
    }

    case '$roleinfo': {
      try {
        const infoEmbed = {
          color: 0x1E90FF,  // A nice medical blue color
          title: '🏥 Dr. Sauce\'s Guide to Joining Factions',
          description: '*Adjusts glasses* Let me explain how our faction system works!',
          fields: [
            {
              name: '📋 Available Factions',
              value: Object.values(SUBFACTION_ROLES).map(faction => 
                `${faction.emoji} **${faction.name}** - Join with \`$${faction.name.toLowerCase().replace(/\./g, '')}\``
              ).join('\n'),
              inline: false
            },
            {
              name: '⚕️ How to Join',
              value: 'Simply use the command for the faction you want to join. For example:\n`$meth` to join M.E.T.H.\n`$geneva` to join G.E.N.E.V.A.',
              inline: false
            },
            {
              name: '❗ Important Notes',
              value: '• You can only be in one faction at a time\n• Joining a new faction will remove you from your current faction\n• The Organization role will be automatically added if you don\'t have it',
              inline: false
            },
            {
              name: '🔍 Need Help?',
              value: 'Use `$factions` to see a simple list of all faction commands',
              inline: false
            }
          ],
          footer: {
            text: 'Remember: Choose the faction that best suits your playstyle!'
          }
        };

        const infoMsg = await message.channel.send({ embeds: [infoEmbed] });
        setTimeout(() => infoMsg.delete().catch(() => {}), TIMEOUTS.COMMAND_MESSAGE);
        // Delete the original command message
        await message.delete().catch(() => {});
      } catch (error) {
        console.error('Error showing role info:', error);
        const errorMsg = await message.channel.send('*Drops clipboard* Something went wrong! Please try again later.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
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

    // Add new case for $delete command
    case '$delete': {
      // Check if user has permission (Lieutenant or Sauce)
      const hasPermission = message.member.roles.cache.has(JUNIOR_OFFICER_ROLE) || 
                           message.author.id === '603550636545540096';
      
      if (!hasPermission) {
        const errorMsg = await message.channel.send(getRandomSauceStory() + "\n\nAnd that's why I'm not allowed to delete messages without proper clearance anymore!");
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        return;
      }

      const amount = parseInt(args[1]);
      const validAmounts = [5, 10, 50];

      if (!validAmounts.includes(amount)) {
        const errorMsg = await message.channel.send("Pro tip: My totally legitimate medical license only allows me to work with 5, 10, or 50. Don't ask why, long story...");
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        return;
      }

      try {
        // Delete command message first
        await message.delete();

        // Then bulk delete the specified amount, excluding important discussions
        const messages = await message.channel.messages.fetch({ limit: amount });
        const filteredMessages = messages.filter(msg => {
          // Skip messages that are discussing subsections or bot functionality
          if (msg.content.toLowerCase().includes('subsection') && 
              (msg.content.toLowerCase().includes('level 50') || 
               msg.content.toLowerCase().includes('m.e.t.h.') || 
               msg.content.toLowerCase().includes('medic'))) {
            return false;
          }
          return true;
        });

        await message.channel.bulkDelete(filteredMessages);

        // Send success message with random funny quote
        const successMsg = await message.channel.send(DELETE_MESSAGES[Math.floor(Math.random() * DELETE_MESSAGES.length)]);
        setTimeout(() => successMsg.delete().catch(() => {}), TIMEOUTS.COMMAND_MESSAGE);

        // Add to audit log
        addToAuditLog(`${formatName(message.author, message.guild)} deleted ${filteredMessages.size} messages in ${message.channel.name}`);
      } catch (error) {
        console.error('Delete error:', error);
        const errorMsg = await message.channel.send("Well, that failed spectacularly! *looks at camera* Just like my last performance review!");
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
      }
      break;
    }

    case '$play': {
      await handlePlay(message, args);
      break;
    }

    case '$skip': {
      await handleSkip(message);
      break;
    }

    case '$queue': {
      await handleQueue(message);
      break;
    }

  case '$fixed': {
    // Check if user is Sauce
    if (authorID !== '603550636545540096') {
      const errorMsg = await message.channel.send(getRandomSauceStory() + "\n\nSpeaking of which, only the real Dr. Sauce can run this fix!");
      setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
      break;
    }

    try {
      const statusMsg = await message.channel.send("🔄 *Puts on surgical gloves* Starting the role cleanup operation...");
      
      // Fetch all guild members
      await message.guild.members.fetch();
      const members = message.guild.members.cache;
      
      let fixedCount = 0;
      let processedCount = 0;
      let orgRoleAdded = 0;
      
      // Process each member
      for (const [memberId, member] of members) {
        if (member.user.bot) continue; // Skip bots
        
        processedCount++;
        
        // Check for inappropriate role combinations
        const hasOfficerRole = member.roles.cache.has(OFFICER_ROLE);
        const hasWarrantRole = member.roles.cache.has(WARRANT_OFFICER_ROLE);
        const hasEnlistedRole = member.roles.cache.has(ADD_ROLES.enlisted);
        const hasMemberRole = member.roles.cache.has(ADD_ROLES.member);
        const hasAmbassadorRole = member.roles.cache.has(AMBASSADOR_ROLE);
        
        let rolesRemoved = false;
        
        // If they have officer/warrant/enlisted/member/ambassador roles, they shouldn't have new member roles
        if (hasOfficerRole || hasWarrantRole || hasEnlistedRole || hasMemberRole || hasAmbassadorRole) {
          for (const [roleName, roleId] of Object.entries(REMOVE_ROLES)) {
            if (member.roles.cache.has(roleId)) {
              await member.roles.remove(roleId);
              rolesRemoved = true;
            }
          }
        }

        // Check if member has any subsection role and needs the organization role
        let hasSubsectionRole = false;
        for (const faction of Object.values(SUBFACTION_ROLES)) {
          if (member.roles.cache.has(faction.id)) {
            hasSubsectionRole = true;
            break;
          }
        }

        // Add organization role if they have a subsection role but not the org role
        if (hasSubsectionRole && !member.roles.cache.has(ORGANIZATION_ROLE)) {
          await member.roles.add(ORGANIZATION_ROLE);
          orgRoleAdded++;
        }
        
        if (rolesRemoved) {
          fixedCount++;
          // Update status message every 10 members fixed
          if (fixedCount % 10 === 0) {
            await statusMsg.edit(`🔄 *Adjusting roles...* Fixed ${fixedCount} members so far...`);
          }
        }
      }

      // Delete the status message
      await statusMsg.delete().catch(() => {});

      // Send completion message and delete after delay
      const completionMsg = await message.channel.send(
        `✅ *Removes gloves* Operation complete! I've processed ${processedCount} members:\n` +
        `• Fixed ${fixedCount} members with incorrect roles\n` +
        `• Added Organization role to ${orgRoleAdded} members with subsection roles\n` +
        `*Note: Removed Cadet, TRA, and Trainee roles from members who shouldn't have them.*`
      );
      setTimeout(() => completionMsg.delete().catch(() => {}), TIMEOUTS.COMMAND_MESSAGE);
      
      // Add to audit log
      addToAuditLog(`${formatName(message.author, message.guild)} ran role cleanup, fixed ${fixedCount} members, added org role to ${orgRoleAdded} members`);
    } catch (error) {
      console.error('Fixed command error:', error);
      const errorMsg = await message.channel.send(`❌ *Drops scalpel* Oops! Something went wrong: ${error.message}`);
      setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
    }
    break;
  }

    case '$logs': {
      // Only allow admins to view logs
      if (!isAdmin) {
        const errorMsg = await message.channel.send('❌ You do not have permission to view logs.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      try {
        // Execute pm2 logs command
        exec('pm2 logs discord-bot --lines 20 --nostream', async (error, stdout, stderr) => {
          if (error) {
            console.error('Error getting logs:', error);
            message.channel.send('❌ Error getting logs.');
            return;
          }

          // Split logs into chunks if they're too long
          const logs = stdout || stderr;
          const chunks = logs.match(/.{1,1900}/gs) || [];

          for (const chunk of chunks) {
            await message.channel.send(`\`\`\`\n${chunk}\n\`\`\``);
          }

          // Delete after 2 minutes
          setTimeout(() => {
            message.channel.messages.fetch({ limit: chunks.length + 1 })
              .then(messages => messages.forEach(msg => msg.delete().catch(() => {})))
              .catch(() => {});
          }, 120000);
        });
      } catch (error) {
        console.error('Error executing logs command:', error);
        message.channel.send('❌ Error executing logs command.');
      }
      break;
    }

    case '$strike': {
      // Only allow Sauce to use this command
      if (message.author.id !== '603550636545540096') {
        const errorMsg = await message.channel.send('❌ Only Dr. Sauce can use this command!');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      // Check if a user was mentioned
      const targetMember = message.mentions.members.first();
      if (!targetMember) {
        const errorMsg = await message.channel.send('❌ You need to mention a user to strike!');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      // Check if the author is in a voice channel
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        const errorMsg = await message.channel.send('❌ You need to be in a voice channel to use this command!');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      try {
        // Check if thunder.mp3 exists
        const thunderPath = path.join(__dirname, 'thunder.mp3');
        if (!fs.existsSync(thunderPath)) {
          const errorMsg = await message.channel.send('❌ Thunder sound effect not found!');
          setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
          break;
        }

        // Create a new connection
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false
        });

        // Create audio player with error handling
        const player = createAudioPlayer({
          behaviors: {
            noSubscriber: NoSubscriberBehavior.Play
          }
        });

        // Handle player errors
        player.on('error', error => {
          console.error('Error:', error.message);
          message.channel.send('❌ Error playing thunder sound!').then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
          });
        });

        // Create audio resource with proper options
        const resource = createAudioResource(thunderPath, {
          inputType: 'oggopus',
          inlineVolume: true,
        });

        // Set volume to maximum for dramatic effect
        resource.volume.setVolume(2);

        // Subscribe connection to player
        connection.subscribe(player);

        // Play the thunder sound
        player.play(resource);

        // Send a dramatic message
        const strikeMsg = await message.channel.send('⚡ *Thunder crashes!* ⚡');

        // When the sound finishes playing
        player.on(AudioPlayerStatus.Idle, async () => {
          try {
            // Disconnect the target user if they're in a voice channel
            if (targetMember.voice.channel) {
              await targetMember.voice.disconnect();
              await strikeMsg.edit('💥 *Thunder strikes ' + targetMember.displayName + '!* ⚡');
            }
            // Destroy the connection after a short delay
            setTimeout(() => {
              connection.destroy();
            }, 1000);
          } catch (error) {
            console.error('Error in idle handler:', error);
          }
        });

        // Handle connection errors
        connection.on('error', error => {
          console.error('Connection error:', error);
        });

        // Add to audit log
        addToAuditLog(`${formatName(message.author, message.guild)} struck ${formatName(targetMember.user, message.guild)} with thunder`);

      } catch (error) {
        console.error('Strike command error:', error);
        const errorMsg = await message.channel.send('❌ Error executing strike command.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
      }
      break;
    }

    case '$take': {
      // Only allow Sauce to use this command
      if (message.author.id !== '603550636545540096') {
        const errorMsg = await message.channel.send('❌ Only Dr. Sauce can use this command!');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      // Check if a user was mentioned
      const targetMember = message.mentions.members.first();
      if (!targetMember) {
        const errorMsg = await message.channel.send('❌ You need to mention a user to take!');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      // Check if the author is in a voice channel
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        const errorMsg = await message.channel.send('❌ You need to be in a voice channel to use this command!');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
        break;
      }

      try {
        // Get the target voice channel
        const targetVC = message.guild.channels.cache.get('1301245409330593803');
        if (!targetVC) {
          const errorMsg = await message.channel.send('❌ Target voice channel not found!');
          setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
          break;
        }

        // Move the target user to the specified voice channel
        if (targetMember.voice.channel) {
          await targetMember.voice.setChannel(targetVC);
        } else {
          const errorMsg = await message.channel.send('❌ Target user is not in a voice channel!');
          setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
          break;
        }

        // Move the bot to the same channel
        const connection = joinVoiceChannel({
          channelId: targetVC.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false
        });

        // Send a message
        const takeMsg = await message.channel.send(`👻 *Taking ${targetMember.displayName} to the shadow realm...*`);

        // Wait 3 seconds then disconnect
        setTimeout(() => {
          connection.destroy();
          takeMsg.edit(`✨ *${targetMember.displayName} has been taken...*`);
        }, 3000);

        // Add to audit log
        addToAuditLog(`${formatName(message.author, message.guild)} took ${formatName(targetMember.user, message.guild)} to the shadow realm`);

      } catch (error) {
        console.error('Take command error:', error);
        const errorMsg = await message.channel.send('❌ Error executing take command.');
        setTimeout(() => errorMsg.delete().catch(() => {}), TIMEOUTS.ERROR_MESSAGE);
      }
      break;
    }
  }
};

// Export the setup function
module.exports = {
  commands,
  assignFactionRole,
  updateDeployMessage,
  checkAndAssignVeterancy
};