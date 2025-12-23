/**
 * @fileoverview Packet Collector - Network-themed Idle/Clicker Game with upgrades and automation
 * @author Naxish
 * Saves progress to localStorage
 */

/**
 * Main game state object
 * @type {Object}
 */
const gameState = {
  packets: 0,
  totalPackets: 0,
  clickPower: 1,
  packetsPerSecond: 0,
  upgrades: {
    click1: { level: 0, cost: 10, multiplier: 1.2 },
    click2: { level: 0, cost: 100, multiplier: 1.6 },
    click3: { level: 0, cost: 1000, multiplier: 2 },
  },
  automation: {
    router: { count: 0, cost: 50, production: 1 },
    switch: { count: 0, cost: 500, production: 5 },
    firewall: { count: 0, cost: 5000, production: 25 },
    server: { count: 0, cost: 50000, production: 100 },
  },
  achievements: {},
};

// Upgrade Definitions
const upgrades = [
  {
    id: "click1",
    name: "Better Mouse",
    description: "1.2x click power per level",
    baseCost: 10,
  },
  {
    id: "click2",
    name: "Overclocked NIC",
    description: "1.6x click power per level",
    baseCost: 100,
  },
  {
    id: "click3",
    name: "Quantum Clicks",
    description: "2x click power per level",
    baseCost: 1000,
  },
];

// Automation Definitions
const automationItems = [
  {
    id: "router",
    name: "Router",
    description: "Generates 1 packet/sec",
    baseCost: 50,
    production: 1,
  },
  {
    id: "switch",
    name: "Switch",
    description: "Generates 5 packets/sec",
    baseCost: 500,
    production: 5,
  },
  {
    id: "firewall",
    name: "Firewall",
    description: "Generates 25 packets/sec",
    baseCost: 5000,
    production: 25,
  },
  {
    id: "server",
    name: "Server Rack",
    description: "Generates 100 packets/sec",
    baseCost: 50000,
    production: 100,
  },
];

// Achievement Definitions
const achievements = [
  { id: "first_click", name: "First Packet", desc: "Collect your first packet", target: 1, type: "total" },
  { id: "hundred", name: "Century", desc: "Collect 100 packets", target: 100, type: "total" },
  { id: "thousand", name: "Kilopacket", desc: "Collect 1,000 packets", target: 1000, type: "total" },
  { id: "ten_thousand", name: "Network Admin", desc: "Collect 10,000 packets", target: 10000, type: "total" },
  { id: "hundred_thousand", name: "Data Center", desc: "Collect 100,000 packets", target: 100000, type: "total" },
  { id: "first_router", name: "Auto Pilot", desc: "Buy your first router", target: 1, type: "router" },
  { id: "ten_routers", name: "Network Built", desc: "Own 10 routers", target: 10, type: "router" },
  { id: "first_upgrade", name: "Enhanced", desc: "Buy your first upgrade", target: 1, type: "upgrade" },
];

// DOM Elements
const elements = {
  packets: document.getElementById("packets"),
  packetsPerSec: document.getElementById("packetsPerSec"),
  totalPackets: document.getElementById("totalPackets"),
  clickPower: document.getElementById("clickPower"),
  clickButton: document.getElementById("clickButton"),
  upgradesList: document.getElementById("upgradesList"),
  automationList: document.getElementById("automationList"),
  achievementsList: document.getElementById("achievementsList"),
  themeToggle: document.getElementById("themeToggle"),
  saveBtn: document.getElementById("saveBtn"),
  resetBtn: document.getElementById("resetBtn"),
};

// Initialize Game
function init() {
  loadGame();
  renderUpgrades();
  renderAutomation();
  renderAchievements();
  updateDisplay();
  initializeTheme();

  // Event Listeners
  elements.clickButton.addEventListener("click", handleClick);
  elements.themeToggle.addEventListener("click", toggleTheme);
  elements.saveBtn.addEventListener("click", () => {
    saveGame();
    alert("Game saved!");
  });
  elements.resetBtn.addEventListener("click", resetGame);

  // Game Loop
  setInterval(gameLoop, 1000);
  setInterval(updateDisplay, 100);
  setInterval(saveGame, 30000); // Auto-save every 30 seconds
}

// Handle Click
function handleClick() {
  const power = Math.floor(calculateClickPower()); // Floor when collecting
  gameState.packets += power;
  gameState.totalPackets += power;

  elements.clickButton.classList.add("clicked");
  setTimeout(() => elements.clickButton.classList.remove("clicked"), 200);

  checkAchievements();
}

// Calculate Click Power
function calculateClickPower() {
  let power = gameState.clickPower;
  
  // Apply upgrades multiplicatively
  Object.entries(gameState.upgrades).forEach(([id, upgrade]) => {
    if (upgrade.level > 0) {
      power *= Math.pow(upgrade.multiplier, upgrade.level);
    }
  });
  
  return power; // Return exact value with decimals
}

// Calculate Packets Per Second
function calculatePacketsPerSecond() {
  let total = 0;
  
  Object.entries(gameState.automation).forEach(([id, auto]) => {
    total += auto.count * auto.production;
  });
  
  return total;
}

// Game Loop (runs every second)
function gameLoop() {
  const perSec = calculatePacketsPerSecond();
  gameState.packets += perSec;
  gameState.totalPackets += perSec;
  gameState.packetsPerSecond = perSec;

  checkAchievements();
}

// Update Display
function updateDisplay() {
  elements.packets.textContent = formatNumber(Math.floor(gameState.packets));
  elements.packetsPerSec.textContent = formatNumber(gameState.packetsPerSecond);
  elements.totalPackets.textContent = formatNumber(Math.floor(gameState.totalPackets));
  elements.clickPower.textContent = formatNumber(calculateClickPower());

  updateUpgradeButtons();
  updateAutomationButtons();
}

// Format Large Numbers
function formatNumber(num) {
  if (num < 10) return num.toFixed(2); // Show 2 decimals for small numbers
  if (num < 100) return num.toFixed(1); // Show 1 decimal for medium numbers
  if (num < 1000) return Math.floor(num).toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + "K";
  if (num < 1000000000) return (num / 1000000).toFixed(2) + "M";
  return (num / 1000000000).toFixed(2) + "B";
}

// Render Upgrades
function renderUpgrades() {
  elements.upgradesList.innerHTML = upgrades
    .map((upgrade) => {
      const state = gameState.upgrades[upgrade.id];
      const cost = Math.floor(upgrade.baseCost * Math.pow(1.5, state.level));
      
      // Prevent overflow
      if (!isFinite(cost) || cost < 0) {
        return '';
      }

      return `
        <div class="upgrade-item">
          <div class="upgrade-info">
            <div class="upgrade-name">${upgrade.name} <span style="color: #667eea;">Lv.${state.level}</span></div>
            <div class="upgrade-desc">${upgrade.description}</div>
          </div>
          <button class="upgrade-btn" data-upgrade="${upgrade.id}" data-cost="${cost}">
            ${formatNumber(cost)} packets
          </button>
        </div>
      `;
    })
    .join("");

  // Add event listeners
  document.querySelectorAll(".upgrade-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const upgradeId = e.target.dataset.upgrade;
      const cost = parseInt(e.target.dataset.cost);
      buyUpgrade(upgradeId, cost);
    });
  });
}

// Render Automation
function renderAutomation() {
  elements.automationList.innerHTML = automationItems
    .map((item) => {
      const state = gameState.automation[item.id];
      const cost = Math.floor(item.baseCost * Math.pow(1.15, state.count));
      
      // Prevent overflow
      if (!isFinite(cost) || cost < 0) {
        return '';
      }

      return `
        <div class="automation-item">
          <div class="automation-info">
            <div class="automation-name">${item.name}</div>
            <div class="automation-desc">${item.description}</div>
            <div class="automation-count">Owned: ${state.count}</div>
          </div>
          <button class="automation-btn" data-auto="${item.id}" data-cost="${cost}">
            ${formatNumber(cost)} packets
          </button>
        </div>
      `;
    })
    .join("");

  // Add event listeners
  document.querySelectorAll(".automation-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const autoId = e.target.dataset.auto;
      const cost = parseInt(e.target.dataset.cost);
      buyAutomation(autoId, cost);
    });
  });
}

// Render Achievements
function renderAchievements() {
  elements.achievementsList.innerHTML = achievements
    .map((achievement) => {
      const unlocked = gameState.achievements[achievement.id] || false;
      return `
        <div class="achievement-item ${unlocked ? "unlocked" : ""}">
          <div class="achievement-status">${unlocked ? "Unlocked" : "Locked"}</div>
          <div class="achievement-name">${achievement.name}</div>
          <div class="achievement-desc">${achievement.desc}</div>
        </div>
      `;
    })
    .join("");
}

// Buy Upgrade
function buyUpgrade(upgradeId, cost) {
  if (gameState.packets >= cost) {
    gameState.packets -= cost;
    gameState.upgrades[upgradeId].level++;
    renderUpgrades();
    
    // Check upgrade achievement
    const totalUpgrades = Object.values(gameState.upgrades).reduce((sum, u) => sum + u.level, 0);
    if (totalUpgrades >= 1) unlockAchievement("first_upgrade");
  }
}

// Buy Automation
function buyAutomation(autoId, cost) {
  if (gameState.packets >= cost) {
    gameState.packets -= cost;
    gameState.automation[autoId].count++;
    renderAutomation();
    
    // Check router achievements
    if (autoId === "router") {
      const count = gameState.automation.router.count;
      if (count >= 1) unlockAchievement("first_router");
      if (count >= 10) unlockAchievement("ten_routers");
    }
  }
}

// Update Button States
function updateUpgradeButtons() {
  document.querySelectorAll(".upgrade-btn").forEach((btn) => {
    const cost = parseInt(btn.dataset.cost);
    btn.disabled = gameState.packets < cost;
  });
}

function updateAutomationButtons() {
  document.querySelectorAll(".automation-btn").forEach((btn) => {
    const cost = parseInt(btn.dataset.cost);
    btn.disabled = gameState.packets < cost;
  });
}

// Achievements
function checkAchievements() {
  achievements.forEach((achievement) => {
    if (!gameState.achievements[achievement.id]) {
      let shouldUnlock = false;

      if (achievement.type === "total") {
        shouldUnlock = gameState.totalPackets >= achievement.target;
      } else if (achievement.type === "router") {
        shouldUnlock = gameState.automation.router.count >= achievement.target;
      } else if (achievement.type === "upgrade") {
        const totalUpgrades = Object.values(gameState.upgrades).reduce((sum, u) => sum + u.level, 0);
        shouldUnlock = totalUpgrades >= achievement.target;
      }

      if (shouldUnlock) {
        unlockAchievement(achievement.id);
      }
    }
  });
}

function unlockAchievement(id) {
  if (!gameState.achievements[id]) {
    gameState.achievements[id] = true;
    renderAchievements();
    
    // Show notification
    const achievement = achievements.find((a) => a.id === id);
    if (achievement) {
      showNotification(`Achievement Unlocked: ${achievement.name}!`);
    }
  }
}

function showNotification(message) {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #48bb78;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Save/Load Game
function saveGame() {
  localStorage.setItem("packetCollectorSave", JSON.stringify(gameState));
}

function loadGame() {
  const saved = localStorage.getItem("packetCollectorSave");
  if (saved) {
    try {
      const loadedState = JSON.parse(saved);
      // Validate data structure
      if (loadedState && typeof loadedState === 'object' && 
          typeof loadedState.packets === 'number' &&
          typeof loadedState.totalPackets === 'number') {
        Object.assign(gameState, loadedState);
      } else {
        console.warn('Invalid save data, starting fresh');
        localStorage.removeItem("packetCollectorSave");
      }
    } catch (e) {
      console.error('Failed to load save:', e);
      localStorage.removeItem("packetCollectorSave");
    }
  }
}

function resetGame() {
  if (confirm("Are you sure? This will delete all your progress!")) {
    localStorage.removeItem("packetCollectorSave");
    location.reload();
  }
}

// Theme
function initializeTheme() {
  const savedTheme = localStorage.getItem("packetGameTheme");
  if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.body.classList.add("dark-mode");
    elements.themeToggle.textContent = "Light Mode";
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  elements.themeToggle.textContent = isDark ? "Light Mode" : "Dark Mode";
  localStorage.setItem("packetGameTheme", isDark ? "dark" : "light");
}

// Start Game
init();
