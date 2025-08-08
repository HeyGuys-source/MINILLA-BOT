module.exports = {
    name: 'guildMemberRemove',
    async execute(client, member) {
        try {
            client.logger.info(`👋 Member left: ${member.user.tag} from ${member.guild.name}`);
            
            // Check if member logging is enabled
            if (!client.config.features.memberLogging) return;
            
            // You can add leave message logic here
            // Example: Log to a specific channel
            /*
            const logChannel = member.guild.channels.cache.find(
                channel => channel.name === 'member-logs' || channel.name === 'logs'
            );
            
            if (logChannel) {
                await logChannel.send(
                    `📤 **Member Left**\n` +
                    `${member.user.tag} (${member.user.id}) has left the server.`
                );
            }
            */
            
        } catch (error) {
            client.logger.error('Error in guildMemberRemove event:', error);
        }
    }
};
