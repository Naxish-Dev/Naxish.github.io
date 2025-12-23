/**
 * @fileoverview Shared localStorage utilities for game state persistence
 * @author Naxish
 */

/**
 * Safely save data to localStorage with error handling
 * @param {string} key - The localStorage key
 * @param {Object} data - The data to save (will be JSON stringified)
 * @returns {boolean} True if save was successful, false otherwise
 */
function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Failed to save to localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Safely load data from localStorage with error handling
 * @param {string} key - The localStorage key
 * @param {Object} [defaults=null] - Default value if key doesn't exist or parsing fails
 * @returns {Object|null} Parsed data or defaults
 */
function loadFromLocalStorage(key, defaults = null) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaults;
    
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' ? parsed : defaults;
  } catch (error) {
    console.error(`Failed to load from localStorage (${key}):`, error);
    return defaults;
  }
}

/**
 * Remove an item from localStorage
 * @param {string} key - The localStorage key to remove
 * @returns {boolean} True if removal was successful
 */
function removeFromLocalStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove from localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Check if a key exists in localStorage
 * @param {string} key - The localStorage key to check
 * @returns {boolean} True if key exists
 */
function localStorageHasKey(key) {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error(`Failed to check localStorage (${key}):`, error);
    return false;
  }
}
