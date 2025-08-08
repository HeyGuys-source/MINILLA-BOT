const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Replies with bot latency information',
    aliases: ['latency', 'pong'],
    category: 'utility',
    usage: 'ping',
    cooldown: 5,
    permissions: [],
    guildOnly: false,
    ownerOnly: false,
    slash: true,
    
    async execute(client, message, args) {
        try {
            const sent = await message.reply('🏓 Pinging...');
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🏓 Pong!')
                .addFields(
                    {
                        name: 'Bot Latency',
                        value: `${sent.createdTimestamp - message.createdTimestamp}ms`,
                        inline: true
                    },
                    {
                        name: 'API Latency',
                        value: `${Math.round(client.ws.ping)}ms`,
                        inline: true
                    },
                    {
                        name: 'Status',
                        value: client.ws.ping < 100 ? '🟢 Excellent' : 
                               client.ws.ping < 200 ? '🟡 Good' : 
                               client.ws.ping < 300 ? '🟠 Fair' : '🔴 Poor',
                        inline: true
                    }
                )
                .setTimestamp();
            
            await sent.edit({ content: null, embeds: [embed] });
            
        } catch (error) {
            client.logger.error('Error in ping command:', error);
            throw error;
        }
    },
    
    async executeSlash(client, interaction) {
        try {
            await interaction.deferReply();
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🏓 Pong!')
                .addFields(
                    {
                        name: 'Bot Latency',
                        value: `${Date.now() - interaction.createdTimestamp}ms`,
                        inline: true
                    },
                    {
                        name: 'API Latency',
                        value: `${Math.round(client.ws.ping)}ms`,
                        inline: true
                    },
                    {
                        name: 'Status',
                        value: client.ws.ping < 100 ? '🟢 Excellent' : 
                               client.ws.ping < 200 ? '🟡 Good' : 
                               client.ws.ping < 300 ? '🟠 Fair' : '🔴 Poor',
                        inline: true
                    }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            client.logger.error('Error in ping slash command:', error);
            throw error;
        }
    }
};
