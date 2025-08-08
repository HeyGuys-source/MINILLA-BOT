const logger = require('../utils/logger.js');

// Configuration object with validation
const config = {
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID,
        guildId: process.env.DISCORD_GUILD_ID,
    },
    
    bot: {
        prefix: process.env.BOT_PREFIX || '!',
        owners: process.env.BOT_OWNERS ? process.env.BOT_OWNERS.split(',') : [],
        defaultActivity: {
            name: 'for commands | !help',
            type: 'WATCHING'
        },
        defaultStatus: 'online' // online, idle, dnd, invisible
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        toFile: process.env.LOG_TO_FILE === 'true'
    },
    
    database: {
        url: process.env.DATABASE_URL || null
    },
    
    features: {
        commandCooldowns: true,
        autoModeration: false,
        welcomeMessages: true,
        memberLogging: true,
        performanceMonitoring: true,
        advancedCaching: true,
        rateLimiting: true,
        pluginSystem: true,
        autoRecovery: true
    },
    
    cache: {
        maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 10000,
        defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL) || 3600000, // 1 hour
        maxMemoryUsage: parseInt(process.env.CACHE_MAX_MEMORY) || 200 * 1024 * 1024, // 200MB
        cleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL) || 300000 // 5 minutes
    },
    
    monitoring: {
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 300000, // 5 minutes
        metricsRetention: parseInt(process.env.METRICS_RETENTION) || 3600000, // 1 hour
        autoRecovery: process.env.AUTO_RECOVERY !== 'false',
        criticalMemoryThreshold: parseFloat(process.env.CRITICAL_MEMORY_THRESHOLD) || 0.9,
        criticalLatencyThreshold: parseInt(process.env.CRITICAL_LATENCY_THRESHOLD) || 1000
    },
    
    limits: {
        maxCommandsPerMinute: 10,
        maxMessageLength: 2000,
        commandTimeout: 30000 // 30 seconds
    }
};

// Validation function
function validateConfig() {
    const errors = [];
    
    if (!config.discord.token) {
        errors.push('DISCORD_TOKEN is required');
    }
    
    if (config.discord.token && config.discord.token.length < 50) {
        errors.push('DISCORD_TOKEN appears to be invalid (too short)');
    }
    
    if (errors.length > 0) {
        logger.error('Configuration validation failed:');
        errors.forEach(error => logger.error(`- ${error}`));
        process.exit(1);
    }
    
    logger.info('✅ Configuration validation passed');
}

// Validate configuration on load
validateConfig();

module.exports = config;
