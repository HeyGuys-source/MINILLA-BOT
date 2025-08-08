const { GatewayIntentBits, Partials } = require('discord.js');

class IntentManager {
    constructor() {
        this.requiredIntents = [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages
        ];
        
        this.requiredPartials = [
            Partials.Message,
            Partials.Channel,
            Partials.Reaction,
            Partials.User,
            Partials.GuildMember
        ];
    }
    
    getIntents() {
        return this.requiredIntents;
    }
    
    getPartials() {
        return this.requiredPartials;
    }
    
    // Add custom intents if needed
    addIntent(intent) {
        if (!this.requiredIntents.includes(intent)) {
            this.requiredIntents.push(intent);
        }
    }
    
    // Remove intents if not needed
    removeIntent(intent) {
        const index = this.requiredIntents.indexOf(intent);
        if (index > -1) {
            this.requiredIntents.splice(index, 1);
        }
    }
}

module.exports = new IntentManager();
