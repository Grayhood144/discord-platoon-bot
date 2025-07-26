// messageCleaner.js

module.exports = async function cleanMessage(message, client) {
  if (!message || message.author?.bot) return;
  const content = message.content;

  // Skip deletion for messages that are discussing subsections or bot functionality
  if (content.toLowerCase().includes('subsection') && 
      (content.toLowerCase().includes('level 50') || 
       content.toLowerCase().includes('m.e.t.h.') || 
       content.toLowerCase().includes('medic') ||
       content.toLowerCase().includes('playstyle'))) {
    return;
  }

  // Auto-delete password-containing messages
  if (content.includes('2430114')) {
    return setTimeout(() => {
      if (message.deletable) message.delete().catch(() => {});
    }, 1000);
  }

  // Auto-delete command messages (excluding raw 'deploy')
  const commandPrefixes = ['$', '$$'];
  const validCommands = [
    // Core commands
    '$deploy', '$sync', '$help', '$Instructor', '$officer',
    '$clear', '$auditlog', '$clearall', '$clearcommands',
    '$reaction', '$fixed', '$eval', '$delete', '$nick',
    '$$deploy', 'SauceTest14405', 'SauceTestend14405',
    
    // Added commands
    '$veterancy',
    '$debugroles',
    
    // Subfaction commands
    '$reticle',
    '$armor',
    '$calibre',
    '$diesel',
    '$stalker',
    '$meth',
    '$geneva',
    '$static',
    '$factions',
    '$roleinfo'
  ];

  const isCommand = commandPrefixes.some(prefix => content.startsWith(prefix)) || 
                   content.startsWith('SauceTest') ||
                   (content === 'deploy');
                   
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
    // Status messages
    'added as', 'removed from', 'Cleared', 'synced', 'activated', 'ended', 'Audit Log', 'deleted', 
    'Incorrect password', 'You are not authorized',
    
    // Dr. Sauce character messages
    'Adjusts lab coat', 'Adjusts stethoscope', 'Checks clipboard', 'Drops clipboard', 
    'Fumbles with medical equipment', 'Drops scalpel', 'puts on surgical gloves',
    
    // Command responses
    'Successfully promoted', 'Error executing command', 'Invalid command format', 'Invalid rank',
    'role cleanup operation', 'roles have been fixed', 'Something went wrong assigning the role',
    'Pro tip: My totally legitimate medical license', 'Whoa there, wannabe doctor',
    
    // Veterancy messages
    'Veterancy Check Results', 'Veterancy Assignment Complete',
    
    // Debug messages
    'Bot Version Info', 'Recent Changes', 'Organization Roles Status'
  ];

  // Only delete messages that are EXACTLY command responses or status messages
  // This prevents deleting messages that happen to contain these phrases in a discussion
  for (const trigger of quickDeleteTriggers) {
    if (content === trigger || 
        (content.includes(trigger) && content.length < trigger.length + 50)) {
      return setTimeout(() => {
        if (message.deletable) message.delete().catch(() => {});
      }, 10000);
    }
  }
};
