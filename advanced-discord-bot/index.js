require('dotenv').config();
const { Client, Collection } = require('discord.js');
const config = require('./config/config.js');
const intents = require('./config/intents.js');
const logger = require('./utils/logger.js');
const commandHandler = require('./handlers/commandHandler.js');
const eventHandler = require('./handlers/eventHandler.js');
const errorHandler = require('./middleware/errorHandler.js');
const PerformanceMonitor = require('./utils/performance.js');
const AdvancedCache = require('./utils/cache.js');
const { AdvancedRateLimitManager } = require('./utils/rateLimit.js');
const { PluginManager } = require('./utils/pluginManager.js');

class DiscordBot {
    constructor() {
        this.client = new Client({ 
            intents: intents.getIntents(),
            partials: intents.getPartials()
        });
        
        this.client.commands = new Collection();
        this.client.cooldowns = new Collection();
        this.client.config = config;
        this.client.logger = logger;
        
        // Initialize advanced systems
        this.setupAdvancedSystems();
        this.initializeBot();
    }
    
    setupAdvancedSystems() {
        // Performance monitoring
        this.performanceMonitor = new PerformanceMonitor(this.client);
        this.client.performance = this.performanceMonitor;
        
        // Advanced caching system
        this.cache = new AdvancedCache({
            maxSize: config.cache?.maxSize || 10000,
            defaultTTL: config.cache?.defaultTTL || 3600000,
            maxMemoryUsage: config.cache?.maxMemoryUsage || 200 * 1024 * 1024
        });
        this.client.cache = this.cache;
        
        // Rate limiting system
        this.rateLimitManager = new AdvancedRateLimitManager();
        this.setupRateLimiters();
        this.client.rateLimit = this.rateLimitManager;
        
        // Plugin system
        this.pluginManager = new PluginManager(this.client);
        this.client.plugins = this.pluginManager;
        
        // Setup monitoring events
        this.setupMonitoringEvents();
    }
    
    setupRateLimiters() {
        // Command rate limiter
        this.rateLimitManager.createLimiter('commands', {
            windowMs: 60000, // 1 minute
            maxRequests: config.limits.maxCommandsPerMinute,
            keyGenerator: (userId) => `cmd_${userId}`,
            onLimitReached: (key, client, context) => {
                logger.warn(`Command rate limit exceeded for ${key}`);
            }
        });
        
        // Message processing rate limiter
        this.rateLimitManager.createLimiter('messages', {
            windowMs: 30000, // 30 seconds
            maxRequests: 30,
            keyGenerator: (userId) => `msg_${userId}`
        });
        
        // API rate limiter
        this.rateLimitManager.createLimiter('api', {
            windowMs: 10000, // 10 seconds
            maxRequests: 5,
            keyGenerator: (userId) => `api_${userId}`
        });
    }
    
    setupMonitoringEvents() {
        // Performance monitoring events
        this.performanceMonitor.on('critical', (health) => {
            logger.error('Bot entered critical state:', health.issues);
            this.handleCriticalState(health);
        });
        
        this.performanceMonitor.on('unhealthy', (health) => {
            logger.warn('Bot health degraded:', health.issues);
        });
        
        // Plugin system events
        this.pluginManager.on('pluginLoaded', (name) => {
            logger.info(`Plugin loaded: ${name}`);
        });
        
        this.pluginManager.on('pluginUnloaded', (name) => {
            logger.info(`Plugin unloaded: ${name}`);
        });
    }
    
    async handleCriticalState(health) {
        try {
            // Attempt self-healing
            logger.info('🚑 Attempting self-healing procedures...');
            
            // Clear caches
            this.cache.clear();
            this.rateLimitManager.resetLimiter('commands');
            this.rateLimitManager.resetLimiter('messages');
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            logger.info('✅ Self-healing procedures completed');
            
        } catch (error) {
            logger.error('Self-healing failed:', error);
        }
    }

    async initializeBot() {
        try {
            logger.info('🚀 Initializing Discord Bot...');
            
            // Load command and event handlers
            await commandHandler.loadCommands(this.client);
            await eventHandler.loadEvents(this.client);
            
            // Load plugins
            await this.pluginManager.loadAllPlugins();
            
            // Set up global error handling
            errorHandler.setupGlobalErrorHandling(this.client);
            
            // Login to Discord
            await this.client.login(config.discord.token);
            
            // Start monitoring after successful login
            this.startHealthChecks();
            
        } catch (error) {
            logger.error('Failed to initialize bot:', error);
            process.exit(1);
        }
    }
    
    startHealthChecks() {
        // Regular health check every 5 minutes
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 300000);
        
        // Cache cleanup every hour
        this.cacheCleanupInterval = setInterval(() => {
            const stats = this.cache.getStats();
            logger.info(`Cache stats: ${stats.size} items, ${stats.hitRate}% hit rate`);
        }, 3600000);
        
        // Rate limit stats every 10 minutes
        this.rateLimitStatsInterval = setInterval(() => {
            const stats = this.rateLimitManager.getStats();
            if (stats.global.blockedRequests > 0) {
                logger.info(`Rate limit stats: ${stats.global.blockedRequests} blocked requests`);
            }
        }, 600000);
    }
    
    async performHealthCheck() {
        try {
            const performance = this.performanceMonitor.getReport();
            const cacheStats = this.cache.getStats();
            const rateLimitStats = this.rateLimitManager.getStats();
            
            logger.debug('Health check completed', {
                uptime: performance.uptime,
                memory: performance.latestMemory?.heapUsed,
                latency: performance.averageLatency,
                cacheSize: cacheStats.size,
                guilds: this.client.guilds.cache.size
            });
            
            // Auto-optimize if needed
            if (cacheStats.memoryUsage > this.cache.options.maxMemoryUsage * 0.8) {
                logger.info('🧹 Cache memory usage high, performing cleanup');
                this.cache.cleanupExpired();
            }
            
        } catch (error) {
            logger.error('Health check failed:', error);
        }
    }

    // Graceful shutdown handling
    setupGracefulShutdown() {
        const gracefulShutdown = async (signal) => {
            logger.info(`📴 Received ${signal}. Shutting down gracefully...`);
            
            try {
                // Clear intervals
                if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
                if (this.cacheCleanupInterval) clearInterval(this.cacheCleanupInterval);
                if (this.rateLimitStatsInterval) clearInterval(this.rateLimitStatsInterval);
                
                // Update bot status to indicate shutdown
                if (this.client.user) {
                    await this.client.user.setStatus('invisible');
                }
                
                // Shutdown advanced systems
                await this.pluginManager.destroy();
                this.performanceMonitor.destroy();
                this.cache.destroy();
                this.rateLimitManager.destroy();
                
                // Close database connections if any
                // await database.close();
                
                // Destroy the Discord client
                this.client.destroy();
                
                logger.info('✅ Bot shutdown completed successfully');
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        };

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart
    }
}

// Initialize and start the bot
const bot = new DiscordBot();
bot.setupGracefulShutdown();

// Export for testing purposes
module.exports = DiscordBot;
