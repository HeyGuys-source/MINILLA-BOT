module.exports = {
    name: 'interactionCreate',
    async execute(client, interaction) {
        try {
            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                
                if (!command) {
                    client.logger.warn(`Unknown slash command: ${interaction.commandName}`);
                    return;
                }
                
                // Check if command supports slash commands
                if (!command.slash) {
                    await interaction.reply({
                        content: '❌ This command is not available as a slash command.',
                        ephemeral: true
                    });
                    return;
                }
                
                try {
                    await command.executeSlash(client, interaction);
                    client.logger.info(`Slash command executed: ${interaction.commandName} by ${interaction.user.tag}`);
                } catch (error) {
                    client.logger.error(`Error executing slash command ${interaction.commandName}:`, error);
                    
                    const errorMessage = '❌ An error occurred while executing this command.';
                    
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: errorMessage, ephemeral: true });
                    } else {
                        await interaction.reply({ content: errorMessage, ephemeral: true });
                    }
                }
            }
            
            // Handle button interactions
            else if (interaction.isButton()) {
                client.logger.debug(`Button interaction: ${interaction.customId} by ${interaction.user.tag}`);
                // Add button interaction logic here
            }
            
            // Handle select menu interactions
            else if (interaction.isSelectMenu()) {
                client.logger.debug(`Select menu interaction: ${interaction.customId} by ${interaction.user.tag}`);
                // Add select menu interaction logic here
            }
            
        } catch (error) {
            client.logger.error('Error in interactionCreate event:', error);
        }
    }
};
