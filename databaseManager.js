// databaseManager.js - Database integration with caching layer
const { Collection } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const errorHandler = require('./errorHandler');
const memoryManager = require('./memoryManager');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.cache = new Collection();
        this.cacheTTL = 30 * 60 * 1000; // 30 minutes
        this.backupInterval = 24 * 60 * 60 * 1000; // 24 hours
        this.initialized = false;
        this.dbPath = path.join(__dirname, 'data', 'bot.db');
    }

    /**
     * Initialize the database connection
     */
    async initialize() {
        try {
            // Ensure data directory exists
            const fs = require('fs');
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Open database connection
            this.db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });

            // Create tables if they don't exist
            await this.createTables();

            // Start backup schedule
            this.startBackupSchedule();

            this.initialized = true;
            console.log('✅ Database initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing database:', error);
            throw error;
        }
    }

    /**
     * Create database tables
     */
    async createTables() {
        const tables = {
            settings: `
                CREATE TABLE IF NOT EXISTS settings (
                    guild_id TEXT PRIMARY KEY,
                    settings_json TEXT NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            `,
            user_data: `
                CREATE TABLE IF NOT EXISTS user_data (
                    user_id TEXT PRIMARY KEY,
                    data_json TEXT NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            `,
            command_stats: `
                CREATE TABLE IF NOT EXISTS command_stats (
                    command_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    command_name TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    guild_id TEXT NOT NULL,
                    executed_at INTEGER NOT NULL,
                    success BOOLEAN NOT NULL,
                    execution_time INTEGER NOT NULL
                )
            `,
            role_history: `
                CREATE TABLE IF NOT EXISTS role_history (
                    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    guild_id TEXT NOT NULL,
                    role_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    timestamp INTEGER NOT NULL
                )
            `
        };

        for (const [name, sql] of Object.entries(tables)) {
            try {
                await this.db.exec(sql);
            } catch (error) {
                console.error(`❌ Error creating ${name} table:`, error);
                throw error;
            }
        }
    }

    /**
     * Get cached data or fetch from database
     * @param {string} key - Cache key
     * @param {Function} fetchFunction - Function to fetch data if not cached
     * @returns {Object} The requested data
     */
    async getCachedData(key, fetchFunction) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }

        const data = await fetchFunction();
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        // Register with memory manager
        memoryManager.registerResource(`cache:${key}`, data, () => {
            this.cache.delete(key);
        });

        return data;
    }

    /**
     * Get guild settings
     * @param {string} guildId - Discord guild ID
     * @returns {Object} Guild settings
     */
    async getGuildSettings(guildId) {
        return this.getCachedData(`settings:${guildId}`, async () => {
            const row = await this.db.get(
                'SELECT settings_json FROM settings WHERE guild_id = ?',
                guildId
            );
            return row ? JSON.parse(row.settings_json) : {};
        });
    }

    /**
     * Update guild settings
     * @param {string} guildId - Discord guild ID
     * @param {Object} settings - New settings
     */
    async updateGuildSettings(guildId, settings) {
        try {
            const settingsJson = JSON.stringify(settings);
            await this.db.run(
                `INSERT OR REPLACE INTO settings (guild_id, settings_json, updated_at)
                 VALUES (?, ?, ?)`,
                [guildId, settingsJson, Date.now()]
            );

            // Update cache
            this.cache.set(`settings:${guildId}`, {
                data: settings,
                timestamp: Date.now()
            });
        } catch (error) {
            await errorHandler.handleError(error, {
                guildId,
                errorContext: 'Database settings update'
            });
            throw error;
        }
    }

    /**
     * Log command execution
     * @param {Object} commandData - Command execution data
     */
    async logCommand(commandData) {
        try {
            const { command_name, user_id, guild_id, success, execution_time } = commandData;
            await this.db.run(
                `INSERT INTO command_stats 
                 (command_name, user_id, guild_id, executed_at, success, execution_time)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [command_name, user_id, guild_id, Date.now(), success ? 1 : 0, execution_time]
            );
        } catch (error) {
            await errorHandler.handleError(error, {
                commandData,
                errorContext: 'Command logging'
            });
        }
    }

    /**
     * Get command statistics
     * @param {Object} filters - Query filters
     * @returns {Array} Command statistics
     */
    async getCommandStats(filters = {}) {
        const conditions = [];
        const params = [];

        if (filters.userId) {
            conditions.push('user_id = ?');
            params.push(filters.userId);
        }
        if (filters.guildId) {
            conditions.push('guild_id = ?');
            params.push(filters.guildId);
        }
        if (filters.commandName) {
            conditions.push('command_name = ?');
            params.push(filters.commandName);
        }
        if (filters.since) {
            conditions.push('executed_at > ?');
            params.push(filters.since);
        }

        const whereClause = conditions.length > 0 
            ? 'WHERE ' + conditions.join(' AND ')
            : '';

        return await this.db.all(
            `SELECT * FROM command_stats ${whereClause} ORDER BY executed_at DESC LIMIT 1000`,
            params
        );
    }

    /**
     * Log role change
     * @param {Object} roleData - Role change data
     */
    async logRoleChange(roleData) {
        try {
            const { user_id, guild_id, role_id, action } = roleData;
            await this.db.run(
                `INSERT INTO role_history 
                 (user_id, guild_id, role_id, action, timestamp)
                 VALUES (?, ?, ?, ?, ?)`,
                [user_id, guild_id, role_id, action, Date.now()]
            );
        } catch (error) {
            await errorHandler.handleError(error, {
                roleData,
                errorContext: 'Role history logging'
            });
        }
    }

    /**
     * Get role history
     * @param {Object} filters - Query filters
     * @returns {Array} Role history
     */
    async getRoleHistory(filters = {}) {
        const conditions = [];
        const params = [];

        if (filters.userId) {
            conditions.push('user_id = ?');
            params.push(filters.userId);
        }
        if (filters.guildId) {
            conditions.push('guild_id = ?');
            params.push(filters.guildId);
        }
        if (filters.roleId) {
            conditions.push('role_id = ?');
            params.push(filters.roleId);
        }
        if (filters.since) {
            conditions.push('timestamp > ?');
            params.push(filters.since);
        }

        const whereClause = conditions.length > 0 
            ? 'WHERE ' + conditions.join(' AND ')
            : '';

        return await this.db.all(
            `SELECT * FROM role_history ${whereClause} ORDER BY timestamp DESC LIMIT 1000`,
            params
        );
    }

    /**
     * Create database backup
     */
    async createBackup() {
        try {
            const fs = require('fs');
            const backupDir = path.join(__dirname, 'data', 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

            await this.db.backup(backupPath);
            console.log(`✅ Database backup created: ${backupPath}`);

            // Clean up old backups (keep last 5)
            const backups = fs.readdirSync(backupDir)
                .filter(file => file.startsWith('backup-'))
                .sort()
                .reverse();

            for (const backup of backups.slice(5)) {
                fs.unlinkSync(path.join(backupDir, backup));
            }
        } catch (error) {
            await errorHandler.handleError(error, {
                errorContext: 'Database backup'
            });
        }
    }

    /**
     * Start backup schedule
     */
    startBackupSchedule() {
        setInterval(() => {
            this.createBackup().catch(error => {
                errorHandler.handleError(error, {
                    errorContext: 'Scheduled database backup'
                });
            });
        }, this.backupInterval);
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTTL) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Close database connection
     */
    async close() {
        if (this.db) {
            await this.createBackup();
            await this.db.close();
            this.initialized = false;
        }
    }
}

module.exports = new DatabaseManager();
