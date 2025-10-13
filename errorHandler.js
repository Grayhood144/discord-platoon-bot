// errorHandler.js - Centralized error handling and recovery
const { addToAuditLog } = require('./commands');

class ErrorHandler {
    constructor() {
        this.errorCounts = new Map();
        this.recoveryStrategies = new Map();
        
        // Initialize default recovery strategies
        this.initializeDefaultStrategies();
    }

    initializeDefaultStrategies() {
        // Discord API errors
        this.setRecoveryStrategy('DiscordAPIError', async (error, context) => {
            const { message, client, guild } = context;
            
            switch (error.code) {
                case 50001: // Missing Access
                    await this.handlePermissionError(error, context);
                    break;
                    
                case 50013: // Missing Permissions
                    await this.handlePermissionError(error, context);
                    break;
                    
                case 50007: // Cannot send messages to this user
                    await this.handleDMError(error, context);
                    break;
                    
                case 10008: // Unknown Message
                case 50034: // Message too old to bulk delete
                    await this.handleMessageError(error, context);
                    break;
                    
                case 30013: // Maximum number of guild roles reached
                    await this.handleRoleError(error, context);
                    break;
                    
                default:
                    await this.handleGenericError(error, context);
            }
        });

        // Voice connection errors
        this.setRecoveryStrategy('VoiceConnectionError', async (error, context) => {
            const { voiceConnection, guild } = context;
            
            try {
                // Attempt to reconnect
                if (voiceConnection) {
                    await voiceConnection.destroy();
                    // Wait before attempting to reconnect
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    // Attempt to rejoin
                    if (context.voiceChannel) {
                        await context.voiceChannel.join();
                    }
                }
            } catch (reconnectError) {
                console.error('Failed to recover voice connection:', reconnectError);
                this.logError('VoiceConnectionError', reconnectError, context);
            }
        });

        // Database errors
        this.setRecoveryStrategy('DatabaseError', async (error, context) => {
            try {
                // Attempt to reconnect to database
                await this.reconnectDatabase(context);
            } catch (reconnectError) {
                console.error('Failed to reconnect to database:', reconnectError);
                this.logError('DatabaseError', reconnectError, context);
            }
        });
    }

    async handlePermissionError(error, context) {
        const { message, guild } = context;
        const errorMessage = `Missing permissions: ${error.message}`;
        
        // Log to audit log
        addToAuditLog(`Permission error in ${guild.name}: ${errorMessage}`);
        
        // Notify admins if possible
        try {
            const adminChannel = guild.channels.cache.find(
                channel => channel.name === 'admin-logs' && 
                channel.permissionsFor(guild.members.me).has('SendMessages')
            );
            
            if (adminChannel) {
                await adminChannel.send({
                    embeds: [{
                        color: 0xFF0000,
                        title: '❌ Permission Error',
                        description: errorMessage,
                        fields: [
                            {
                                name: 'Channel',
                                value: message?.channel?.name || 'N/A',
                                inline: true
                            },
                            {
                                name: 'Command',
                                value: message?.content || 'N/A',
                                inline: true
                            }
                        ]
                    }]
                });
            }
        } catch (notifyError) {
            console.error('Failed to notify admins:', notifyError);
        }
    }

    async handleDMError(error, context) {
        const { message, user } = context;
        
        // Log the DM error
        addToAuditLog(`Failed to send DM to ${user.tag}: ${error.message}`);
        
        // If this was from a guild command, try to notify in the guild
        if (message?.guild) {
            try {
                await message.channel.send({
                    content: `❌ I couldn't send you a DM. Please check your privacy settings.`,
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Failed to notify user about DM error:', replyError);
            }
        }
    }

    async handleMessageError(error, context) {
        const { message } = context;
        
        // For bulk delete errors, try individual deletions
        if (error.code === 50034) {
            try {
                const messages = await message.channel.messages.fetch({ limit: 100 });
                for (const msg of messages.values()) {
                    try {
                        await msg.delete();
                        // Add small delay to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (deleteError) {
                        console.error('Failed to delete individual message:', deleteError);
                    }
                }
            } catch (fetchError) {
                console.error('Failed to fetch messages for individual deletion:', fetchError);
            }
        }
    }

    async handleRoleError(error, context) {
        const { guild } = context;
        
        addToAuditLog(`Role limit reached in ${guild.name}`);
        
        // Try to find unused roles
        try {
            const roles = await guild.roles.fetch();
            const unusedRoles = roles.filter(role => role.members.size === 0);
            
            if (unusedRoles.size > 0) {
                // Notify admins about unused roles
                const adminChannel = guild.channels.cache.find(
                    channel => channel.name === 'admin-logs' && 
                    channel.permissionsFor(guild.members.me).has('SendMessages')
                );
                
                if (adminChannel) {
                    await adminChannel.send({
                        embeds: [{
                            color: 0xFF9900,
                            title: '⚠️ Role Limit Reached',
                            description: `Found ${unusedRoles.size} unused roles that could be deleted:`,
                            fields: unusedRoles.first(10).map(role => ({
                                name: role.name,
                                value: `ID: ${role.id}`,
                                inline: true
                            }))
                        }]
                    });
                }
            }
        } catch (roleError) {
            console.error('Failed to handle role limit error:', roleError);
        }
    }

    async handleGenericError(error, context) {
        const { guild, message } = context;
        
        // Log the error
        console.error('Generic Discord API error:', error);
        addToAuditLog(`Error in ${guild?.name || 'DM'}: ${error.message}`);
        
        // Increment error count
        this.incrementErrorCount(error.code);
        
        // If error count is high, notify admins
        if (this.getErrorCount(error.code) >= 5) {
            try {
                const owner = await guild?.client.users.fetch(guild?.ownerId);
                if (owner) {
                    await owner.send({
                        embeds: [{
                            color: 0xFF0000,
                            title: '⚠️ High Error Rate Detected',
                            description: `Multiple errors (${error.code}) occurring in ${guild.name}`,
                            fields: [
                                {
                                    name: 'Error Code',
                                    value: error.code.toString(),
                                    inline: true
                                },
                                {
                                    name: 'Count',
                                    value: this.getErrorCount(error.code).toString(),
                                    inline: true
                                },
                                {
                                    name: 'Message',
                                    value: error.message
                                }
                            ]
                        }]
                    });
                }
            } catch (notifyError) {
                console.error('Failed to notify owner about high error rate:', notifyError);
            }
        }
    }

    // Error tracking methods
    incrementErrorCount(errorCode) {
        const count = this.errorCounts.get(errorCode) || 0;
        this.errorCounts.set(errorCode, count + 1);
        
        // Reset count after 1 hour
        setTimeout(() => {
            this.errorCounts.set(errorCode, Math.max(0, this.getErrorCount(errorCode) - 1));
        }, 3600000);
    }

    getErrorCount(errorCode) {
        return this.errorCounts.get(errorCode) || 0;
    }

    // Recovery strategy management
    setRecoveryStrategy(errorType, strategy) {
        this.recoveryStrategies.set(errorType, strategy);
    }

    getRecoveryStrategy(errorType) {
        return this.recoveryStrategies.get(errorType);
    }

    // Main error handling method
    async handleError(error, context = {}) {
        try {
            // Determine error type
            const errorType = error.name || error.constructor.name;
            
            // Get recovery strategy
            const strategy = this.getRecoveryStrategy(errorType);
            
            if (strategy) {
                // Execute recovery strategy
                await strategy(error, context);
            } else {
                // Default error handling
                await this.handleGenericError(error, context);
            }
            
            // Log error for monitoring
            this.logError(errorType, error, context);
            
        } catch (handlingError) {
            console.error('Error in error handler:', handlingError);
            // Last resort: log to console and audit log
            addToAuditLog(`Critical error handling failure: ${handlingError.message}`);
        }
    }

    // Error logging
    logError(errorType, error, context) {
        const errorLog = {
            type: errorType,
            message: error.message,
            stack: error.stack,
            code: error.code,
            timestamp: new Date().toISOString(),
            context: {
                guild: context.guild?.name,
                channel: context.message?.channel?.name,
                command: context.message?.content,
                user: context.message?.author?.tag
            }
        };

        console.error('Error logged:', errorLog);
        addToAuditLog(`Error [${errorType}]: ${error.message}`);
    }
}

module.exports = new ErrorHandler();

