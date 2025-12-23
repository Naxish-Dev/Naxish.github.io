/**
 * @fileoverview Game configuration constants
 * @author Naxish
 */

/**
 * Configuration for Firewall Defense game
 */
const FIREWALL_CONFIG = {
  WAVE_DURATION: 30000,        // 30 seconds per wave
  MAX_DELTA_TIME: 100,         // Cap delta time to prevent physics jumps
  STARTING_CASH: 150,
  STARTING_LIVES: 20,
  GRID_SIZE: 10,
  CELL_SIZE: 50,
  STORAGE_KEY: 'firewallDefense'
};

/**
 * Configuration for SQL Injection Hunter game
 */
const SQLHUNTER_CONFIG = {
  DECISION_TIME: 5000,         // 5 seconds per decision
  STARTING_LIVES: 3,
  POINTS_CORRECT: 10,
  POINTS_COMBO_BONUS: 5,
  STORAGE_KEY: 'sqlHunter'
};

/**
 * Configuration for Crypto Exchange game
 */
const CRYPTO_CONFIG = {
  PRICE_UPDATE_INTERVAL: 2000, // 2 seconds
  MINING_UPDATE_INTERVAL: 1000, // 1 second
  NEWS_EVENT_INTERVAL: 30000,  // 30 seconds
  STARTING_CASH: 10000,
  STORAGE_KEY: 'cryptoExchangeSave'
};

/**
 * Configuration for Packet Collector game
 */
const PACKET_COLLECTOR_CONFIG = {
  STARTING_PACKETS: 0,
  STARTING_PPS: 0,
  CLICK_VALUE: 1,
  STORAGE_KEY: 'packetCollectorSave'
};

/**
 * Configuration for Packet Runner (Jumper) game
 */
const JUMPER_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 400,
  PLAYER_SIZE: 30,
  GRAVITY: 0.6,
  JUMP_STRENGTH: -12,
  OBSTACLE_SPEED: 5,
  STORAGE_KEY: 'packetRunnerLeaderboard'
};

/**
 * Configuration for Packet Inspector game
 */
const PACKET_INSPECTOR_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 450,
  STARTING_LIVES: 5,
  PACKET_SPAWN_INTERVAL: 1000,
  MAX_PACKETS: 10,
  STORAGE_KEY: 'packetInspectorSave'
};

/**
 * Configuration for Phishing Hunter game
 */
const PHISHING_CONFIG = {
  ROUNDS_PER_GAME: 10,
  STARTING_STREAK: 0,
  POINTS_CORRECT: 10,
  POINTS_STREAK_BONUS: 5,
  STORAGE_KEY: 'phishingHunterSave'
};

/**
 * Configuration for Password Cracker game
 */
const PASSWORD_CONFIG = {
  DIFFICULTIES: {
    easy: { length: 4, charset: '0123456789', maxHints: 3 },
    medium: { length: 6, charset: '0123456789ABCDEF', maxHints: 2 },
    hard: { length: 8, charset: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*', maxHints: 1 }
  },
  STORAGE_KEY: 'passwordCrackerSave'
};

/**
 * Configuration for Port Scanner game
 */
const PORT_SCANNER_CONFIG = {
  DIFFICULTIES: {
    easy: { gridSize: 8, ports: 10 },
    medium: { gridSize: 12, ports: 20 },
    hard: { gridSize: 16, ports: 35 }
  },
  STORAGE_KEY: 'portScannerSave'
};

/**
 * Shared UI configuration
 */
const UI_CONFIG = {
  NOTIFICATION_DURATION: 3000,
  ANIMATION_DURATION: 300,
  TOOLTIP_DELAY: 500
};

/**
 * Shared game mechanics configuration
 */
const GAME_CONFIG = {
  MAX_DELTA_TIME: 100,         // Maximum frame delta to prevent physics glitches
  AUTOSAVE_INTERVAL: 5000,     // Auto-save every 5 seconds
  LEADERBOARD_SIZE: 10         // Top 10 scores
};
