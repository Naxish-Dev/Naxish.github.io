/**
 * Main JavaScript for Portfolio Website
 * Handles dark mode toggle and changelog functionality
 */

// ===== DARK MODE TOGGLE =====
const toggleButton = document.getElementById("darkModeToggle");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

/**
 * Updates the dark mode toggle button text and accessibility
 */
function updateButtonLabel() {
  if (toggleButton) {
    const isDark = document.body.classList.contains("dark-mode");
    toggleButton.textContent = isDark ? "Light Mode" : "Dark Mode";
    toggleButton.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  }
}

/**
 * Initializes dark mode based on saved preference or system preference
 */
function initializeDarkMode() {
  const savedTheme = localStorage.getItem("theme");
  
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.body.classList.add("dark-mode");
  }
  
  updateButtonLabel();
}

/**
 * Toggles dark mode and saves preference
 */
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const mode = document.body.classList.contains("dark-mode") ? "dark" : "light";
  localStorage.setItem("theme", mode);
  updateButtonLabel();
}

// Initialize dark mode on page load
initializeDarkMode();

// Attach event listener if toggle button exists
if (toggleButton) {
  toggleButton.addEventListener("click", toggleDarkMode);
}

// ===== CHANGELOG FUNCTIONALITY =====
const changelogToggle = document.getElementById("changelogToggle");
const changelogContainer = document.getElementById("changelogContainer");
const changelogContent = document.getElementById("changelogContent");
const versionContent = document.getElementById("versionContent");

/**
 * Loads the changelog from the server
 */
function loadChangelog() {
  if (!changelogContent) return;
  
  // Show loading state
  changelogContent.textContent = "Loading changelog...";
  
  fetch("changelog.txt")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then((text) => {
      changelogContent.textContent = text || "No changelog available.";
    })
    .catch((error) => {
      console.error("Failed to load changelog:", error);
      changelogContent.textContent = "Changelog could not be loaded. Please try again later.";
    });
}

/**
 * Loads the version info from the server
 */
function loadVersion() {
  if (!versionContent) return;

  // Show loading state
  versionContent.textContent = "Loading version...";
  fetch("./VERSION")
    .then((response) => {
      if (!response.ok) { 
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return "Version: " + response.text();
    })
    .then((text) => {
      versionContent.textContent = text || "Version info not available.";
    })
    .catch((error) => {
      console.error("Failed to load version info:", error);
      versionContent.textContent = "Version info could not be loaded.";
    }); 
}

/**
 * Toggles changelog visibility
 */
function toggleChangelog() {
  if (changelogContainer) {
    changelogContainer.classList.toggle("hidden");
  }
}

// Load changelog on page load
if (changelogContent) {
  loadChangelog();
}

// Load version info on page load
if (versionContent) {
  loadVersion();
}

// Attach toggle event listener
if (changelogToggle) {
  changelogToggle.addEventListener("click", toggleChangelog);
}

// ===== ERROR HANDLING =====
// Global error handler for unhandled errors
window.addEventListener("error", (event) => {
  console.error("Unhandled error:", event.error);
  // Optionally show user-friendly error message
});

// Global promise rejection handler
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});
