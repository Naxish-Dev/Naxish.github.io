/**
 * @fileoverview SQL Injection Hunter - A fast-paced game to identify and block SQL injection attacks
 * @author Naxish
 */

/**
 * Main game state object
 * @type {Object}
 */
const game = {
    score: 0,
    combo: 0,
    maxCombo: 0,
    timeLeft: 60,
    level: 1,
    queriesChecked: 0,
    blocked: 0,
    allowed: 0,
    correct: 0,
    wrong: 0,
    currentQuery: null,
    gameRunning: false,
    timer: null,
    baseTime: 5000, // Time to decide in ms
    decisionTime: 5000,
    queryTimer: null,
    queryTimerStart: 0,
    queryTimerInterval: null
};

/**
 * Array of safe SQL queries for the game
 * @const {string[]}
 */
const SAFE_QUERIES = [
    "SELECT * FROM users WHERE id = 1",
    "SELECT name, email FROM customers WHERE active = true",
    "INSERT INTO orders (user_id, product, quantity) VALUES (5, 'Laptop', 1)",
    "UPDATE profile SET bio = 'Hello' WHERE user_id = 42",
    "DELETE FROM sessions WHERE expires < NOW()",
    "SELECT COUNT(*) FROM products WHERE category = 'Electronics'",
    "SELECT user.name, order.total FROM users JOIN orders ON users.id = orders.user_id",
    "INSERT INTO comments (text, author_id) VALUES ('Great post!', 7)",
    "UPDATE settings SET theme = 'dark' WHERE user_id = 10",
    "SELECT * FROM articles WHERE published = true ORDER BY date DESC LIMIT 10",
    "SELECT AVG(rating) FROM reviews WHERE product_id = 23",
    "DELETE FROM notifications WHERE read = true AND age > 30",
    "SELECT p.name, c.name FROM products p JOIN categories c ON p.category_id = c.id",
    "INSERT INTO logs (action, user_id, timestamp) VALUES ('login', 5, NOW())",
    "UPDATE cart SET quantity = 3 WHERE user_id = 8 AND product_id = 15"
];

/**
 * Array of malicious SQL queries containing injection patterns
 * @const {string[]}
 */
const MALICIOUS_QUERIES = [
    "SELECT * FROM users WHERE username = 'admin' OR '1'='1'",
    "SELECT * FROM users WHERE id = 1; DROP TABLE users;",
    "SELECT * FROM products WHERE id = 1 UNION SELECT username, password FROM users",
    "SELECT * FROM users WHERE username = 'admin'--' AND password = 'anything'",
    "INSERT INTO users (username, password) VALUES ('hacker', 'pass'); DROP TABLE admin;",
    "SELECT * FROM orders WHERE user_id = 1 OR 1=1",
    "UPDATE users SET password = 'hacked' WHERE '1'='1'",
    "DELETE FROM products WHERE id = 1 OR 2=2",
    "SELECT * FROM accounts WHERE username = '' OR 1=1--",
    "SELECT name FROM users WHERE id = 1 UNION ALL SELECT password FROM admin",
    "INSERT INTO comments VALUES ('test'); DROP TABLE comments;--",
    "SELECT * FROM data WHERE value = 'x' AND 1=1 UNION SELECT * FROM passwords",
    "UPDATE settings SET role = 'admin' WHERE user_id = 5 OR '1'='1'",
    "DELETE FROM logs WHERE id = 1; DELETE FROM users WHERE role = 'admin';",
    "SELECT * FROM users WHERE username = 'admin' AND password = 'x' OR 'y'='y'",
    "SELECT user_id FROM sessions WHERE token = '123' UNION SELECT credit_card FROM payments",
    "INSERT INTO messages (text) VALUES ('hi'); UPDATE users SET admin = true WHERE id = 1;",
    "SELECT * FROM orders WHERE status = 'pending' OR 1=1--'",
    "DELETE FROM items WHERE id = 1 OR EXISTS(SELECT * FROM admin)",
    "UPDATE profile SET bio = 'test' WHERE id = 1 UNION SELECT password FROM users"
];

/**
 * Initialize the game - set up event listeners and load saved data
 */
function init() {
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('safeBtn').addEventListener('click', () => makeDecision(true));
    document.getElementById('dangerBtn').addEventListener('click', () => makeDecision(false));
    
    loadGame();
/**
 * Start a new game session
 */
}

function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    
    game.score = 0;
    game.combo = 0;
    game.maxCombo = 0;
    game.timeLeft = 60;
    game.level = 1;
    game.queriesChecked = 0;
    game.blocked = 0;
    game.allowed = 0;
    game.correct = 0;
    game.wrong = 0;
    game.gameRunning = true;
    game.decisionTime = game.baseTime;
    
    updateUI();
    showNextQuery();
/**
 * Restart the game from the game over screen
 */
    startTimer();
}
/**
 * Start the countdown timer for the game session
 */

function restartGame() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    startGame();
}

function startTimer() {
    game.timer = setInterval(() => {
        game.timeLeft--;
        updateUI();
        
/**
 * Display the next SQL query for the player to evaluate
 */
        if (game.timeLeft <= 0) {
            gameOver();
        }
    }, 1000);
}

function showNextQuery() {
    if (!game.gameRunning) return;
    
    // Clear feedback
    document.getElementById('feedback').classList.add('hidden');
    
    // Generate query
    const isSafe = Math.random() > 0.5;
    const queries = isSafe ? SAFE_QUERIES : MALICIOUS_QUERIES;
    const query = queries[Math.floor(Math.random() * queries.length)];
    
    game.currentQuery = {
        text: query,
        isSafe: isSafe
    };
    
    document.getElementById('queryText').textContent = query;
    
    // Enable buttons
    document.getElementById('safeBtn').disabled = false;
    document.getElementById('dangerBtn').disabled = false;
    
    // Reset and start timer bar animation
    const timerFill = document.getElementById('queryTimerFill');
    timerFill.style.width = '100%';
    game.queryTimerStart = Date.now();
    
    // Start query timer
    clearTimeout(game.queryTimer);
    clearInterval(game.queryTimerInterval);
    
    // Update timer bar smoothly
    game.queryTimerInterval = setInterval(() => {
        if (!game.gameRunning || !game.currentQuery) {
            clearInterval(game.queryTimerInterval);
            return;
    clearInterval(game.queryTimerInterval);
        }
        
        const elapsed = Date.now() - game.queryTimerStart;
        const remaining = Math.max(0, game.decisionTime - elapsed);
        const percent = (remaining / game.decisionTime) * 100;
        timerFill.style.width = percent + '%';
        
        if (remaining <= 0) {
            clearInterval(game.queryTimerInterval);
        }
    }, 50);
/**
 * Handle player's decision on whether a query is safe or malicious
 * @param {boolean|null} playerSaysSafe - True if player says safe, false if malicious, null if timeout
 */
    
    game.queryTimer = setTimeout(() => {
        if (game.gameRunning && game.currentQuery) {
            // Time ran out - treat as wrong
            makeDecision(null);
        }
    }, game.decisionTime);
}

function makeDecision(playerSaysSafe) {
    if (!game.gameRunning || !game.currentQuery) return;
    
    clearTimeout(game.queryTimer);
    
    // Disable buttons
    document.getElementById('safeBtn').disabled = true;
    document.getElementById('dangerBtn').disabled = true;
    
    game.queriesChecked++;
    
    let isCorrect = false;
    
    if (playerSaysSafe === null) {
        // Time ran out
        isCorrect = false;
    } else if (playerSaysSafe === game.currentQuery.isSafe) {
        isCorrect = true;
    }
    
    if (isCorrect) {
        // Correct decision
        game.correct++;
        game.combo++;
        
        if (game.combo > game.maxCombo) {
            game.maxCombo = game.combo;
        }
        
        const points = 10 + game.combo * 2;
        game.score += points;
        
        if (game.currentQuery.isSafe) {
            game.allowed++;
        } else {
            game.blocked++;
        }
        
        showFeedback(true, `Correct! +${points} points`);
    } else {
        // Wrong decision
        game.wrong++;
        game.combo = 0;
        
        const penalty = Math.max(0, game.score - 5);
        game.score = penalty;
        
        showFeedback(false, `Wrong! ${game.currentQuery.isSafe ? 'That was safe' : 'That was an SQL injection!'}`);
    }
    
    // Level up every 10 queries
    if (game.queriesChecked % 10 === 0) {
        game.level++;
        game.decisionTime = Math.max(2000, game.baseTime - (game.level - 1) * 500);
        game.timeLeft += 10; // Bonus time
    }
/**
 * Display feedback message to the player
 * @param {boolean} isCorrect - Whether the decision was correct
 * @param {string} message - Feedback message to display
 */
    
    updateUI();
    
    // Show next query after delay
    setTimeout(() => {
/**
 * Update all UI elements with current game statistics
 */
        game.currentQuery = null;
        showNextQuery();
    }, 1500);
}

function showFeedback(isCorrect, message) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.classList.remove('hidden', 'correct', 'wrong');
    feedback.classList.add(isCorrect ? 'correct' : 'wrong');
}

function updateUI() {
/**
 * End the game and display final statistics
 */
    document.getElementById('scoreValue').textContent = game.score;
    document.getElementById('comboValue').textContent = game.combo + 'x';
    document.getElementById('timeValue').textContent = game.timeLeft + 's';
    document.getElementById('levelValue').textContent = game.level;
    
    document.getElementById('blockedValue').textContent = game.blocked;
    document.getElementById('allowedValue').textContent = game.allowed;
    
    const accuracy = game.queriesChecked > 0 ? Math.round((game.correct / game.queriesChecked) * 100) : 0;
    document.getElementById('accuracyValue').textContent = accuracy + '%';
}

function gameOver() {
    game.gameRunning = false;
    clearInterval(game.timer);
    clearTimeout(game.queryTimer);
    
    const accuracy = game.queriesChecked > 0 ? Math.round((game.correct / game.queriesChecked) * 100) : 0;
    
    document.getElementById('finalScore').textContent = game.score;
    document.getElementById('finalCombo').textContent = game.maxCombo;
/**
 * Save high scores and statistics to localStorage
 */
    document.getElementById('finalAccuracy').textContent = accuracy + '%';
    document.getElementById('finalLevel').textContent = game.level;
    
    let rating = 'Novice';
    if (accuracy >= 90 && game.score >= 500) rating = 'Security Expert';
    else if (accuracy >= 80 && game.score >= 300) rating = 'Database Defender';
    else if (accuracy >= 70 && game.score >= 200) rating = 'Query Guardian';
    else if (accuracy >= 60) rating = 'SQL Student';
    
    document.getElementById('finalRating').textContent = rating;
    document.getElementById('gameOverScreen').classList.remove('hidden');
    
    saveGame();
}

function saveGame() {
    try {
        const save = {
            highScore: game.score,
            bestAccuracy: Math.round((game.correct / game.queriesChecked) * 100),
            maxCombo: game.maxCombo,
            timestamp: Date.now()
        };
        
        const existing = localStorage.getItem('sqlHunter');
        if (existing) {
            const data = JSON.parse(existing);
            if (data.highScore > save.highScore) {
                save.highScore = data.highScore;
            }
/**
 * Load saved game data from localStorage
 */
            if (data.maxCombo > save.maxCombo) {
                save.maxCombo = data.maxCombo;
            }
            if (data.bestAccuracy > save.bestAccuracy) {
                save.bestAccuracy = data.bestAccuracy;
            }
        }
        
        localStorage.setItem('sqlHunter', JSON.stringify(save));
    } catch (e) {
        console.error('Save failed');
    }
}

/**
 * Load saved game data from localStorage
 */
function loadGame() {
    try {
        const save = localStorage.getItem('sqlHunter');
        if (save) {
            const data = JSON.parse(save);
            // Could show high scores on start screen
        }
    } catch (e) {
        console.error('Load failed');
    }
}

/**
 * Keyboard event handler for shortcuts
 * A/Left Arrow = Safe, D/Right Arrow = Block
 */
document.addEventListener('keydown', (e) => {
    if (!game.gameRunning || !game.currentQuery) return;
    
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        makeDecision(true); // Safe
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        makeDecision(false); // Danger
    }
});

// Initialize on load
window.addEventListener('DOMContentLoaded', init);
