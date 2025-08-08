const fs = require('fs').promises;
const path = require('path');
const { Collection } = require('discord.js');

class CommandHandler {
    constructor() {
        this.commandsPath = path.join(__dirname, '../commands');
    }
    
    async loadCommands(client) {
        try {
            client.logger.info('📂 Loading commands...');
            
            const commandFolders = await this.getCommandFolders();
            let commandCount = 0;
            
            for (const folder of commandFolders) {
                const commandFiles = await this.getCommandFiles(folder);
                
                for (const file of commandFiles) {
                    await this.loadCommand(client, folder, file);
                    commandCount++;
                }
            }
            
            client.logger.info(`✅ Loaded ${commandCount} commands from ${commandFolders.length} categories`);
            
        } catch (error) {
            client.logger.error('Failed to load commands:', error);
            throw error;
        }
    }
    
    async getCommandFolders() {
        try {
            const items = await fs.readdir(this.commandsPath, { withFileTypes: true });
            return items
                .filter(item => item.isDirectory())
                .map(item => item.name);
        } catch (error) {
            return [];
        }
    }
    
    async getCommandFiles(folder) {
        try {
            const folderPath = path.join(this.commandsPath, folder);
            const files = await fs.readdir(folderPath);
            return files.filter(file => file.endsWith('.js'));
        } catch (error) {
            return [];
        }
    }
    
    async loadCommand(client, folder, file) {
        try {
            const filePath = path.join(this.commandsPath, folder, file);
            
            // Clear require cache for hot reloading in development
            delete require.cache[require.resolve(filePath)];
            
            const command = require(filePath);
            
            // Validate command structure
            if (!this.validateCommand(command)) {
                client.logger.warn(`⚠️ Invalid command structure in ${folder}/${file}`);
                return;
            }
            
            // Set command category
            command.category = folder;
            
            // Add command to collection
            client.commands.set(command.name, command);
            
            // Add aliases if they exist
            if (command.aliases && Array.isArray(command.aliases)) {
                command.aliases.forEach(alias => {
                    client.commands.set(alias, command);
                });
            }
            
            client.logger.debug(`Loaded command: ${command.name} (${folder})`);
            
        } catch (error) {
            client.logger.error(`Failed to load command ${folder}/${file}:`, error);
        }
    }
    
    validateCommand(command) {
        return (
            command &&
            typeof command === 'object' &&
            typeof command.name === 'string' &&
            typeof command.description === 'string' &&
            typeof command.execute === 'function'
        );
    }
    
    // Reload a specific command
    async reloadCommand(client, commandName) {
        try {
            const command = client.commands.get(commandName);
            if (!command) {
                throw new Error(`Command ${commandName} not found`);
            }
            
            const commandPath = path.join(this.commandsPath, command.category, `${command.name}.js`);
            delete require.cache[require.resolve(commandPath)];
            
            const newCommand = require(commandPath);
            if (!this.validateCommand(newCommand)) {
                throw new Error('Invalid command structure after reload');
            }
            
            newCommand.category = command.category;
            client.commands.set(newCommand.name, newCommand);
            
            client.logger.info(`🔄 Reloaded command: ${commandName}`);
            return true;
            
        } catch (error) {
            client.logger.error(`Failed to reload command ${commandName}:`, error);
            throw error;
        }
    }
}

module.exports = new CommandHandler();
