const { PermissionsBitField } = require('discord.js');
const permissions = require('../utils/permissions.js');

class ValidationMiddleware {
    /**
     * Validate command execution context
     */
    validateCommandContext(command, message) {
        // Check if command should only be used in guilds
        if (command.guildOnly && !message.guild) {
            message.reply('❌ This command can only be used in servers, not in DMs.');
            return false;
        }
        
        // Check if command is owner only
        if (command.ownerOnly && !permissions.isBotOwner(message.author.id)) {
            message.reply('❌ This command can only be used by bot owners.');
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate user permissions for command
     */
    validatePermissions(command, message) {
        if (!command.permissions || command.permissions.length === 0) {
            return true;
        }
        
        const member = message.member;
        if (!member) return false;
        
        // Bot owners bypass permission checks
        if (permissions.isBotOwner(message.author.id)) {
            return true;
        }
        
        const missingPermissions = permissions.getMissingPermissions(member, command.permissions);
        
        if (missingPermissions.length > 0) {
            const errorMessage = permissions.createPermissionErrorMessage(missingPermissions);
            message.reply(errorMessage);
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate and handle command cooldowns
     */
    validateCooldown(client, command, message) {
        if (!command.cooldown || command.cooldown <= 0) {
            return true;
        }
        
        const { cooldowns } = client;
        
        if (!cooldowns.has(command.name)) {
            cooldowns.set(command.name, new Map());
        }
        
        const now = Date.now();
        const timestamps = cooldowns.get(command.name);
        const cooldownAmount = command.cooldown * 1000;
        
        if (timestamps.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
            
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                message.reply(`⏰ Please wait ${timeLeft.toFixed(1)} more second(s) before using \`${command.name}\` again.`);
                return false;
            }
        }
        
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
        
        return true;
    }
    
    /**
     * Validate bot permissions in channel
     */
    validateBotPermissions(channel, requiredPermissions) {
        const result = permissions.checkBotPermissions(channel, requiredPermissions);
        
        if (!result.hasPermissions) {
            const missingPermissionNames = result.missingPermissions.map(p => 
                permissions.formatPermissionName(p)
            );
            
            return {
                valid: false,
                message: `I need the following permissions to execute this command:\n${missingPermissionNames.map(p => `• ${p}`).join('\n')}`
            };
        }
        
        return { valid: true };
    }
    
    /**
     * Validate user input
     */
    validateInput(input, rules) {
        const errors = [];
        
        if (rules.required && (!input || input.trim().length === 0)) {
            errors.push('This field is required.');
        }
        
        if (rules.minLength && input.length < rules.minLength) {
            errors.push(`Minimum length is ${rules.minLength} characters.`);
        }
        
        if (rules.maxLength && input.length > rules.maxLength) {
            errors.push(`Maximum length is ${rules.maxLength} characters.`);
        }
        
        if (rules.pattern && !rules.pattern.test(input)) {
            errors.push('Invalid format.');
        }
        
        if (rules.type === 'number') {
            const num = parseFloat(input);
            if (isNaN(num)) {
                errors.push('Must be a valid number.');
            } else {
                if (rules.min !== undefined && num < rules.min) {
                    errors.push(`Minimum value is ${rules.min}.`);
                }
                if (rules.max !== undefined && num > rules.max) {
                    errors.push(`Maximum value is ${rules.max}.`);
                }
            }
        }
        
        if (rules.type === 'url') {
            try {
                new URL(input);
            } catch {
                errors.push('Must be a valid URL.');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Validate Discord mention formats
     */
    validateMentions(input, type) {
        const patterns = {
            user: /^<@!?(\d{17,19})>$/,
            channel: /^<#(\d{17,19})>$/,
            role: /^<@&(\d{17,19})>$/,
            emoji: /^<a?:\w+:(\d{17,19})>$/
        };
        
        const pattern = patterns[type];
        if (!pattern) {
            return { valid: false, error: 'Invalid mention type' };
        }
        
        const match = input.match(pattern);
        if (!match) {
            return { valid: false, error: `Invalid ${type} mention format` };
        }
        
        return { valid: true, id: match[1] };
    }
    
    /**
     * Sanitize user input
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/[<>]/g, '') // Remove potential HTML/XML tags
            .replace(/[@#]/g, '') // Remove mention prefixes
            .trim();
    }
    
    /**
     * Validate command arguments
     */
    validateArguments(command, args) {
        if (!command.args) return { valid: true };
        
        const errors = [];
        
        if (command.args.required && args.length === 0) {
            errors.push('This command requires arguments.');
        }
        
        if (command.args.min && args.length < command.args.min) {
            errors.push(`This command requires at least ${command.args.min} arguments.`);
        }
        
        if (command.args.max && args.length > command.args.max) {
            errors.push(`This command accepts at most ${command.args.max} arguments.`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = new ValidationMiddleware();
