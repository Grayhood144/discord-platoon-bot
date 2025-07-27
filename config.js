module.exports = {
    music: {
        // Default volume level
        defaultVolume: 75,
        
        // Maximum volume that users can set
        maxVolume: 100,
        
        // Whether to use Spotify bridge (convert Spotify to YouTube)
        enableSpotify: true,
        
        // Auto-leave settings
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 30000, // 30 seconds
        leaveOnEnd: true,
        leaveOnEndCooldown: 30000, // 30 seconds
        
        // DJ mode settings
        djMode: {
            enabled: true,
            roleId: '1398878441423634432'
        },

        // Emoji reactions for player
        emojis: {
            play: '▶️',
            pause: '⏸️',
            stop: '⏹️',
            skip: '⏭️',
            previous: '⏮️',
            loop: '🔁',
            shuffle: '🔀'
        }
    }
}; 