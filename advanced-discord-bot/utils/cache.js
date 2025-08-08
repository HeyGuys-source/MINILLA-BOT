class AdvancedCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.timers = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0
        };
        
        this.options = {
            maxSize: options.maxSize || 1000,
            defaultTTL: options.defaultTTL || 3600000, // 1 hour
            cleanupInterval: options.cleanupInterval || 300000, // 5 minutes
            maxMemoryUsage: options.maxMemoryUsage || 100 * 1024 * 1024 // 100MB
        };
        
        this.startCleanupInterval();
    }
    
    set(key, value, ttl = this.options.defaultTTL) {
        try {
            // Remove existing entry if it exists
            this.delete(key);
            
            // Check cache size limits
            if (this.cache.size >= this.options.maxSize) {
                this.evictLRU();
            }
            
            // Store the value with metadata
            const entry = {
                value,
                timestamp: Date.now(),
                ttl,
                accessCount: 0,
                lastAccessed: Date.now()
            };
            
            this.cache.set(key, entry);
            this.stats.sets++;
            
            // Set TTL timer if specified
            if (ttl > 0) {
                const timer = setTimeout(() => {
                    this.delete(key);
                }, ttl);
                
                this.timers.set(key, timer);
            }
            
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }
    
    get(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.stats.misses++;
            return undefined;
        }
        
        // Check if expired
        if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
            this.delete(key);
            this.stats.misses++;
            return undefined;
        }
        
        // Update access metadata
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        
        this.stats.hits++;
        return entry.value;
    }
    
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) return false;
        
        // Check if expired
        if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
            this.delete(key);
            return false;
        }
        
        return true;
    }
    
    delete(key) {
        const existed = this.cache.has(key);
        
        if (existed) {
            this.cache.delete(key);
            this.stats.deletes++;
        }
        
        // Clear timer
        const timer = this.timers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
        
        return existed;
    }
    
    clear() {
        // Clear all timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        
        this.cache.clear();
        this.timers.clear();
        
        // Reset stats except for historical data
        const totalOperations = this.stats.hits + this.stats.misses + this.stats.sets + this.stats.deletes;
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: this.stats.evictions,
            totalOperationsLifetime: (this.stats.totalOperationsLifetime || 0) + totalOperations
        };
    }
    
    evictLRU() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.cache) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.delete(oldestKey);
            this.stats.evictions++;
        }
    }
    
    cleanupExpired() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, entry] of this.cache) {
            if (entry.ttl > 0 && now - entry.timestamp > entry.ttl) {
                expiredKeys.push(key);
            }
        }
        
        for (const key of expiredKeys) {
            this.delete(key);
        }
        
        return expiredKeys.length;
    }
    
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
            : 0;
        
        return {
            ...this.stats,
            size: this.cache.size,
            hitRate: parseFloat(hitRate.toFixed(2)),
            memoryUsage: this.getMemoryUsage()
        };
    }
    
    getMemoryUsage() {
        // Rough estimation of memory usage
        let totalSize = 0;
        
        for (const [key, entry] of this.cache) {
            totalSize += this.roughSizeOf(key) + this.roughSizeOf(entry);
        }
        
        return totalSize;
    }
    
    roughSizeOf(object) {
        const objectList = [];
        const stack = [object];
        let bytes = 0;
        
        while (stack.length) {
            const value = stack.pop();
            
            if (typeof value === 'boolean') {
                bytes += 4;
            } else if (typeof value === 'string') {
                bytes += value.length * 2;
            } else if (typeof value === 'number') {
                bytes += 8;
            } else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
                objectList.push(value);
                
                if (value !== null) {
                    for (const key in value) {
                        if (value.hasOwnProperty(key)) {
                            stack.push(value[key]);
                        }
                    }
                }
            }
        }
        
        return bytes;
    }
    
    startCleanupInterval() {
        this.cleanupTimer = setInterval(() => {
            const expired = this.cleanupExpired();
            if (expired > 0) {
                console.debug(`Cache cleanup: removed ${expired} expired entries`);
            }
        }, this.options.cleanupInterval);
    }
    
    // Advanced caching patterns
    async getOrSet(key, fetchFunction, ttl = this.options.defaultTTL) {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }
        
        try {
            const value = await fetchFunction();
            this.set(key, value, ttl);
            return value;
        } catch (error) {
            throw error;
        }
    }
    
    mget(keys) {
        const results = {};
        for (const key of keys) {
            const value = this.get(key);
            if (value !== undefined) {
                results[key] = value;
            }
        }
        return results;
    }
    
    mset(entries, ttl = this.options.defaultTTL) {
        const results = {};
        for (const [key, value] of Object.entries(entries)) {
            results[key] = this.set(key, value, ttl);
        }
        return results;
    }
    
    keys() {
        return Array.from(this.cache.keys());
    }
    
    values() {
        return Array.from(this.cache.values()).map(entry => entry.value);
    }
    
    entries() {
        const result = [];
        for (const [key, entry] of this.cache) {
            result.push([key, entry.value]);
        }
        return result;
    }
    
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.clear();
    }
}

module.exports = AdvancedCache;