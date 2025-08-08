const { PermissionsBitField } = require('discord.js');

class PermissionManager {
    constructor() {
        this.defaultPermissions = {
            everyone: [],
            moderator: [
                PermissionsBitField.Flags.ManageMessages,
                PermissionsBitField.Flags.KickMembers,
                PermissionsBitField.Flags.MuteMembers
            ],
            administrator: [
                PermissionsBitField.Flags.Administrator
            ]
        };
    }
    
    /**
     * Check if user has specific permission
     */
    hasPermission(member, permission) {
        if (!member || !member.permissions) return false;
        
        // Bot owners bypass all permission checks
        if (this.isBotOwner(member.user.id)) return true;
        
        // Check for administrator permission
        if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
        
        // Check specific permission
        if (typeof permission === 'string') {
            return member.permissions.has(PermissionsBitField.Flags[permission]);
        }
        
        if (Array.isArray(permission)) {
            return member.permissions.has(permission);
        }
        
        return member.permissions.has(permission);
    }
    
    /**
     * Check if user has any of the specified permissions
     */
    hasAnyPermission(member, permissions) {
        if (!Array.isArray(permissions)) return false;
        
        return permissions.some(permission => this.hasPermission(member, permission));
    }
    
    /**
     * Check if user has all of the specified permissions
     */
    hasAllPermissions(member, permissions) {
        if (!Array.isArray(permissions)) return false;
        
        return permissions.every(permission => this.hasPermission(member, permission));
    }
    
    /**
     * Check if user is bot owner
     */
    isBotOwner(userId) {
        const config = require('../config/config.js');
        return config.bot.owners.includes(userId);
    }
    
    /**
     * Check if user is guild owner
     */
    isGuildOwner(member) {
        return member.guild.ownerId === member.user.id;
    }
    
    /**
     * Check if user has moderator permissions
     */
    isModerator(member) {
        return this.hasAnyPermission(member, this.defaultPermissions.moderator) || 
               this.isGuildOwner(member);
    }
    
    /**
     * Check if user has administrator permissions
     */
    isAdministrator(member) {
        return this.hasPermission(member, PermissionsBitField.Flags.Administrator) || 
               this.isGuildOwner(member);
    }
    
    /**
     * Get missing permissions for a user
     */
    getMissingPermissions(member, requiredPermissions) {
        if (!Array.isArray(requiredPermissions)) {
            requiredPermissions = [requiredPermissions];
        }
        
        const missing = [];
        
        for (const permission of requiredPermissions) {
            if (!this.hasPermission(member, permission)) {
                missing.push(permission);
            }
        }
        
        return missing;
    }
    
    /**
     * Format permission names for display
     */
    formatPermissionName(permission) {
        if (typeof permission === 'string') {
            return permission.replace(/([A-Z])/g, ' $1').trim();
        }
        
        const permissionName = Object.keys(PermissionsBitField.Flags).find(
            key => PermissionsBitField.Flags[key] === permission
        );
        
        return permissionName ? permissionName.replace(/([A-Z])/g, ' $1').trim() : 'Unknown Permission';
    }
    
    /**
     * Create permission error message
     */
    createPermissionErrorMessage(missingPermissions) {
        if (missingPermissions.length === 0) return null;
        
        const formattedPermissions = missingPermissions.map(p => this.formatPermissionName(p));
        
        if (formattedPermissions.length === 1) {
            return `You need the **${formattedPermissions[0]}** permission to use this command.`;
        }
        
        return `You need the following permissions to use this command:\n${formattedPermissions.map(p => `• ${p}`).join('\n')}`;
    }
    
    /**
     * Check bot permissions in a channel
     */
    checkBotPermissions(channel, requiredPermissions) {
        const botMember = channel.guild.members.me;
        const botPermissions = channel.permissionsFor(botMember);
        
        if (!Array.isArray(requiredPermissions)) {
            requiredPermissions = [requiredPermissions];
        }
        
        const missing = [];
        
        for (const permission of requiredPermissions) {
            if (!botPermissions.has(permission)) {
                missing.push(permission);
            }
        }
        
        return {
            hasPermissions: missing.length === 0,
            missingPermissions: missing
        };
    }
}

module.exports = new PermissionManager();
