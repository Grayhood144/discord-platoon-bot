
// messageCleaner.js

module.exports = async function cleanMessage(message, client) {
  if (!message || message.author?.bot) return;

  const content = message.content;

  // Delete any message containing the password immediately (1 sec)
  if (content.includes('2430114')) {
    return setTimeout(() => {
      if (message.deletable) message.delete().catch(() => {});
    }, 1000);
  }

  // Delete user-sent commands after 5 seconds (excluding deploy output)
  const commandPrefixes = ['$', '$$'];
  const isCommand = commandPrefixes.some(prefix => content.startsWith(prefix));

  if (isCommand && !content.startsWith('deploy')) {
    return setTimeout(() => {
      if (message.deletable) message.delete().catch(() => {});
    }, 5000);
  }

  // Help output gets deleted after 60 seconds
  if (content.includes('Subsection Bot Command List')) {
    return setTimeout(() => {
      if (message.deletable) message.delete().catch(() => {});
    }, 60000);
  }

  // Confirmation or error messages from the bot get deleted after 10 seconds
  const quickDeleteTriggers = [
    'Instructor list updated',
    'Removed',
    'Cleared',
    'All bot messages cleared',
    'Incorrect password',
    'Password input timed out',
    'You are not authorized',
    'Subsection member lists have been updated',
    'Audit log has been sent',
    'Unable to send you a DM'
  ];

  for (const trigger of quickDeleteTriggers) {
    if (content.includes(trigger)) {
      return setTimeout(() => {
        if (message.deletable) message.delete().catch(() => {});
      }, 10000);
    }
  }
};
