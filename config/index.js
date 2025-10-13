// config/index.js - Environment-based configuration management
const path = require('path');
require('dotenv').config();

const environment = process.env.NODE_ENV || 'development';

// Base configuration
const baseConfig = {
    // Bot settings
    bot: {
        prefix: '$',
        adminPrefix: '$$',
        testMode: false
    },

    // Cache settings
    cache: {
        guild: {
            ttl: 3600, // 1 hour
            checkPeriod: 600 // 10 minutes
        },
        member: {
            ttl: 1800, // 30 minutes
            checkPeriod: 300 // 5 minutes
        },
        role: {
            ttl: 3600, // 1 hour
            checkPeriod: 600 // 10 minutes
        }
    },

    // Rate limiting settings
    rateLimits: {
        roleUpdate: {
            max: 10,
            window: 10000 // 10 seconds
        },
        messageDelete: {
            max: 100,
            window: 10000 // 10 seconds
        },
        memberUpdate: {
            max: 10,
            window: 10000 // 10 seconds
        }
    },

    // Music player settings
    music: {
        defaultVolume: 75,
        maxVolume: 100,
        enableSpotify: true,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 30000, // 30 seconds
        leaveOnEnd: true,
        leaveOnEndCooldown: 30000, // 30 seconds
        djMode: {
            enabled: true,
            roleId: process.env.DJ_ROLE_ID
        },
        emojis: {
            play: '▶️',
            pause: '⏸️',
            stop: '⏹️',
            skip: '⏭️',
            previous: '⏮️',
            loop: '🔁',
            shuffle: '🔀'
        }
    },

    // Role settings
    roles: {
        newMember: {
            tra: process.env.TRA_ROLE_ID,
            cadet: process.env.CADET_ROLE_ID,
            trainee: process.env.TRAINEE_ROLE_ID
        },
        member: process.env.MEMBER_ROLE_ID,
        officer: process.env.OFFICER_ROLE_ID,
        warrantOfficer: process.env.WARRANT_OFFICER_ROLE_ID,
        ambassador: process.env.AMBASSADOR_ROLE_ID
    },

    // Channel settings
    channels: {
        organization: process.env.ORGANIZATION_CHANNEL_ID,
        logs: process.env.LOGS_CHANNEL_ID
    },

    // API settings
    api: {
        spotify: {
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            refreshInterval: 45 * 60 * 1000 // 45 minutes
        },
        youtube: {
            cookie: process.env.YOUTUBE_COOKIE
        }
    }
};

// Environment-specific configurations
const envConfigs = {
    development: {
        bot: {
            testMode: true
        },
        cache: {
            guild: {
                ttl: 300, // 5 minutes in development
                checkPeriod: 60
            }
        },
        rateLimits: {
            roleUpdate: {
                max: 5,
                window: 5000
            }
        }
    },
    
    production: {
        // Production-specific overrides
        cache: {
            guild: {
                ttl: 7200, // 2 hours in production
                checkPeriod: 1800
            }
        },
        rateLimits: {
            roleUpdate: {
                max: 15,
                window: 15000
            }
        }
    },
    
    test: {
        // Test environment configuration
        bot: {
            testMode: true
        },
        cache: {
            guild: {
                ttl: 60,
                checkPeriod: 30
            }
        }
    }
};

// Deep merge function for configurations
function mergeConfigs(base, override) {
    const merged = { ...base };
    
    for (const [key, value] of Object.entries(override)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            merged[key] = mergeConfigs(merged[key] || {}, value);
        } else {
            merged[key] = value;
        }
    }
    
    return merged;
}

// Validate required environment variables
function validateConfig(config) {
    const requiredVars = [
        'DJ_ROLE_ID',
        'SPOTIFY_CLIENT_ID',
        'SPOTIFY_CLIENT_SECRET',
        'DISCORD_TOKEN'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return config;
}

// Export the merged and validated configuration
module.exports = validateConfig(
    mergeConfigs(baseConfig, envConfigs[environment] || {})
);

