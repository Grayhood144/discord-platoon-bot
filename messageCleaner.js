// messageCleaner.js

module.exports = async function cleanMessage(message, client) {
  if (!message || message.author?.bot) return;
  const content = message.content;

  // Auto-delete password-containing messages
  if (content.includes('2430114')) {
    return setTimeout(() => {
      if (message.deletable) message.delete().catch(() => {});
    }, 1000);
  }

  // Auto-delete command messages (excluding raw 'deploy')
  const commandPrefixes = ['$', '$$'];
  const validCommands = [
    '$deploy', '$sync', '$help', '$Instructor', '$officer',
    '$clear', '$auditlog', '$clearall', '$clearcommands',
    '$reaction', '$fixed', '$eval', '$delete', '$nick',
    '$$deploy', 'SauceTest14405', 'SauceTestend14405'
  ];

  const isCommand = commandPrefixes.some(prefix => content.startsWith(prefix)) && validCommands.some(cmd => content.startsWith(cmd));
  if (isCommand) {
    return setTimeout(() => {
      if (message.deletable) message.delete().catch(() => {});
    }, 5000);
  }

  // Auto-delete help message
  if (content.includes('Subsection Bot Command List')) {
    return setTimeout(() => {
      if (message.deletable) message.delete().catch(() => {});
    }, 60000);
  }

  // Auto-delete confirmation and error messages
  const quickDeleteTriggers = [
    'added as', 'removed from', 'Cleared', 'synced', 'activated', 'ended', 'Audit Log', 'deleted', 'Incorrect password', 'You are not authorized',
    'Adjusts lab coat', 'Adjusts stethoscope', 'Checks clipboard', 'Drops clipboard', 'Fumbles with medical equipment',
    'Successfully promoted', 'Error executing command', 'Invalid command format', 'Invalid rank',
    'role cleanup operation', 'roles have been fixed', 'Something went wrong assigning the role',
    'Pro tip: My totally legitimate medical license', 'Whoa there, wannabe doctor'
  ];

  for (const trigger of quickDeleteTriggers) {
    if (content.includes(trigger)) {
      return setTimeout(() => {
        if (message.deletable) message.delete().catch(() => {});
      }, 10000);
    }
  }
};
