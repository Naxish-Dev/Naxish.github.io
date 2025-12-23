/**
 * @fileoverview Port Scanner - Minesweeper-style network security game with port vulnerabilities
 * @author Naxish
 */

/**
 * Main game state object
 * @type {Object}
 */
const gameState = {
    isRunning: false,
    gridSize: 8,
    totalPorts: 10,
    portsFound: 0,
    scans: 0,
    startTime: null,
    grid: [],
    ports: [],
};

const portInfo = {
    21: { name: "FTP", desc: "File Transfer Protocol - Commonly exploited for anonymous access" },
    22: { name: "SSH", desc: "Secure Shell - Check for weak passwords or outdated versions" },
    80: { name: "HTTP", desc: "Web Server - Look for unpatched vulnerabilities" },
    443: { name: "HTTPS", desc: "Secure Web Server - Verify certificate configuration" },
    3306: { name: "MySQL", desc: "Database Server - Often exposed with default credentials" },
    3389: { name: "RDP", desc: "Remote Desktop - High-value target for attackers" },
    8080: { name: "Web Proxy", desc: "Alternative HTTP - Check for misconfigurations" },
    27017: { name: "MongoDB", desc: "NoSQL Database - Frequently left without authentication" },
};

const difficulties = {
    easy: { gridSize: 8, ports: 10 },
    medium: { gridSize: 10, ports: 15 },
    hard: { gridSize: 12, ports: 20 },
};

const elements = {
    startScreen: document.getElementById("startScreen"),
    gameOverScreen: document.getElementById("gameOverScreen"),
    gameUI: document.getElementById("gameUI"),
    grid: document.getElementById("grid"),
    restartBtn: document.getElementById("restartBtn"),
    timer: document.getElementById("timer"),
    portsFound: document.getElementById("portsFound"),
    totalPorts: document.getElementById("totalPorts"),
    scans: document.getElementById("scans"),
    portDetails: document.getElementById("portDetails"),
    finalTime: document.getElementById("finalTime"),
    finalScans: document.getElementById("finalScans"),
    accuracy: document.getElementById("accuracy"),
    rating: document.getElementById("rating"),
    resultTitle: document.getElementById("resultTitle"),
    resultMessage: document.getElementById("resultMessage"),
};

let timerInterval = null;

function init() {
    const difficultyBtns = document.querySelectorAll(".difficulty-btn");
    difficultyBtns.forEach(btn => {
        btn.addEventListener("click", () => startGame(btn.dataset.level));
    });

    elements.restartBtn.addEventListener("click", restartGame);
}

function startGame(difficulty) {
    const config = difficulties[difficulty];
    gameState.gridSize = config.gridSize;
    gameState.totalPorts = config.ports;
    
    resetGame();
    generateGrid();
    placePorts();
    calculateNumbers();
    renderGrid();
    
    elements.startScreen.classList.add("hidden");
    elements.gameUI.classList.remove("hidden");
    
    gameState.isRunning = true;
    gameState.startTime = Date.now();
    startTimer();
}

function restartGame() {
    elements.gameOverScreen.classList.add("hidden");
    elements.startScreen.classList.remove("hidden");
    elements.gameUI.classList.add("hidden");
}

function resetGame() {
    gameState.portsFound = 0;
    gameState.scans = 0;
    gameState.grid = [];
    gameState.ports = [];
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    updateUI();
}

function generateGrid() {
    for (let row = 0; row < gameState.gridSize; row++) {
        gameState.grid[row] = [];
        for (let col = 0; col < gameState.gridSize; col++) {
            gameState.grid[row][col] = {
                isPort: false,
                isRevealed: false,
                isFlagged: false,
                adjacentPorts: 0,
                row: row,
                col: col,
            };
        }
    }
}

function placePorts() {
    let portsPlaced = 0;
    const portNumbers = Object.keys(portInfo);
    
    while (portsPlaced < gameState.totalPorts) {
        const row = Math.floor(Math.random() * gameState.gridSize);
        const col = Math.floor(Math.random() * gameState.gridSize);
        
        if (!gameState.grid[row][col].isPort) {
            gameState.grid[row][col].isPort = true;
            gameState.grid[row][col].portNumber = portNumbers[portsPlaced % portNumbers.length];
            portsPlaced++;
        }
    }
}

function calculateNumbers() {
    for (let row = 0; row < gameState.gridSize; row++) {
        for (let col = 0; col < gameState.gridSize; col++) {
            if (!gameState.grid[row][col].isPort) {
                gameState.grid[row][col].adjacentPorts = countAdjacentPorts(row, col);
            }
        }
    }
}

function countAdjacentPorts(row, col) {
    let count = 0;
    for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
            if (r >= 0 && r < gameState.gridSize && c >= 0 && c < gameState.gridSize) {
                if (gameState.grid[r][c].isPort) {
                    count++;
                }
            }
        }
    }
    return count;
}

function renderGrid() {
    elements.grid.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;
    elements.grid.innerHTML = "";
    
    for (let row = 0; row < gameState.gridSize; row++) {
        for (let col = 0; col < gameState.gridSize; col++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            cell.addEventListener("click", handleCellClick);
            cell.addEventListener("contextmenu", handleRightClick);
            
            elements.grid.appendChild(cell);
        }
    }
}

function handleCellClick(e) {
    if (!gameState.isRunning) return;
    
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    const cellData = gameState.grid[row][col];
    
    if (cellData.isRevealed || cellData.isFlagged) return;
    
    gameState.scans++;
    updateUI();
    
    if (cellData.isPort) {
        // Clicked on a port - GAME OVER!
        revealPort(row, col, e.target);
        endGame(false);
    } else {
        revealCell(row, col, e.target);
        checkWinCondition();
    }
}

function handleRightClick(e) {
    e.preventDefault();
    if (!gameState.isRunning) return;
    
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    const cellData = gameState.grid[row][col];
    
    if (cellData.isRevealed) return;
    
    cellData.isFlagged = !cellData.isFlagged;
    
    if (cellData.isFlagged) {
        e.target.classList.add("flagged");
        e.target.textContent = "FLAG";
        // Count correctly flagged ports
        if (cellData.isPort) {
            gameState.portsFound++;
            updateUI();
            checkWinCondition();
        }
    } else {
        e.target.classList.remove("flagged");
        e.target.textContent = "";
        // Uncount if unflagging a port
        if (cellData.isPort) {
            gameState.portsFound--;
            updateUI();
        }
    }
}

function revealCell(row, col, element) {
    const cellData = gameState.grid[row][col];
    
    if (cellData.isRevealed || cellData.isPort) return;
    
    cellData.isRevealed = true;
    element.classList.add("revealed");
    
    if (cellData.adjacentPorts > 0) {
        element.textContent = cellData.adjacentPorts;
        element.classList.add(`number-${cellData.adjacentPorts}`);
    } else {
        // Reveal adjacent cells if no ports nearby
        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = col - 1; c <= col + 1; c++) {
                if (r >= 0 && r < gameState.gridSize && c >= 0 && c < gameState.gridSize) {
                    if (r !== row || c !== col) {
                        const adjacentElement = elements.grid.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                        if (adjacentElement && !gameState.grid[r][c].isRevealed) {
                            revealCell(r, c, adjacentElement);
                        }
                    }
                }
            }
        }
    }
}

function revealPort(row, col, element) {
    const cellData = gameState.grid[row][col];
    
    cellData.isRevealed = true;
    element.classList.add("port");
    element.textContent = "PORT";
    
    // Show port information (sanitized)
    const portNum = cellData.portNumber;
    const info = portInfo[portNum];
    if (info) {
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        elements.portDetails.innerHTML = `
            <strong style="color: #e53e3e;">VULNERABILITY TRIGGERED!</strong><br>
            <strong>Port ${escapeHtml(String(portNum))}: ${escapeHtml(info.name)}</strong><br>
            ${escapeHtml(info.desc)}
        `;
    }
}

function checkWinCondition() {
    // Win condition 1: All ports correctly flagged
    if (gameState.portsFound === gameState.totalPorts) {
        endGame(true);
        return;
    }
    
    // Win condition 2: All safe cells revealed (none with ports)
    let allSafeCellsRevealed = true;
    for (let row = 0; row < gameState.gridSize; row++) {
        for (let col = 0; col < gameState.gridSize; col++) {
            const cell = gameState.grid[row][col];
            if (!cell.isPort && !cell.isRevealed) {
                allSafeCellsRevealed = false;
                break;
            }
        }
        if (!allSafeCellsRevealed) break;
    }
    
    if (allSafeCellsRevealed) {
        endGame(true);
    }
}

function startTimer() {
    timerInterval = setInterval(() => {
        const elapsed = Date.now() - gameState.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        elements.timer.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }, 1000);
}

function updateUI() {
    elements.portsFound.textContent = gameState.portsFound;
    elements.totalPorts.textContent = gameState.totalPorts;
    elements.scans.textContent = gameState.scans;
}

function endGame(success) {
    gameState.isRunning = false;
    clearInterval(timerInterval);
    
    // Reveal all ports
    for (let row = 0; row < gameState.gridSize; row++) {
        for (let col = 0; col < gameState.gridSize; col++) {
            if (gameState.grid[row][col].isPort) {
                const element = elements.grid.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                element.classList.add("port");
                element.textContent = "PORT";
            }
        }
    }
    
    const elapsed = Date.now() - gameState.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const timeString = `${minutes}m ${seconds}s`;
    
    elements.finalTime.textContent = timeString;
    elements.finalScans.textContent = gameState.scans;
    
    const totalCells = gameState.gridSize * gameState.gridSize;
    const accuracyPercent = Math.round((1 - (gameState.scans / totalCells)) * 100);
    elements.accuracy.textContent = accuracyPercent + "%";
    
    if (success) {
        elements.resultTitle.textContent = "Network Scan Complete!";
        elements.resultMessage.textContent = "All vulnerable ports identified safely!";
        
        let rating = "";
        const efficiency = gameState.scans / gameState.totalPorts;
        
        if (efficiency <= 1.5) {
            rating = "Elite Pentester!";
        } else if (efficiency <= 2.5) {
            rating = "Expert Scanner!";
        } else if (efficiency <= 4) {
            rating = "Skilled Analyst!";
        } else if (efficiency <= 6) {
            rating = "Junior Tester!";
        } else {
            rating = "Beginner!";
        }
        
        elements.rating.textContent = rating;
    } else {
        elements.resultTitle.textContent = "Scan Failed!";
        elements.resultMessage.textContent = "You triggered a vulnerable port! The system detected your scan.";
        elements.rating.textContent = "Try Again!";
    }
    
    elements.gameOverScreen.classList.remove("hidden");
}

init();
