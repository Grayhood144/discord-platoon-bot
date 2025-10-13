// cache.js - Caching utility for Discord data
const NodeCache = require('node-cache');

// Initialize caches with different TTLs
const guildCache = new NodeCache({ 
    stdTTL: 3600, // 1 hour for guild data
    checkperiod: 600 // Check for expired keys every 10 minutes
});

const memberCache = new NodeCache({ 
    stdTTL: 1800, // 30 minutes for member data
    checkperiod: 300 // Check for expired keys every 5 minutes
});

const roleCache = new NodeCache({ 
    stdTTL: 3600, // 1 hour for role data
    checkperiod: 600 
});

// Cache keys
const CACHE_KEYS = {
    GUILD_MEMBERS: (guildId) => `guild_members_${guildId}`,
    GUILD_ROLES: (guildId) => `guild_roles_${guildId}`,
    MEMBER_ROLES: (guildId, memberId) => `member_roles_${guildId}_${memberId}`,
    MEMBER_DATA: (guildId, memberId) => `member_data_${guildId}_${memberId}`
};

class CacheManager {
    // Guild caching
    static async getGuildMembers(guild) {
        const cacheKey = CACHE_KEYS.GUILD_MEMBERS(guild.id);
        let members = guildCache.get(cacheKey);

        if (members === undefined) {
            try {
                members = await guild.members.fetch();
                guildCache.set(cacheKey, members);
            } catch (error) {
                console.error('Error fetching guild members:', error);
                throw error;
            }
        }

        return members;
    }

    static async getGuildRoles(guild) {
        const cacheKey = CACHE_KEYS.GUILD_ROLES(guild.id);
        let roles = roleCache.get(cacheKey);

        if (roles === undefined) {
            try {
                roles = await guild.roles.fetch();
                roleCache.set(cacheKey, roles);
            } catch (error) {
                console.error('Error fetching guild roles:', error);
                throw error;
            }
        }

        return roles;
    }

    // Member caching
    static async getMemberData(guild, memberId) {
        const cacheKey = CACHE_KEYS.MEMBER_DATA(guild.id, memberId);
        let memberData = memberCache.get(cacheKey);

        if (memberData === undefined) {
            try {
                memberData = await guild.members.fetch(memberId);
                memberCache.set(cacheKey, memberData);
            } catch (error) {
                console.error('Error fetching member data:', error);
                throw error;
            }
        }

        return memberData;
    }

    static async getMemberRoles(guild, memberId) {
        const cacheKey = CACHE_KEYS.MEMBER_ROLES(guild.id, memberId);
        let roles = roleCache.get(cacheKey);

        if (roles === undefined) {
            try {
                const member = await this.getMemberData(guild, memberId);
                roles = member.roles.cache;
                roleCache.set(cacheKey, roles);
            } catch (error) {
                console.error('Error fetching member roles:', error);
                throw error;
            }
        }

        return roles;
    }

    // Cache invalidation
    static invalidateGuildCache(guildId) {
        guildCache.del(CACHE_KEYS.GUILD_MEMBERS(guildId));
        roleCache.del(CACHE_KEYS.GUILD_ROLES(guildId));
    }

    static invalidateMemberCache(guildId, memberId) {
        memberCache.del(CACHE_KEYS.MEMBER_DATA(guildId, memberId));
        roleCache.del(CACHE_KEYS.MEMBER_ROLES(guildId, memberId));
    }

    // Bulk operations
    static async warmupGuildCache(guild) {
        try {
            await Promise.all([
                this.getGuildMembers(guild),
                this.getGuildRoles(guild)
            ]);
        } catch (error) {
            console.error('Error warming up guild cache:', error);
            throw error;
        }
    }

    static clearAllCaches() {
        guildCache.flushAll();
        memberCache.flushAll();
        roleCache.flushAll();
    }

    // Cache statistics
    static getCacheStats() {
        return {
            guild: guildCache.getStats(),
            member: memberCache.getStats(),
            role: roleCache.getStats()
        };
    }
}

module.exports = CacheManager;

