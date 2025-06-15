// commands.js
const fs = require('fs');
const subsections = require('./subsections.json');
const userRoles = require('./userRoles.json');
const deployPath = './deployMessages.json';

let auditLog = [];
let testingMode = false;

function saveJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function formatName(user) {
  return `@${user.username}`;
}

function hasRole(member, ids) {
  return member.roles.cache.some(role => ids.includes(role.id));
}

module.exports = {
  commands: async (message, client) => {
    if (!message.content.startsWith('$') && !message.content.startsWith('$$') && !message.content.startsWith('SauceTest')) return;
    const args = message.content.trim().split(/ +/);
    const cmd = args.shift();

    const author = message.member;
    const authorID = message.author.id;

    const ADMIN_IDS = [
      '1378997615613710368', // @S
      '1305992733835399238', // @- - - - OFC - - - -
      '1378985570289844314'  // @Chief Warrant Officer
    ];

    const SYNC_ACCESS = [
      '1305992733835399238',
      '1379535329735872512',
      '1295544720222589069',
      '603550636545540096'
    ];

    const isAdmin = hasRole(author, ADMIN_IDS) || authorID === '603550636545540096';

    switch (cmd) {
      case '$help': {
        const helpText = `**Subsection Bot Command List**\n\n**General Commands**\n• \`deploy\` — Shows the full subsection layout.\n• \`$sync\` — Updates all members in each subsection based on Discord roles.\n• \`$help\` — Displays this help message.\n\n**Personnel Commands**\n• \`$Instructor @User @Subsection Add/Remove\`\n• \`$officer @User @Subsection Add/Remove\`\n• \`$clear @Subsection [instructors|members|all]\`\n\n**Admin Commands** (Restricted to @S or Admins)\n• \`$$deploy true/false\` — Enable or disable testing mode.\n• \`SauceTest14405 / SauceTestend14405\` — Manually toggle testing mode.\n• \`$auditlog\` — View audit log.\n• \`$clearall\` — Deletes last 100 messages (requires password or admin).\n• \`$clearcommands\` — Deletes all command messages.`;
        message.channel.send(helpText);
        break;
      }

      case 'deploy': {
        const deployMsg = Object.entries(subsections)
          .map(([name, data]) => `**${name}**\n- Officers: ${data.officer.map(id => formatName(client.users.cache.get(id) || { username: id })).join(', ') || 'None'}\n- Instructors: ${data.instructors.map(id => formatName(client.users.cache.get(id) || { username: id })).join(', ') || 'None'}\n- Members: ${data.members.map(id => formatName(client.users.cache.get(id) || { username: id })).join(', ') || 'None'}`)
          .join('\n\n');
        message.channel.send(deployMsg);
        break;
      }

      case '$sync': {
        if (!SYNC_ACCESS.some(id => hasRole(author, [id])) && authorID !== '603550636545540096') return;
        Object.entries(subsections).forEach(([section, roles]) => {
          roles.members.forEach(id => userRoles[id] = section);
        });
        saveJSON('./userRoles.json', userRoles);
        message.channel.send('✅ Subsection member lists have been updated.');
        break;
      }

      case '$Instructor':
      case '$officer': {
        const roleType = cmd === '$Instructor' ? 'instructors' : 'officer';
        const [mention, section, action] = args;
        const userID = mention.replace(/[<@!>]/g, '');
        const member = await message.guild.members.fetch(userID);
        if (!subsections[section]) return message.reply('❌ Subsection not found.');
        const list = subsections[section][roleType];

        if (action.toLowerCase() === 'add') {
          if (!list.includes(userID)) list.push(userID);
          userRoles[userID] = section;
          message.channel.send(`${formatName(member.user)} added as ${roleType} in ${section}.`);
        } else {
          const idx = list.indexOf(userID);
          if (idx > -1) list.splice(idx, 1);
          message.channel.send(`${formatName(member.user)} removed from ${roleType} in ${section}.`);
        }
        auditLog.push(`${formatName(message.author.user)} ${action} ${roleType} ${section}`);
        saveJSON('./subsections.json', subsections);
        saveJSON('./userRoles.json', userRoles);
        break;
      }

      case '$clear': {
        if (!isAdmin) return;
        const [section, target] = args;
        if (!subsections[section]) return message.reply('❌ Subsection not found.');
        if (target === 'all') {
          subsections[section].officer = [];
          subsections[section].instructors = [];
          subsections[section].members = [];
        } else {
          subsections[section][target] = [];
        }
        saveJSON('./subsections.json', subsections);
        message.channel.send(`✅ Cleared ${target} in ${section}.`);
        break;
      }

      case '$auditlog': {
        if (!isAdmin) return;
        message.channel.send(`**Audit Log (Last 10):**\n${auditLog.slice(-10).join('\n')}`);
        break;
      }

      case '$clearall': {
        if (!isAdmin && !message.content.includes('2430114')) return;
        const msgs = await message.channel.messages.fetch({ limit: 100 });
        msgs.forEach(msg => {
          if (msg.author.id === client.user.id || msg.content.includes('2430114') || msg.content.startsWith('$')) msg.delete().catch(() => {});
        });
        break;
      }

      case '$clearcommands': {
        if (!isAdmin) return;
        const msgs = await message.channel.messages.fetch({ limit: 100 });
        msgs.forEach(msg => {
          if (msg.content.startsWith('$') || msg.content.startsWith('$$')) msg.delete().catch(() => {});
        });
        break;
      }

      case '$$deploy': {
        if (!isAdmin) return;
        testingMode = args[0] === 'true';
        message.channel.send(`🧪 Testing mode is now ${testingMode ? 'enabled' : 'disabled'}.`);
        break;
      }

      case 'SauceTest14405': {
        if (!isAdmin) return;
        testingMode = true;
        message.channel.send('🧪 Testing mode activated.');
        break;
      }

      case 'SauceTestend14405': {
        if (!isAdmin) return;
        testingMode = false;
        message.channel.send('🧪 Testing mode ended.');
        break;
      }
    }
  }
};
