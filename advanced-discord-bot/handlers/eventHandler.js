const fs = require('fs').promises;
const path = require('path');

class EventHandler {
    constructor() {
        this.eventsPath = path.join(__dirname, '../events');
    }
    
    async loadEvents(client) {
        try {
            client.logger.info('🎯 Loading events...');
            
            const eventFiles = await this.getEventFiles();
            let eventCount = 0;
            
            for (const file of eventFiles) {
                await this.loadEvent(client, file);
                eventCount++;
            }
            
            client.logger.info(`✅ Loaded ${eventCount} events`);
            
        } catch (error) {
            client.logger.error('Failed to load events:', error);
            throw error;
        }
    }
    
    async getEventFiles() {
        try {
            const files = await fs.readdir(this.eventsPath);
            return files.filter(file => file.endsWith('.js'));
        } catch (error) {
            return [];
        }
    }
    
    async loadEvent(client, file) {
        try {
            const filePath = path.join(this.eventsPath, file);
            
            // Clear require cache for hot reloading
            delete require.cache[require.resolve(filePath)];
            
            const event = require(filePath);
            
            // Validate event structure
            if (!this.validateEvent(event)) {
                client.logger.warn(`⚠️ Invalid event structure in ${file}`);
                return;
            }
            
            // Register event listener
            if (event.once) {
                client.once(event.name, (...args) => event.execute(client, ...args));
            } else {
                client.on(event.name, (...args) => event.execute(client, ...args));
            }
            
            client.logger.debug(`Loaded event: ${event.name} (once: ${event.once || false})`);
            
        } catch (error) {
            client.logger.error(`Failed to load event ${file}:`, error);
        }
    }
    
    validateEvent(event) {
        return (
            event &&
            typeof event === 'object' &&
            typeof event.name === 'string' &&
            typeof event.execute === 'function'
        );
    }
    
    // Reload a specific event
    async reloadEvent(client, eventName) {
        try {
            const eventPath = path.join(this.eventsPath, `${eventName}.js`);
            delete require.cache[require.resolve(eventPath)];
            
            const event = require(eventPath);
            if (!this.validateEvent(event)) {
                throw new Error('Invalid event structure after reload');
            }
            
            // Remove all existing listeners for this event
            client.removeAllListeners(event.name);
            
            // Re-register the event
            if (event.once) {
                client.once(event.name, (...args) => event.execute(client, ...args));
            } else {
                client.on(event.name, (...args) => event.execute(client, ...args));
            }
            
            client.logger.info(`🔄 Reloaded event: ${eventName}`);
            return true;
            
        } catch (error) {
            client.logger.error(`Failed to reload event ${eventName}:`, error);
            throw error;
        }
    }
}

module.exports = new EventHandler();
