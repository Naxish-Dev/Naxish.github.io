/**
 * @fileoverview Phishing Hunter - Educational game to identify phishing emails and learn security awareness
 * @author Naxish
 */

/**
 * Main game state object
 * @type {Object}
 */
const gameState = {
  isRunning: false,
  score: 0,
  streak: 0,
  currentRound: 0,
  totalRounds: 10,
  correctAnswers: 0,
};

// Email templates
const emails = {
  phishing: [
    {
      from: "security@paypa1-secure.com",
      subject: "URGENT: Your Account Will Be Closed!",
      body: "Dear valued customer, We have detected suspicious activity on your account. Click below immediately to verify your identity or your account will be permanently suspended within 24 hours!",
      link: "http://paypa1-secure.com/verify?id=38291",
      redFlags: ["Suspicious domain (paypa1 instead of paypal)", "Urgent threat", "Requests immediate action", "Generic greeting"],
    },
    {
      from: "no-reply@amazn-prize.com",
      subject: "Congratulations! You've Won $5000!",
      body: "You have been randomly selected as our lucky winner! Claim your $5,000 prize now by clicking the link below. This offer expires in 6 hours!",
      link: "http://amazn-prize.com/claim?user=winner2024",
      redFlags: ["Too good to be true", "Fake urgency", "Typo in domain (amazn)", "Unsolicited prize"],
    },
    {
      from: "support@bank-verify-center.com",
      subject: "Verify Your Account Information",
      body: "Dear client, Due to recent security updates, we need you to verify your account details. Please provide your account number, password, and SSN by replying to this email.",
      link: "mailto:support@bank-verify-center.com",
      redFlags: ["Requests sensitive information", "Suspicious domain", "Asks for password via email", "Generic greeting"],
    },
    {
      from: "billing@microsft-support.net",
      subject: "Your Microsoft subscription has expired",
      body: "Your Microsoft Office subscription expired yesterday. To avoid service interruption, please update your payment information immediately.",
      link: "http://microsft-support.net/renew/office",
      redFlags: ["Misspelled domain (microsft)", "Fake urgency", "Suspicious URL"],
    },
    {
      from: "hr@company-payroll.biz",
      subject: "Important: Update Your Direct Deposit",
      body: "This is an urgent notice from HR. We are updating our payroll system. Please fill out the attached form with your bank account details to ensure you receive your next paycheck.",
      link: "http://company-payroll.biz/form.exe",
      redFlags: ["Unexpected request", ".exe file", "Requests bank details", "Creates urgency"],
    },
  ],
  legitimate: [
    {
      from: "newsletter@github.com",
      subject: "Your GitHub Security Digest",
      body: "Hi there! Here's your weekly security summary for your repositories. You have 2 dependabot alerts that need attention. View them in your dashboard.",
      link: "https://github.com/settings/security",
      reason: "Legitimate GitHub domain, expected communication, secure HTTPS link",
    },
    {
      from: "receipts@amazon.com",
      subject: "Your Amazon.com order #123-4567890-1234567",
      body: "Hello, Thank you for your recent Amazon order. Your order has been shipped and will arrive by December 25th. Track your package using the link below.",
      link: "https://www.amazon.com/gp/css/order-history",
      reason: "Official Amazon domain, proper order number format, legitimate tracking link",
    },
    {
      from: "noreply@linkedin.com",
      subject: "John Doe viewed your profile",
      body: "John Doe, Senior Network Engineer at Tech Corp, viewed your LinkedIn profile. Connect with John to expand your professional network.",
      link: "https://www.linkedin.com/in/johndoe",
      reason: "Official LinkedIn domain, typical notification format, secure link",
    },
    {
      from: "no-reply@accounts.google.com",
      subject: "Security alert: New sign-in from Windows device",
      body: "Hi, We noticed a new sign-in to your Google Account from a Windows device. If this was you, you can disregard this email. If not, secure your account immediately.",
      link: "https://myaccount.google.com/security",
      reason: "Official Google domain, legitimate security notification, expected from Google",
    },
    {
      from: "support@stackoverflow.email",
      subject: "Weekly Stack Overflow Newsletter",
      body: "Here are this week's top questions in your favorite tags. Browse the latest discussions in JavaScript, Python, and Network Security.",
      link: "https://stackoverflow.com/questions/tagged",
      reason: "Official Stack Overflow email domain, expected newsletter, legitimate link",
    },
  ],
};

const elements = {
  score: document.getElementById("score"),
  streak: document.getElementById("streak"),
  round: document.getElementById("round"),
  emailContainer: document.getElementById("emailContainer"),
  safeBtn: document.getElementById("safeBtn"),
  phishingBtn: document.getElementById("phishingBtn"),
  feedback: document.getElementById("feedback"),
  startScreen: document.getElementById("startScreen"),
  gameOverScreen: document.getElementById("gameOverScreen"),
  startBtn: document.getElementById("startBtn"),
  restartBtn: document.getElementById("restartBtn"),
  finalScore: document.getElementById("finalScore"),
  accuracy: document.getElementById("accuracy"),
  rating: document.getElementById("rating"),
};

let currentEmail = null;
let shuffledEmails = [];

function init() {
  elements.startBtn.addEventListener("click", startGame);
  elements.restartBtn.addEventListener("click", restartGame);
  elements.safeBtn.addEventListener("click", () => makeDecision(false));
  elements.phishingBtn.addEventListener("click", () => makeDecision(true));
}

function startGame() {
  resetGame();
  prepareEmails();
  gameState.isRunning = true;
  elements.startScreen.classList.add("hidden");
  showNextEmail();
}

function restartGame() {
  resetGame();
  prepareEmails();
  gameState.isRunning = true;
  elements.gameOverScreen.classList.add("hidden");
  showNextEmail();
}

function resetGame() {
  gameState.score = 0;
  gameState.streak = 0;
  gameState.currentRound = 0;
  gameState.correctAnswers = 0;
  updateUI();
}

function prepareEmails() {
  // Select 5 phishing and 5 legitimate emails randomly
  const phishing = [...emails.phishing].sort(() => Math.random() - 0.5).slice(0, 5);
  const legitimate = [...emails.legitimate].sort(() => Math.random() - 0.5).slice(0, 5);
  
  // Combine and shuffle
  shuffledEmails = [...phishing, ...legitimate].sort(() => Math.random() - 0.5);
}

function showNextEmail() {
  if (gameState.currentRound >= gameState.totalRounds) {
    endGame();
    return;
  }

  // Re-enable buttons for the new email
  elements.safeBtn.disabled = false;
  elements.phishingBtn.disabled = false;

  currentEmail = shuffledEmails[gameState.currentRound];
  gameState.currentRound++;
  updateUI();

  const isPhishing = emails.phishing.some(e => e.from === currentEmail.from);

  // Escape HTML to prevent XSS
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  elements.emailContainer.innerHTML = `
    <div class="email">
      <div class="email-header">
        <div class="email-from">
          <strong>From:</strong> ${escapeHtml(currentEmail.from)}
        </div>
        <div class="email-subject">${escapeHtml(currentEmail.subject)}</div>
      </div>
      <div class="email-body">
        ${escapeHtml(currentEmail.body)}
      </div>
      <a class="email-link" href="#" onclick="return false;">${escapeHtml(currentEmail.link)}</a>
    </div>
  `;

  // Store the correct answer
  currentEmail.isPhishing = isPhishing;
}

function makeDecision(userSaysPhishing) {
  if (!gameState.isRunning) return;

  // Disable buttons to prevent multiple clicks
  elements.safeBtn.disabled = true;
  elements.phishingBtn.disabled = true;

  const correct = userSaysPhishing === currentEmail.isPhishing;

  if (correct) {
    gameState.score++;
    gameState.correctAnswers++;
    gameState.streak++;
    showFeedback(true, currentEmail);
  } else {
    gameState.streak = 0;
    showFeedback(false, currentEmail);
  }

  updateUI();
}

function showFeedback(correct, email) {
  const feedbackContent = elements.feedback.querySelector(".feedback-content") || document.createElement("div");
  feedbackContent.className = "feedback-content " + (correct ? "correct" : "wrong");

  // Escape HTML helper
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  if (correct) {
    const redFlagsHtml = email.isPhishing ? 
      email.redFlags.map(flag => escapeHtml(flag)).join(", ") : 
      escapeHtml(email.reason || "");
    feedbackContent.innerHTML = `
      <h3>Correct!</h3>
      <p>${email.isPhishing ? "This was indeed a phishing attempt!" : "This was a legitimate email!"}</p>
      ${email.isPhishing ? `<p><strong>Red flags:</strong> ${redFlagsHtml}</p>` : `<p><strong>Why legitimate:</strong> ${redFlagsHtml}</p>`}
    `;
  } else {
    const redFlagsHtml = email.isPhishing ? 
      email.redFlags.map(flag => escapeHtml(flag)).join(", ") : 
      escapeHtml(email.reason || "");
    feedbackContent.innerHTML = `
      <h3>Incorrect!</h3>
      <p>${email.isPhishing ? "This was actually a phishing attempt!" : "This was actually legitimate!"}</p>
      ${email.isPhishing ? `<p><strong>Red flags you missed:</strong> ${redFlagsHtml}</p>` : `<p><strong>Why it's safe:</strong> ${redFlagsHtml}</p>`}
    `;
  }

  elements.feedback.innerHTML = "";
  elements.feedback.appendChild(feedbackContent);
  elements.feedback.classList.remove("hidden");

  setTimeout(() => {
    elements.feedback.classList.add("hidden");
    showNextEmail();
  }, 4000);
}

function updateUI() {
  elements.score.textContent = gameState.score;
  elements.streak.textContent = gameState.streak;
  elements.round.textContent = `${gameState.currentRound}/${gameState.totalRounds}`;
}

function endGame() {
  gameState.isRunning = false;

  const accuracy = (gameState.correctAnswers / gameState.totalRounds) * 100;
  elements.finalScore.textContent = gameState.score;
  elements.accuracy.textContent = Math.round(accuracy) + "%";

  let rating = "";
  if (accuracy === 100) rating = "Perfect! Cybersecurity Expert!";
  else if (accuracy >= 80) rating = "Excellent! Security Pro!";
  else if (accuracy >= 60) rating = "Good! Getting Better!";
  else if (accuracy >= 40) rating = "Not Bad! Keep Learning!";
  else rating = "Need More Practice!";

  elements.rating.textContent = rating;
  elements.gameOverScreen.classList.remove("hidden");
}

init();
