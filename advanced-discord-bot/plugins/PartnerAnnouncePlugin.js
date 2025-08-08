const { BasePlugin } = require('../utils/pluginManager');
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

class PartnerAnnouncePlugin extends BasePlugin {
    constructor(client, pluginManager) {
        super(client, pluginManager);
        
        // Plugin metadata
        this.name = 'PartnerAnnouncePlugin';
        this.version = '1.0.0';
        this.description = 'Creates decorative partnership announcement embeds with role-based permissions';
        this.author = 'Advanced Bot System';
        this.dependencies = [];
        
        // Configuration
        this.config = {
            targetChannelId: '1342278130890702929',
            authorizedRoles: [
                '1398025228365598790',
                '1338316768858345605', 
                '1338317469810425926',
                '1338316903881506887',
                '1338316974387761212'
            ],
            emojis: {
                top: '<:EvolvedGodzillaKB:1376016386999980183>',
                bottom: '<:EvolvedGodzillaKaijuBlocky:1383897239415558337>'
            },
            embedColor: '#FFD700' // Gold color
        };
        
        // Register slash command
        this.slashCommand = new SlashCommandBuilder()
            .setName('partnerannounce')
            .setDescription('Create a decorative partnership announcement')
            .addStringOption(option =>
                option.setName('server_link')
                    .setDescription('Discord server invite link')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('pings')
                    .setDescription('Users to ping (1-2 users, separate with spaces)')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('image_links')
                    .setDescription('Optional image/file links (separate multiple with spaces)')
                    .setRequired(false));
    }
    
    async init() {
        this.log('Partnership Announce Plugin initializing...');
        
        // Register the slash command
        await this.registerSlashCommand();
        
        // Set up command handler
        this.client.on('interactionCreate', this.handleInteraction.bind(this));
        
        this.log('Partnership Announce Plugin initialized successfully!');
    }
    
    async registerSlashCommand() {
        try {
            // Register the slash command globally
            await this.client.application.commands.create(this.slashCommand.toJSON());
            this.log('Slash command registered successfully');
        } catch (error) {
            this.log(`Failed to register slash command: ${error.message}`, 'error');
        }
    }
    
    async handleInteraction(interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName !== 'partnerannounce') return;
        
        try {
            // Check permissions
            if (!this.hasPermission(interaction.member)) {
                await interaction.reply({
                    content: '❌ You do not have permission to use this command.',
                    ephemeral: true
                });
                return;
            }
            
            // Get command parameters
            const serverLink = interaction.options.getString('server_link');
            const pingsString = interaction.options.getString('pings');
            const imageLinksString = interaction.options.getString('image_links');
            
            // Validate and parse parameters
            const validationResult = await this.validateParameters(serverLink, pingsString, imageLinksString);
            if (!validationResult.valid) {
                await interaction.reply({
                    content: `❌ ${validationResult.error}`,
                    ephemeral: true
                });
                return;
            }
            
            // Defer reply for processing time
            await interaction.deferReply({ ephemeral: true });
            
            // Get server information
            const serverInfo = await this.getServerInfo(serverLink);
            if (!serverInfo) {
                await interaction.editReply({
                    content: '❌ Could not fetch server information from the provided link.',
                });
                return;
            }
            
            // Create and send the announcement embed
            await this.sendAnnouncement(serverInfo, validationResult.pings, validationResult.imageLinks);
            
            await interaction.editReply({
                content: '✅ Partnership announcement sent successfully!',
            });
            
            this.log(`Partnership announcement created by ${interaction.user.tag} for server: ${serverInfo.name}`);
            
        } catch (error) {
            this.log(`Error handling partnership announce command: ${error.message}`, 'error');
            
            const errorMessage = '❌ An error occurred while processing your request. Please try again later.';
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
    
    hasPermission(member) {
        if (!member || !member.roles) return false;
        
        return this.config.authorizedRoles.some(roleId => 
            member.roles.cache.has(roleId)
        );
    }
    
    async validateParameters(serverLink, pingsString, imageLinksString) {
        const result = { valid: true, pings: [], imageLinks: [] };
        
        // Validate server link
        if (!this.isValidDiscordInvite(serverLink)) {
            result.valid = false;
            result.error = 'Invalid Discord server invite link provided.';
            return result;
        }
        
        // Parse and validate pings
        const pingMatches = pingsString.match(/<@!?(\d+)>/g);
        if (!pingMatches || pingMatches.length === 0 || pingMatches.length > 2) {
            result.valid = false;
            result.error = 'Please provide 1-2 valid user pings (e.g., @user1 @user2).';
            return result;
        }
        result.pings = pingMatches;
        
        // Parse image links if provided
        if (imageLinksString) {
            const imageLinks = imageLinksString.split(/\s+/).filter(link => link.trim());
            for (const link of imageLinks) {
                if (!this.isValidUrl(link)) {
                    result.valid = false;
                    result.error = `Invalid URL provided: ${link}`;
                    return result;
                }
            }
            result.imageLinks = imageLinks;
        }
        
        return result;
    }
    
    isValidDiscordInvite(url) {
        const discordInviteRegex = /^https?:\/\/(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/).+/i;
        return discordInviteRegex.test(url);
    }
    
    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }
    
    async getServerInfo(inviteUrl) {
        try {
            // Extract invite code from URL
            const inviteCode = inviteUrl.split('/').pop().split('?')[0];
            
            // Fetch invite information using Discord API
            const invite = await this.client.fetchInvite(inviteCode);
            
            return {
                name: invite.guild.name,
                description: invite.guild.description || 'No description available',
                memberCount: invite.memberCount || 'Unknown',
                iconUrl: invite.guild.iconURL({ dynamic: true, size: 512 }) || null,
                inviteUrl: inviteUrl
            };
        } catch (error) {
            this.log(`Failed to fetch server info: ${error.message}`, 'error');
            return null;
        }
    }
    
    async sendAnnouncement(serverInfo, pings, imageLinks) {
        try {
            // Get the target channel
            const channel = await this.client.channels.fetch(this.config.targetChannelId);
            if (!channel) {
                throw new Error('Target channel not found');
            }
            
            // Create the embed
            const embed = new EmbedBuilder()
                .setTitle(`${this.config.emojis.top} ${this.config.emojis.top} **PARTNERSHIP ANNOUNCEMENT** ${this.config.emojis.top} ${this.config.emojis.top}`)
                .setDescription(this.buildEmbedDescription(serverInfo))
                .setColor(this.config.embedColor)
                .setTimestamp()
                .setFooter({ 
                    text: 'Partnership System',
                    iconURL: this.client.user.displayAvatarURL()
                });
            
            // Set thumbnail if server has an icon
            if (serverInfo.iconUrl) {
                embed.setThumbnail(serverInfo.iconUrl);
            }
            
            // Add images if provided
            if (imageLinks.length > 0) {
                // Use the first image as main image
                embed.setImage(imageLinks[0]);
                
                // Add additional images in fields if more than one
                if (imageLinks.length > 1) {
                    embed.addFields({
                        name: '📎 Additional Attachments',
                        value: imageLinks.slice(1).map((link, index) => 
                            `[Image ${index + 2}](${link})`
                        ).join(' • '),
                        inline: false
                    });
                }
            }
            
            // Create the message content with pings
            const messageContent = `${pings.join(' ')} 🎉 **New Partnership Announcement!** 🎉`;
            
            // Send the announcement
            await channel.send({
                content: messageContent,
                embeds: [embed]
            });
            
            this.log(`Partnership announcement sent to channel ${channel.name}`);
            
        } catch (error) {
            this.log(`Failed to send announcement: ${error.message}`, 'error');
            throw error;
        }
    }
    
    buildEmbedDescription(serverInfo) {
        return [
            `🌟 **We're excited to announce our partnership with:**`,
            '',
            `**${serverInfo.name}**`,
            `📋 ${serverInfo.description}`,
            `👥 Members: **${serverInfo.memberCount}**`,
            '',
            `🔗 **Join their server:** ${serverInfo.inviteUrl}`,
            '',
            `${this.config.emojis.bottom} ${this.config.emojis.bottom} **Thank you for your continued support!** ${this.config.emojis.bottom} ${this.config.emojis.bottom}`
        ].join('\n');
    }
    
    // Plugin API methods
    getAnnouncementStats() {
        // This could be extended to track announcement statistics
        return {
            pluginName: this.name,
            version: this.version,
            targetChannel: this.config.targetChannelId,
            authorizedRoles: this.config.authorizedRoles.length
        };
    }
    
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.log('Plugin configuration updated');
    }
    
    // Plugin lifecycle methods
    async enable() {
        await super.enable();
        this.log('Partnership Announce Plugin enabled');
    }
    
    async disable() {
        await super.disable();
        this.log('Partnership Announce Plugin disabled');
    }
    
    async destroy() {
        // Clean up event listeners
        this.client.removeAllListeners('interactionCreate');
        
        // Remove slash command
        try {
            const commands = await this.client.application.commands.fetch();
            const command = commands.find(cmd => cmd.name === 'partnerannounce');
            if (command) {
                await command.delete();
                this.log('Slash command removed');
            }
        } catch (error) {
            this.log(`Failed to remove slash command: ${error.message}`, 'error');
        }
        
        await super.destroy();
        this.log('Partnership Announce Plugin destroyed and cleaned up');
    }
}

module.exports = PartnerAnnouncePlugin;
