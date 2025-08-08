class RateLimiter {
    constructor(options = {}) {
        this.options = {
            windowMs: options.windowMs || 60000, // 1 minute
            maxRequests: options.maxRequests || 10,
            keyGenerator: options.keyGenerator || ((userId) => userId),
            skipSuccessfulRequests: options.skipSuccessfulRequests || false,
            skipFailedRequests: options.skipFailedRequests || false,
            onLimitReached: options.onLimitReached || (() => {}),
            ...options
        };
        
        this.clients = new Map();
        this.resetTime = Date.now() + this.options.windowMs;
        
        // Auto-cleanup expired entries
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, this.options.windowMs);
    }
    
    async isAllowed(identifier, context = {}) {
        const key = this.options.keyGenerator(identifier, context);
        const now = Date.now();
        
        // Reset window if needed
        if (now >= this.resetTime) {
            this.clients.clear();
            this.resetTime = now + this.options.windowMs;
        }
        
        let client = this.clients.get(key);
        
        if (!client) {
            client = {
                count: 0,
                resetTime: now + this.options.windowMs,
                firstRequest: now,
                lastRequest: now
            };
            this.clients.set(key, client);
        }
        
        // Check if we're within the window
        if (now >= client.resetTime) {
            client.count = 0;
            client.resetTime = now + this.options.windowMs;
            client.firstRequest = now;
        }
        
        client.lastRequest = now;
        client.count++;
        
        const isAllowed = client.count <= this.options.maxRequests;
        
        if (!isAllowed) {
            this.options.onLimitReached(key, client, context);
        }
        
        return {
            allowed: isAllowed,
            remaining: Math.max(0, this.options.maxRequests - client.count),
            resetTime: client.resetTime,
            totalHits: client.count,
            timeToReset: Math.max(0, client.resetTime - now)
        };
    }
    
    async consume(identifier, context = {}) {
        const result = await this.isAllowed(identifier, context);
        
        if (!result.allowed) {
            const error = new Error('Rate limit exceeded');
            error.code = 'RATE_LIMIT_EXCEEDED';
            error.rateLimitInfo = result;
            throw error;
        }
        
        return result;
    }
    
    reset(identifier) {
        const key = this.options.keyGenerator(identifier);
        return this.clients.delete(key);
    }
    
    resetAll() {
        this.clients.clear();
        this.resetTime = Date.now() + this.options.windowMs;
    }
    
    getStats() {
        const now = Date.now();
        let totalClients = 0;
        let blockedClients = 0;
        let activeClients = 0;
        
        for (const [key, client] of this.clients) {
            totalClients++;
            
            if (now < client.resetTime) {
                activeClients++;
                if (client.count > this.options.maxRequests) {
                    blockedClients++;
                }
            }
        }
        
        return {
            totalClients,
            activeClients,
            blockedClients,
            windowMs: this.options.windowMs,
            maxRequests: this.options.maxRequests,
            resetTime: this.resetTime
        };
    }
    
    cleanup() {
        const now = Date.now();
        const keysToDelete = [];
        
        for (const [key, client] of this.clients) {
            if (now >= client.resetTime) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.clients.delete(key));
    }
    
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clients.clear();
    }
}

class AdvancedRateLimitManager {
    constructor() {
        this.limiters = new Map();
        this.globalStats = {
            totalRequests: 0,
            blockedRequests: 0,
            startTime: Date.now()
        };
    }
    
    createLimiter(name, options) {
        const limiter = new RateLimiter({
            ...options,
            onLimitReached: (key, client, context) => {
                this.globalStats.blockedRequests++;
                if (options.onLimitReached) {
                    options.onLimitReached(key, client, context);
                }
            }
        });
        
        this.limiters.set(name, limiter);
        return limiter;
    }
    
    async checkLimit(limiterName, identifier, context = {}) {
        this.globalStats.totalRequests++;
        
        const limiter = this.limiters.get(limiterName);
        if (!limiter) {
            throw new Error(`Rate limiter '${limiterName}' not found`);
        }
        
        return await limiter.isAllowed(identifier, context);
    }
    
    async consumeLimit(limiterName, identifier, context = {}) {
        this.globalStats.totalRequests++;
        
        const limiter = this.limiters.get(limiterName);
        if (!limiter) {
            throw new Error(`Rate limiter '${limiterName}' not found`);
        }
        
        try {
            return await limiter.consume(identifier, context);
        } catch (error) {
            this.globalStats.blockedRequests++;
            throw error;
        }
    }
    
    resetLimiter(limiterName, identifier = null) {
        const limiter = this.limiters.get(limiterName);
        if (!limiter) return false;
        
        if (identifier) {
            return limiter.reset(identifier);
        } else {
            limiter.resetAll();
            return true;
        }
    }
    
    getStats(limiterName = null) {
        if (limiterName) {
            const limiter = this.limiters.get(limiterName);
            return limiter ? limiter.getStats() : null;
        }
        
        const limiterStats = {};
        for (const [name, limiter] of this.limiters) {
            limiterStats[name] = limiter.getStats();
        }
        
        return {
            global: {
                ...this.globalStats,
                uptime: Date.now() - this.globalStats.startTime,
                blockedRate: this.globalStats.totalRequests > 0 
                    ? (this.globalStats.blockedRequests / this.globalStats.totalRequests) * 100 
                    : 0
            },
            limiters: limiterStats
        };
    }
    
    destroy() {
        for (const limiter of this.limiters.values()) {
            limiter.destroy();
        }
        this.limiters.clear();
    }
}

module.exports = { RateLimiter, AdvancedRateLimitManager };