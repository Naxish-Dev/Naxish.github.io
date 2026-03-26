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

// ===== MUSIC PLAYER =====
const audioPlayer = new Audio();
const playPauseBtn = document.getElementById("playPauseBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const songTitle = document.getElementById("songTitle");
const volumeSlider = document.getElementById("volumeSlider");
const progressFill = document.getElementById("progressFill");
const progressBar = document.querySelector(".progress-bar");

// List of songs to play (populated from songs.json)
let songs = [];

let currentSongIndex = 0;
let isPlaying = false;
let updateScheduled = false;

/**
 * Loads songs from the songs.json file
 */
async function loadSongsFromJSON() {
  try {
    const response = await fetch("audio/lo-fi/songs.json");
    if (!response.ok) {
      throw new Error(`Failed to load songs.json: ${response.status}`);
    }
    const data = await response.json();
    
    // Convert relative paths to full paths
    songs = data.songs.map(song => `audio/lo-fi/${song}`);
    
    // Initialize player after songs are loaded
    initializePlayer();
  } catch (error) {
    console.error("Error loading songs:", error);
    songTitle.textContent = "Error loading songs";
  }
}

/**
 * Initializes the music player after songs are loaded
 */
function initializePlayer() {
  if (songs.length > 0) {
    loadSong(0);
    audioPlayer.volume = 0.7;
  }
}

/**
 * Gets a random song index that's different from the current one
 */
function getRandomSongIndex() {
  let newIndex = currentSongIndex;
  while (newIndex === currentSongIndex && songs.length > 1) {
    newIndex = Math.floor(Math.random() * songs.length);
  }
  return newIndex;
}

/**
 * Loads a song by index
 */
function loadSong(index) {
  currentSongIndex = index;
  audioPlayer.src = songs[index];
  
  // Extract song name from filename
  const fileName = songs[index].split("/").pop();
  const cleanName = fileName.replace(".mp3", "");
  songTitle.textContent = cleanName;
}

/**
 * Toggles play/pause
 */
function togglePlayPause() {
  if (isPlaying) {
    audioPlayer.pause();
    playPauseBtn.querySelector(".play-icon").style.display = "inline";
    playPauseBtn.querySelector(".pause-icon").style.display = "none";
    isPlaying = false;
  } else {
    audioPlayer.play();
    playPauseBtn.querySelector(".play-icon").style.display = "none";
    playPauseBtn.querySelector(".pause-icon").style.display = "inline";
    isPlaying = true;
  }
}

/**
 * Uses requestAnimationFrame to throttle repaints
 */
function updateProgress() {
  if (audioPlayer.duration) {
    const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressFill.style.width = percent + "%";
  }
  updateScheduled = false;
}

/**
 * Schedules progress bar update on next animation frame
 * Prevents excessive repaints from frequent timeupdate events
 */
function scheduleProgressUpdate() {
  if (!updateScheduled) {
    updateScheduled = true;
    requestAnimationFrame(updateProgress);
  }
}

/**
 * Seeks to a position on clicking the progress bar
 */
function seekSong(e) {
  const rect = progressBar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audioPlayer.currentTime = percent * audioPlayer.duration;
}

/**
 * Loads next song and plays it
 */
function playNextSong() {
  currentSongIndex = getRandomSongIndex();
  loadSong(currentSongIndex);
  if (isPlaying) {
    audioPlayer.play();
  }
}

/**
 * Go to previous song
 */
function playPreviousSong() {
  // If more than 3 seconds into song, restart current song
  if (audioPlayer.currentTime > 3) {
    audioPlayer.currentTime = 0;
  } else {
    // Otherwise, go to previous song by cycling through
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    loadSong(currentSongIndex);
  }
  if (isPlaying) {
    audioPlayer.play();
  }
}

/**
 * Skip to next song
 */
function skipToNextSong() {
  currentSongIndex = getRandomSongIndex();
  loadSong(currentSongIndex);
  if (isPlaying) {
    audioPlayer.play();
  }
}

// Load songs from JSON file on page load
loadSongsFromJSON();

// Event listeners
playPauseBtn.addEventListener("click", togglePlayPause);
prevBtn.addEventListener("click", playPreviousSong);
nextBtn.addEventListener("click", skipToNextSong);
volumeSlider.addEventListener("input", (e) => {
  audioPlayer.volume = e.target.value / 100;
});
progressBar.addEventListener("click", seekSong);
audioPlayer.addEventListener("timeupdate", scheduleProgressUpdate);
audioPlayer.addEventListener("ended", playNextSong);

// Optional: Start playing automatically (comment out if you prefer manual start)
// togglePlayPause();

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
      return response.text();
    })
    .then((text) => {
      versionContent.textContent = text.trim() ? "Version: " + text.trim() : "Version information not available.";
    })
    .catch((error) => {
      console.error("Failed to load version information:", error);
      versionContent.textContent = "Version information could not be loaded.";
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
