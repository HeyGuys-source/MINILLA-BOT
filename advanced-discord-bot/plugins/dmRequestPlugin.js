const { BasePlugin } = require('../utils/pluginManager');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class DMRequestPlugin extends BasePlugin {
    constructor(client, pluginManager) {
        super(client, pluginManager);
        
        // Plugin metadata
        this.name = 'DMRequestPlugin';
        this.version = '2.0.0';
        this.description = 'Advanced DM request forwarding system with decorative embeds and user analytics';
        this.author = 'Advanced Bot System';
        this.dependencies = [];
        
        // Configuration
        this.targetUserId = '1198388098007052331'; // maxshieldman
        this.targetUsername = 'maxshieldman';
        
        // Statistics tracking
        this.requestStats = {
            totalRequests: 0,
            uniqueUsers: new Set(),
            requestHistory: [],
            dailyRequests: new Map(),
            statusDistribution: { pending: 0, processed: 0, ignored: 0 }
        };
        
        // Rate limiting for DM requests
        this.userCooldowns = new Map();
        this.cooldownTime = 300000; // 5 minutes between requests per user
        
        // No middlewares needed - using direct event listener
    }
    
    async init() {
        this.log('🚀 DM Request Forwarding System initialized successfully!');
        this.log(`📨 Forwarding requests to: ${this.targetUsername} (${this.targetUserId})`);
        
        // Set up message listener for DMs
        this.client.on('messageCreate', async (message) => {
            if (this.isDMMessage(message)) {
                await this.processDirectMessage(message);
            }
        });
        
        // Setup daily stats reset
        this.setupDailyStatsReset();
    }
    
    isDMMessage(message) {
        return message.channel.type === 1 && // DM channel
               !message.author.bot && // Not from a bot
               message.author.id !== this.client.user.id && // Not from our bot
               message.author.id !== this.targetUserId; // Not from maxshieldman
    }
    
    async processDirectMessage(message) {
        try {
            // Check cooldown
            if (this.isUserOnCooldown(message.author.id)) {
                await this.sendCooldownMessage(message);
                return;
            }
            
            // Send confirmation to user
            await this.sendConfirmationEmbed(message);
            
            // Forward request to maxshieldman
            await this.forwardRequestToTarget(message);
            
            // Update statistics
            this.updateRequestStats(message.author);
            
            // Set cooldown
            this.setCooldown(message.author.id);
            
            this.log(`📨 Request forwarded from ${message.author.tag} (${message.author.id})`);
            
        } catch (error) {
            this.error('Error processing DM request:', error);
            await this.sendErrorMessage(message);
        }
    }
    
    async sendConfirmationEmbed(message) {
        const embed = new EmbedBuilder()
            .setColor('#FFD700') // Yellow/Gold color
            .setTitle('🚀 Request Submission Successful')
            .setDescription('**Sending request to Maxshieldman**')
            .addFields(
                {
                    name: '📨 Status',
                    value: '```✅ Your request is being processed```',
                    inline: false
                },
                {
                    name: '⏰ Processing Time',
                    value: '```Usually within 24 hours```',
                    inline: true
                },
                {
                    name: '🔄 Next Request',
                    value: '```Available in 5 minutes```',
                    inline: true
                },
                {
                    name: '📋 Request Details',
                    value: `\`\`\`• User: ${message.author.tag}
• Time: ${new Date().toLocaleString()}
• ID: REQ-${Date.now().toString().slice(-6)}\`\`\``,
                    inline: false
                }
            )
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({
                text: '🌟 Advanced Request System | Please wait for a response',
                iconURL: this.client.user.displayAvatarURL()
            })
            .setTimestamp();
        
        // Add decorative elements
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('request_status')
                    .setLabel('📊 View Status')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('request_cancel')
                    .setLabel('❌ Cancel Request')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true)
            );
        
        await message.reply({ 
            embeds: [embed], 
            components: [row]
        });
    }
    
    async forwardRequestToTarget(message) {
        try {
            const targetUser = await this.client.users.fetch(this.targetUserId);
            
            // Create comprehensive user analysis
            const userAnalysis = await this.generateUserAnalysis(message.author, message.guild);
            
            const forwardEmbed = new EmbedBuilder()
                .setColor('#FF6B35') // Orange-red for attention
                .setTitle('📨 New DM Request Received')
                .setDescription('**A user has sent a direct message request**')
                .addFields(
                    {
                        name: '👤 User Information',
                        value: `\`\`\`yaml
Name: ${message.author.tag}
ID: ${message.author.id}
Account Age: ${this.getAccountAge(message.author.createdAt)}
Avatar: ${message.author.avatar ? 'Custom' : 'Default'}\`\`\``,
                        inline: false
                    },
                    {
                        name: '📊 User Analytics',
                        value: userAnalysis,
                        inline: false
                    },
                    {
                        name: '💬 Original Message',
                        value: `\`\`\`${message.content.length > 950 ? message.content.substring(0, 950) + '...' : message.content}\`\`\``,
                        inline: false
                    },
                    {
                        name: '🔗 Quick Actions',
                        value: `• Reply with \`!respond ${message.author.id} [message]\`
• Block user: \`!block ${message.author.id}\`
• View history: \`!history ${message.author.id}\``,
                        inline: false
                    }
                )
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
                .setFooter({
                    text: `Request #${this.requestStats.totalRequests + 1} | Advanced DM System`,
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();
            
            // Add attachments info if any
            if (message.attachments.size > 0) {
                const attachmentInfo = Array.from(message.attachments.values())
                    .map(att => `• ${att.name} (${this.formatFileSize(att.size)})`)
                    .join('\n');
                
                forwardEmbed.addFields({
                    name: '📎 Attachments',
                    value: `\`\`\`${attachmentInfo}\`\`\``,
                    inline: false
                });
            }
            
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`reply_${message.author.id}`)
                        .setLabel('💬 Quick Reply')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`profile_${message.author.id}`)
                        .setLabel('👤 View Profile')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`block_${message.author.id}`)
                        .setLabel('🚫 Block User')
                        .setStyle(ButtonStyle.Danger)
                );
            
            await targetUser.send({ 
                embeds: [forwardEmbed], 
                components: [actionRow]
            });
            
        } catch (error) {
            this.error('Failed to forward message to target user:', error);
            throw error;
        }
    }
    
    async generateUserAnalysis(user, guild) {
        const stats = this.requestStats;
        const isRepeatUser = stats.uniqueUsers.has(user.id);
        const userHistory = stats.requestHistory.filter(req => req.userId === user.id);
        
        let analysis = [];
        
        // Request history
        analysis.push(`Requests Made: ${userHistory.length} ${isRepeatUser ? '(Repeat User)' : '(New User)'}`);
        
        // Account age analysis
        const accountAge = Date.now() - user.createdAt.getTime();
        const daysSinceCreation = Math.floor(accountAge / (1000 * 60 * 60 * 24));
        
        if (daysSinceCreation < 7) {
            analysis.push(`Account Age: ${daysSinceCreation} days (🚨 Very New)`);
        } else if (daysSinceCreation < 30) {
            analysis.push(`Account Age: ${daysSinceCreation} days (⚠️ New)`);
        } else {
            analysis.push(`Account Age: ${Math.floor(daysSinceCreation / 30)} months (✅ Established)`);
        }
        
        // Activity pattern
        if (userHistory.length > 0) {
            const lastRequest = new Date(userHistory[userHistory.length - 1].timestamp);
            const timeSinceLastRequest = Date.now() - lastRequest.getTime();
            const daysSinceLastRequest = Math.floor(timeSinceLastRequest / (1000 * 60 * 60 * 24));
            
            analysis.push(`Last Request: ${daysSinceLastRequest === 0 ? 'Today' : `${daysSinceLastRequest} days ago`}`);
        }
        
        // Trust level calculation
        const trustLevel = this.calculateTrustLevel(user, userHistory, daysSinceCreation);
        analysis.push(`Trust Level: ${trustLevel}`);
        
        return `\`\`\`yaml\n${analysis.join('\n')}\`\`\``;
    }
    
    calculateTrustLevel(user, userHistory, accountAge) {
        let score = 0;
        
        // Account age scoring
        if (accountAge > 365) score += 3;
        else if (accountAge > 90) score += 2;
        else if (accountAge > 30) score += 1;
        
        // Avatar scoring
        if (user.avatar) score += 1;
        
        // Request history scoring
        if (userHistory.length === 0) score += 2; // New users get benefit of doubt
        else if (userHistory.length < 3) score += 1;
        else if (userHistory.length > 10) score -= 2; // Too many requests might be spam
        
        // Trust level determination
        if (score >= 5) return '🟢 High (Trusted)';
        if (score >= 3) return '🟡 Medium (Caution)';
        if (score >= 1) return '🟠 Low (Monitor)';
        return '🔴 Very Low (Suspicious)';
    }
    
    isUserOnCooldown(userId) {
        const lastRequest = this.userCooldowns.get(userId);
        if (!lastRequest) return false;
        
        return (Date.now() - lastRequest) < this.cooldownTime;
    }
    
    setCooldown(userId) {
        this.userCooldowns.set(userId, Date.now());
    }
    
    async sendCooldownMessage(message) {
        const lastRequest = this.userCooldowns.get(message.author.id);
        const timeRemaining = this.cooldownTime - (Date.now() - lastRequest);
        const minutesRemaining = Math.ceil(timeRemaining / 60000);
        
        const embed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('⏰ Request Cooldown Active')
            .setDescription('**Please wait before sending another request**')
            .addFields({
                name: '🕐 Time Remaining',
                value: `\`\`\`${minutesRemaining} minute(s)\`\`\``,
                inline: true
            })
            .setFooter({
                text: 'This helps prevent spam and ensures quality responses',
                iconURL: this.client.user.displayAvatarURL()
            })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    async sendErrorMessage(message) {
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Request Failed')
            .setDescription('**An error occurred while processing your request**')
            .addFields({
                name: '🔧 What to do',
                value: '```• Try again in a few minutes\n• Contact support if the issue persists\n• Check if your message contains valid content```',
                inline: false
            })
            .setFooter({
                text: 'Advanced Request System - Error Handler',
                iconURL: this.client.user.displayAvatarURL()
            })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    updateRequestStats(user) {
        this.requestStats.totalRequests++;
        this.requestStats.uniqueUsers.add(user.id);
        this.requestStats.requestHistory.push({
            userId: user.id,
            username: user.tag,
            timestamp: Date.now()
        });
        
        // Update daily stats
        const today = new Date().toDateString();
        const todayCount = this.requestStats.dailyRequests.get(today) || 0;
        this.requestStats.dailyRequests.set(today, todayCount + 1);
        
        // Maintain history limit
        if (this.requestStats.requestHistory.length > 1000) {
            this.requestStats.requestHistory = this.requestStats.requestHistory.slice(-500);
        }
    }
    
    setupDailyStatsReset() {
        // Reset daily stats at midnight
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const msUntilMidnight = tomorrow - now;
        
        setTimeout(() => {
            this.resetDailyStats();
            // Set up daily interval
            setInterval(() => this.resetDailyStats(), 24 * 60 * 60 * 1000);
        }, msUntilMidnight);
    }
    
    resetDailyStats() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep last 7 days
        
        for (const [date] of this.requestStats.dailyRequests) {
            if (new Date(date) < cutoffDate) {
                this.requestStats.dailyRequests.delete(date);
            }
        }
        
        this.log('📊 Daily stats cleaned up');
    }
    
    // Utility methods
    getAccountAge(createdAt) {
        const age = Date.now() - createdAt.getTime();
        const days = Math.floor(age / (1000 * 60 * 60 * 24));
        
        if (days < 1) return 'Less than 1 day';
        if (days < 30) return `${days} day(s)`;
        if (days < 365) return `${Math.floor(days / 30)} month(s)`;
        return `${Math.floor(days / 365)} year(s)`;
    }
    
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
        return Math.round(bytes / 1048576) + ' MB';
    }
    
    // Plugin API methods
    getRequestStats() {
        return {
            ...this.requestStats,
            uniqueUsers: this.requestStats.uniqueUsers.size,
            averageRequestsPerDay: this.calculateAverageRequestsPerDay()
        };
    }
    
    calculateAverageRequestsPerDay() {
        if (this.requestStats.dailyRequests.size === 0) return 0;
        
        const totalRequests = Array.from(this.requestStats.dailyRequests.values())
            .reduce((sum, count) => sum + count, 0);
        
        return Math.round(totalRequests / this.requestStats.dailyRequests.size);
    }
    
    // Plugin lifecycle methods
    async enable() {
        this.log('✅ DM Request Plugin enabled');
    }
    
    async disable() {
        this.log('⏸️ DM Request Plugin disabled');
    }
    
    async destroy() {
        // Clean up resources
        this.userCooldowns.clear();
        this.requestStats.uniqueUsers.clear();
        this.requestStats.requestHistory = [];
        this.requestStats.dailyRequests.clear();
        
        this.log('🗑️ DM Request Plugin destroyed and cleaned up');
    }
}

module.exports = DMRequestPlugin;