// memoryManager.js - Memory and resource management
const { Collection } = require('discord.js');
const { performance } = require('perf_hooks');
const errorHandler = require('./errorHandler');

class MemoryManager {
    constructor() {
        this.resources = new Collection();
        this.metrics = new Collection();
        this.cleanupTasks = new Collection();
        this.resourceLimits = {
            audioConnections: 10,
            cacheSize: 1000,
            messageQueue: 1000,
            maxMemoryUsage: 1024 * 1024 * 1024 // 1GB
        };
    }

    /**
     * Register a resource for tracking
     * @param {string} resourceId - Unique identifier for the resource
     * @param {Object} resource - The resource object to track
     * @param {Function} cleanup - Cleanup function for the resource
     */
    registerResource(resourceId, resource, cleanup) {
        try {
            this.resources.set(resourceId, {
                resource,
                createdAt: Date.now(),
                lastAccessed: Date.now(),
                accessCount: 0,
                memoryUsage: this.estimateMemoryUsage(resource)
            });

            if (cleanup) {
                this.cleanupTasks.set(resourceId, cleanup);
            }

            this.updateMetrics();
        } catch (error) {
            console.error(`❌ Error registering resource ${resourceId}:`, error);
            throw error;
        }
    }

    /**
     * Access a registered resource
     * @param {string} resourceId - Resource identifier
     * @returns {Object} The requested resource
     */
    accessResource(resourceId) {
        const resourceData = this.resources.get(resourceId);
        if (!resourceData) {
            throw new Error(`Resource ${resourceId} not found`);
        }

        resourceData.lastAccessed = Date.now();
        resourceData.accessCount++;
        this.resources.set(resourceId, resourceData);

        return resourceData.resource;
    }

    /**
     * Release a resource and run its cleanup
     * @param {string} resourceId - Resource identifier
     */
    releaseResource(resourceId) {
        try {
            const cleanup = this.cleanupTasks.get(resourceId);
            if (cleanup) {
                cleanup();
                this.cleanupTasks.delete(resourceId);
            }

            this.resources.delete(resourceId);
            this.updateMetrics();
        } catch (error) {
            console.error(`❌ Error releasing resource ${resourceId}:`, error);
            throw error;
        }
    }

    /**
     * Clean up inactive resources
     * @param {number} threshold - Time in milliseconds of inactivity before cleanup
     */
    cleanupInactiveResources(threshold = 30 * 60 * 1000) { // Default 30 minutes
        const now = Date.now();
        let cleanedCount = 0;

        for (const [resourceId, resourceData] of this.resources.entries()) {
            if (now - resourceData.lastAccessed > threshold) {
                this.releaseResource(resourceId);
                cleanedCount++;
            }
        }

        return cleanedCount;
    }

    /**
     * Estimate memory usage of a resource
     * @param {Object} resource - Resource to estimate
     * @returns {number} Estimated memory usage in bytes
     */
    estimateMemoryUsage(resource) {
        try {
            const seen = new WeakSet();
            const estimate = (obj) => {
                if (obj === null || obj === undefined) return 0;
                if (typeof obj !== 'object') return 8;
                if (seen.has(obj)) return 0;
                seen.add(obj);

                let size = 0;
                for (const key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        size += estimate(obj[key]);
                    }
                }
                return size;
            };

            return estimate(resource);
        } catch (error) {
            console.warn('Error estimating memory usage:', error);
            return 0;
        }
    }

    /**
     * Update memory usage metrics
     */
    updateMetrics() {
        const metrics = {
            totalResources: this.resources.size,
            totalMemoryUsage: 0,
            resourceTypes: {},
            timestamp: Date.now()
        };

        for (const [resourceId, resourceData] of this.resources.entries()) {
            metrics.totalMemoryUsage += resourceData.memoryUsage;
            
            const type = resourceId.split(':')[0];
            if (!metrics.resourceTypes[type]) {
                metrics.resourceTypes[type] = {
                    count: 0,
                    totalMemory: 0
                };
            }
            metrics.resourceTypes[type].count++;
            metrics.resourceTypes[type].totalMemory += resourceData.memoryUsage;
        }

        this.metrics.set('latest', metrics);
    }

    /**
     * Get current memory usage metrics
     * @returns {Object} Current memory metrics
     */
    getMetrics() {
        this.updateMetrics();
        return this.metrics.get('latest');
    }

    /**
     * Check if system is approaching resource limits
     * @returns {Object} Status of resource limits
     */
    checkResourceLimits() {
        const metrics = this.getMetrics();
        return {
            memoryUsage: {
                current: metrics.totalMemoryUsage,
                limit: this.resourceLimits.maxMemoryUsage,
                approaching: metrics.totalMemoryUsage > this.resourceLimits.maxMemoryUsage * 0.8
            },
            resourceCount: {
                current: metrics.totalResources,
                limit: this.resourceLimits.cacheSize,
                approaching: metrics.totalResources > this.resourceLimits.cacheSize * 0.8
            }
        };
    }

    /**
     * Perform emergency cleanup if resources are critically low
     */
    async performEmergencyCleanup() {
        const limits = this.checkResourceLimits();
        if (limits.memoryUsage.approaching || limits.resourceCount.approaching) {
            console.warn('⚠️ Performing emergency resource cleanup');
            
            // Aggressive cleanup of old resources
            const cleanedCount = this.cleanupInactiveResources(5 * 60 * 1000); // 5 minutes
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            return cleanedCount;
        }
        return 0;
    }

    /**
     * Start periodic monitoring
     * @param {number} interval - Check interval in milliseconds
     */
    startMonitoring(interval = 5 * 60 * 1000) { // Default 5 minutes
        setInterval(() => {
            try {
                const limits = this.checkResourceLimits();
                if (limits.memoryUsage.approaching || limits.resourceCount.approaching) {
                    this.performEmergencyCleanup();
                }
            } catch (error) {
                errorHandler.handleError(error, {
                    errorContext: 'Memory monitoring'
                });
            }
        }, interval);
    }
}

module.exports = new MemoryManager();
