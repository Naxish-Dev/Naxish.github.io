/**
 * @fileoverview Shared game loop and animation utilities
 * @author Naxish
 */

/**
 * Creates a managed game loop with proper cleanup
 * @param {Function} updateCallback - Function to call each frame with deltaTime
 * @param {number} [maxDeltaTime=100] - Maximum deltaTime to prevent physics jumps
 * @returns {Object} Object with start() and stop() methods
 */
function createGameLoop(updateCallback, maxDeltaTime = 100) {
  let animationId = null;
  let lastTime = 0;
  let isRunning = false;

  function loop(currentTime) {
    if (!isRunning) return;

    const deltaTime = lastTime ? Math.min(currentTime - lastTime, maxDeltaTime) : 0;
    lastTime = currentTime;

    updateCallback(deltaTime);
    animationId = requestAnimationFrame(loop);
  }

  return {
    start() {
      if (isRunning) return;
      isRunning = true;
      lastTime = 0;
      animationId = requestAnimationFrame(loop);
    },
    stop() {
      isRunning = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      lastTime = 0;
    },
    isRunning() {
      return isRunning;
    }
  };
}

/**
 * Creates a managed interval with proper cleanup
 * @param {Function} callback - Function to call each interval
 * @param {number} delay - Delay in milliseconds
 * @returns {Object} Object with start(), stop(), and restart() methods
 */
function createManagedInterval(callback, delay) {
  let intervalId = null;
  let isRunning = false;

  return {
    start() {
      if (isRunning) return;
      isRunning = true;
      intervalId = setInterval(callback, delay);
    },
    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      isRunning = false;
    },
    restart() {
      this.stop();
      this.start();
    },
    isRunning() {
      return isRunning;
    }
  };
}

/**
 * Cleanup manager for game resources
 */
class GameCleanupManager {
  constructor() {
    this.intervals = [];
    this.timeouts = [];
    this.listeners = [];
    this.animationFrames = [];
  }

  /**
   * Register an interval for cleanup
   * @param {number} intervalId - Interval ID from setInterval
   */
  addInterval(intervalId) {
    this.intervals.push(intervalId);
  }

  /**
   * Register a timeout for cleanup
   * @param {number} timeoutId - Timeout ID from setTimeout
   */
  addTimeout(timeoutId) {
    this.timeouts.push(timeoutId);
  }

  /**
   * Register an event listener for cleanup
   * @param {Element} element - DOM element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  addListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  }

  /**
   * Register an animation frame for cleanup
   * @param {number} frameId - Frame ID from requestAnimationFrame
   */
  addAnimationFrame(frameId) {
    this.animationFrames.push(frameId);
  }

  /**
   * Clean up all registered resources
   */
  cleanup() {
    // Clear intervals
    this.intervals.forEach(id => clearInterval(id));
    this.intervals = [];

    // Clear timeouts
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts = [];

    // Remove event listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];

    // Cancel animation frames
    this.animationFrames.forEach(id => cancelAnimationFrame(id));
    this.animationFrames = [];
  }
}
