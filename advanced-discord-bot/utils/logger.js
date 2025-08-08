const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console logging
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        
        if (Object.keys(meta).length > 0) {
            log += `\n${JSON.stringify(meta, null, 2)}`;
        }
        
        return log;
    })
);

// Custom format for file logging
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: fileFormat,
    defaultMeta: { service: 'discord-bot' },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: consoleFormat,
            handleExceptions: true,
            handleRejections: true
        })
    ],
    exitOnError: false
});

// Add file transports if logging to file is enabled
if (process.env.LOG_TO_FILE === 'true') {
    logger.add(
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    );
    
    logger.add(
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    );
}

// Add custom methods for structured logging
logger.command = (commandName, user, guild, args = []) => {
    logger.info('Command executed', {
        command: commandName,
        user: `${user.tag} (${user.id})`,
        guild: guild ? `${guild.name} (${guild.id})` : 'DM',
        args: args
    });
};

logger.error = (message, error) => {
    if (error instanceof Error) {
        winston.loggers.get('default').error(message, {
            error: error.message,
            stack: error.stack,
            name: error.name
        });
    } else {
        winston.loggers.get('default').error(message, { error });
    }
};

module.exports = logger;
