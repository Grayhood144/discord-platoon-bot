// scheduler.js - Centralized task scheduler
const CacheManager = require('./cache');
const { addToAuditLog } = require('./commands');

class TaskScheduler {
    constructor() {
        this.tasks = new Map();
        this.intervals = new Map();
    }

    // Schedule a task to run at a specific time
    scheduleTask(name, time, task) {
        const now = new Date();
        const targetTime = new Date(time);
        
        // If time has passed for today, schedule for tomorrow
        if (now > targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }
        
        const timeUntilRun = targetTime.getTime() - now.getTime();
        
        // Schedule the task
        const timeout = setTimeout(() => {
            this.runTask(name, task);
            // Reschedule for next day
            this.scheduleTask(name, time, task);
        }, timeUntilRun);
        
        this.tasks.set(name, timeout);
    }

    // Set up a recurring interval task
    setInterval(name, interval, task) {
        if (this.intervals.has(name)) {
            clearInterval(this.intervals.get(name));
        }
        
        const intervalId = setInterval(() => this.runTask(name, task), interval);
        this.intervals.set(name, intervalId);
    }

    // Run a task with error handling and logging
    async runTask(name, task) {
        console.log(`🔄 Running scheduled task: ${name}`);
        try {
            await task();
            console.log(`✅ Task completed: ${name}`);
        } catch (error) {
            console.error(`❌ Task failed: ${name}`, error);
            addToAuditLog(`Scheduled task ${name} failed: ${error.message}`);
        }
    }

    // Clear a scheduled task
    clearTask(name) {
        if (this.tasks.has(name)) {
            clearTimeout(this.tasks.get(name));
            this.tasks.delete(name);
        }
    }

    // Clear an interval task
    clearInterval(name) {
        if (this.intervals.has(name)) {
            clearInterval(this.intervals.get(name));
            this.intervals.delete(name);
        }
    }

    // Clear all tasks
    clearAll() {
        // Clear one-time tasks
        for (const [name, timeout] of this.tasks) {
            clearTimeout(timeout);
        }
        this.tasks.clear();

        // Clear interval tasks
        for (const [name, interval] of this.intervals) {
            clearInterval(interval);
        }
        this.intervals.clear();
    }

    // Get status of all tasks
    getStatus() {
        return {
            scheduledTasks: Array.from(this.tasks.keys()),
            intervalTasks: Array.from(this.intervals.keys())
        };
    }
}

module.exports = new TaskScheduler();

