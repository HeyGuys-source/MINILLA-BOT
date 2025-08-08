module.exports = {
    name: 'guildMemberAdd',
    async execute(client, member) {
        try {
            client.logger.info(`👋 New member joined: ${member.user.tag} in ${member.guild.name}`);
            
            // Check if welcome messages are enabled
            if (!client.config.features.welcomeMessages) return;
            
            // You can add welcome message logic here
            // Example: Send welcome message to a specific channel
            /*
            const welcomeChannel = member.guild.channels.cache.find(
                channel => channel.name === 'welcome' || channel.name === 'general'
            );
            
            if (welcomeChannel) {
                await welcomeChannel.send(
                    `Welcome to ${member.guild.name}, ${member}! 🎉\n` +
                    `We're glad to have you here. Be sure to read the rules and have fun!`
                );
            }
            */
            
        } catch (error) {
            client.logger.error('Error in guildMemberAdd event:', error);
        }
    }
};
