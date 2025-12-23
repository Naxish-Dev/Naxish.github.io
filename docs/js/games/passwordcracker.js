/**
 * @fileoverview Password Cracker - Logic puzzle game with difficulty levels and hint system
 * @author Naxish
 */

/**
 * Main game state object
 * @type {Object}
 */
const gameState = {
    isRunning: false,
    password: "",
    attempts: 0,
    hintsUsed: 0,
    startTime: null,
    difficulty: "easy",
    maxLength: 4,
    characterSet: "0123456789",
};

const difficulties = {
    easy: {
        length: 4,
        charset: "0123456789",
        maxHints: 3,
    },
    medium: {
        length: 5,
        charset: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        maxHints: 2,
    },
    hard: {
        length: 6,
        charset: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%",
        maxHints: 1,
    },
};

const elements = {
    startScreen: document.getElementById("startScreen"),
    gameOverScreen: document.getElementById("gameOverScreen"),
    gameUI: document.getElementById("gameUI"),
    passwordInput: document.getElementById("passwordInput"),
    submitBtn: document.getElementById("submitBtn"),
    getHintBtn: document.getElementById("getHintBtn"),
    restartBtn: document.getElementById("restartBtn"),
    attemptsContainer: document.getElementById("attemptsContainer"),
    hintsList: document.getElementById("hintsList"),
    attempts: document.getElementById("attempts"),
    timer: document.getElementById("timer"),
    hintsUsed: document.getElementById("hintsUsed"),
    finalPassword: document.getElementById("finalPassword"),
    finalAttempts: document.getElementById("finalAttempts"),
    finalTime: document.getElementById("finalTime"),
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

    elements.submitBtn.addEventListener("click", submitGuess);
    elements.getHintBtn.addEventListener("click", getHint);
    elements.restartBtn.addEventListener("click", restartGame);
    
    elements.passwordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") submitGuess();
    });
}

function startGame(difficulty) {
    gameState.difficulty = difficulty;
    const config = difficulties[difficulty];
    gameState.maxLength = config.length;
    gameState.characterSet = config.charset;
    
    resetGame();
    generatePassword();
    
    elements.startScreen.classList.add("hidden");
    elements.gameUI.classList.remove("hidden");
    
    elements.passwordInput.maxLength = gameState.maxLength;
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
    gameState.attempts = 0;
    gameState.hintsUsed = 0;
    elements.attemptsContainer.innerHTML = "";
    elements.hintsList.innerHTML = "";
    elements.passwordInput.value = "";
    updateUI();
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function generatePassword() {
    let password = "";
    const charset = gameState.characterSet;
    
    for (let i = 0; i < gameState.maxLength; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    
    gameState.password = password;
}

function submitGuess() {
    if (!gameState.isRunning) return;
    
    const guess = elements.passwordInput.value.toUpperCase().trim();
    
    if (guess.length !== gameState.maxLength) {
        alert(`Password must be ${gameState.maxLength} characters long!`);
        return;
    }
    
    // Validate characters
    const validChars = guess.split("").every(char => 
        gameState.characterSet.includes(char)
    );
    
    if (!validChars) {
        alert(`Only use characters from: ${gameState.characterSet}`);
        return;
    }
    
    gameState.attempts++;
    updateUI();
    
    const feedback = checkGuess(guess);
    displayAttempt(guess, feedback);
    
    if (feedback.correct) {
        endGame(true);
    }
    
    elements.passwordInput.value = "";
}

function checkGuess(guess) {
    const password = gameState.password;
    const feedback = {
        correct: guess === password,
        positions: []
    };
    
    const passwordChars = password.split("");
    const guessChars = guess.split("");
    const used = new Array(password.length).fill(false);
    
    // First pass: check correct positions
    for (let i = 0; i < guessChars.length; i++) {
        if (guessChars[i] === passwordChars[i]) {
            feedback.positions.push("correct");
            used[i] = true;
        } else {
            feedback.positions.push(null);
        }
    }
    
    // Second pass: check present but wrong position
    for (let i = 0; i < guessChars.length; i++) {
        if (feedback.positions[i] === null) {
            let found = false;
            for (let j = 0; j < passwordChars.length; j++) {
                if (!used[j] && guessChars[i] === passwordChars[j]) {
                    feedback.positions[i] = "present";
                    used[j] = true;
                    found = true;
                    break;
                }
            }
            if (!found) {
                feedback.positions[i] = "absent";
            }
        }
    }
    
    return feedback;
}

function displayAttempt(guess, feedback) {
    const attemptRow = document.createElement("div");
    attemptRow.className = "attempt-row";
    
    const attemptNumber = document.createElement("div");
    attemptNumber.className = "attempt-number";
    attemptNumber.textContent = `#${gameState.attempts}`;
    
    const attemptGuess = document.createElement("div");
    attemptGuess.className = "attempt-guess";
    
    guess.split("").forEach((char, index) => {
        const charBox = document.createElement("div");
        charBox.className = `char-box char-${feedback.positions[index]}`;
        charBox.textContent = char;
        attemptGuess.appendChild(charBox);
    });
    
    attemptRow.appendChild(attemptNumber);
    attemptRow.appendChild(attemptGuess);
    elements.attemptsContainer.insertBefore(attemptRow, elements.attemptsContainer.firstChild);
}

function getHint() {
    const config = difficulties[gameState.difficulty];
    
    if (gameState.hintsUsed >= config.maxHints) {
        alert("No more hints available!");
        return;
    }
    
    gameState.hintsUsed++;
    updateUI();
    
    const hints = generateHints();
    const unusedHints = hints.filter(h => !isHintUsed(h));
    
    if (unusedHints.length === 0) {
        alert("All available hints used!");
        return;
    }
    
    const hint = unusedHints[Math.floor(Math.random() * unusedHints.length)];
    displayHint(hint);
    
    if (gameState.hintsUsed >= config.maxHints) {
        elements.getHintBtn.disabled = true;
        elements.getHintBtn.textContent = "No Hints Left";
    }
}

function generateHints() {
    const password = gameState.password;
    const hints = [];
    
    // Find positions that have already been correctly guessed
    const knownPositions = getKnownPositions();
    
    // Hint about a specific character position (only unknown positions)
    const unknownPositions = [];
    for (let i = 0; i < password.length; i++) {
        if (!knownPositions.has(i)) {
            unknownPositions.push(i);
        }
    }
    
    if (unknownPositions.length > 0) {
        // Add first/last character hints if not known
        if (!knownPositions.has(0)) {
            hints.push(`First character is: ${password[0]}`);
        }
        if (!knownPositions.has(password.length - 1)) {
            hints.push(`Last character is: ${password[password.length - 1]}`);
        }
        
        // Add random position hints (excluding first/last to avoid duplicates)
        const middlePositions = unknownPositions.filter(pos => pos !== 0 && pos !== password.length - 1);
        if (middlePositions.length > 0) {
            const randomPos = middlePositions[Math.floor(Math.random() * middlePositions.length)];
            hints.push(`Position ${randomPos + 1} is: ${password[randomPos]}`);
        }
        
        // If only first or last unknown, add a second random position from any unknown
        if (middlePositions.length === 0 && unknownPositions.length > 1) {
            const randomPos = unknownPositions[Math.floor(Math.random() * unknownPositions.length)];
            hints.push(`Position ${randomPos + 1} is: ${password[randomPos]}`);
        }
    }
    
    // Hint about character types
    if (gameState.difficulty === "medium" || gameState.difficulty === "hard") {
        const hasNumbers = /\d/.test(password);
        const hasLetters = /[A-Z]/.test(password);
        const hasSpecial = /[!@#$%]/.test(password);
        
        if (hasNumbers) hints.push("Password contains at least one number");
        if (hasLetters) hints.push("Password contains at least one letter");
        if (hasSpecial) hints.push("Password contains at least one special character");
        if (!hasNumbers) hints.push("Password contains no numbers");
        if (!hasLetters) hints.push("Password contains no letters");
    }
    
    return hints;
}

function getKnownPositions() {
    const knownPositions = new Set();
    const password = gameState.password;
    
    // Check all previous attempts for correctly guessed positions
    const attemptRows = elements.attemptsContainer.querySelectorAll(".attempt-row");
    
    attemptRows.forEach(row => {
        const charBoxes = row.querySelectorAll(".char-box");
        charBoxes.forEach((box, index) => {
            if (box.classList.contains("char-correct")) {
                knownPositions.add(index);
            }
        });
    });
    
    return knownPositions;
}

function isHintUsed(hint) {
    const hintItems = elements.hintsList.querySelectorAll(".hint-item");
    return Array.from(hintItems).some(item => item.textContent === hint);
}

function displayHint(hint) {
    const hintItem = document.createElement("div");
    hintItem.className = "hint-item";
    hintItem.textContent = hint;
    elements.hintsList.appendChild(hintItem);
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
    elements.attempts.textContent = gameState.attempts;
    elements.hintsUsed.textContent = gameState.hintsUsed;
}

function endGame(success) {
    gameState.isRunning = false;
    clearInterval(timerInterval);
    
    const elapsed = Date.now() - gameState.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const timeString = `${minutes}m ${seconds}s`;
    
    elements.finalPassword.textContent = gameState.password;
    elements.finalAttempts.textContent = gameState.attempts;
    elements.finalTime.textContent = timeString;
    
    if (success) {
        elements.resultTitle.textContent = "Password Cracked!";
        
        let rating = "";
        let message = "";
        
        const score = gameState.attempts + gameState.hintsUsed * 2;
        
        if (score <= 3) {
            rating = "Master Hacker!";
            message = "Incredible! You cracked it with minimal attempts!";
        } else if (score <= 5) {
            rating = "Expert Pentester!";
            message = "Excellent work! Very efficient cracking!";
        } else if (score <= 8) {
            rating = "Skilled Analyst!";
            message = "Good job! You're learning the patterns!";
        } else if (score <= 12) {
            rating = "Junior Tester!";
            message = "Not bad! Keep practicing your logic skills!";
        } else {
            rating = "Trainee!";
            message = "You cracked it! Try to be more efficient next time!";
        }
        
        elements.rating.textContent = rating;
        elements.resultMessage.textContent = message;
    }
    
    elements.gameOverScreen.classList.remove("hidden");
}

init();
