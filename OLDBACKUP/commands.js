// commands.js
const fs = require('fs');
const { EmbedBuilder } = require('discord.js');

let subsections = require('./subsections.json');
let userRoles = require('./userRoles.json');
const DEPLOY_STORE = './deployMessages.json';

let auditLog = [];
let testingMode = false;

function saveSubsections() {
  fs.writeFileSync('./subsections.json', JSON.stringify(subsections, null, 2));
}

function saveUserRoles() {
  fs.writeFileSync('./userRoles.json', JSON.stringify(userRoles, null, 2));
}

function formatName(user) {
  return `@${user.username}`;
}

function hasRole(member, roleIDs) {
  return member.roles.cache.some(role => roleIDs.includes(role.id));
}

module.exports = {
  commands: async (message, client) => {
    if (!message.content.startsWith('$') && !message.content.startsWith('$$') && !message.content.startsWith('SauceTest')) return;
    const args = message.content.trim().split(/ +/);
    const cmd = args.shift();

    const author = message.member;
    const authorID = message.author.id;
    const ADMIN_IDS = [
      '1378997615613710368',
      '1305992733835399238',
      '1378985570289844314'
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
        const helpMsg = `**General Commands**
• \`deploy\` — Shows the full subsection layout.
• \`$sync\` — Updates all members in each subsection based on Discord roles.
• \`$help\` — Displays this help message.

**Personnel Commands**
• \`$Instructor @User @Subsection Add/Remove\`
• \`$officer @User @Subsection Add/Remove\`
• \`$clear @Subsection [instructors|members|all]\`

**Admin Commands** (Restricted to @S)
• \`$$deploy true/false\` — Enable or disable testing mode.
• \`SauceTest14405 / SauceTestend14405\` — Toggle testing mode manually.
• \`$auditlog\` — View audit log.
• \`$clearall\` — Delete last 100 messages (with password or @S role).
• \`$clearcommands\` — Delete all command messages by users.`;
        message.channel.send(helpMsg);
        break;
      }

      case 'deploy': {
        const deployMsg = formatDeployLayout();
        message.channel.send(deployMsg);
        break;
      }

      case '$sync': {
        if (!SYNC_ACCESS.some(id => hasRole(author, [id])) && authorID !== '603550636545540096') return;
        const confirmation = syncRoles(message.guild);
        message.channel.send(confirmation);
        break;
      }

      case '$Instructor':
      case '$officer': {
        const type = cmd === '$Instructor' ? 'instructors' : 'officers';
        const [mention, subsection, action] = args;
        const userID = mention.replace(/[<@!>]/g, '');
        const member = await message.guild.members.fetch(userID);

        if (!subsections[subsection]) return message.reply('Subsection not found.');

        const list = subsections[subsection][type];
        if (action.toLowerCase() === 'add') {
          if (!list.includes(userID)) list.push(userID);
          userRoles[userID] = subsection;
          message.channel.send(`${formatName(member.user)} added as ${type} in ${subsection}.`);
        } else {
          const index = list.indexOf(userID);
          if (index > -1) list.splice(index, 1);
          message.channel.send(`${formatName(member.user)} removed from ${type} in ${subsection}.`);
        }

        saveSubsections();
        saveUserRoles();
        break;
      }

      case '$clear': {
        const [subsection, target] = args;
        if (!isAdmin) return;
        if (!subsections[subsection]) return message.reply('Subsection not found.');

        if (target === 'all') {
          subsections[subsection].officers = [];
          subsections[subsection].instructors = [];
          subsections[subsection].members = [];
        } else {
          subsections[subsection][target] = [];
        }

        saveSubsections();
        message.channel.send(`Cleared ${target} in ${subsection}.`);
        break;
      }

      case '$auditlog': {
        if (!isAdmin) return;
        const log = auditLog.slice(-10).join('\n');
        message.channel.send(`**Audit Log (Last 10):**\n${log}`);
        break;
      }

      case '$clearall': {
        if (!isAdmin && !message.content.includes('2430114')) return;
        const messages = await message.channel.messages.fetch({ limit: 100 });
        messages.forEach(msg => {
          if (msg.author.id === client.user.id || msg.content.includes('2430114') || msg.content.startsWith('$')) msg.delete().catch(() => {});
        });
        break;
      }

      case '$clearcommands': {
        if (!isAdmin) return;
        const messages = await message.channel.messages.fetch({ limit: 100 });
        messages.forEach(msg => {
          if (msg.content.startsWith('$') || msg.content.startsWith('$$')) msg.delete().catch(() => {});
        });
        break;
      }

      case '$$deploy': {
        if (!isAdmin) return;
        testingMode = args[0] === 'true';
        message.channel.send(`Testing mode is now ${testingMode ? 'enabled' : 'disabled'}.`);
        break;
      }

      case 'SauceTest14405': {
        if (!isAdmin) return;
        testingMode = true;
        message.channel.send('Testing mode activated.');
        break;
      }

      case 'SauceTestend14405': {
        if (!isAdmin) return;
        testingMode = false;
        message.channel.send('Testing mode ended.');
        break;
      }
    }

    function syncRoles(guild) {
      Object.keys(subsections).forEach(section => {
        subsections[section].members.forEach(async id => {
          const member = await guild.members.fetch(id).catch(() => null);
          if (!member) return;
          userRoles[id] = section;
        });
      });
      saveUserRoles();
      return 'All roles synced to userRoles.json.';
    }

    function formatDeployLayout() {
      const layout = Object.entries(subsections)
        .map(([key, value]) => `**${key}**
- Officers: ${value.officers.map(id => formatName(client.users.cache.get(id) || { username: id })).join(', ') || 'None'}
- Instructors: ${value.instructors.map(id => formatName(client.users.cache.get(id) || { username: id })).join(', ') || 'None'}
- Members: ${value.members.map(id => formatName(client.users.cache.get(id) || { username: id })).join(', ') || 'None'}`)
        .join('\n\n');
      return layout;
    }
  }
};