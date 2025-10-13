// eventManager.js - Centralized event management system
const { Collection } = require('discord.js');
const errorHandler = require('./errorHandler');

class EventManager {
    constructor() {
        this.listeners = new Collection();
        this.cleanupHandlers = new Collection();
        this.debugMode = process.env.NODE_ENV === 'development';
    }

    /**
     * Register an event listener with cleanup
     * @param {string} eventKey - Unique identifier for this event listener
     * @param {Object} emitter - The event emitter object
     * @param {string} eventName - Name of the event to listen for
     * @param {Function} handler - Event handler function
     * @param {Function} cleanup - Optional cleanup function
     */
    registerListener(eventKey, emitter, eventName, handler, cleanup = null) {
        try {
            // Remove existing listener if present
            this.removeListener(eventKey);

            // Wrap handler with error handling and logging
            const wrappedHandler = async (...args) => {
                try {
                    await handler(...args);
                } catch (error) {
                    await errorHandler.handleError(error, {
                        eventKey,
                        eventName,
                        errorContext: 'Event handler'
                    });
                }
            };

            // Add the event listener
            emitter.on(eventName, wrappedHandler);

            // Store listener information
            this.listeners.set(eventKey, {
                emitter,
                eventName,
                handler: wrappedHandler,
                registeredAt: Date.now()
            });

            // Store cleanup handler if provided
            if (cleanup) {
                this.cleanupHandlers.set(eventKey, cleanup);
            }

            if (this.debugMode) {
                console.log(`✅ Registered event listener: ${eventKey} for ${eventName}`);
            }
        } catch (error) {
            console.error(`❌ Error registering event listener ${eventKey}:`, error);
            throw error;
        }
    }

    /**
     * Remove a specific event listener
     * @param {string} eventKey - Unique identifier for the listener
     */
    removeListener(eventKey) {
        try {
            const listener = this.listeners.get(eventKey);
            if (listener) {
                const { emitter, eventName, handler } = listener;
                emitter.removeListener(eventName, handler);
                this.listeners.delete(eventKey);

                // Run cleanup handler if exists
                const cleanup = this.cleanupHandlers.get(eventKey);
                if (cleanup) {
                    cleanup();
                    this.cleanupHandlers.delete(eventKey);
                }

                if (this.debugMode) {
                    console.log(`✅ Removed event listener: ${eventKey}`);
                }
            }
        } catch (error) {
            console.error(`❌ Error removing event listener ${eventKey}:`, error);
            throw error;
        }
    }

    /**
     * Remove all listeners for a specific emitter
     * @param {Object} emitter - The event emitter object
     */
    removeAllListeners(emitter) {
        try {
            for (const [eventKey, listener] of this.listeners.entries()) {
                if (listener.emitter === emitter) {
                    this.removeListener(eventKey);
                }
            }
        } catch (error) {
            console.error('❌ Error removing all listeners:', error);
            throw error;
        }
    }

    /**
     * Get all active listeners
     * @returns {Object} Object containing active listeners and their details
     */
    getActiveListeners() {
        const activeListeners = {};
        for (const [key, listener] of this.listeners.entries()) {
            activeListeners[key] = {
                eventName: listener.eventName,
                registeredAt: listener.registeredAt,
                hasCleanup: this.cleanupHandlers.has(key)
            };
        }
        return activeListeners;
    }

    /**
     * Check for leaked listeners
     * @param {number} threshold - Time in milliseconds to consider a listener as potentially leaked
     * @returns {Array} Array of potentially leaked listeners
     */
    checkForLeaks(threshold = 24 * 60 * 60 * 1000) { // Default 24 hours
        const now = Date.now();
        const leakedListeners = [];

        for (const [key, listener] of this.listeners.entries()) {
            if (now - listener.registeredAt > threshold) {
                leakedListeners.push({
                    key,
                    eventName: listener.eventName,
                    age: Math.floor((now - listener.registeredAt) / 1000 / 60 / 60) + ' hours'
                });
            }
        }

        return leakedListeners;
    }

    /**
     * Clean up leaked listeners
     * @param {number} threshold - Time in milliseconds to consider a listener as potentially leaked
     */
    cleanupLeakedListeners(threshold = 24 * 60 * 60 * 1000) {
        const leakedListeners = this.checkForLeaks(threshold);
        for (const listener of leakedListeners) {
            this.removeListener(listener.key);
        }
        return leakedListeners.length;
    }

    /**
     * Register a one-time event listener
     * @param {string} eventKey - Unique identifier for this event listener
     * @param {Object} emitter - The event emitter object
     * @param {string} eventName - Name of the event to listen for
     * @param {Function} handler - Event handler function
     */
    registerOneTimeListener(eventKey, emitter, eventName, handler) {
        const wrappedHandler = async (...args) => {
            try {
                await handler(...args);
            } catch (error) {
                await errorHandler.handleError(error, {
                    eventKey,
                    eventName,
                    errorContext: 'One-time event handler'
                });
            } finally {
                this.removeListener(eventKey);
            }
        };

        this.registerListener(eventKey, emitter, eventName, wrappedHandler);
    }

    /**
     * Register multiple event listeners at once
     * @param {Array} listeners - Array of listener configurations
     */
    registerBulkListeners(listeners) {
        for (const config of listeners) {
            const { eventKey, emitter, eventName, handler, cleanup } = config;
            this.registerListener(eventKey, emitter, eventName, handler, cleanup);
        }
    }
}

module.exports = new EventManager();
