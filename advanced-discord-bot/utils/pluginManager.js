const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class PluginManager extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;
        this.plugins = new Map();
        this.pluginOrder = [];
        this.pluginsPath = path.join(__dirname, '../plugins');
        this.hooks = new Map();
        this.middlewares = new Map();
        
        this.ensurePluginDirectory();
    }
    
    async ensurePluginDirectory() {
        try {
            await fs.access(this.pluginsPath);
        } catch {
            await fs.mkdir(this.pluginsPath, { recursive: true });
            this.client.logger.info('📁 Created plugins directory');
        }
    }
    
    async loadAllPlugins() {
        try {
            this.client.logger.info('🔌 Loading plugins...');
            
            const pluginFiles = await this.getPluginFiles();
            let loadedCount = 0;
            
            for (const file of pluginFiles) {
                try {
                    await this.loadPlugin(file);
                    loadedCount++;
                } catch (error) {
                    this.client.logger.error(`Failed to load plugin ${file}:`, error);
                }
            }
            
            this.client.logger.info(`✅ Loaded ${loadedCount} plugins`);
            this.emit('allPluginsLoaded', loadedCount);
            
        } catch (error) {
            this.client.logger.error('Failed to load plugins:', error);
            throw error;
        }
    }
    
    async getPluginFiles() {
        try {
            const files = await fs.readdir(this.pluginsPath);
            return files.filter(file => file.endsWith('.js') && !file.startsWith('_'));
        } catch (error) {
            return [];
        }
    }
    
    async loadPlugin(filename) {
        const pluginPath = path.join(this.pluginsPath, filename);
        const pluginName = path.basename(filename, '.js');
        
        try {
            // Clear require cache for hot reloading
            delete require.cache[require.resolve(pluginPath)];
            
            const PluginClass = require(pluginPath);
            
            if (typeof PluginClass !== 'function') {
                throw new Error('Plugin must export a class');
            }
            
            const plugin = new PluginClass(this.client, this);
            
            // Validate plugin structure
            this.validatePlugin(plugin);
            
            // Initialize plugin
            if (plugin.init && typeof plugin.init === 'function') {
                await plugin.init();
            }
            
            // Register plugin
            this.plugins.set(pluginName, plugin);
            this.pluginOrder.push(pluginName);
            
            // Register hooks if any
            if (plugin.hooks) {
                this.registerPluginHooks(pluginName, plugin.hooks);
            }
            
            // Register middlewares if any
            if (plugin.middlewares) {
                this.registerPluginMiddlewares(pluginName, plugin.middlewares);
            }
            
            this.client.logger.info(`📦 Loaded plugin: ${pluginName}`);
            this.emit('pluginLoaded', pluginName, plugin);
            
            return plugin;
            
        } catch (error) {
            this.client.logger.error(`Failed to load plugin ${pluginName}:`, error);
            throw error;
        }
    }
    
    validatePlugin(plugin) {
        const required = ['name', 'version', 'description'];
        
        for (const field of required) {
            if (!plugin[field]) {
                throw new Error(`Plugin missing required field: ${field}`);
            }
        }
        
        if (plugin.dependencies) {
            this.validatePluginDependencies(plugin.dependencies);
        }
    }
    
    validatePluginDependencies(dependencies) {
        for (const dep of dependencies) {
            if (!this.plugins.has(dep)) {
                throw new Error(`Plugin dependency not found: ${dep}`);
            }
        }
    }
    
    registerPluginHooks(pluginName, hooks) {
        for (const [hookName, handler] of Object.entries(hooks)) {
            if (!this.hooks.has(hookName)) {
                this.hooks.set(hookName, []);
            }
            
            this.hooks.get(hookName).push({
                plugin: pluginName,
                handler
            });
        }
    }
    
    registerPluginMiddlewares(pluginName, middlewares) {
        for (const [eventName, middleware] of Object.entries(middlewares)) {
            if (!this.middlewares.has(eventName)) {
                this.middlewares.set(eventName, []);
            }
            
            this.middlewares.get(eventName).push({
                plugin: pluginName,
                middleware
            });
        }
    }
    
    async executeHook(hookName, ...args) {
        const hooks = this.hooks.get(hookName);
        if (!hooks) return args;
        
        let result = args;
        
        for (const hook of hooks) {
            try {
                const hookResult = await hook.handler.call(this.plugins.get(hook.plugin), ...result);
                if (hookResult !== undefined) {
                    result = Array.isArray(hookResult) ? hookResult : [hookResult];
                }
            } catch (error) {
                this.client.logger.error(`Error in hook ${hookName} from plugin ${hook.plugin}:`, error);
            }
        }
        
        return result;
    }
    
    async executeMiddlewares(eventName, context, next) {
        const middlewares = this.middlewares.get(eventName);
        if (!middlewares || middlewares.length === 0) {
            return await next();
        }
        
        let index = 0;
        
        const executeNext = async () => {
            if (index >= middlewares.length) {
                return await next();
            }
            
            const middleware = middlewares[index++];
            try {
                return await middleware.middleware.call(
                    this.plugins.get(middleware.plugin),
                    context,
                    executeNext
                );
            } catch (error) {
                this.client.logger.error(`Error in middleware from plugin ${middleware.plugin}:`, error);
                return await executeNext();
            }
        };
        
        return await executeNext();
    }
    
    async unloadPlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) return false;
        
        try {
            // Call cleanup if available
            if (plugin.destroy && typeof plugin.destroy === 'function') {
                await plugin.destroy();
            }
            
            // Remove hooks
            for (const [hookName, hooks] of this.hooks) {
                this.hooks.set(hookName, hooks.filter(h => h.plugin !== pluginName));
            }
            
            // Remove middlewares
            for (const [eventName, middlewares] of this.middlewares) {
                this.middlewares.set(eventName, middlewares.filter(m => m.plugin !== pluginName));
            }
            
            // Remove from collections
            this.plugins.delete(pluginName);
            this.pluginOrder = this.pluginOrder.filter(name => name !== pluginName);
            
            this.client.logger.info(`🗑️ Unloaded plugin: ${pluginName}`);
            this.emit('pluginUnloaded', pluginName);
            
            return true;
            
        } catch (error) {
            this.client.logger.error(`Error unloading plugin ${pluginName}:`, error);
            return false;
        }
    }
    
    async reloadPlugin(pluginName) {
        await this.unloadPlugin(pluginName);
        await this.loadPlugin(`${pluginName}.js`);
    }
    
    getPlugin(name) {
        return this.plugins.get(name);
    }
    
    getPluginInfo(name) {
        const plugin = this.plugins.get(name);
        if (!plugin) return null;
        
        return {
            name: plugin.name,
            version: plugin.version,
            description: plugin.description,
            author: plugin.author,
            dependencies: plugin.dependencies || [],
            loaded: true
        };
    }
    
    getAllPlugins() {
        const result = [];
        
        for (const [name, plugin] of this.plugins) {
            result.push(this.getPluginInfo(name));
        }
        
        return result;
    }
    
    async enablePlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) return false;
        
        if (plugin.enable && typeof plugin.enable === 'function') {
            await plugin.enable();
        }
        
        plugin.enabled = true;
        this.emit('pluginEnabled', pluginName);
        return true;
    }
    
    async disablePlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) return false;
        
        if (plugin.disable && typeof plugin.disable === 'function') {
            await plugin.disable();
        }
        
        plugin.enabled = false;
        this.emit('pluginDisabled', pluginName);
        return true;
    }
    
    getStats() {
        return {
            totalPlugins: this.plugins.size,
            loadedPlugins: Array.from(this.plugins.keys()),
            totalHooks: this.hooks.size,
            totalMiddlewares: this.middlewares.size,
            loadOrder: [...this.pluginOrder]
        };
    }
    
    async destroy() {
        for (const pluginName of [...this.pluginOrder].reverse()) {
            await this.unloadPlugin(pluginName);
        }
        
        this.plugins.clear();
        this.pluginOrder = [];
        this.hooks.clear();
        this.middlewares.clear();
    }
}

// Base plugin class for easier plugin development
class BasePlugin {
    constructor(client, pluginManager) {
        this.client = client;
        this.pluginManager = pluginManager;
        this.enabled = true;
        
        // Plugin metadata (should be overridden)
        this.name = 'BasePlugin';
        this.version = '1.0.0';
        this.description = 'Base plugin class';
        this.author = 'Unknown';
        this.dependencies = [];
    }
    
    async init() {
        // Override this method for plugin initialization
    }
    
    async enable() {
        // Override this method for plugin enabling
    }
    
    async disable() {
        // Override this method for plugin disabling
    }
    
    async destroy() {
        // Override this method for plugin cleanup
    }
    
    log(message, ...args) {
        this.client.logger.info(`[${this.name}] ${message}`, ...args);
    }
    
    error(message, ...args) {
        this.client.logger.error(`[${this.name}] ${message}`, ...args);
    }
}

module.exports = { PluginManager, BasePlugin };