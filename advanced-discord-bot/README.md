# Advanced Discord Bot

A highly sophisticated Discord bot with advanced features including performance monitoring, caching, rate limiting, and a plugin system.

## Features

- 🚀 **Advanced Performance Monitoring** - Real-time health checks and auto-recovery
- 💾 **Intelligent Caching System** - Memory-efficient with TTL and eviction policies  
- 🛡️ **Rate Limiting** - Prevent abuse with intelligent rate limiting
- 🔌 **Plugin System** - Extensible architecture with hooks and middlewares
- 📊 **System Monitoring** - Real-time metrics and diagnostics
- 🛠️ **Modular Commands** - Easy to add and manage commands
- 📝 **Comprehensive Logging** - Winston-based structured logging
- ⚡ **Error Handling** - Robust error handling and recovery

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Rename `package-bot.json` to `package.json` and create a `.env` file:
```
DISCORD_TOKEN=your_discord_bot_token_here
NODE_ENV=production
```

### 3. Run the Bot
```bash
npm start
```

## Deployment to Render.com

### 1. Upload to GitHub
1. Create a new GitHub repository
2. Upload all the bot files
3. Make sure `.env` is in `.gitignore` (don't commit your token!)

### 2. Deploy on Render
1. Go to [Render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Use these settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Add `DISCORD_TOKEN` in Environment Variables

### 3. Environment Variables
Add these environment variables in Render:
- `DISCORD_TOKEN`: Your Discord bot token
- `NODE_ENV`: `production`

## UptimeRobot Monitoring

Since Discord bots don't have HTTP endpoints by default, you can:

1. **Option 1**: Add a simple HTTP health endpoint to the bot
2. **Option 2**: Monitor your Render service URL directly
3. **Option 3**: Use Discord webhook monitoring to check bot status

### Adding Health Endpoint (Recommended)
Add this to your `index.js` after the bot is ready:

```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Health server running on port ${PORT}`);
});
```

Then monitor `https://your-render-url.com/health` with UptimeRobot.

## Commands

- `!ping` / `/ping` - Check bot latency
- `!status` / `/status` - Detailed bot status and metrics
- `!help` / `/help` - Comprehensive help system
- `!system` / `/system` - Advanced system monitoring and control

## Plugin Development

Create new plugins in the `plugins/` directory. Extend the `BasePlugin` class:

```javascript
const { BasePlugin } = require('../utils/pluginManager');

class MyPlugin extends BasePlugin {
    constructor(client, pluginManager) {
        super(client, pluginManager);
        this.name = 'MyPlugin';
        this.version = '1.0.0';
        this.description = 'My custom plugin';
    }
    
    async init() {
        this.log('Plugin initialized!');
    }
}

module.exports = MyPlugin;
```

## Support

This bot includes comprehensive error handling and logging. Check the console output for any issues.

## License

MIT License - Feel free to customize and extend!