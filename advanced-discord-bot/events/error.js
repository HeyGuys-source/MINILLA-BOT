module.exports = {
    name: 'error',
    async execute(client, error) {
        client.logger.error('Discord client error:', error);
        
        // You can add additional error handling here
        // Such as sending error notifications to developers
        // or restarting certain components
    }
};
