// messageManager.js - Optimized message cleanup and management
const { Collection } = require('discord.js');
const rateLimiter = require('./rateLimiter');
const errorHandler = require('./errorHandler');

class MessageManager {
    constructor() {
        this.deleteQueue = new Collection();
        this.processingQueue = false;
        this.batchSize = 100; // Maximum messages per bulk delete
        this.processInterval = 1000; // Process queue every second
    }

    async queueMessageDelete(message, options = {}) {
        const guildId = message.guild.id;
        const channelId = message.channel.id;
        const key = `${guildId}-${channelId}`;

        if (!this.deleteQueue.has(key)) {
            this.deleteQueue.set(key, new Collection());
        }

        const queue = this.deleteQueue.get(key);
        queue.set(message.id, {
            message,
            options,
            timestamp: Date.now()
        });

        // Start processing queue if not already processing
        if (!this.processingQueue) {
            this.processQueue();
        }
    }

    async queueBulkDelete(channel, amount, options = {}) {
        try {
            const messages = await channel.messages.fetch({ limit: amount });
            const key = `${channel.guild.id}-${channel.id}`;

            if (!this.deleteQueue.has(key)) {
                this.deleteQueue.set(key, new Collection());
            }

            const queue = this.deleteQueue.get(key);
            
            messages.forEach(message => {
                queue.set(message.id, {
                    message,
                    options,
                    timestamp: Date.now()
                });
            });

            // Start processing queue if not already processing
            if (!this.processingQueue) {
                this.processQueue();
            }

            return messages.size;
        } catch (error) {
            await errorHandler.handleError(error, {
                channel,
                errorContext: 'Bulk delete queue'
            });
            throw error;
        }
    }

    async processQueue() {
        this.processingQueue = true;

        try {
            for (const [key, queue] of this.deleteQueue.entries()) {
                if (queue.size === 0) {
                    this.deleteQueue.delete(key);
                    continue;
                }

                const [guildId, channelId] = key.split('-');
                const messages = queue.map(item => item.message);

                // Group messages by age for appropriate deletion method
                const { recent, old } = this.groupMessagesByAge(messages);

                // Process recent messages in batches
                if (recent.size > 0) {
                    const batches = this.createMessageBatches(recent);
                    for (const batch of batches) {
                        try {
                            await rateLimiter.queueMessageDelete(guildId, batch);
                            // Remove processed messages from queue
                            batch.forEach(message => queue.delete(message.id));
                        } catch (error) {
                            await errorHandler.handleError(error, {
                                guildId,
                                channelId,
                                errorContext: 'Bulk message delete'
                            });
                        }
                    }
                }

                // Process old messages individually
                if (old.size > 0) {
                    for (const message of old.values()) {
                        try {
                            await rateLimiter.queueMessageDelete(guildId, [message]);
                            queue.delete(message.id);
                        } catch (error) {
                            await errorHandler.handleError(error, {
                                guildId,
                                channelId,
                                message,
                                errorContext: 'Individual message delete'
                            });
                        }
                    }
                }
            }
        } catch (error) {
            await errorHandler.handleError(error, {
                errorContext: 'Message queue processing'
            });
        }

        // Schedule next processing if queue is not empty
        if (this.deleteQueue.size > 0) {
            setTimeout(() => this.processQueue(), this.processInterval);
        } else {
            this.processingQueue = false;
        }
    }

    groupMessagesByAge(messages) {
        const recent = new Collection();
        const old = new Collection();
        const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);

        messages.forEach(message => {
            if (message.createdTimestamp > twoWeeksAgo) {
                recent.set(message.id, message);
            } else {
                old.set(message.id, message);
            }
        });

        return { recent, old };
    }

    createMessageBatches(messages) {
        const batches = [];
        let currentBatch = [];

        messages.forEach(message => {
            currentBatch.push(message);
            if (currentBatch.length >= this.batchSize) {
                batches.push(currentBatch);
                currentBatch = [];
            }
        });

        if (currentBatch.length > 0) {
            batches.push(currentBatch);
        }

        return batches;
    }

    // Utility method to check if a message should be deleted
    shouldDeleteMessage(message, filters = {}) {
        const {
            ignorePatterns = [],
            ignorePrefixes = [],
            ignoreUsers = [],
            maxAge
        } = filters;

        // Check message age
        if (maxAge && (Date.now() - message.createdTimestamp) > maxAge) {
            return false;
        }

        // Check user filters
        if (ignoreUsers.includes(message.author.id)) {
            return false;
        }

        // Check content filters
        const content = message.content.toLowerCase();
        
        // Check ignore patterns
        if (ignorePatterns.some(pattern => content.includes(pattern.toLowerCase()))) {
            return false;
        }

        // Check ignore prefixes
        if (ignorePrefixes.some(prefix => content.startsWith(prefix.toLowerCase()))) {
            return false;
        }

        return true;
    }

    // Get queue status
    getQueueStatus() {
        const status = {};
        this.deleteQueue.forEach((queue, key) => {
            status[key] = {
                size: queue.size,
                oldestMessage: Math.min(...queue.map(item => item.timestamp))
            };
        });
        return status;
    }
}

module.exports = new MessageManager();

