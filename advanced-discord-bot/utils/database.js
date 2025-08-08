const fs = require('fs').promises;
const path = require('path');

class Database {
    constructor() {
        this.dataPath = path.join(__dirname, '../data');
        this.cache = new Map();
        this.initializeDatabase();
    }
    
    async initializeDatabase() {
        try {
            // Create data directory if it doesn't exist
            await fs.mkdir(this.dataPath, { recursive: true });
            
            // Load existing data into cache
            await this.loadDataFromFiles();
            
        } catch (error) {
            console.error('Failed to initialize database:', error);
        }
    }
    
    async loadDataFromFiles() {
        try {
            const files = await fs.readdir(this.dataPath);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(this.dataPath, file);
                    const data = await fs.readFile(filePath, 'utf8');
                    const parsed = JSON.parse(data);
                    const key = file.replace('.json', '');
                    this.cache.set(key, parsed);
                }
            }
            
        } catch (error) {
            // Directory might not exist yet, which is fine
        }
    }
    
    /**
     * Get data for a specific key
     */
    async get(key, defaultValue = null) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        
        try {
            const filePath = path.join(this.dataPath, `${key}.json`);
            const data = await fs.readFile(filePath, 'utf8');
            const parsed = JSON.parse(data);
            this.cache.set(key, parsed);
            return parsed;
        } catch (error) {
            return defaultValue;
        }
    }
    
    /**
     * Set data for a specific key
     */
    async set(key, value) {
        try {
            this.cache.set(key, value);
            const filePath = path.join(this.dataPath, `${key}.json`);
            await fs.writeFile(filePath, JSON.stringify(value, null, 2));
            return true;
        } catch (error) {
            console.error(`Failed to set data for key ${key}:`, error);
            return false;
        }
    }
    
    /**
     * Delete data for a specific key
     */
    async delete(key) {
        try {
            this.cache.delete(key);
            const filePath = path.join(this.dataPath, `${key}.json`);
            await fs.unlink(filePath);
            return true;
        } catch (error) {
            console.error(`Failed to delete data for key ${key}:`, error);
            return false;
        }
    }
    
    /**
     * Check if key exists
     */
    async has(key) {
        if (this.cache.has(key)) {
            return true;
        }
        
        try {
            const filePath = path.join(this.dataPath, `${key}.json`);
            await fs.access(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Get all keys
     */
    async keys() {
        try {
            const files = await fs.readdir(this.dataPath);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''));
        } catch (error) {
            return [];
        }
    }
    
    /**
     * Guild-specific data management
     */
    async getGuildData(guildId, defaultData = {}) {
        return await this.get(`guild_${guildId}`, defaultData);
    }
    
    async setGuildData(guildId, data) {
        return await this.set(`guild_${guildId}`, data);
    }
    
    /**
     * User-specific data management
     */
    async getUserData(userId, defaultData = {}) {
        return await this.get(`user_${userId}`, defaultData);
    }
    
    async setUserData(userId, data) {
        return await this.set(`user_${userId}`, data);
    }
    
    /**
     * Backup all data
     */
    async backup() {
        try {
            const backupPath = path.join(this.dataPath, 'backups');
            await fs.mkdir(backupPath, { recursive: true });
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(backupPath, `backup_${timestamp}.json`);
            
            const allData = {};
            for (const [key, value] of this.cache) {
                allData[key] = value;
            }
            
            await fs.writeFile(backupFile, JSON.stringify(allData, null, 2));
            return backupFile;
            
        } catch (error) {
            console.error('Failed to create backup:', error);
            throw error;
        }
    }
}

module.exports = new Database();
