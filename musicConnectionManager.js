// musicConnectionManager.js - Connection pooling and management for music playback
const { 
    joinVoiceChannel,
    createAudioPlayer,
    VoiceConnectionStatus,
    entersState,
    AudioPlayerStatus,
    NoSubscriberBehavior
} = require('@discordjs/voice');
const { Collection } = require('discord.js');
const config = require('./config');
const errorHandler = require('./errorHandler');

class MusicConnectionManager {
    constructor() {
        this.connections = new Collection();
        this.players = new Collection();
        this.connectionStates = new Collection();
        this.reconnectAttempts = new Collection();
        this.maxReconnectAttempts = 5;
    }

    async getConnection(guild, voiceChannel) {
        let connection = this.connections.get(guild.id);
        
        if (!connection) {
            connection = await this.createConnection(guild, voiceChannel);
        } else if (connection.state.status === VoiceConnectionStatus.Disconnected) {
            await this.handleDisconnection(connection, guild, voiceChannel);
        }
        
        return connection;
    }

    async createConnection(guild, voiceChannel) {
        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: false
            });

            // Set up connection state tracking
            this.connectionStates.set(guild.id, {
                status: VoiceConnectionStatus.Connecting,
                lastActivity: Date.now(),
                channelId: voiceChannel.id
            });

            // Set up connection event handlers
            this.setupConnectionHandlers(connection, guild, voiceChannel);

            this.connections.set(guild.id, connection);
            return connection;
        } catch (error) {
            await errorHandler.handleError(error, { 
                guild, 
                voiceChannel,
                errorContext: 'Creating voice connection'
            });
            throw error;
        }
    }

    setupConnectionHandlers(connection, guild, voiceChannel) {
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await this.handleDisconnection(connection, guild, voiceChannel);
            } catch (error) {
                await errorHandler.handleError(error, {
                    guild,
                    voiceChannel,
                    errorContext: 'Handling disconnection'
                });
            }
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            this.connectionStates.set(guild.id, {
                status: VoiceConnectionStatus.Ready,
                lastActivity: Date.now(),
                channelId: voiceChannel.id
            });
            this.reconnectAttempts.delete(guild.id);
        });

        // Monitor connection state changes
        connection.on('stateChange', (oldState, newState) => {
            console.log(`Voice connection state change in ${guild.name}: ${oldState.status} -> ${newState.status}`);
            
            this.connectionStates.set(guild.id, {
                status: newState.status,
                lastActivity: Date.now(),
                channelId: voiceChannel.id
            });
        });
    }

    async handleDisconnection(connection, guild, voiceChannel) {
        try {
            const attempts = this.reconnectAttempts.get(guild.id) || 0;
            
            if (attempts >= this.maxReconnectAttempts) {
                this.cleanup(guild.id);
                throw new Error('Max reconnection attempts reached');
            }
            
            this.reconnectAttempts.set(guild.id, attempts + 1);

            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                ]);
                // Successful race, reset attempts
                this.reconnectAttempts.delete(guild.id);
            } catch (error) {
                // Destroy and recreate connection
                connection.destroy();
                const newConnection = await this.createConnection(guild, voiceChannel);
                this.connections.set(guild.id, newConnection);
                
                // Resubscribe the player if it exists
                const player = this.players.get(guild.id);
                if (player) {
                    newConnection.subscribe(player);
                }
            }
        } catch (error) {
            await errorHandler.handleError(error, {
                guild,
                voiceChannel,
                errorContext: 'Handling disconnection'
            });
            this.cleanup(guild.id);
            throw error;
        }
    }

    getPlayer(guild) {
        let player = this.players.get(guild.id);
        
        if (!player) {
            player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Play
                }
            });
            
            // Set up player event handlers
            this.setupPlayerHandlers(player, guild);
            
            this.players.set(guild.id, player);
        }
        
        return player;
    }

    setupPlayerHandlers(player, guild) {
        player.on('error', async (error) => {
            await errorHandler.handleError(error, {
                guild,
                errorContext: 'Audio player error'
            });
        });

        player.on(AudioPlayerStatus.Idle, () => {
            this.updateActivityTimestamp(guild.id);
        });

        player.on('stateChange', (oldState, newState) => {
            console.log(`Audio player state change in ${guild.name}: ${oldState.status} -> ${newState.status}`);
            this.updateActivityTimestamp(guild.id);
        });
    }

    updateActivityTimestamp(guildId) {
        const state = this.connectionStates.get(guildId);
        if (state) {
            state.lastActivity = Date.now();
            this.connectionStates.set(guildId, state);
        }
    }

    cleanup(guildId) {
        // Destroy and cleanup connection
        const connection = this.connections.get(guildId);
        if (connection) {
            connection.destroy();
            this.connections.delete(guildId);
        }

        // Stop and cleanup player
        const player = this.players.get(guildId);
        if (player) {
            player.stop();
            this.players.delete(guildId);
        }

        // Clean up state tracking
        this.connectionStates.delete(guildId);
        this.reconnectAttempts.delete(guildId);
    }

    // Automatic cleanup of inactive connections
    startInactivityChecks() {
        setInterval(() => {
            const now = Date.now();
            for (const [guildId, state] of this.connectionStates.entries()) {
                const inactiveTime = now - state.lastActivity;
                
                // Check if connection has been inactive for too long
                if (inactiveTime > config.music.leaveOnEndCooldown) {
                    console.log(`Cleaning up inactive connection in guild ${guildId}`);
                    this.cleanup(guildId);
                }
            }
        }, 60000); // Check every minute
    }

    // Get connection status
    getConnectionStatus(guildId) {
        return {
            connected: this.connections.has(guildId),
            state: this.connectionStates.get(guildId),
            reconnectAttempts: this.reconnectAttempts.get(guildId) || 0
        };
    }
}

module.exports = new MusicConnectionManager();

