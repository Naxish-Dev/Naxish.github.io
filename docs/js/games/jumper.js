/**
 * @fileoverview Packet Runner - Endless side-scrolling jump game with physics and difficulty scaling
 * @author Naxish
 * Features: Physics-based jumping, progressive difficulty, local leaderboard
 */

/**
 * Canvas and rendering context
 */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Set canvas size
canvas.width = 800;
canvas.height = 400;

/**
 * Main game state object
 * @type {Object}
 */
const gameState = {
  isRunning: false,
  isPaused: false,
  score: 0,
  highScore: 0,
  gameSpeed: 5,
  gravity: 0.8,
  jumpStrength: -15,
  obstacleSpawnTimer: 0,
  obstacleSpawnInterval: 100,
  difficultyIncreaseTimer: 0,
};

// Player
const player = {
  x: 100,
  y: 0,
  width: 40,
  height: 40,
  velocityY: 0,
  isJumping: false,
  color: "#667eea",
};

// Ground
const ground = {
  y: canvas.height - 50,
  height: 50,
  color: "#2d3748",
};

// Obstacles
const obstacles = [];

// DOM Elements
const elements = {
  score: document.getElementById("score"),
  highScore: document.getElementById("highScore"),
  startScreen: document.getElementById("startScreen"),
  pauseScreen: document.getElementById("pauseScreen"),
  gameOverScreen: document.getElementById("gameOverScreen"),
  leaderboardScreen: document.getElementById("leaderboardScreen"),
  startBtn: document.getElementById("startBtn"),
  resumeBtn: document.getElementById("resumeBtn"),
  restartBtn: document.getElementById("restartBtn"),
  restartFromPause: document.getElementById("restartFromPause"),
  viewLeaderboard: document.getElementById("viewLeaderboard"),
  closeLeaderboard: document.getElementById("closeLeaderboard"),
  finalScore: document.getElementById("finalScore"),
  newRecord: document.getElementById("newRecord"),
  leaderboardList: document.getElementById("leaderboardList"),
};

// Initialize
function init() {
  loadHighScore();
  updateScoreDisplay();
  setupEventListeners();
  player.y = ground.y - player.height;
}

// Event Listeners
function setupEventListeners() {
  // Start/Restart
  elements.startBtn.addEventListener("click", startGame);
  elements.restartBtn.addEventListener("click", restartGame);
  elements.restartFromPause.addEventListener("click", restartGame);

  // Pause/Resume
  elements.resumeBtn.addEventListener("click", resumeGame);

  // Leaderboard
  elements.viewLeaderboard.addEventListener("click", showLeaderboard);
  elements.closeLeaderboard.addEventListener("click", hideLeaderboard);

  // Jump controls
  canvas.addEventListener("click", jump);
  document.addEventListener("keydown", handleKeyPress);
}

// Handle Key Press
function handleKeyPress(e) {
  if (e.code === "Space" && gameState.isRunning && !gameState.isPaused) {
    e.preventDefault();
    jump();
  }
  if (e.code === "KeyP" && gameState.isRunning) {
    e.preventDefault();
    togglePause();
  }
}

// Start Game
function startGame() {
  resetGameState();
  gameState.isRunning = true;
  elements.startScreen.classList.add("hidden");
  gameLoop();
}

// Restart Game
function restartGame() {
  resetGameState();
  gameState.isRunning = true;
  elements.gameOverScreen.classList.add("hidden");
  elements.pauseScreen.classList.add("hidden");
  gameLoop();
}

// Reset Game State
function resetGameState() {
  gameState.score = 0;
  gameState.gameSpeed = 5;
  gameState.obstacleSpawnTimer = 0;
  gameState.obstacleSpawnInterval = 100;
  gameState.difficultyIncreaseTimer = 0;
  gameState.isPaused = false;
  obstacles.length = 0;
  player.y = ground.y - player.height;
  player.velocityY = 0;
  player.isJumping = false;
  updateScoreDisplay();
}

// Pause/Resume
function togglePause() {
  if (!gameState.isRunning) return;
  
  gameState.isPaused = !gameState.isPaused;
  
  if (gameState.isPaused) {
    elements.pauseScreen.classList.remove("hidden");
  } else {
    elements.pauseScreen.classList.add("hidden");
    gameLoop();
  }
}

function resumeGame() {
  gameState.isPaused = false;
  elements.pauseScreen.classList.add("hidden");
  gameLoop();
}

// Jump
function jump() {
  if (!gameState.isRunning || gameState.isPaused) return;
  
  if (!player.isJumping) {
    player.velocityY = gameState.jumpStrength;
    player.isJumping = true;
  }
}

// Update Player
function updatePlayer() {
  // Apply gravity
  player.velocityY += gameState.gravity;
  player.y += player.velocityY;

  // Ground collision
  if (player.y >= ground.y - player.height) {
    player.y = ground.y - player.height;
    player.velocityY = 0;
    player.isJumping = false;
  }

  // Prevent going above canvas
  if (player.y < 0) {
    player.y = 0;
    player.velocityY = 0;
  }
}

// Spawn Obstacle
function spawnObstacle() {
  const types = ["box", "tall", "wide"];
  const type = types[Math.floor(Math.random() * types.length)];
  
  let obstacle = {
    x: canvas.width,
    color: "#e53e3e",
  };

  switch (type) {
    case "box":
      obstacle.width = 30;
      obstacle.height = 40;
      break;
    case "tall":
      obstacle.width = 25;
      obstacle.height = 60;
      break;
    case "wide":
      obstacle.width = 50;
      obstacle.height = 35;
      break;
  }

  obstacle.y = ground.y - obstacle.height;
  obstacles.push(obstacle);
}

// Update Obstacles
function updateObstacles() {
  // Spawn new obstacles
  gameState.obstacleSpawnTimer++;
  if (gameState.obstacleSpawnTimer >= gameState.obstacleSpawnInterval) {
    spawnObstacle();
    gameState.obstacleSpawnTimer = 0;
  }

  // Move and remove obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].x -= gameState.gameSpeed;

    // Remove off-screen obstacles
    if (obstacles[i].x + obstacles[i].width < 0) {
      obstacles.splice(i, 1);
    }
  }
}

// Check Collisions
function checkCollisions() {
  for (let obstacle of obstacles) {
    if (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + player.height > obstacle.y
    ) {
      gameOver();
      return;
    }
  }
}

// Update Score and Difficulty
function updateScore() {
  gameState.score += 0.1;
  gameState.difficultyIncreaseTimer++;

  // Increase difficulty every 300 frames (~5 seconds at 60fps)
  if (gameState.difficultyIncreaseTimer >= 300) {
    gameState.gameSpeed += 0.3;
    if (gameState.obstacleSpawnInterval > 60) {
      gameState.obstacleSpawnInterval -= 2;
    }
    gameState.difficultyIncreaseTimer = 0;
  }

  updateScoreDisplay();
}

// Update Score Display
function updateScoreDisplay() {
  elements.score.textContent = Math.floor(gameState.score) + "m";
  elements.highScore.textContent = Math.floor(gameState.highScore) + "m";
}

// Draw Everything
function draw() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw ground
  ctx.fillStyle = ground.color;
  ctx.fillRect(0, ground.y, canvas.width, ground.height);

  // Draw player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  
  // Add eyes to player
  ctx.fillStyle = "white";
  ctx.fillRect(player.x + 8, player.y + 10, 8, 8);
  ctx.fillRect(player.x + 24, player.y + 10, 8, 8);
  ctx.fillStyle = "black";
  ctx.fillRect(player.x + 12, player.y + 14, 4, 4);
  ctx.fillRect(player.x + 28, player.y + 14, 4, 4);

  // Draw obstacles
  for (let obstacle of obstacles) {
    ctx.fillStyle = obstacle.color;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  }

  // Draw score on canvas
  ctx.fillStyle = "#333";
  ctx.font = "bold 16px Arial";
  ctx.fillText(`Speed: ${gameState.gameSpeed.toFixed(1)}x`, 10, 30);
}

// Game Loop
function gameLoop() {
  if (!gameState.isRunning || gameState.isPaused) return;

  updatePlayer();
  updateObstacles();
  checkCollisions();
  updateScore();
  draw();

  requestAnimationFrame(gameLoop);
}

// Game Over
function gameOver() {
  gameState.isRunning = false;

  const finalScore = Math.floor(gameState.score);
  elements.finalScore.textContent = finalScore + "m";

  // Check if new high score
  const isNewRecord = saveScore(finalScore);
  
  if (isNewRecord) {
    elements.newRecord.classList.remove("hidden");
    gameState.highScore = finalScore;
    updateScoreDisplay();
  } else {
    elements.newRecord.classList.add("hidden");
  }

  elements.gameOverScreen.classList.remove("hidden");
}

// Leaderboard Functions
function saveScore(score) {
  const leaderboard = getLeaderboard();
  const newEntry = {
    score: score,
    date: new Date().toISOString(),
  };

  leaderboard.push(newEntry);
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard.splice(10); // Keep top 10

  localStorage.setItem("packetRunnerLeaderboard", JSON.stringify(leaderboard));

  return leaderboard[0].score === score;
}

function getLeaderboard() {
  const saved = localStorage.getItem("packetRunnerLeaderboard");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      // Validate it's an array
      if (Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
      localStorage.removeItem("packetRunnerLeaderboard");
    }
  }
  return [];
}

function loadHighScore() {
  const leaderboard = getLeaderboard();
  if (leaderboard.length > 0) {
    gameState.highScore = leaderboard[0].score;
  }
}

function showLeaderboard() {
  const leaderboard = getLeaderboard();
  
  if (leaderboard.length === 0) {
    elements.leaderboardList.innerHTML = '<p class="leaderboard-empty">No scores yet. Play your first game!</p>';
  } else {
    elements.leaderboardList.innerHTML = leaderboard
      .map((entry, index) => {
        const rank = index + 1;
        let rankClass = "";
        let rankEmoji = rank;

        if (rank === 1) {
          rankClass = "gold";
          rankEmoji = "#1";
        } else if (rank === 2) {
          rankClass = "silver";
          rankEmoji = "#2";
        } else if (rank === 3) {
          rankClass = "bronze";
          rankEmoji = "#3";
        }

        const date = new Date(entry.date).toLocaleDateString();

        return `
          <div class="leaderboard-item">
            <span class="leaderboard-rank ${rankClass}">${rankEmoji}</span>
            <span class="leaderboard-score">${entry.score}m</span>
            <span class="leaderboard-date">${date}</span>
          </div>
        `;
      })
      .join("");
  }

  elements.gameOverScreen.classList.add("hidden");
  elements.leaderboardScreen.classList.remove("hidden");
}

function hideLeaderboard() {
  elements.leaderboardScreen.classList.add("hidden");
  elements.gameOverScreen.classList.remove("hidden");
}

// Start
init();
