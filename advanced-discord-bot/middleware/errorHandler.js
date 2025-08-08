class ErrorHandler {
    constructor() {
        this.setupProcessHandlers();
    }
    
    setupGlobalErrorHandling(client) {
        // Discord.js error events
        client.on('error', (error) => {
            client.logger.error('Discord client error:', error);
        });
        
        client.on('warn', (warning) => {
            client.logger.warn('Discord client warning:', warning);
        });
        
        client.on('debug', (info) => {
            if (client.config.logging.level === 'debug') {
                client.logger.debug('Discord debug:', info);
            }
        });
        
        // Rate limit handling
        client.rest.on('rateLimited', (rateLimitInfo) => {
            client.logger.warn('Rate limited:', rateLimitInfo);
        });
    }
    
    setupProcessHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            console.error('Stack:', error.stack);
            
            // Give the system time to log before exiting
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });
        
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise);
            console.error('Reason:', reason);
            
            // Don't exit for unhandled rejections, just log them
            // In production, you might want to implement more sophisticated handling
        });
        
        // Handle warnings
        process.on('warning', (warning) => {
            console.warn('Node.js Warning:', warning);
        });
    }
    
    /**
     * Handle command execution errors
     */
    async handleCommandError(client, error, context) {
        const { message, interaction, command } = context;
        
        client.logger.error(`Command error in ${command?.name || 'unknown'}:`, error);
        
        let errorMessage = '❌ An unexpected error occurred while executing this command.';
        
        // Customize error messages based on error type
        if (error.name === 'DiscordAPIError') {
            switch (error.code) {
                case 50013:
                    errorMessage = '❌ I don\'t have permission to perform this action.';
                    break;
                case 50001:
                    errorMessage = '❌ I don\'t have access to this resource.';
                    break;
                case 50035:
                    errorMessage = '❌ Invalid input provided.';
                    break;
                default:
                    errorMessage = `❌ Discord API Error: ${error.message}`;
            }
        } else if (error.name === 'ValidationError') {
            errorMessage = `❌ Validation Error: ${error.message}`;
        } else if (error.name === 'PermissionError') {
            errorMessage = `❌ Permission Error: ${error.message}`;
        }
        
        try {
            if (interaction) {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            } else if (message) {
                await message.reply(errorMessage);
            }
        } catch (replyError) {
            client.logger.error('Failed to send error message:', replyError);
        }
    }
    
    /**
     * Handle API rate limits
     */
    handleRateLimit(client, rateLimitInfo) {
        client.logger.warn('Rate limit hit:', {
            timeout: rateLimitInfo.timeout,
            limit: rateLimitInfo.limit,
            method: rateLimitInfo.method,
            path: rateLimitInfo.path,
            route: rateLimitInfo.route
        });
        
        // You can implement rate limit handling strategies here
        // Such as queuing requests or implementing backoff
    }
    
    /**
     * Create custom error classes
     */
    createCustomErrors() {
        return {
            ValidationError: class ValidationError extends Error {
                constructor(message) {
                    super(message);
                    this.name = 'ValidationError';
                }
            },
            
            PermissionError: class PermissionError extends Error {
                constructor(message) {
                    super(message);
                    this.name = 'PermissionError';
                }
            },
            
            CooldownError: class CooldownError extends Error {
                constructor(message, timeLeft) {
                    super(message);
                    this.name = 'CooldownError';
                    this.timeLeft = timeLeft;
                }
            },
            
            DatabaseError: class DatabaseError extends Error {
                constructor(message) {
                    super(message);
                    this.name = 'DatabaseError';
                }
            }
        };
    }
}

module.exports = new ErrorHandler();
