/**
 * @fileoverview Crypto Exchange - Trading and mining simulation with dynamic price movements
 * @author Naxish
 */

/**
 * Main game state object
 * @type {Object}
 */
const gameState = {
  cash: 10000,
  startingCash: 10000,
  portfolio: {}, // { cryptoId: amount }
  miningRigs: {}, // { rigId: count }
  lastUpdate: Date.now(),
};

/**
 * Array of available cryptocurrencies with their properties
 * @type {Array<Object>}
 * @const
 */
const cryptos = [
  {
    id: "nax",
    name: "NaxCoin",
    symbol: "NAX",
    icon: "NAX",
    basePrice: 50000,
    volatility: 0.03,
    currentPrice: 50000,
    priceHistory: [50000],
    change: 0,
  },
  {
    id: "net",
    name: "NetherToken",
    symbol: "NET",
    icon: "NET",
    basePrice: 3000,
    volatility: 0.04,
    currentPrice: 3000,
    priceHistory: [3000],
    change: 0,
  },
  {
    id: "pkt",
    name: "PacketChain",
    symbol: "PKT",
    icon: "PKT",
    basePrice: 150,
    volatility: 0.06,
    currentPrice: 150,
    priceHistory: [150],
    change: 0,
  },
  {
    id: "rtr",
    name: "RouterLink",
    symbol: "RTR",
    icon: "RTR",
    basePrice: 25,
    volatility: 0.05,
    currentPrice: 25,
    priceHistory: [25],
    change: 0,
  },
  {
    id: "fsh",
    name: "FlashCoin",
    symbol: "FSH",
    icon: "FSH",
    basePrice: 5,
    volatility: 0.08,
    currentPrice: 5,
    priceHistory: [5],
    change: 0,
  },
];

/**
 * Available mining rigs for passive income generation
 * @type {Array<Object>}
 * @const
 */
const miningRigs = [
  {
    id: "basic",
    name: "Basic Miner",
    desc: "Generates $10/sec",
    baseCost: 5000,
    production: 10,
  },
  {
    id: "advanced",
    name: "Advanced Rig",
    desc: "Generates $50/sec",
    baseCost: 25000,
    production: 50,
  },
  {
    id: "quantum",
    name: "Quantum Miner",
    desc: "Generates $200/sec",
    baseCost: 100000,
    production: 200,
  },
];

/**
 * Game achievements to unlock
 * @type {Array<Object>}
 * @const
 */
const achievements = [
  { id: "first_trade", name: "First Trade", desc: "Complete your first trade", unlocked: false },
  { id: "portfolio_10k", name: "10K Portfolio", desc: "Reach $10,000 portfolio value", unlocked: false },
  { id: "portfolio_100k", name: "100K Portfolio", desc: "Reach $100,000 portfolio value", unlocked: false },
  { id: "millionaire", name: "Millionaire", desc: "Reach $1,000,000 net worth", unlocked: false },
  { id: "first_miner", name: "Mining Begins", desc: "Buy your first mining rig", unlocked: false },
  { id: "profit_50k", name: "Profit Master", desc: "Earn $50,000 profit", unlocked: false },
];

/**
 * Random market news events that affect cryptocurrency prices
 * @type {Array<Object>}
 * @const
 */
const newsEvents = [
  { text: "BULL RUN! All cryptos surge 15%!", effect: 0.15 },
  { text: "Market Crash! Cryptos drop 20%!", effect: -0.20 },
  { text: "FlashCoin network upgrade! FSH +30%!", crypto: "fsh", effect: 0.30 },
  { text: "RouterLink partnership announced! RTR +25%!", crypto: "rtr", effect: 0.25 },
  { text: "Major institution adopts NaxCoin! NAX +20%!", crypto: "nax", effect: 0.20 },
  { text: "Regulatory concerns! All cryptos down 10%!", effect: -0.10 },
  { text: "PacketChain mainnet launch! PKT +35%!", crypto: "pkt", effect: 0.35 },
  { text: "NetherToken DeFi boom! NET +28%!", crypto: "net", effect: 0.28 },
];

const elements = {
  startScreen: document.getElementById("startScreen"),
  gameUI: document.getElementById("gameUI"),
  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),
  cash: document.getElementById("cash"),
  portfolioValue: document.getElementById("portfolioValue"),
  netWorth: document.getElementById("netWorth"),
  profitLoss: document.getElementById("profitLoss"),
  newsBanner: document.getElementById("newsBanner"),
  cryptoList: document.getElementById("cryptoList"),
  portfolioList: document.getElementById("portfolioList"),
  miningList: document.getElementById("miningList"),
  achievementsList: document.getElementById("achievementsList"),
  tradeModal: document.getElementById("tradeModal"),
  modalTitle: document.getElementById("modalTitle"),
  modalPrice: document.getElementById("modalPrice"),
  modalBalance: document.getElementById("modalBalance"),
  tradeAmount: document.getElementById("tradeAmount"),
  buyBtn: document.getElementById("buyBtn"),
  sellBtn: document.getElementById("sellBtn"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  tradeError: document.getElementById("tradeError"),
};

let selectedCrypto = null;
let priceUpdateInterval = null;
let miningInterval = null;
let newsInterval = null;

/**
 * Initialize game event listeners and load saved game
 */
function init() {
  elements.startBtn.addEventListener("click", startGame);
  elements.resetBtn.addEventListener("click", resetGame);
  elements.closeModalBtn.addEventListener("click", closeTradeModal);
  elements.buyBtn.addEventListener("click", () => executeTrade("buy"));
  elements.sellBtn.addEventListener("click", () => executeTrade("sell"));
  
  loadGame();
}

/**
 * Start the game by showing UI and initializing all game systems
 */
function startGame() {
  elements.startScreen.classList.add("hidden");
  elements.gameUI.classList.remove("hidden");
  
  renderCryptos();
  renderPortfolio();
  renderMiningRigs();
  renderAchievements();
  updateDisplay();
  
  startPriceUpdates();
  startMining();
  startNewsEvents();
}

/**
 * Start interval for cryptocurrency price updates with random volatility
 */
function startPriceUpdates() {
  priceUpdateInterval = setInterval(() => {
    cryptos.forEach(crypto => {
      // Random walk price movement
      const change = (Math.random() - 0.5) * 2 * crypto.volatility;
      const newPrice = crypto.currentPrice * (1 + change);
      
      crypto.currentPrice = Math.max(newPrice, crypto.basePrice * 0.1); // Min 10% of base
      crypto.priceHistory.push(crypto.currentPrice);
      
      // Keep only last 100 prices
      if (crypto.priceHistory.length > 100) {
        crypto.priceHistory.shift();
      }
      
      // Calculate 24h change
      if (crypto.priceHistory.length > 1) {
        const firstPrice = crypto.priceHistory[0];
        crypto.change = ((crypto.currentPrice - firstPrice) / firstPrice) * 100;
      }
    });
    
    renderCryptos();
    renderPortfolio();
    updateDisplay();
  }, 2000); // Update every 2 seconds
}

/**
 * Start interval for mining rig passive income generation
 */
function startMining() {
  miningInterval = setInterval(() => {
    const elapsed = (Date.now() - gameState.lastUpdate) / 1000;
    gameState.lastUpdate = Date.now();
    
    let totalIncome = 0;
    Object.keys(gameState.miningRigs).forEach(rigId => {
      const rig = miningRigs.find(r => r.id === rigId);
      if (rig) {
        totalIncome += rig.production * gameState.miningRigs[rigId] * elapsed;
      }
    });
    
    if (totalIncome > 0) {
      gameState.cash += totalIncome;
      updateDisplay();
      saveGame();
    }
  }, 1000); // Update every second
}

function startNewsEvents() {
  const triggerNews = () => {
    if (Math.random() < 0.3) { // 30% chance every interval
      const event = newsEvents[Math.floor(Math.random() * newsEvents.length)];
      showNews(event);
      applyNewsEffect(event);
    }
    
    // Schedule next news check (30-60 seconds)
    setTimeout(triggerNews, (30 + Math.random() * 30) * 1000);
  };
  
  // Start first news after 20 seconds
  setTimeout(triggerNews, 20000);
}

function showNews(event) {
  elements.newsBanner.textContent = event.text;
  elements.newsBanner.classList.add("active");
  
  setTimeout(() => {
    elements.newsBanner.classList.remove("active");
  }, 5000);
}

/**
 * Apply news event effects to cryptocurrency prices
 * @param {Object} event - News event with effect and optional crypto target
 */
function applyNewsEffect(event) {
  if (event.crypto) {
    // Affect specific crypto
    const crypto = cryptos.find(c => c.id === event.crypto);
    if (crypto) {
      crypto.currentPrice *= (1 + event.effect);
    }
  } else {
    // Affect all cryptos
    cryptos.forEach(crypto => {
      crypto.currentPrice *= (1 + event.effect);
    });
  }
  
  renderCryptos();
}

/**
 * Render the cryptocurrency market table with current prices and trends
 */
function renderCryptos() {
  elements.cryptoList.innerHTML = cryptos.map(crypto => {
    const changeClass = crypto.change >= 0 ? "positive" : "negative";
    const changeText = crypto.change >= 0 ? "UP" : "DOWN";
    
    return `
      <div class="crypto-card">
        <div class="crypto-icon">${crypto.icon}</div>
        <div class="crypto-info-card">
          <div class="crypto-name">${crypto.name}</div>
          <div class="crypto-symbol">${crypto.symbol}</div>
          <div class="crypto-price">$${formatNumber(crypto.currentPrice)}</div>
          <div class="crypto-change ${changeClass}">
            ${changeText} ${crypto.change >= 0 ? '+' : ''}${crypto.change.toFixed(2)}%
          </div>
        </div>
        <div class="crypto-actions">
          <button class="btn btn-success" onclick="openTradeModal('${crypto.id}')">Trade</button>
        </div>
      </div>
    `;
  }).join("");
}

function renderPortfolio() {
  const holdings = Object.keys(gameState.portfolio).filter(id => gameState.portfolio[id] > 0);
  
  if (holdings.length === 0) {
    elements.portfolioList.innerHTML = '<div style="opacity: 0.5; text-align: center;">No holdings</div>';
    return;
  }
  
  elements.portfolioList.innerHTML = holdings.map(cryptoId => {
    const crypto = cryptos.find(c => c.id === cryptoId);
    const amount = gameState.portfolio[cryptoId];
    const value = amount * crypto.currentPrice;
    
    return `
      <div class="portfolio-item">
        <div class="portfolio-item-info">
          <div class="portfolio-crypto-name">${crypto.icon} ${crypto.symbol}</div>
          <div class="portfolio-amount">${formatNumber(amount)} coins</div>
        </div>
        <div class="portfolio-value">$${formatNumber(value)}</div>
      </div>
    `;
  }).join("");
}

function renderMiningRigs() {
  elements.miningList.innerHTML = miningRigs.map(rig => {
    const count = gameState.miningRigs[rig.id] || 0;
    const cost = Math.floor(rig.baseCost * Math.pow(1.15, count));
    
    return `
      <div class="mining-item">
        <div class="mining-item-header">
          <div class="mining-name">${rig.name}</div>
          <div class="mining-count">×${count}</div>
        </div>
        <div class="mining-desc">${rig.desc}</div>
        <button class="btn btn-primary" onclick="buyMiningRig('${rig.id}')" 
                ${gameState.cash < cost ? 'disabled' : ''}>
          Buy for $${formatNumber(cost)}
        </button>
      </div>
    `;
  }).join("");
}

function renderAchievements() {
  elements.achievementsList.innerHTML = achievements.map(ach => {
    const lockedClass = ach.unlocked ? "" : "locked";
    return `
      <div class="achievement-item ${lockedClass}">
        <div class="achievement-status">${ach.unlocked ? "Unlocked" : "Locked"}</div>
        <div class="achievement-info">
          <div class="achievement-name">${ach.name}</div>
          <div class="achievement-desc">${ach.desc}</div>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * Open trading modal for a specific cryptocurrency
 * @param {string} cryptoId - ID of the cryptocurrency to trade
 */
function openTradeModal(cryptoId) {
  selectedCrypto = cryptos.find(c => c.id === cryptoId);
  elements.modalTitle.textContent = `Trade ${selectedCrypto.name}`;
  elements.modalPrice.textContent = `$${formatNumber(selectedCrypto.currentPrice)}`;
  
  const holdings = gameState.portfolio[cryptoId] || 0;
  elements.modalBalance.textContent = `${formatNumber(holdings)} ${selectedCrypto.symbol}`;
  
  elements.tradeAmount.value = "";
  elements.tradeError.textContent = "";
  elements.tradeModal.classList.remove("hidden");
}

/**
 * Close the trading modal window
 */
function closeTradeModal() {
  elements.tradeModal.classList.add("hidden");
  selectedCrypto = null;
}

/**
 * Execute a buy or sell trade for the selected cryptocurrency
 * @param {string} action - Either 'buy' or 'sell'
 */
function executeTrade(action) {
  const amount = parseFloat(elements.tradeAmount.value);
  
  if (!amount || amount <= 0) {
    elements.tradeError.textContent = "Enter a valid amount";
    return;
  }
  
  const totalCost = amount * selectedCrypto.currentPrice;
  
  if (action === "buy") {
    if (gameState.cash < totalCost) {
      elements.tradeError.textContent = "Insufficient funds";
      return;
    }
    
    gameState.cash -= totalCost;
    gameState.portfolio[selectedCrypto.id] = (gameState.portfolio[selectedCrypto.id] || 0) + amount;
    
    // First trade achievement
    const firstTrade = achievements.find(a => a.id === "first_trade");
    if (!firstTrade.unlocked) {
      unlockAchievement("first_trade");
    }
  } else {
    const holdings = gameState.portfolio[selectedCrypto.id] || 0;
    if (holdings < amount) {
      elements.tradeError.textContent = "Insufficient holdings";
      return;
    }
    
    gameState.cash += totalCost;
    gameState.portfolio[selectedCrypto.id] -= amount;
  }
  
  updateDisplay();
  renderPortfolio();
  renderMiningRigs();
  checkAchievements();
  saveGame();
  
  closeTradeModal();
}

/**
 * Purchase a mining rig for passive income generation
 * @param {string} rigId - ID of the mining rig to purchase
 */
function buyMiningRig(rigId) {
  const rig = miningRigs.find(r => r.id === rigId);
  const count = gameState.miningRigs[rigId] || 0;
  const cost = Math.floor(rig.baseCost * Math.pow(1.15, count));
  
  if (gameState.cash >= cost) {
    gameState.cash -= cost;
    gameState.miningRigs[rigId] = count + 1;
    
    // First miner achievement
    const firstMiner = achievements.find(a => a.id === "first_miner");
    if (!firstMiner.unlocked) {
      unlockAchievement("first_miner");
    }
    
    updateDisplay();
    renderMiningRigs();
    checkAchievements();
    saveGame();
  }
}

/**
 * Calculate total value of all cryptocurrency holdings
 * @returns {number} Total portfolio value in dollars
 */
function calculatePortfolioValue() {
  let total = 0;
  Object.keys(gameState.portfolio).forEach(cryptoId => {
    const crypto = cryptos.find(c => c.id === cryptoId);
    if (crypto) {
      total += gameState.portfolio[cryptoId] * crypto.currentPrice;
    }
  });
  return total;
}

function updateDisplay() {
  elements.cash.textContent = `$${formatNumber(gameState.cash)}`;
  
  const portfolioValue = calculatePortfolioValue();
  elements.portfolioValue.textContent = `$${formatNumber(portfolioValue)}`;
  
  const netWorth = gameState.cash + portfolioValue;
  elements.netWorth.textContent = `$${formatNumber(netWorth)}`;
  
  const profitLoss = netWorth - gameState.startingCash;
  elements.profitLoss.textContent = `${profitLoss >= 0 ? '+' : ''}$${formatNumber(profitLoss)}`;
  elements.profitLoss.style.color = profitLoss >= 0 ? '#10b981' : '#ef4444';
}

function checkAchievements() {
  const portfolioValue = calculatePortfolioValue();
  const netWorth = gameState.cash + portfolioValue;
  const profitLoss = netWorth - gameState.startingCash;
  
  if (portfolioValue >= 10000) unlockAchievement("portfolio_10k");
  if (portfolioValue >= 100000) unlockAchievement("portfolio_100k");
  if (netWorth >= 1000000) unlockAchievement("millionaire");
  if (profitLoss >= 50000) unlockAchievement("profit_50k");
}

function unlockAchievement(id) {
  const achievement = achievements.find(a => a.id === id);
  if (achievement && !achievement.unlocked) {
    achievement.unlocked = true;
    renderAchievements();
    showNotification(`${achievement.name} unlocked!`);
  }
}

function showNotification(message) {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    z-index: 3000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/**
 * Format numbers with K/M suffixes for display
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + "K";
  }
  return num.toFixed(2);
}

/**
 * Save current game state to localStorage
 */
function saveGame() {
  const saveData = {
    cash: gameState.cash,
    startingCash: gameState.startingCash,
    portfolio: gameState.portfolio,
    miningRigs: gameState.miningRigs,
    lastUpdate: gameState.lastUpdate,
    achievements: achievements.filter(a => a.unlocked).map(a => a.id),
  };
  localStorage.setItem("cryptoExchangeSave", JSON.stringify(saveData));
}

/**
 * Load saved game state from localStorage
 */
function loadGame() {
  const saved = localStorage.getItem("cryptoExchangeSave");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data && typeof data === 'object') {
        gameState.cash = data.cash || 10000;
        gameState.startingCash = data.startingCash || 10000;
        gameState.portfolio = data.portfolio || {};
        gameState.miningRigs = data.miningRigs || {};
        gameState.lastUpdate = data.lastUpdate || Date.now();
        
        if (Array.isArray(data.achievements)) {
          data.achievements.forEach(id => {
            const ach = achievements.find(a => a.id === id);
            if (ach) ach.unlocked = true;
          });
        }
      }
    } catch (e) {
      console.error('Failed to load save:', e);
    }
  }
}

/**
 * Reset game to initial state and clear all progress
 */
function resetGame() {
  if (confirm("Are you sure? This will reset all your progress!")) {
    localStorage.removeItem("cryptoExchangeSave");
    
    // Clear intervals
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    if (miningInterval) clearInterval(miningInterval);
    
    // Reload page
    location.reload();
  }
}

init();
