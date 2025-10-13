// rateLimiter.js - Rate limiting utility for Discord operations
const { Collection } = require('discord.js');

class RateLimiter {
    constructor() {
        this.queues = new Collection();
        this.processing = new Collection();
        this.limits = {
            roleUpdate: { max: 10, window: 10000 }, // 10 operations per 10 seconds
            messageDelete: { max: 100, window: 10000 }, // 100 messages per 10 seconds
            memberUpdate: { max: 10, window: 10000 } // 10 member updates per 10 seconds
        };
    }

    async enqueue(type, guildId, operation) {
        if (!this.queues.has(`${type}_${guildId}`)) {
            this.queues.set(`${type}_${guildId}`, []);
        }

        const queue = this.queues.get(`${type}_${guildId}`);
        queue.push(operation);

        // Start processing if not already processing
        if (!this.processing.has(`${type}_${guildId}`)) {
            this.processing.set(`${type}_${guildId}`, true);
            this.processQueue(type, guildId);
        }
    }

    async processQueue(type, guildId) {
        const queue = this.queues.get(`${type}_${guildId}`);
        const limit = this.limits[type];

        while (queue.length > 0) {
            const batch = queue.splice(0, limit.max);
            
            try {
                // Process batch of operations
                await Promise.all(batch.map(operation => operation()));
                
                // If there are more items, wait for the window before processing next batch
                if (queue.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, limit.window));
                }
            } catch (error) {
                console.error(`Error processing ${type} operations:`, error);
                // Add failed operations back to queue for retry
                queue.unshift(...batch);
                await new Promise(resolve => setTimeout(resolve, limit.window));
            }
        }

        this.processing.delete(`${type}_${guildId}`);
    }

    // Role update rate limiting
    async queueRoleUpdate(guild, member, operation) {
        return this.enqueue('roleUpdate', guild.id, async () => {
            try {
                await operation();
            } catch (error) {
                console.error('Role update error:', error);
                throw error;
            }
        });
    }

    // Message delete rate limiting
    async queueMessageDelete(guild, messages) {
        return this.enqueue('messageDelete', guild.id, async () => {
            try {
                if (messages.size > 0) {
                    await messages.channel.bulkDelete(messages);
                }
            } catch (error) {
                console.error('Message delete error:', error);
                throw error;
            }
        });
    }

    // Member update rate limiting
    async queueMemberUpdate(guild, member, operation) {
        return this.enqueue('memberUpdate', guild.id, async () => {
            try {
                await operation();
            } catch (error) {
                console.error('Member update error:', error);
                throw error;
            }
        });
    }
}

module.exports = new RateLimiter();

