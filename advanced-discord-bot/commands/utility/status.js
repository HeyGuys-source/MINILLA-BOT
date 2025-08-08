const { EmbedBuilder, version } = require('discord.js');
const os = require('os');

module.exports = {
    name: 'status',
    description: 'Shows bot status and system information',
    aliases: ['stats', 'info', 'botinfo'],
    category: 'utility',
    usage: 'status',
    cooldown: 10,
    permissions: [],
    guildOnly: false,
    ownerOnly: false,
    slash: true,
    
    async execute(client, message, args) {
        try {
            const embed = await this.createStatusEmbed(client);
            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            client.logger.error('Error in status command:', error);
            throw error;
        }
    },
    
    async executeSlash(client, interaction) {
        try {
            await interaction.deferReply();
            const embed = await this.createStatusEmbed(client);
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            client.logger.error('Error in status slash command:', error);
            throw error;
        }
    },
    
    async createStatusEmbed(client) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        const memoryUsage = process.memoryUsage();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        
        // Get advanced metrics if available
        const performance = client.performance ? client.performance.getLatestMetrics() : null;
        const cacheStats = client.cache ? client.cache.getStats() : null;
        const rateLimitStats = client.rateLimit ? client.rateLimit.getStats() : null;
        const pluginStats = client.plugins ? client.plugins.getStats() : null;
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🤖 Advanced Bot Status')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                {
                    name: '📊 General',
                    value: `**Guilds:** ${client.guilds.cache.size}\n` +
                           `**Users:** ${client.users.cache.size}\n` +
                           `**Channels:** ${client.channels.cache.size}\n` +
                           `**Commands:** ${client.commands.size}`,
                    inline: true
                },
                {
                    name: '⏱️ Uptime',
                    value: `${days}d ${hours}h ${minutes}m ${seconds}s`,
                    inline: true
                },
                {
                    name: '🏓 Latency',
                    value: `**API:** ${Math.round(client.ws.ping)}ms\n` +
                           `**Avg:** ${performance ? Math.round(performance.averageLatency) : 'N/A'}ms\n` +
                           `**Status:** ${client.ws.ping < 100 ? '🟢 Excellent' : 
                                         client.ws.ping < 200 ? '🟡 Good' : 
                                         client.ws.ping < 300 ? '🟠 Fair' : '🔴 Poor'}`,
                    inline: true
                },
                {
                    name: '💾 Memory Usage',
                    value: `**Bot:** ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
                           `**Trend:** ${performance ? performance.memoryTrend : 'N/A'}\n` +
                           `**System:** ${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB / ${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
                    inline: true
                },
                {
                    name: '📈 Performance',
                    value: `**Commands:** ${performance ? performance.commandsExecuted : 'N/A'}\n` +
                           `**Messages:** ${performance ? performance.messagesProcessed : 'N/A'}\n` +
                           `**Errors:** ${performance ? performance.errors : 'N/A'}`,
                    inline: true
                },
                {
                    name: '🗄️ Cache Stats',
                    value: cacheStats ? 
                           `**Size:** ${cacheStats.size} items\n` +
                           `**Hit Rate:** ${cacheStats.hitRate}%\n` +
                           `**Memory:** ${(cacheStats.memoryUsage / 1024 / 1024).toFixed(2)} MB` :
                           'Cache system disabled',
                    inline: true
                },
                {
                    name: '🔌 Plugins',
                    value: pluginStats ? 
                           `**Loaded:** ${pluginStats.totalPlugins}\n` +
                           `**Hooks:** ${pluginStats.totalHooks}\n` +
                           `**Middlewares:** ${pluginStats.totalMiddlewares}` :
                           'Plugin system disabled',
                    inline: true
                },
                {
                    name: '⚡ Rate Limits',
                    value: rateLimitStats ? 
                           `**Requests:** ${rateLimitStats.global.totalRequests}\n` +
                           `**Blocked:** ${rateLimitStats.global.blockedRequests}\n` +
                           `**Rate:** ${rateLimitStats.global.blockedRate.toFixed(1)}%` :
                           'Rate limiting disabled',
                    inline: true
                },
                {
                    name: '📦 Versions',
                    value: `**Node.js:** ${process.version}\n` +
                           `**Discord.js:** v${version}\n` +
                           `**Bot:** v2.0.0 (Advanced)`,
                    inline: true
                }
            )
            .setFooter({ 
                text: `Requested by ${client.user.tag}`, 
                iconURL: client.user.displayAvatarURL() 
            })
            .setTimestamp();
        
        return embed;
    }
};
