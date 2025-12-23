/**
 * @fileoverview Packet Inspector - Fast-paced clicking game to identify malicious network packets
 * @author Naxish
 */

/**
 * Canvas and rendering context
 */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 450;

/**
 * Main game state object
 * @type {Object}
 */
const gameState = {
  isRunning: false,
  score: 0,
  combo: 1,
  maxCombo: 1,
  lives: 3,
  timeLeft: 60,
  totalClicks: 0,
  correctClicks: 0,
  packets: [],
  spawnTimer: 0,
  spawnInterval: 60,
};

// Packet types with attack patterns
const packetTypes = {
  malicious: [
    { name: "SQL Injection", color: "#e53e3e", speed: 2 },
    { name: "XSS Attack", color: "#c53030", speed: 2.5 },
    { name: "DDoS Packet", color: "#9b2c2c", speed: 3 },
    { name: "Malware", color: "#742a2a", speed: 1.8 },
  ],
  legitimate: [
    { name: "HTTP Request", color: "#48bb78", speed: 2 },
    { name: "DNS Query", color: "#38a169", speed: 2.5 },
    { name: "SSH Session", color: "#2f855a", speed: 3 },
    { name: "Email", color: "#276749", speed: 1.8 },
  ],
};

// DOM Elements
const elements = {
  score: document.getElementById("score"),
  combo: document.getElementById("combo"),
  timer: document.getElementById("timer"),
  lives: document.getElementById("lives"),
  startScreen: document.getElementById("startScreen"),
  gameOverScreen: document.getElementById("gameOverScreen"),
  startBtn: document.getElementById("startBtn"),
  restartBtn: document.getElementById("restartBtn"),
  finalScore: document.getElementById("finalScore"),
  maxCombo: document.getElementById("maxCombo"),
  accuracy: document.getElementById("accuracy"),
  resultTitle: document.getElementById("resultTitle"),
};

// Initialize
function init() {
  elements.startBtn.addEventListener("click", startGame);
  elements.restartBtn.addEventListener("click", restartGame);
  canvas.addEventListener("click", handleClick);
}

// Start Game
function startGame() {
  resetGameState();
  gameState.isRunning = true;
  elements.startScreen.classList.add("hidden");
  startTimer();
  gameLoop();
}

// Restart Game
function restartGame() {
  resetGameState();
  gameState.isRunning = true;
  elements.gameOverScreen.classList.add("hidden");
  startTimer();
  gameLoop();
}

// Reset State
function resetGameState() {
  gameState.score = 0;
  gameState.combo = 1;
  gameState.maxCombo = 1;
  gameState.lives = 3;
  gameState.timeLeft = 60;
  gameState.totalClicks = 0;
  gameState.correctClicks = 0;
  gameState.packets = [];
  gameState.spawnTimer = 0;
  updateUI();
}

// Timer
function startTimer() {
  const timerInterval = setInterval(() => {
    if (!gameState.isRunning) {
      clearInterval(timerInterval);
      return;
    }

    gameState.timeLeft--;
    elements.timer.textContent = gameState.timeLeft;

    if (gameState.timeLeft <= 0) {
      clearInterval(timerInterval);
      gameOver(true);
    }
  }, 1000);
}

// Spawn Packet
function spawnPacket() {
  const isMalicious = Math.random() < 0.4; // 40% malicious
  const types = isMalicious ? packetTypes.malicious : packetTypes.legitimate;
  const type = types[Math.floor(Math.random() * types.length)];

  const packet = {
    x: canvas.width,
    y: Math.random() * (canvas.height - 60) + 30,
    size: 30,
    isMalicious: isMalicious,
    type: type.name,
    color: type.color,
    speed: type.speed + Math.random() * 0.5,
    clicked: false,
  };

  gameState.packets.push(packet);
}

// Update Packets
function updatePackets() {
  gameState.spawnTimer++;

  // Spawn new packet
  if (gameState.spawnTimer >= gameState.spawnInterval) {
    spawnPacket();
    gameState.spawnTimer = 0;

    // Increase difficulty
    if (gameState.spawnInterval > 30) {
      gameState.spawnInterval -= 0.5;
    }
  }

  // Move packets
  for (let i = gameState.packets.length - 1; i >= 0; i--) {
    const packet = gameState.packets[i];
    packet.x -= packet.speed;

    // Remove off-screen packets
    if (packet.x + packet.size < 0) {
      if (packet.isMalicious && !packet.clicked) {
        loseLife();
      }
      gameState.packets.splice(i, 1);
    }
  }
}

// Handle Click
function handleClick(e) {
  if (!gameState.isRunning) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  gameState.totalClicks++;
  let hit = false;

  for (let i = gameState.packets.length - 1; i >= 0; i--) {
    const packet = gameState.packets[i];

    // Expanded hitbox for better click detection (especially for fast packets)
    const hitboxPadding = 10;
    const hitboxX = packet.x - hitboxPadding;
    const hitboxY = packet.y - hitboxPadding;
    const hitboxSize = packet.size + (hitboxPadding * 2);

    if (
      clickX >= hitboxX &&
      clickX <= hitboxX + hitboxSize &&
      clickY >= hitboxY &&
      clickY <= hitboxY + hitboxSize &&
      !packet.clicked
    ) {
      hit = true;
      packet.clicked = true;

      if (packet.isMalicious) {
        // Correct click
        gameState.score += 10 * gameState.combo;
        gameState.combo++;
        if (gameState.combo > gameState.maxCombo) {
          gameState.maxCombo = gameState.combo;
        }
        gameState.correctClicks++;
        gameState.packets.splice(i, 1);
      } else {
        // Wrong click
        gameState.combo = 1;
        loseLife();
        gameState.packets.splice(i, 1);
      }
      break;
    }
  }

  // Missed click resets combo
  if (!hit) {
    gameState.combo = 1;
  }

  updateUI();
}

// Lose Life
function loseLife() {
  gameState.lives--;
  gameState.combo = 1;

  if (gameState.lives <= 0) {
    gameOver(false);
  }

  updateUI();
}

// Update UI
function updateUI() {
  elements.score.textContent = gameState.score;
  elements.combo.textContent = "x" + gameState.combo;
  elements.lives.textContent = gameState.lives;

  // Combo color
  if (gameState.combo >= 10) {
    elements.combo.style.color = "#dd6b20";
  } else if (gameState.combo >= 5) {
    elements.combo.style.color = "#f6ad55";
  } else {
    elements.combo.style.color = "#fbd38d";
  }
}

// Draw
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw packets
  for (const packet of gameState.packets) {
    if (packet.clicked) continue;

    // Draw packet box
    ctx.fillStyle = packet.color;
    ctx.fillRect(packet.x, packet.y, packet.size, packet.size);

    // Draw border
    ctx.strokeStyle = packet.isMalicious ? "#fff" : "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(packet.x, packet.y, packet.size, packet.size);

    // Draw icon
    ctx.fillStyle = "white";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      packet.isMalicious ? "BAD" : "OK",
      packet.x + packet.size / 2,
      packet.y + packet.size / 2
    );
  }
}

// Game Loop
function gameLoop() {
  if (!gameState.isRunning) return;

  updatePackets();
  draw();

  requestAnimationFrame(gameLoop);
}

// Game Over
function gameOver(timeUp) {
  gameState.isRunning = false;

  elements.finalScore.textContent = gameState.score;
  elements.maxCombo.textContent = "x" + gameState.maxCombo;

  const accuracy =
    gameState.totalClicks > 0
      ? Math.round((gameState.correctClicks / gameState.totalClicks) * 100)
      : 0;
  elements.accuracy.textContent = accuracy + "%";

  if (timeUp) {
    elements.resultTitle.textContent = "Time's Up!";
  } else {
    elements.resultTitle.textContent = "Out of Lives!";
  }

  elements.gameOverScreen.classList.remove("hidden");
}

// Start
init();
