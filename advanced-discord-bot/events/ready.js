const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        try {
            client.logger.info(`🤖 Bot logged in as ${client.user.tag}`);
            client.logger.info(`📊 Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} users`);
            
            // Set bot activity
            await client.user.setActivity(
                client.config.bot.defaultActivity.name,
                { 
                    type: ActivityType[client.config.bot.defaultActivity.type] || ActivityType.Watching 
                }
            );
            
            // Set bot status
            await client.user.setStatus(client.config.bot.defaultStatus);
            
            client.logger.info(`✅ Bot is ready and operational!`);
            
            // Log guild information
            if (client.config.logging.level === 'debug') {
                client.guilds.cache.forEach(guild => {
                    client.logger.debug(`Guild: ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
                });
            }
            
        } catch (error) {
            client.logger.error('Error in ready event:', error);
        }
    }
};
