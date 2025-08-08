const { BasePlugin } = require('../utils/pluginManager');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

class EchoPlugin extends BasePlugin {
    constructor(client, pluginManager) {
        super(client, pluginManager);
        
        // Plugin metadata
        this.name = 'EchoPlugin';
        this.version = '1.0.0';
        this.description = 'Echo messages in different formats with optional reply functionality';
        this.author = 'Advanced Bot System';
        this.dependencies = [];
        
        // Plugin statistics
        this.stats = {
            echoCount: 0,
            embedCount: 0,
            plainTextCount: 0,
            replyCount: 0
        };
        
        // Register slash command
        this.slashCommand = new SlashCommandBuilder()
            .setName('echo')
            .setDescription('Make the bot echo a message in different formats')
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('The message you want the bot to say')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('format_type')
                    .setDescription('Message format type')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Embed', value: 'embed' },
                        { name: 'Plain Text', value: 'plain' }
                    ))
            .addStringOption(option =>
                option.setName('message_id')
                    .setDescription('Optional: Message ID to reply to')
                    .setRequired(false));
    }
    
    async init() {
        this.log('Echo Plugin initializing...');
        
        // Register the slash command
        await this.registerSlashCommand();
        
        // Set up command handler
        this.client.on('interactionCreate', this.handleInteraction.bind(this));
        
        this.log('Echo Plugin initialized successfully!');
    }
    
    async registerSlashCommand() {
        try {
            // Register the slash command globally
            await this.client.application.commands.create(this.slashCommand.toJSON());
            this.log('Echo slash command registered successfully');
        } catch (error) {
            this.log(`Failed to register echo slash command: ${error.message}`, 'error');
        }
    }
    
    async handleInteraction(interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName !== 'echo') return;
        
        try {
            // Get command parameters
            const message = interaction.options.getString('message');
            const formatType = interaction.options.getString('format_type');
            const messageId = interaction.options.getString('message_id');
            
            // Validate parameters
            const validationResult = await this.validateParameters(message, formatType, messageId, interaction.channel);
            if (!validationResult.valid) {
                await interaction.reply({
                    content: `❌ ${validationResult.error}`,
                    ephemeral: true
                });
                return;
            }
            
            // Create the echo message
            const echoContent = await this.createEchoMessage(message, formatType);
            
            // Send the echo message
            await this.sendEchoMessage(interaction, echoContent, validationResult.replyToMessage);
            
            // Update statistics
            this.updateStats(formatType, messageId !== null);
            
            this.log(`Echo command used: ${formatType} format${messageId ? ' with reply' : ''}`);
            
        } catch (error) {
            this.log(`Error handling echo command: ${error.message}`, 'error');
            
            const errorMessage = '❌ An error occurred while processing the echo command.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
    
    async validateParameters(message, formatType, messageId, channel) {
        const result = { valid: true, replyToMessage: null };
        
        // Validate message content
        if (!message || message.trim().length === 0) {
            result.valid = false;
            result.error = 'Message cannot be empty.';
            return result;
        }
        
        if (message.length > 2000) {
            result.valid = false;
            result.error = 'Message is too long. Maximum length is 2000 characters.';
            return result;
        }
        
        // Validate format type
        if (!['embed', 'plain'].includes(formatType)) {
            result.valid = false;
            result.error = 'Invalid format type. Use "embed" or "plain".';
            return result;
        }
        
        // Validate message ID if provided
        if (messageId) {
            try {
                // Check if message ID is a valid snowflake
                if (!/^\d{17,19}$/.test(messageId)) {
                    result.valid = false;
                    result.error = 'Invalid message ID format.';
                    return result;
                }
                
                // Try to fetch the message
                const targetMessage = await channel.messages.fetch(messageId);
                result.replyToMessage = targetMessage;
                
            } catch (error) {
                result.valid = false;
                result.error = 'Could not find the specified message to reply to.';
                return result;
            }
        }
        
        return result;
    }
    
    async createEchoMessage(message, formatType) {
        if (formatType === 'embed') {
            const embed = new EmbedBuilder()
                .setDescription(message)
                .setColor('#5865F2') // Discord blurple color
                .setTimestamp()
                .setFooter({ 
                    text: 'Echo Message',
                    iconURL: this.client.user.displayAvatarURL()
                });
            
            return { embeds: [embed] };
        } else {
            return { content: message };
        }
    }
    
    async sendEchoMessage(interaction, echoContent, replyToMessage) {
        try {
            // Reply to the interaction silently (ephemeral)
            await interaction.reply({
                content: '✅ Echo message sent!',
                ephemeral: true
            });
            
            // Send the actual echo message
            if (replyToMessage) {
                // Reply to the specified message
                await replyToMessage.reply(echoContent);
            } else {
                // Send as a regular message
                await interaction.channel.send(echoContent);
            }
            
        } catch (error) {
            this.log(`Failed to send echo message: ${error.message}`, 'error');
            throw error;
        }
    }
    
    updateStats(formatType, hasReply) {
        this.stats.echoCount++;
        
        if (formatType === 'embed') {
            this.stats.embedCount++;
        } else {
            this.stats.plainTextCount++;
        }
        
        if (hasReply) {
            this.stats.replyCount++;
        }
    }
    
    // Plugin API methods
    getEchoStats() {
        return {
            ...this.stats,
            pluginName: this.name,
            version: this.version
        };
    }
    
    resetStats() {
        this.stats = {
            echoCount: 0,
            embedCount: 0,
            plainTextCount: 0,
            replyCount: 0
        };
        this.log('Echo plugin statistics reset');
    }
    
    // Utility method to format message for logging (truncated)
    formatMessageForLog(message) {
        if (message.length <= 50) {
            return message;
        }
        return message.substring(0, 47) + '...';
    }
    
    // Plugin lifecycle methods
    async enable() {
        await super.enable();
        this.log('Echo Plugin enabled');
    }
    
    async disable() {
        await super.disable();
        this.log('Echo Plugin disabled');
    }
    
    async destroy() {
        // Clean up event listeners
        this.client.removeAllListeners('interactionCreate');
        
        // Remove slash command
        try {
            const commands = await this.client.application.commands.fetch();
            const command = commands.find(cmd => cmd.name === 'echo');
            if (command) {
                await command.delete();
                this.log('Echo slash command removed');
            }
        } catch (error) {
            this.log(`Failed to remove echo slash command: ${error.message}`, 'error');
        }
        
        await super.destroy();
        this.log('Echo Plugin destroyed and cleaned up');
    }
}

module.exports = EchoPlugin;