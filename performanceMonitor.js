// performanceMonitor.js - Performance metrics and monitoring
const { Collection } = require('discord.js');
const { performance, PerformanceObserver } = require('perf_hooks');
const os = require('os');
const errorHandler = require('./errorHandler');
const databaseManager = require('./databaseManager');

class PerformanceMonitor {
    constructor() {
        this.metrics = new Collection();
        this.alerts = new Collection();
        this.thresholds = {
            commandDuration: 5000, // 5 seconds
            memoryUsage: 0.8, // 80% of available memory
            cpuUsage: 0.8, // 80% CPU usage
            responseTime: 1000 // 1 second
        };
        this.observer = null;
        this.initialized = false;
    }

    /**
     * Initialize performance monitoring
     */
    initialize() {
        if (this.initialized) return;

        // Set up performance observer
        this.observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            for (const entry of entries) {
                this.recordMetric(entry.name, entry.duration);
            }
        });

        this.observer.observe({ entryTypes: ['measure'], buffered: true });
        this.startPeriodicChecks();
        this.initialized = true;
    }

    /**
     * Start a performance measurement
     * @param {string} name - Name of the operation
     * @returns {Function} Function to end measurement
     */
    startMeasurement(name) {
        const startMark = `${name}-start-${Date.now()}`;
        const endMark = `${name}-end-${Date.now()}`;
        
        performance.mark(startMark);

        return () => {
            try {
                performance.mark(endMark);
                performance.measure(name, startMark, endMark);
                performance.clearMarks(startMark);
                performance.clearMarks(endMark);
            } catch (error) {
                console.error(`Error ending measurement ${name}:`, error);
            }
        };
    }

    /**
     * Record a metric
     * @param {string} name - Metric name
     * @param {number} value - Metric value
     */
    recordMetric(name, value) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, {
                values: [],
                min: Infinity,
                max: -Infinity,
                sum: 0,
                count: 0
            });
        }

        const metric = this.metrics.get(name);
        metric.values.push(value);
        metric.min = Math.min(metric.min, value);
        metric.max = Math.max(metric.max, value);
        metric.sum += value;
        metric.count++;

        // Keep only last 1000 values
        if (metric.values.length > 1000) {
            const removed = metric.values.shift();
            metric.sum -= removed;
            metric.count--;
        }

        // Check for threshold violations
        this.checkThresholds(name, value);
    }

    /**
     * Check metric thresholds
     * @param {string} name - Metric name
     * @param {number} value - Current value
     */
    checkThresholds(name, value) {
        let threshold = null;

        if (name.endsWith('command')) {
            threshold = this.thresholds.commandDuration;
        } else if (name === 'memoryUsage') {
            threshold = this.thresholds.memoryUsage;
        } else if (name === 'cpuUsage') {
            threshold = this.thresholds.cpuUsage;
        } else if (name === 'responseTime') {
            threshold = this.thresholds.responseTime;
        }

        if (threshold && value > threshold) {
            this.createAlert(name, value, threshold);
        }
    }

    /**
     * Create performance alert
     * @param {string} metric - Metric name
     * @param {number} value - Current value
     * @param {number} threshold - Threshold value
     */
    createAlert(metric, value, threshold) {
        const alert = {
            metric,
            value,
            threshold,
            timestamp: Date.now()
        };

        this.alerts.set(`${metric}-${Date.now()}`, alert);

        // Log alert to database
        databaseManager.logPerformanceAlert(alert).catch(error => {
            errorHandler.handleError(error, {
                alert,
                errorContext: 'Performance alert logging'
            });
        });

        console.warn(`⚠️ Performance alert: ${metric} = ${value} (threshold: ${threshold})`);
    }

    /**
     * Get metric statistics
     * @param {string} name - Metric name
     * @returns {Object} Metric statistics
     */
    getMetricStats(name) {
        const metric = this.metrics.get(name);
        if (!metric) return null;

        return {
            min: metric.min,
            max: metric.max,
            avg: metric.sum / metric.count,
            count: metric.count,
            recent: metric.values.slice(-10)
        };
    }

    /**
     * Get system resource usage
     * @returns {Object} System resource usage
     */
    getSystemMetrics() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;

        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });

        const cpuUsage = 1 - (totalIdle / totalTick);
        const memUsage = 1 - (os.freemem() / os.totalmem());

        return {
            cpu: {
                usage: cpuUsage,
                cores: cpus.length
            },
            memory: {
                used: os.totalmem() - os.freemem(),
                total: os.totalmem(),
                usage: memUsage
            },
            uptime: os.uptime()
        };
    }

    /**
     * Start periodic system checks
     */
    startPeriodicChecks() {
        setInterval(() => {
            try {
                const metrics = this.getSystemMetrics();
                
                this.recordMetric('cpuUsage', metrics.cpu.usage);
                this.recordMetric('memoryUsage', metrics.memory.usage);

                // Clean up old alerts
                const now = Date.now();
                for (const [key, alert] of this.alerts.entries()) {
                    if (now - alert.timestamp > 24 * 60 * 60 * 1000) { // 24 hours
                        this.alerts.delete(key);
                    }
                }
            } catch (error) {
                errorHandler.handleError(error, {
                    errorContext: 'Performance monitoring'
                });
            }
        }, 60000); // Check every minute
    }

    /**
     * Get performance report
     * @returns {Object} Performance report
     */
    getReport() {
        const report = {
            system: this.getSystemMetrics(),
            metrics: {},
            alerts: Array.from(this.alerts.values())
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 10)
        };

        for (const [name, metric] of this.metrics.entries()) {
            report.metrics[name] = this.getMetricStats(name);
        }

        return report;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.metrics.clear();
        this.alerts.clear();
        this.initialized = false;
    }
}

module.exports = new PerformanceMonitor();
