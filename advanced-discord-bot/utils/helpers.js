const { EmbedBuilder, PermissionsBitField } = require('discord.js');

class Helpers {
    /**
     * Create a standardized error embed
     */
    static createErrorEmbed(message, title = 'Error') {
        return new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`❌ ${title}`)
            .setDescription(message)
            .setTimestamp();
    }
    
    /**
     * Create a standardized success embed
     */
    static createSuccessEmbed(message, title = 'Success') {
        return new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle(`✅ ${title}`)
            .setDescription(message)
            .setTimestamp();
    }
    
    /**
     * Create a standardized warning embed
     */
    static createWarningEmbed(message, title = 'Warning') {
        return new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle(`⚠️ ${title}`)
            .setDescription(message)
            .setTimestamp();
    }
    
    /**
     * Create a standardized info embed
     */
    static createInfoEmbed(message, title = 'Information') {
        return new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`ℹ️ ${title}`)
            .setDescription(message)
            .setTimestamp();
    }
    
    /**
     * Format uptime into a readable string
     */
    static formatUptime(uptime) {
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        let result = '';
        if (days > 0) result += `${days}d `;
        if (hours > 0) result += `${hours}h `;
        if (minutes > 0) result += `${minutes}m `;
        result += `${seconds}s`;
        
        return result.trim();
    }
    
    /**
     * Format bytes into a readable string
     */
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    /**
     * Check if user has required permissions
     */
    static hasPermission(member, permission) {
        if (!member || !member.permissions) return false;
        
        if (typeof permission === 'string') {
            return member.permissions.has(PermissionsBitField.Flags[permission]);
        }
        
        if (Array.isArray(permission)) {
            return member.permissions.has(permission);
        }
        
        return member.permissions.has(permission);
    }
    
    /**
     * Get permission names from permission bitfield
     */
    static getPermissionNames(permissions) {
        const permissionNames = [];
        
        for (const [name, value] of Object.entries(PermissionsBitField.Flags)) {
            if (permissions.has(value)) {
                permissionNames.push(name);
            }
        }
        
        return permissionNames;
    }
    
    /**
     * Truncate text to specified length
     */
    static truncate(text, length = 100, suffix = '...') {
        if (text.length <= length) return text;
        return text.slice(0, length - suffix.length) + suffix;
    }
    
    /**
     * Escape markdown characters
     */
    static escapeMarkdown(text) {
        return text.replace(/[*_`~\\]/g, '\\$&');
    }
    
    /**
     * Parse time string (e.g., "1h 30m", "2d", "45s")
     */
    static parseTime(timeString) {
        const regex = /(\d+)([smhd])/g;
        let totalSeconds = 0;
        let match;
        
        while ((match = regex.exec(timeString)) !== null) {
            const value = parseInt(match[1]);
            const unit = match[2];
            
            switch (unit) {
                case 's':
                    totalSeconds += value;
                    break;
                case 'm':
                    totalSeconds += value * 60;
                    break;
                case 'h':
                    totalSeconds += value * 3600;
                    break;
                case 'd':
                    totalSeconds += value * 86400;
                    break;
            }
        }
        
        return totalSeconds * 1000; // Return milliseconds
    }
    
    /**
     * Generate a random string
     */
    static generateRandomString(length = 10) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }
    
    /**
     * Wait for a specified amount of time
     */
    static wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Chunk an array into smaller arrays
     */
    static chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}

module.exports = Helpers;
