const os = require('os');
const { EventEmitter } = require('events');

class PerformanceMonitor extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;
        this.metrics = {
            startTime: Date.now(),
            commandsExecuted: 0,
            messagesProcessed: 0,
            errors: 0,
            memoryUsage: [],
            cpuUsage: [],
            latency: [],
            guildCount: 0,
            userCount: 0
        };
        
        this.startMonitoring();
    }
    
    startMonitoring() {
        // Monitor every 30 seconds
        this.monitorInterval = setInterval(() => {
            this.collectMetrics();
            this.checkHealth();
        }, 30000);
        
        // Clean old metrics every 10 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldMetrics();
        }, 600000);
    }
    
    collectMetrics() {
        try {
            const memory = process.memoryUsage();
            const cpus = os.cpus();
            
            // Memory metrics
            this.metrics.memoryUsage.push({
                timestamp: Date.now(),
                rss: memory.rss,
                heapUsed: memory.heapUsed,
                heapTotal: memory.heapTotal,
                external: memory.external
            });
            
            // CPU metrics
            const cpuUsage = process.cpuUsage();
            this.metrics.cpuUsage.push({
                timestamp: Date.now(),
                user: cpuUsage.user,
                system: cpuUsage.system
            });
            
            // Discord metrics
            if (this.client.readyAt) {
                this.metrics.latency.push({
                    timestamp: Date.now(),
                    ws: this.client.ws.ping,
                    rest: Date.now() - this.client.readyTimestamp
                });
                
                this.metrics.guildCount = this.client.guilds.cache.size;
                this.metrics.userCount = this.client.users.cache.size;
            }
            
            this.emit('metricsCollected', this.getLatestMetrics());
            
        } catch (error) {
            this.client.logger.error('Error collecting performance metrics:', error);
        }
    }
    
    checkHealth() {
        const health = this.getHealthStatus();
        
        if (health.status === 'unhealthy') {
            this.client.logger.warn('Bot health check failed:', health.issues);
            this.emit('unhealthy', health);
        }
        
        if (health.status === 'critical') {
            this.client.logger.error('Bot in critical state:', health.issues);
            this.emit('critical', health);
            this.attemptRecovery();
        }
    }
    
    getHealthStatus() {
        const issues = [];
        let status = 'healthy';
        
        // Check memory usage
        const latestMemory = this.metrics.memoryUsage.slice(-1)[0];
        if (latestMemory) {
            const memoryUsagePercent = (latestMemory.heapUsed / latestMemory.heapTotal) * 100;
            if (memoryUsagePercent > 90) {
                issues.push('High memory usage');
                status = 'critical';
            } else if (memoryUsagePercent > 75) {
                issues.push('Elevated memory usage');
                status = 'unhealthy';
            }
        }
        
        // Check latency
        const latestLatency = this.metrics.latency.slice(-1)[0];
        if (latestLatency) {
            if (latestLatency.ws > 1000) {
                issues.push('High WebSocket latency');
                status = status === 'critical' ? 'critical' : 'unhealthy';
            }
        }
        
        // Check Discord connection
        if (!this.client.readyAt || this.client.ws.status !== 0) {
            issues.push('Discord connection issues');
            status = 'critical';
        }
        
        return { status, issues };
    }
    
    async attemptRecovery() {
        try {
            this.client.logger.info('🔧 Attempting automatic recovery...');
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
                this.client.logger.info('✅ Forced garbage collection');
            }
            
            // Clear caches
            this.client.commands.sweep(() => false);
            this.client.users.cache.sweep(user => user.id !== this.client.user.id);
            this.client.channels.cache.sweep(() => false);
            
            this.client.logger.info('✅ Cleared internal caches');
            
            // If still critical, restart
            const healthAfterRecovery = this.getHealthStatus();
            if (healthAfterRecovery.status === 'critical') {
                this.client.logger.warn('🔄 Recovery failed, scheduling restart...');
                setTimeout(() => process.exit(0), 5000);
            }
            
        } catch (error) {
            this.client.logger.error('Error during recovery attempt:', error);
        }
    }
    
    getLatestMetrics() {
        return {
            uptime: Date.now() - this.metrics.startTime,
            commandsExecuted: this.metrics.commandsExecuted,
            messagesProcessed: this.metrics.messagesProcessed,
            errors: this.metrics.errors,
            guildCount: this.metrics.guildCount,
            userCount: this.metrics.userCount,
            latestMemory: this.metrics.memoryUsage.slice(-1)[0],
            latestLatency: this.metrics.latency.slice(-1)[0],
            averageLatency: this.getAverageLatency(),
            memoryTrend: this.getMemoryTrend()
        };
    }
    
    getAverageLatency() {
        const recent = this.metrics.latency.slice(-10);
        if (recent.length === 0) return 0;
        
        const sum = recent.reduce((total, metric) => total + metric.ws, 0);
        return sum / recent.length;
    }
    
    getMemoryTrend() {
        const recent = this.metrics.memoryUsage.slice(-10);
        if (recent.length < 2) return 'stable';
        
        const first = recent[0].heapUsed;
        const last = recent[recent.length - 1].heapUsed;
        const change = ((last - first) / first) * 100;
        
        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
    }
    
    cleanupOldMetrics() {
        const maxAge = 3600000; // 1 hour
        const now = Date.now();
        
        this.metrics.memoryUsage = this.metrics.memoryUsage.filter(
            metric => now - metric.timestamp < maxAge
        );
        
        this.metrics.cpuUsage = this.metrics.cpuUsage.filter(
            metric => now - metric.timestamp < maxAge
        );
        
        this.metrics.latency = this.metrics.latency.filter(
            metric => now - metric.timestamp < maxAge
        );
    }
    
    incrementCounter(metric) {
        if (this.metrics.hasOwnProperty(metric)) {
            this.metrics[metric]++;
        }
    }
    
    getReport() {
        return {
            ...this.getLatestMetrics(),
            health: this.getHealthStatus(),
            systemInfo: {
                platform: os.platform(),
                arch: os.arch(),
                nodeVersion: process.version,
                totalMemory: os.totalmem(),
                freeMemory: os.freemem(),
                cpuCount: os.cpus().length
            }
        };
    }
    
    destroy() {
        if (this.monitorInterval) clearInterval(this.monitorInterval);
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    }
}

module.exports = PerformanceMonitor;