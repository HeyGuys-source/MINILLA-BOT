const { EmbedBuilder } = require('discord.js');
const os = require('os');

module.exports = {
    name: 'system',
    description: 'Advanced system monitoring and control commands',
    aliases: ['sys', 'monitor', 'health'],
    category: 'utility',
    usage: 'system [info|health|cache|plugins|ratelimit|recovery]',
    cooldown: 10,
    permissions: [],
    guildOnly: false,
    ownerOnly: false,
    slash: true,
    
    async execute(client, message, args) {
        try {
            const subcommand = args[0]?.toLowerCase();
            
            switch (subcommand) {
                case 'info':
                    await this.showSystemInfo(client, message);
                    break;
                case 'health':
                    await this.showHealthStatus(client, message);
                    break;
                case 'cache':
                    await this.showCacheStats(client, message);
                    break;
                case 'plugins':
                    await this.showPluginInfo(client, message);
                    break;
                case 'ratelimit':
                    await this.showRateLimitStats(client, message);
                    break;
                case 'recovery':
                    await this.triggerRecovery(client, message);
                    break;
                default:
                    await this.showSystemOverview(client, message);
            }
            
        } catch (error) {
            client.logger.error('Error in system command:', error);
            throw error;
        }
    },
    
    async executeSlash(client, interaction) {
        try {
            const subcommand = interaction.options.getString('action') || 'overview';
            
            await interaction.deferReply();
            
            switch (subcommand) {
                case 'info':
                    await this.showSystemInfo(client, interaction, true);
                    break;
                case 'health':
                    await this.showHealthStatus(client, interaction, true);
                    break;
                case 'cache':
                    await this.showCacheStats(client, interaction, true);
                    break;
                case 'plugins':
                    await this.showPluginInfo(client, interaction, true);
                    break;
                case 'ratelimit':
                    await this.showRateLimitStats(client, interaction, true);
                    break;
                case 'recovery':
                    await this.triggerRecovery(client, interaction, true);
                    break;
                default:
                    await this.showSystemOverview(client, interaction, true);
            }
            
        } catch (error) {
            client.logger.error('Error in system slash command:', error);
            throw error;
        }
    },
    
    async showSystemOverview(client, context, isSlash = false) {
        const performance = client.performance ? client.performance.getReport() : null;
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🖥️ Advanced System Overview')
            .setDescription('Comprehensive system monitoring dashboard')
            .setThumbnail(client.user.displayAvatarURL());
        
        if (performance) {
            const health = performance.health;
            const healthColor = health.status === 'healthy' ? '🟢' : 
                               health.status === 'unhealthy' ? '🟡' : '🔴';
            
            const healthValue = `${healthColor} **${health.status.toUpperCase()}**\\n${health.issues.length > 0 ? health.issues.join('\\n') : 'All systems operational'}`;
            const performanceValue = [
                `**Uptime:** ${this.formatUptime(performance.uptime)}`,
                `**Commands:** ${performance.commandsExecuted.toLocaleString()}`,
                `**Messages:** ${performance.messagesProcessed.toLocaleString()}`,
                `**Errors:** ${performance.errors}`
            ].join("\\n");
            const memoryValue = [
                `**Used:** ${(performance.latestMemory?.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                `**Total:** ${(performance.latestMemory?.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                `**Trend:** ${performance.memoryTrend}`,
                `**External:** ${(performance.latestMemory?.external / 1024 / 1024).toFixed(2)} MB`
            ].join("\\n");
            
            embed.addFields(
                {
                    name: '❤️ Health Status',
                    value: healthValue,
                    inline: true
                },
                {
                    name: '⚡ Performance',
                    value: performanceValue,
                    inline: true
                },
                {
                    name: '🧠 Memory',
                    value: memoryValue,
                    inline: true
                }
            );
        }
        
        // System info
        const systemValue = [
            `**Platform:** ${os.platform()} ${os.arch()}`,
            `**Node.js:** ${process.version}`,
            `**CPU Cores:** ${os.cpus().length}`,
            `**Total RAM:** ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`
        ].join("\\n");
        
        embed.addFields({
            name: '🖥️ System Info',
            value: systemValue,
            inline: true
        });
        
        const commandsValue = [
            "\`system info\` - Detailed system information",
            "\`system health\` - Health monitoring",  
            "\`system cache\` - Cache statistics",
            "\`system plugins\` - Plugin information",
            "\`system ratelimit\` - Rate limiting stats",
            "\`system recovery\` - Trigger recovery"
        ].join("\\n");
        
        embed.addFields({
            name: '📊 Available Commands',
            value: commandsValue,
            inline: false
        });
        
        embed.setTimestamp();
        
        if (isSlash) {
            await context.editReply({ embeds: [embed] });
        } else {
            await context.reply({ embeds: [embed] });
        }
    },
    
    async showHealthStatus(client, context, isSlash = false) {
        if (!client.performance) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Performance Monitoring Disabled')
                .setDescription('Performance monitoring is not enabled on this bot.');
            
            if (isSlash) {
                await context.editReply({ embeds: [embed] });
            } else {
                await context.reply({ embeds: [embed] });
            }
            return;
        }
        
        const report = client.performance.getReport();
        const health = report.health;
        
        const embed = new EmbedBuilder()
            .setColor(health.status === 'healthy' ? '#00ff00' : health.status === 'unhealthy' ? '#ffaa00' : '#ff0000')
            .setTitle(`❤️ Health Status: ${health.status.toUpperCase()}`)
            .setDescription(health.issues.length > 0 ? `**Issues Detected:**\\n${health.issues.join('\\n')}` : '✅ All systems are operating normally');
        
        // Detailed metrics
        const currentMetricsValue = [
            `**Memory Usage:** ${((report.latestMemory?.heapUsed / report.latestMemory?.heapTotal) * 100).toFixed(1)}%`,
            `**WebSocket Ping:** ${report.latestLatency?.ws || 'N/A'} ms`,
            `**Average Latency:** ${Math.round(report.averageLatency)} ms`,
            `**Memory Trend:** ${report.memoryTrend}`
        ].join("\\n");
        
        const performanceStatsValue = [
            `**Uptime:** ${this.formatUptime(report.uptime)}`,
            `**Commands Executed:** ${report.commandsExecuted.toLocaleString()}`,
            `**Messages Processed:** ${report.messagesProcessed.toLocaleString()}`,
            `**Error Count:** ${report.errors}`
        ].join("\\n");
        
        embed.addFields(
            {
                name: '📊 Current Metrics',
                value: currentMetricsValue,
                inline: true
            },
            {
                name: '⏱️ Performance Stats',
                value: performanceStatsValue,
                inline: true
            }
        );
        
        if (health.status !== 'healthy') {
            const recommendedActions = health.status === 'critical' ? 
                '• Automatic recovery procedures are in progress\\n• Monitor system closely\\n• Consider manual intervention if issues persist' :
                '• Monitor system performance\\n• Check resource usage\\n• Review error logs';
            
            embed.addFields({
                name: '🔧 Recommended Actions',
                value: recommendedActions,
                inline: false
            });
        }
        
        embed.setTimestamp();
        
        if (isSlash) {
            await context.editReply({ embeds: [embed] });
        } else {
            await context.reply({ embeds: [embed] });
        }
    },
    
    async showCacheStats(client, context, isSlash = false) {
        if (!client.cache) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Caching System Disabled')
                .setDescription('Advanced caching is not enabled on this bot.');
            
            if (isSlash) {
                await context.editReply({ embeds: [embed] });
            } else {
                await context.reply({ embeds: [embed] });
            }
            return;
        }
        
        const stats = client.cache.getStats();
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🗃️ Cache Statistics')
            .setDescription('Advanced caching system performance metrics');
        
        const usageStatsValue = [
            `**Cache Size:** ${stats.size.toLocaleString()} items`,
            `**Hit Rate:** ${stats.hitRate}%`,
            `**Total Hits:** ${stats.hits.toLocaleString()}`,
            `**Total Misses:** ${stats.misses.toLocaleString()}`
        ].join("\\n");
        
        const memoryUsageValue = [
            `**Cache Memory:** ${(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB`,
            `**Operations:** ${stats.sets.toLocaleString()} sets, ${stats.deletes.toLocaleString()} deletes`,
            `**Evictions:** ${stats.evictions.toLocaleString()}`,
            `**Efficiency:** ${stats.hits > 0 ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1) : 0}%`
        ].join("\\n");
        
        embed.addFields(
            {
                name: '📊 Usage Statistics',
                value: usageStatsValue,
                inline: true
            },
            {
                name: '💾 Memory Usage',
                value: memoryUsageValue,
                inline: true
            }
        );
        
        // Performance indicators
        const efficiency = stats.hits > 0 ? (stats.hits / (stats.hits + stats.misses)) * 100 : 0;
        const statusColor = efficiency > 80 ? '🟢' : efficiency > 60 ? '🟡' : '🔴';
        
        embed.addFields({
            name: '🎯 Performance Rating',
            value: `${statusColor} **${this.getRatingText(efficiency)}**\\n${this.getCacheAdvice(stats)}`,
            inline: false
        });
        
        embed.setTimestamp();
        
        if (isSlash) {
            await context.editReply({ embeds: [embed] });
        } else {
            await context.reply({ embeds: [embed] });
        }
    },
    
    async triggerRecovery(client, context, isSlash = false) {
        const embed = new EmbedBuilder()
            .setColor('#ff9500')
            .setTitle('🔧 System Recovery')
            .setDescription('Initiating system recovery procedures...');
        
        if (isSlash) {
            await context.editReply({ embeds: [embed] });
        } else {
            await context.reply({ embeds: [embed] });
        }
        
        try {
            // Perform recovery actions
            let actionsPerformed = [];
            
            // Clear caches
            if (client.cache) {
                const oldSize = client.cache.getStats().size;
                client.cache.clear();
                actionsPerformed.push(`Cleared cache (${oldSize} items)`);
            }
            
            // Reset rate limiters
            if (client.rateLimit) {
                client.rateLimit.resetLimiter('commands');
                client.rateLimit.resetLimiter('messages');
                actionsPerformed.push('Reset rate limiters');
            }
            
            // Force garbage collection
            if (global.gc) {
                global.gc();
                actionsPerformed.push('Forced garbage collection');
            }
            
            // Update embed
            embed.setColor('#00ff00')
                .setTitle('✅ Recovery Complete')
                .setDescription('System recovery completed successfully!')
                .addFields({
                    name: '🔧 Actions Performed',
                    value: actionsPerformed.join('\\n') || 'No actions needed',
                    inline: false
                });
            
            if (isSlash) {
                await context.editReply({ embeds: [embed] });
            } else {
                await context.channel.send({ embeds: [embed] });
            }
            
        } catch (error) {
            embed.setColor('#ff0000')
                .setTitle('❌ Recovery Failed')
                .setDescription(`Recovery failed: ${error.message}`);
            
            if (isSlash) {
                await context.editReply({ embeds: [embed] });
            } else {
                await context.channel.send({ embeds: [embed] });
            }
        }
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
    
    getRatingText(efficiency) {
        if (efficiency >= 90) return 'Excellent';
        if (efficiency >= 80) return 'Very Good';
        if (efficiency >= 70) return 'Good';
        if (efficiency >= 60) return 'Fair';
        return 'Needs Improvement';
    },
    
    getCacheAdvice(stats) {
        if (stats.hitRate < 60) {
            return 'Consider increasing cache TTL or reviewing caching strategy';
        } else if (stats.evictions > stats.size * 0.1) {
            return 'Consider increasing cache size to reduce evictions';
        } else if (stats.hitRate > 90) {
            return 'Cache is performing excellently!';
        }
        return 'Cache performance is good';
    }
};