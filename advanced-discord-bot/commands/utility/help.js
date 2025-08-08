const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Shows help information for commands and bot features',
    aliases: ['h', 'commands', 'info'],
    category: 'utility',
    usage: 'help [command]',
    cooldown: 5,
    permissions: [],
    guildOnly: false,
    ownerOnly: false,
    slash: true,
    
    async execute(client, message, args) {
        try {
            const commandName = args[0];
            
            if (commandName) {
                await this.showCommandHelp(client, message, commandName);
            } else {
                await this.showMainHelp(client, message);
            }
            
        } catch (error) {
            client.logger.error('Error in help command:', error);
            throw error;
        }
    },
    
    async executeSlash(client, interaction) {
        try {
            const commandName = interaction.options.getString('command');
            
            if (commandName) {
                await this.showCommandHelp(client, interaction, commandName, true);
            } else {
                await this.showMainHelp(client, interaction, true);
            }
            
        } catch (error) {
            client.logger.error('Error in help slash command:', error);
            throw error;
        }
    },
    
    async showMainHelp(client, context, isSlash = false) {
        // Group commands by category
        const categories = new Map();
        
        for (const [name, command] of client.commands) {
            if (!command.category || command.name !== name) continue; // Skip aliases
            
            if (!categories.has(command.category)) {
                categories.set(command.category, []);
            }
            categories.get(command.category).push(command);
        }
        
        const description = [
            "Welcome to the most advanced Discord bot! Here's what I can do:",
            "",
            "**🔥 Advanced Features:**",
            "• Smart performance monitoring & auto-recovery",
            "• Advanced caching system for lightning-fast responses", 
            "• Intelligent rate limiting to prevent abuse",
            "• Plugin system for unlimited customization",
            "• Real-time health monitoring",
            "• Comprehensive error handling",
            "",
            `**Usage:** \`${client.config.bot.prefix}help [command]\` or \`/help [command]\``,
            `**Bot Status:** Use \`${client.config.bot.prefix}status\` for detailed system info`
        ].join("\\n");
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🤖 Advanced Discord Bot - Help Center')
            .setDescription(description)
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp();
        
        // Add command categories
        for (const [categoryName, commands] of categories) {
            const commandList = commands
                .map(cmd => `\`${cmd.name}\``)
                .join(', ');
            
            embed.addFields({
                name: `${this.getCategoryEmoji(categoryName)} ${this.formatCategoryName(categoryName)}`,
                value: commandList || 'No commands',
                inline: false
            });
        }
        
        // Add system stats if available
        if (client.performance && client.cache && client.plugins) {
            const performance = client.performance.getLatestMetrics();
            const cacheStats = client.cache.getStats();
            const pluginStats = client.plugins.getStats();
            
            const statusInfo = [
                `**Uptime:** ${this.formatUptime(performance.uptime)}`,
                `**Commands Executed:** ${performance.commandsExecuted.toLocaleString()}`,
                `**Cache Hit Rate:** ${cacheStats.hitRate}%`,
                `**Active Plugins:** ${pluginStats.totalPlugins}`,
                `**Health:** ${this.getHealthIcon(client)}`
            ].join("\\n");
            
            embed.addFields({
                name: '📊 System Status',
                value: statusInfo,
                inline: true
            });
        }
        
        embed.setFooter({
            text: `${categories.size} categories • ${client.commands.size} total commands`,
            iconURL: client.user.displayAvatarURL()
        });
        
        if (isSlash) {
            await context.reply({ embeds: [embed] });
        } else {
            await context.reply({ embeds: [embed] });
        }
    },
    
    async showCommandHelp(client, context, commandName, isSlash = false) {
        const command = client.commands.get(commandName);
        
        if (!command) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Command Not Found')
                .setDescription(`No command named \`${commandName}\` was found.\\n\\nUse \`${client.config.bot.prefix}help\` to see all available commands.`);
            
            if (isSlash) {
                await context.reply({ embeds: [embed], ephemeral: true });
            } else {
                await context.reply({ embeds: [embed] });
            }
            return;
        }
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📘 Command: ${command.name}`)
            .setDescription(command.description || 'No description provided')
            .addFields(
                {
                    name: '📂 Category',
                    value: this.formatCategoryName(command.category || 'Unknown'),
                    inline: true
                },
                {
                    name: '⏱️ Cooldown',
                    value: `${command.cooldown || 0} seconds`,
                    inline: true
                },
                {
                    name: '🔒 Permissions',
                    value: command.permissions?.length ? 
                           command.permissions.map(p => `\`${p}\``).join(', ') : 
                           'None required',
                    inline: true
                }
            );
        
        if (command.usage) {
            embed.addFields({
                name: '📖 Usage',
                value: `\`${client.config.bot.prefix}${command.usage}\``,
                inline: false
            });
        }
        
        if (command.aliases && command.aliases.length > 0) {
            embed.addFields({
                name: '🔄 Aliases',
                value: command.aliases.map(alias => `\`${alias}\``).join(', '),
                inline: false
            });
        }
        
        // Add additional info
        const additionalInfo = [];
        if (command.guildOnly) additionalInfo.push('Server Only');
        if (command.ownerOnly) additionalInfo.push('Owner Only');
        if (command.slash) additionalInfo.push('Slash Command');
        
        if (additionalInfo.length > 0) {
            embed.addFields({
                name: 'ℹ️ Additional Info',
                value: additionalInfo.join(' • '),
                inline: false
            });
        }
        
        embed.setTimestamp();
        
        if (isSlash) {
            await context.reply({ embeds: [embed] });
        } else {
            await context.reply({ embeds: [embed] });
        }
    },
    
    getCategoryEmoji(category) {
        const emojis = {
            utility: '🛠️',
            moderation: '🛡️',
            fun: '🎉',
            music: '🎵',
            admin: '⚙️',
            owner: '👑'
        };
        return emojis[category.toLowerCase()] || '📁';
    },
    
    formatCategoryName(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    },
    
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    },
    
    getHealthIcon(client) {
        if (!client.performance) return '❓';
        
        const health = client.performance.getHealthStatus ? client.performance.getHealthStatus() : { status: 'unknown' };
        
        switch (health.status) {
            case 'healthy': return '🟢 Excellent';
            case 'unhealthy': return '🟡 Warning';
            case 'critical': return '🔴 Critical';
            default: return '❓ Unknown';
        }
    }
};