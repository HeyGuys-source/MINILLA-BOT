const { BasePlugin } = require('../utils/pluginManager');

class ExamplePlugin extends BasePlugin {
    constructor(client, pluginManager) {
        super(client, pluginManager);
        
        // Plugin metadata
        this.name = 'ExamplePlugin';
        this.version = '1.0.0';
        this.description = 'An example plugin demonstrating the plugin system';
        this.author = 'Advanced Bot System';
        this.dependencies = []; // Other plugins this depends on
        
        // Plugin-specific properties
        this.messageCount = 0;
        this.commandUsage = new Map();
        
        // Hooks - functions that modify data flow
        this.hooks = {
            'beforeCommand': this.beforeCommandHook.bind(this),
            'afterCommand': this.afterCommandHook.bind(this)
        };
        
        // Middlewares - functions that can intercept events
        this.middlewares = {
            'messageCommand': this.commandMiddleware.bind(this)
        };
    }
    
    async init() {
        this.log('Plugin initialized successfully!');
        
        // Set up plugin-specific intervals or listeners
        this.setupMessageTracker();
    }
    
    setupMessageTracker() {
        // Track message statistics
        this.client.on('messageCreate', (message) => {
            if (!message.author.bot) {
                this.messageCount++;
            }
        });
        
        // Log stats every 10 minutes
        this.statsInterval = setInterval(() => {
            this.log(`Message count: ${this.messageCount}, Commands tracked: ${this.commandUsage.size}`);
        }, 600000);
    }
    
    // Hook that runs before any command execution
    async beforeCommandHook(commandName, user, args) {
        this.log(`Command ${commandName} about to be executed by ${user.tag}`);
        
        // You can modify the arguments here
        return [commandName, user, args];
    }
    
    // Hook that runs after command execution
    async afterCommandHook(commandName, user, result) {
        // Track command usage
        const key = `${commandName}_${user.id}`;
        this.commandUsage.set(key, (this.commandUsage.get(key) || 0) + 1);
        
        this.log(`Command ${commandName} completed for ${user.tag}`);
        return result;
    }
    
    // Middleware that can intercept and modify command execution
    async commandMiddleware(context, next) {
        const { message, command } = context;
        
        // Add custom logic before command execution
        this.log(`Middleware processing command: ${command.name}`);
        
        // Check for custom conditions
        if (command.name === 'ping' && Math.random() < 0.1) {
            // 10% chance to add a special message
            await message.channel.send('🎉 You hit the lucky ping!');
        }
        
        // Continue to the next middleware or command execution
        return await next();
    }
    
    // Plugin API methods
    getMessageCount() {
        return this.messageCount;
    }
    
    getCommandStats() {
        const stats = {};
        for (const [key, count] of this.commandUsage) {
            const [command] = key.split('_');
            stats[command] = (stats[command] || 0) + count;
        }
        return stats;
    }
    
    resetStats() {
        this.messageCount = 0;
        this.commandUsage.clear();
        this.log('Statistics reset');
    }
    
    // Plugin lifecycle methods
    async enable() {
        this.log('Plugin enabled');
    }
    
    async disable() {
        this.log('Plugin disabled');
    }
    
    async destroy() {
        // Clean up resources
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        
        this.log('Plugin destroyed and cleaned up');
    }
}

module.exports = ExamplePlugin;