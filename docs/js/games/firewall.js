/**
 * @fileoverview Firewall Defense - A tower defense game where players defend their network from cyber attacks
 * @author Naxish
 */

/**
 * Main game state object
 * @type {Object}
 */
const game = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    gridSize: 40,
    cols: 0,
    rows: 0,
    path: [],
    defenses: [],
    attacks: [],
    particles: [],
    wave: 1,
    budget: 200,
    health: 100,
    score: 0,
    selectedDefense: null,
    gameRunning: false,
    waveInProgress: false,
    waveStarted: false,
    attacksToSpawn: 0,
    spawnTimer: 0,
    waveDelay: 30000,
    waveDelayTimer: 0,
    showingWaveTimer: false,
    lastTime: 0
};

/**
 * Defense type definitions
 * @const {Object.<string, {name: string, cost: number, damage: number, range: number, cooldown: number, color: string, slow?: number}>}
 */
const DEFENSE_TYPES = {
    firewall: { name: 'Basic Firewall', cost: 50, damage: 10, range: 80, cooldown: 1000, color: '#48bb78' },
    ids: { name: 'IDS/IPS', cost: 150, damage: 25, range: 120, cooldown: 800, color: '#4299e1' },
    honeypot: { name: 'Honeypot', cost: 100, damage: 5, range: 100, cooldown: 500, slow: 0.5, color: '#ecc94b' },
    waf: { name: 'WAF', cost: 200, damage: 40, range: 150, cooldown: 1200, color: '#9f7aea' }
};

/**
 * Attack type definitions
 * @const {Object.<string, {name: string, health: number, speed: number, reward: number, color: string, size: number}>}
 */
const ATTACK_TYPES = {
    ddos: { name: 'DDoS', health: 30, speed: 1.5, reward: 20, color: '#e53e3e', size: 8 },
    malware: { name: 'Malware', health: 50, speed: 1, reward: 30, color: '#d69e2e', size: 10 },
    exploit: { name: 'Exploit', health: 80, speed: 0.8, reward: 50, color: '#805ad5', size: 12 },
    ransomware: { name: 'Ransomware', health: 120, speed: 0.6, reward: 80, color: '#e53e3e', size: 14 }
};

/**
 * Initialize the game - sets up canvas, event listeners, and loads saved data
 */
function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    generatePath();
    
    game.canvas.addEventListener('click', handleCanvasClick);
    
    document.querySelectorAll('.shop-item').forEach(item => {
        item.addEventListener('click', () => selectDefense(item.dataset.type));
    });
    
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('startWaveBtn').addEventListener('click', manualStartWave);
    document.getElementById('skipWaveBtn').addEventListener('click', skipToNextWave);
    
    // Ensure start screen is visible
    document.getElementById('startScreen').classList.remove('hidden');
    
    loadGame();
/**
 * Resize the canvas to fit its container and recalculate grid dimensions
 */
}

function resizeCanvas() {
    const container = game.canvas.parentElement;
    game.canvas.width = container.clientWidth - 20;
    game.canvas.height = 500;
    game.width = game.canvas.width;
/**
 * Generate the path that attacks will follow through the grid
 * Creates a zigzag pattern from left to right
 */
    game.height = game.canvas.height;
    game.cols = Math.floor(game.width / game.gridSize);
    game.rows = Math.floor(game.height / game.gridSize);
}

function generatePath() {
    game.path = [];
    const startY = Math.floor(game.rows / 2);
    
    // Simple zigzag path
    for (let x = 0; x < game.cols; x++) {
        if (x < game.cols / 3) {
            game.path.push({ x, y: startY });
        } else if (x < 2 * game.cols / 3) {
            const offset = Math.floor((x - game.cols / 3) / 2);
            game.path.push({ x, y: startY - offset });
/**
 * Select a defense type from the shop if player has enough budget
 * @param {string} type - The defense type key from DEFENSE_TYPES
 */
        } else {
            const maxOffset = Math.floor(game.cols / 6);
            game.path.push({ x, y: startY - maxOffset });
        }
    }
}

function selectDefense(type) {
    if (!game.gameRunning) return;
/**
 * Update shop UI to reflect current budget and selected defense
 * Disables items that are too expensive
 */
    
    const defenseType = DEFENSE_TYPES[type];
    if (game.budget >= defenseType.cost) {
        game.selectedDefense = type;
        updateShopUI();
    }
}

function updateShopUI() {
    document.querySelectorAll('.shop-item').forEach(item => {
        item.classList.remove('selected');
        const type = item.dataset.type;
        const cost = DEFENSE_TYPES[type].cost;
        
/**
 * Handle canvas click events for placing defenses on the grid
 * @param {MouseEvent} e - The click event
 */
        if (game.budget < cost) {
            item.classList.add('disabled');
        } else {
            item.classList.remove('disabled');
        }
        
        if (type === game.selectedDefense) {
            item.classList.add('selected');
        }
    });
}

function handleCanvasClick(e) {
    if (!game.gameRunning || !game.selectedDefense) return;
    
    const rect = game.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const gridX = Math.floor(x / game.gridSize);
    const gridY = Math.floor(y / game.gridSize);
    
    // Check if position is valid (not on path and no defense there)
    const onPath = game.path.some(p => p.x === gridX && p.y === gridY);
    const hasDefense = game.defenses.some(d => d.gridX === gridX && d.gridY === gridY);
    
    if (!onPath && !hasDefense) {
        const defenseType = DEFENSE_TYPES[game.selectedDefense];
        if (game.budget >= defenseType.cost) {
            game.defenses.push({
                type: game.selectedDefense,
                gridX,
                gridY,
                x: gridX * game.gridSize + game.gridSize / 2,
                y: gridY * game.gridSize + game.gridSize / 2,
/**
 * Start the game - hide start screen, initialize game state, and begin game loop
 */
                lastFire: 0,
                ...defenseType
            });
            
            game.budget -= defenseType.cost;
            game.selectedDefense = null;
            updateUI();
            updateShopUI();
        }
    }
}

function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    game.gameRunning = true;
/**
 * Manually start the first wave when player clicks the start wave button
 */
    game.waveStarted = false;
    game.lastTime = performance.now();
    
    // Show start wave button after a brief delay
    setTimeout(() => {
        document.getElementById('startWaveBtn').style.display = 'block';
    }, 500);
/**
 * Skip to the next wave immediately if current wave is cleared
 */
    
    gameLoop();
}

function manualStartWave() {
    if (!game.gameRunning || game.waveInProgress) return;
    
    document.getElementById('startWaveBtn').style.display = 'none';
    game.waveStarted = true;
    game.waveDelayTimer = game.waveDelay;
/**
 * Restart the game from wave 1 with reset state
 */
    document.getElementById('waveTimer').style.display = 'flex';
    startWave();
}

function skipToNextWave() {
    if (!game.gameRunning || !game.waveStarted) return;
    
    // Only allow skip if current wave is cleared
    if (game.attacks.length === 0 && !game.waveInProgress) {
        game.waveDelayTimer = 0; // Set timer to 0 to trigger next wave immediately
    }
}

function restartGame() {
    // Reset game state
    game.wave = 1;
    game.budget = 200;
    game.health = 100;
/**
 * Start a new wave - reset attack spawning and grant budget
 */
    game.score = 0;
    game.defenses = [];
    game.attacks = [];
    game.particles = [];
    game.selectedDefense = null;
    game.waveInProgress = false;
    game.waveStarted = false;
    game.showingWaveTimer = false;
    
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('startWaveBtn').style.display = 'none';
    document.getElementById('waveTimer').style.display = 'none';
    document.getElementById('skipWaveBtn').style.display = 'none';
    startGame();
}
/**
 * Spawn a single attack from the attack queue
 */

function startWave() {
    game.waveInProgress = true;
    game.attacksToSpawn = 5 + game.wave * 3;
    game.spawnTimer = 0;
    
    // Give budget at start of wave
    game.budget += 50 + game.wave * 10;
    
    // Reset wave timer for next wave
    game.waveDelayTimer = game.waveDelay;
    
    updateUI();
}

function spawnAttack() {
    if (game.attacksToSpawn <= 0) {
        game.waveInProgress = false;
        return;
    }
    
    // Select attack type based on wave
    let type = 'ddos';
    const rand = Math.random();
    if (game.wave >= 3 && rand < 0.3) type = 'malware';
    if (game.wave >= 5 && rand < 0.5) type = 'exploit';
    if (game.wave >= 8 && rand < 0.7) type = 'ransomware';
    
    const attackType = ATTACK_TYPES[type];
    const pathIndex = 0;
    const pos = game.path[pathIndex];
    
    game.attacks.push({
        type,
/**
 * Main game loop - updates game state and renders each frame
 * @param {number} timestamp - Current timestamp from requestAnimationFrame
 */
        health: attackType.health,
        maxHealth: attackType.health,
        speed: attackType.speed,
        reward: attackType.reward,
        color: attackType.color,
        size: attackType.size,
        pathIndex: 0,
        x: pos.x * game.gridSize + game.gridSize / 2,
        y: pos.y * game.gridSize + game.gridSize / 2,
        slowFactor: 1
    });
/**
 * Update all game objects and logic
 * @param {number} deltaTime - Time elapsed since last frame in milliseconds
 */
    
    game.attacksToSpawn--;
}

function gameLoop(timestamp) {
    if (!game.gameRunning) return;
    
    const deltaTime = timestamp - game.lastTime;
    game.lastTime = timestamp;
    
    // Cap deltaTime to prevent huge jumps when tab loses/regains focus
    const cappedDeltaTime = Math.min(deltaTime, 100);
    
    update(cappedDeltaTime);
    render();
    
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    // Update wave timer (counts down continuously after first wave starts)
    if (game.waveStarted) {
        game.waveDelayTimer -= deltaTime;
        const seconds = Math.ceil(Math.max(0, game.waveDelayTimer) / 1000);
        document.getElementById('waveTimerValue').textContent = seconds + 's';
        
        // Start next wave when timer reaches 0
        if (game.waveDelayTimer <= 0) {
            game.wave++;
            updateUI();
            startWave();
        }
    }
    
    // Spawn askip button visibility
    const skipBtn = document.getElementById('skipWaveBtn');
    if (game.waveStarted && game.attacks.length === 0 && !game.waveInProgress && game.waveDelayTimer > 1000) {
        skipBtn.style.display = 'block';
    } else {
        skipBtn.style.display = 'none';
    }
    
    // Update ttacks
    if (game.waveInProgress && game.waveStarted) {
        game.spawnTimer += deltaTime;
        if (game.spawnTimer >= 1000) {
            spawnAttack();
            game.spawnTimer = 0;
        }
    }
    
    // Update attacks
    for (let i = game.attacks.length - 1; i >= 0; i--) {
        const attack = game.attacks[i];
        
        // Move along path
        if (attack.pathIndex < game.path.length - 1) {
            const target = game.path[attack.pathIndex + 1];
            const targetX = target.x * game.gridSize + game.gridSize / 2;
            const targetY = target.y * game.gridSize + game.gridSize / 2;
            
            const dx = targetX - attack.x;
            const dy = targetY - attack.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 2) {
                attack.pathIndex++;
            } else {
                const speed = attack.speed * attack.slowFactor * (deltaTime / 16);
                attack.x += (dx / dist) * speed;
                attack.y += (dy / dist) * speed;
            }
            
            attack.slowFactor = Math.min(1, attack.slowFactor + 0.01);
        } else {
            // Attack reached end
            game.health -= 10;
            game.attacks.splice(i, 1);
            updateUI();
            
            if (game.health <= 0) {
                gameOver();
            }
        }
    }
    
    // Update defenses
    for (const defense of game.defenses) {
        defense.lastFire += deltaTime;
        
        if (defense.lastFire >= defense.cooldown) {
            // Find target
            let target = null;
            let minDist = defense.range;
            
            for (const attack of game.attacks) {
                const dx = attack.x - defense.x;
                const dy = attack.y - defense.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < minDist) {
                    minDist = dist;
                    target = attack;
                }
            }
            
            if (target) {
                defense.lastFire = 0;
                target.health -= defense.damage;
                
                // Apply slow effect
                if (defense.slow) {
                    target.slowFactor = defense.slow;
                }
                
                // Create particle
                game.particles.push({
                    x: defense.x,
                    y: defense.y,
                    targetX: target.x,
                    targetY: target.y,
                    color: defense.color,
                    life: 1
                });
                
                // Check if attack destroyed
                if (target.health <= 0) {
                    game.score += target.reward;
/**
 * Render all game elements to the canvas
 */
                    game.budget += target.reward / 2;
                    game.attacks.splice(game.attacks.indexOf(target), 1);
                    updateUI();
                    updateShopUI();
                }
            }
        }
    }
    
    // Update particles
    for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.life -= deltaTime / 200;
        
        if (p.life <= 0) {
            game.particles.splice(i, 1);
        }
    }
}

function render() {
    const ctx = game.ctx;
    
    // Clear
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, game.width, game.height);
    
    // Draw grid
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1;
    for (let x = 0; x < game.cols; x++) {
        for (let y = 0; y < game.rows; y++) {
            ctx.strokeRect(x * game.gridSize, y * game.gridSize, game.gridSize, game.gridSize);
        }
    }
    
    // Draw path
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = game.gridSize * 0.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < game.path.length; i++) {
        const p = game.path[i];
        const x = p.x * game.gridSize + game.gridSize / 2;
        const y = p.y * game.gridSize + game.gridSize / 2;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Draw defenses
    for (const defense of game.defenses) {
        ctx.fillStyle = defense.color;
        ctx.beginPath();
        ctx.arc(defense.x, defense.y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw range (when selected)
        if (game.selectedDefense === defense.type) {
            ctx.strokeStyle = defense.color + '40';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(defense.x, defense.y, defense.range, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    // Draw attacks
    for (const attack of game.attacks) {
        ctx.fillStyle = attack.color;
        ctx.beginPath();
        ctx.arc(attack.x, attack.y, attack.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Health bar
        const barWidth = attack.size * 3;
        const barHeight = 4;
        const healthPercent = attack.health / attack.maxHealth;
        
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(attack.x - barWidth / 2, attack.y - attack.size - 8, barWidth, barHeight);
        
        ctx.fillStyle = healthPercent > 0.5 ? '#48bb78' : healthPercent > 0.25 ? '#ecc94b' : '#f56565';
        ctx.fillRect(attack.x - barWidth / 2, attack.y - attack.size - 8, barWidth * healthPercent, barHeight);
    }
    
    // Draw particles
    for (const p of game.particles) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = p.life;
/**
 * Update the UI display with current game stats
 */
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.targetX, p.targetY);
        ctx.stroke();
/**
 * End the game and show the game over screen with final stats
 */
    }
    ctx.globalAlpha = 1;
    
    // Draw selected defense preview
    if (game.selectedDefense && game.gameRunning) {
        const defenseType = DEFENSE_TYPES[game.selectedDefense];
        ctx.fillStyle = defenseType.color + '60';
        ctx.strokeStyle = defenseType.color;
        ctx.lineWidth = 2;
        
        // Show on hover
        const rect = game.canvas.getBoundingClientRect();
        // This would need mouse tracking, simplified for now
    }
}

function updateUI() {
    document.getElementById('waveValue').textContent = game.wave;
    document.getElementById('budgetValue').textContent = '$' + game.budget;
/**
 * Save high scores and statistics to localStorage
 */
    document.getElementById('healthValue').textContent = game.health + '%';
    document.getElementById('scoreValue').textContent = game.score;
}

function gameOver() {
    game.gameRunning = false;
    
    document.getElementById('finalWave').textContent = game.wave;
    document.getElementById('finalScore').textContent = game.score;
    document.getElementById('finalDefenses').textContent = game.defenses.length;
    
    let rating = 'Beginner';
    if (game.wave >= 5) rating = 'Defender';
    if (game.wave >= 10) rating = 'Guardian';
    if (game.wave >= 15) rating = 'Master';
    if (game.wave >= 20) rating = 'Legend';
    
    document.getElementById('finalRating').textContent = rating;
    document.getElementById('gameOverScreen').classList.remove('hidden');
    
    saveGame();
}

function saveGame() {
    try {
/**
 * Load saved game data from localStorage
 */
        const save = {
            highScore: game.score,
            highWave: game.wave,
            timestamp: Date.now()
        };
        
        const existing = localStorage.getItem('firewallDefense');
        if (existing) {
            const data = JSON.parse(existing);
            if (data.highScore > save.highScore) {
                save.highScore = data.highScore;
            }
            if (data.highWave > save.highWave) {
                save.highWave = data.highWave;
            }
        }
        
        localStorage.setItem('firewallDefense', JSON.stringify(save));
    } catch (e) {
        console.error('Save failed');
    }
}

function loadGame() {
    try {
        const save = localStorage.getItem('firewallDefense');
        if (save) {
            const data = JSON.parse(save);
            // Could show high scores on start screen
        }
    } catch (e) {
        console.error('Load failed');
    }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', init);
