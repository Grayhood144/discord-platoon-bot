// roleManager.js - Role management queue and optimization
const { Collection } = require('discord.js');
const rateLimiter = require('./rateLimiter');
const errorHandler = require('./errorHandler');
const CacheManager = require('./cache');

class RoleManager {
    constructor() {
        this.roleQueue = new Collection();
        this.processingQueue = false;
        this.processInterval = 1000; // Process queue every second
        this.maxRetries = 3;
    }

    async queueRoleUpdate(member, roles, action = 'add', options = {}) {
        const guildId = member.guild.id;
        const memberId = member.id;
        const key = `${guildId}-${memberId}`;

        if (!this.roleQueue.has(key)) {
            this.roleQueue.set(key, new Collection());
        }

        const queue = this.roleQueue.get(key);
        const roleIds = Array.isArray(roles) ? roles : [roles];

        roleIds.forEach(roleId => {
            queue.set(roleId, {
                roleId,
                action,
                options,
                retries: 0,
                timestamp: Date.now()
            });
        });

        // Start processing queue if not already processing
        if (!this.processingQueue) {
            this.processQueue();
        }
    }

    async processQueue() {
        this.processingQueue = true;

        try {
            for (const [key, queue] of this.roleQueue.entries()) {
                if (queue.size === 0) {
                    this.roleQueue.delete(key);
                    continue;
                }

                const [guildId, memberId] = key.split('-');

                try {
                    // Get guild and member from cache
                    const guild = await CacheManager.getGuildData(guildId);
                    const member = await CacheManager.getMemberData(guild, memberId);

                    // Group role updates by action
                    const addRoles = [];
                    const removeRoles = [];

                    queue.forEach((update, roleId) => {
                        if (update.action === 'add') {
                            addRoles.push(roleId);
                        } else {
                            removeRoles.push(roleId);
                        }
                    });

                    // Process role additions
                    if (addRoles.length > 0) {
                        try {
                            await rateLimiter.queueRoleUpdate(guild, member, async () => {
                                await member.roles.add(addRoles);
                            });
                            addRoles.forEach(roleId => queue.delete(roleId));
                        } catch (error) {
                            await this.handleRoleUpdateError(error, guild, member, addRoles, queue, 'add');
                        }
                    }

                    // Process role removals
                    if (removeRoles.length > 0) {
                        try {
                            await rateLimiter.queueRoleUpdate(guild, member, async () => {
                                await member.roles.remove(removeRoles);
                            });
                            removeRoles.forEach(roleId => queue.delete(roleId));
                        } catch (error) {
                            await this.handleRoleUpdateError(error, guild, member, removeRoles, queue, 'remove');
                        }
                    }

                } catch (error) {
                    await errorHandler.handleError(error, {
                        guildId,
                        memberId,
                        errorContext: 'Role queue processing'
                    });
                }
            }
        } catch (error) {
            await errorHandler.handleError(error, {
                errorContext: 'Role queue main processing'
            });
        }

        // Schedule next processing if queue is not empty
        if (this.roleQueue.size > 0) {
            setTimeout(() => this.processQueue(), this.processInterval);
        } else {
            this.processingQueue = false;
        }
    }

    async handleRoleUpdateError(error, guild, member, roleIds, queue, action) {
        await errorHandler.handleError(error, {
            guild,
            member,
            roleIds,
            action,
            errorContext: 'Role update'
        });

        // Handle specific error cases
        switch (error.code) {
            case 50013: // Missing Permissions
                await this.handlePermissionError(guild, member, roleIds, action);
                roleIds.forEach(roleId => queue.delete(roleId));
                break;

            case 50028: // Invalid Role
                await this.handleInvalidRoleError(guild, roleIds);
                roleIds.forEach(roleId => queue.delete(roleId));
                break;

            default:
                // Increment retry count for each role
                roleIds.forEach(roleId => {
                    const update = queue.get(roleId);
                    if (update) {
                        update.retries++;
                        if (update.retries >= this.maxRetries) {
                            queue.delete(roleId);
                        }
                    }
                });
        }
    }

    async handlePermissionError(guild, member, roleIds, action) {
        try {
            // Get the bot's member object
            const botMember = await guild.members.fetchMe();
            
            // Check role hierarchy
            const botRole = botMember.roles.highest;
            const roles = await Promise.all(roleIds.map(id => guild.roles.fetch(id)));
            
            const hierarchyIssues = roles.filter(role => role && role.position >= botRole.position);
            
            if (hierarchyIssues.length > 0) {
                // Notify admins about hierarchy issues
                const adminChannel = guild.channels.cache.find(
                    channel => channel.name === 'admin-logs' && 
                    channel.permissionsFor(botMember).has('SendMessages')
                );
                
                if (adminChannel) {
                    await adminChannel.send({
                        embeds: [{
                            color: 0xFF0000,
                            title: '❌ Role Hierarchy Issue',
                            description: `Cannot ${action} roles for ${member.user.tag} due to role hierarchy`,
                            fields: [
                                {
                                    name: 'Affected Roles',
                                    value: hierarchyIssues.map(role => role.name).join('\n')
                                },
                                {
                                    name: 'Bot\'s Highest Role',
                                    value: botRole.name
                                }
                            ]
                        }]
                    });
                }
            }
        } catch (error) {
            await errorHandler.handleError(error, {
                guild,
                member,
                roleIds,
                action,
                errorContext: 'Permission error handling'
            });
        }
    }

    async handleInvalidRoleError(guild, roleIds) {
        try {
            // Notify admins about invalid roles
            const adminChannel = guild.channels.cache.find(
                channel => channel.name === 'admin-logs' && 
                channel.permissionsFor(guild.members.me).has('SendMessages')
            );
            
            if (adminChannel) {
                await adminChannel.send({
                    embeds: [{
                        color: 0xFF0000,
                        title: '❌ Invalid Role Error',
                        description: 'Attempted to update roles that no longer exist',
                        fields: [
                            {
                                name: 'Role IDs',
                                value: roleIds.join('\n')
                            }
                        ]
                    }]
                });
            }
        } catch (error) {
            await errorHandler.handleError(error, {
                guild,
                roleIds,
                errorContext: 'Invalid role error handling'
            });
        }
    }

    // Utility method to check role hierarchy
    canManageRole(botMember, role) {
        if (!role) return false;
        if (!botMember.permissions.has('MANAGE_ROLES')) return false;
        return botMember.roles.highest.position > role.position;
    }

    // Get queue status
    getQueueStatus() {
        const status = {};
        this.roleQueue.forEach((queue, key) => {
            status[key] = {
                size: queue.size,
                pendingActions: {
                    add: queue.filter(update => update.action === 'add').size,
                    remove: queue.filter(update => update.action === 'remove').size
                },
                oldestUpdate: Math.min(...queue.map(update => update.timestamp))
            };
        });
        return status;
    }
}

module.exports = new RoleManager();

