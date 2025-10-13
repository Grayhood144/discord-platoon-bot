// commandRateLimiter.js - Per-user command rate limiting
const { Collection } = require('discord.js');
const errorHandler = require('./errorHandler');
const databaseManager = require('./databaseManager');

class CommandRateLimiter {
    constructor() {
        this.userLimits = new Collection();
        this.commandLimits = new Map();
        this.defaultLimits = {
            global: { max: 10, window: 10000 }, // 10 commands per 10 seconds globally
            default: { max: 3, window: 5000 }   // 3 uses per 5 seconds per command
        };

        // Set specific command limits
        this.setCommandLimits();
    }

    /**
     * Set up command-specific rate limits
     */
    setCommandLimits() {
        // Music commands
        this.commandLimits.set('play', { max: 2, window: 5000 });     // 2 songs per 5 seconds
        this.commandLimits.set('skip', { max: 1, window: 2000 });     // 1 skip per 2 seconds
        this.commandLimits.set('queue', { max: 2, window: 5000 });    // 2 queue checks per 5 seconds

        // Role management
        this.commandLimits.set('sync', { max: 1, window: 30000 });    // 1 sync per 30 seconds
        this.commandLimits.set('eval', { max: 2, window: 10000 });    // 2 evals per 10 seconds
        this.commandLimits.set('clear', { max: 2, window: 10000 });   // 2 clears per 10 seconds

        // Utility commands
        this.commandLimits.set('help', { max: 2, window: 10000 });    // 2 help requests per 10 seconds
        this.commandLimits.set('bump', { max: 1, window: 7200000 });  // 1 bump per 2 hours
    }

    /**
     * Check if a command can be executed
     * @param {string} userId - User ID
     * @param {string} commandName - Command name
     * @returns {Object} Rate limit status
     */
    async checkRateLimit(userId, commandName) {
        try {
            // Get user's rate limit data
            if (!this.userLimits.has(userId)) {
                this.userLimits.set(userId, {
                    global: [],
                    commands: new Collection()
                });
            }

            const userData = this.userLimits.get(userId);
            const now = Date.now();

            // Check global rate limit
            const globalLimit = this.defaultLimits.global;
            userData.global = userData.global.filter(time => now - time < globalLimit.window);
            
            if (userData.global.length >= globalLimit.max) {
                return {
                    limited: true,
                    remaining: Math.ceil((userData.global[0] + globalLimit.window - now) / 1000),
                    type: 'global'
                };
            }

            // Check command-specific rate limit
            if (!userData.commands.has(commandName)) {
                userData.commands.set(commandName, []);
            }

            const commandTimes = userData.commands.get(commandName);
            const commandLimit = this.commandLimits.get(commandName) || this.defaultLimits.default;

            // Clean up old timestamps
            userData.commands.set(
                commandName,
                commandTimes.filter(time => now - time < commandLimit.window)
            );

            if (commandTimes.length >= commandLimit.max) {
                return {
                    limited: true,
                    remaining: Math.ceil((commandTimes[0] + commandLimit.window - now) / 1000),
                    type: 'command'
                };
            }

            // Command can be executed
            userData.global.push(now);
            commandTimes.push(now);

            // Log command usage
            await this.logCommandUsage(userId, commandName);

            return {
                limited: false,
                remaining: 0
            };
        } catch (error) {
            await errorHandler.handleError(error, {
                userId,
                commandName,
                errorContext: 'Rate limit check'
            });
            // Allow command if rate limit check fails
            return { limited: false, remaining: 0 };
        }
    }

    /**
     * Log command usage to database
     * @param {string} userId - User ID
     * @param {string} commandName - Command name
     */
    async logCommandUsage(userId, commandName) {
        try {
            await databaseManager.logCommand({
                command_name: commandName,
                user_id: userId,
                guild_id: 'global',
                success: true,
                execution_time: 0
            });
        } catch (error) {
            await errorHandler.handleError(error, {
                userId,
                commandName,
                errorContext: 'Command usage logging'
            });
        }
    }

    /**
     * Get user's rate limit status
     * @param {string} userId - User ID
     * @returns {Object} Rate limit status for all commands
     */
    getUserStatus(userId) {
        const userData = this.userLimits.get(userId);
        if (!userData) return null;

        const now = Date.now();
        const status = {
            global: {
                used: userData.global.length,
                max: this.defaultLimits.global.max,
                reset: userData.global[0] ? 
                    Math.max(0, userData.global[0] + this.defaultLimits.global.window - now) : 0
            },
            commands: {}
        };

        userData.commands.forEach((times, command) => {
            const limit = this.commandLimits.get(command) || this.defaultLimits.default;
            status.commands[command] = {
                used: times.length,
                max: limit.max,
                reset: times[0] ? 
                    Math.max(0, times[0] + limit.window - now) : 0
            };
        });

        return status;
    }

    /**
     * Reset rate limits for a user
     * @param {string} userId - User ID
     * @param {string} commandName - Optional specific command to reset
     */
    resetLimits(userId, commandName = null) {
        const userData = this.userLimits.get(userId);
        if (!userData) return;

        if (commandName) {
            userData.commands.delete(commandName);
        } else {
            userData.global = [];
            userData.commands.clear();
        }
    }

    /**
     * Clean up old rate limit data
     */
    cleanup() {
        const now = Date.now();
        
        for (const [userId, userData] of this.userLimits.entries()) {
            // Clean up global limits
            userData.global = userData.global.filter(
                time => now - time < this.defaultLimits.global.window
            );

            // Clean up command-specific limits
            for (const [command, times] of userData.commands.entries()) {
                const limit = this.commandLimits.get(command) || this.defaultLimits.default;
                const validTimes = times.filter(time => now - time < limit.window);

                if (validTimes.length === 0) {
                    userData.commands.delete(command);
                } else {
                    userData.commands.set(command, validTimes);
                }
            }

            // Remove user data if empty
            if (userData.global.length === 0 && userData.commands.size === 0) {
                this.userLimits.delete(userId);
            }
        }
    }

    /**
     * Start periodic cleanup
     */
    startCleanupInterval() {
        setInterval(() => {
            try {
                this.cleanup();
            } catch (error) {
                errorHandler.handleError(error, {
                    errorContext: 'Rate limit cleanup'
                });
            }
        }, 300000); // Clean up every 5 minutes
    }
}

module.exports = new CommandRateLimiter();
