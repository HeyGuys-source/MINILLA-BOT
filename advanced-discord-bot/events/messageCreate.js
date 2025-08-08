const { Collection } = require('discord.js');
const validation = require('../middleware/validation.js');

module.exports = {
    name: 'messageCreate',
    async execute(client, message) {
        try {
            // Ignore bot messages
            if (message.author.bot) return;
            
            // Increment message counter
            if (client.performance) {
                client.performance.incrementCounter('messagesProcessed');
            }
            
            // Rate limiting for message processing
            if (client.rateLimit) {
                try {
                    await client.rateLimit.consumeLimit('messages', message.author.id, { 
                        guild: message.guild?.id,
                        channel: message.channel.id 
                    });
                } catch (rateLimitError) {
                    return; // Silently ignore rate limited messages
                }
            }
            
            // Check if message starts with prefix
            if (!message.content.startsWith(client.config.bot.prefix)) return;
            
            // Parse command and arguments
            const args = message.content.slice(client.config.bot.prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            // Get command
            const command = client.commands.get(commandName);
            if (!command) return;
            
            // Rate limiting for commands
            if (client.rateLimit) {
                try {
                    await client.rateLimit.consumeLimit('commands', message.author.id, {
                        command: commandName,
                        guild: message.guild?.id
                    });
                } catch (rateLimitError) {
                    const timeLeft = Math.ceil(rateLimitError.rateLimitInfo.timeToReset / 1000);
                    return message.reply(`⏰ You're sending commands too fast! Please wait ${timeLeft} seconds.`);
                }
            }
            
            // Execute through plugin middleware if available
            if (client.plugins) {
                await client.plugins.executeMiddlewares('messageCommand', {
                    message,
                    command,
                    args,
                    client
                }, async () => {
                    await this.executeCommand(client, message, command, args);
                });
            } else {
                await this.executeCommand(client, message, command, args);
            }
            
        } catch (error) {
            client.logger.error('Error in messageCreate event:', error);
            
            if (client.performance) {
                client.performance.incrementCounter('errors');
            }
            
            try {
                await message.reply('❌ An error occurred while executing this command.');
            } catch (replyError) {
                client.logger.error('Failed to send error message:', replyError);
            }
        }
    },
    
    async executeCommand(client, message, command, args) {
        // Validate command execution context
        if (!validation.validateCommandContext(command, message)) {
            return;
        }
        
        // Check permissions
        if (command.permissions && !validation.validatePermissions(command, message)) {
            return message.reply('❌ You don\'t have permission to use this command.');
        }
        
        // Handle cooldowns
        if (client.config.features.commandCooldowns && !validation.validateCooldown(client, command, message)) {
            return;
        }
        
        // Execute command
        await command.execute(client, message, args);
        
        // Increment command counter
        if (client.performance) {
            client.performance.incrementCounter('commandsExecuted');
        }
        
        // Log command usage
        client.logger.command(command.name, message.author, message.guild, args);
    }
};
