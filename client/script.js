// script.js - Main application orchestration
/**
 * MoodSync Main Script
 * Orchestrates all modules and handles UI interactions
 * Minimal coupling - delegates to specialized modules
 */

import { state } from "./modules/state.js";
import { getTopTracks, logout } from "./modules/apiClient.js";
import {
  renderTrackList,
  displayError,
  showToast,
  updateModeButtons,
  showLoading,
  hideLoading,
  updateProgress,
  updatePlaybackState,
} from "./modules/uiRenderer.js";
import {
  initializePlayer,
  playTracks,
  resume,
  pause,
  nextTrack,
  previousTrack,
  setVolume,
  disconnectPlayer,
} from "./modules/playerManager.js";
import {
  detectAndPlayMood,
  MOOD_PLAYLIST_INDICES,
} from "./modules/emotionDetector.js";
import { startEmotionMode, startGestureMode, stopCamera } from "./modules/cameraManager.js";


// ============================================
// INITIALIZATION
// ============================================

/**
 * Main initialization function
 * Loads tracks and initializes player
 */
async function init() {
  try {
    showLoading("Loading your top tracks...");

    // Fetch user's top tracks
    const data = await getTopTracks();

    if (!data || !data.items || data.items.length === 0) {
      displayError(
        "No tracks available. Please add tracks to your Spotify library.",
      );
      hideLoading();
      return;
    }

    // Store tracks in state
    state.setTracks(data.items);

    // Render track list
    renderTrackList(state.allTracks, state.currentFocusIndex, handleCardClick);

    // Initialize Spotify player
    await initializePlayer();

    // Start polling for playback progress
    startProgressPoller();

    hideLoading();
    showToast("✅ Ready to play", "success");

    console.log("✅ Application initialized successfully");
  } catch (err) {
    hideLoading();
    if (err.message === "Auth failed") {
      window.location.href = "/";
      return;
    }
    console.error("Initialization error:", err);
    displayError(err.message || "Failed to initialize application");
  }
}

// ============================================
// TRACK NAVIGATION
// ============================================

/**
 * Handle card click to focus on track
 * @param {number} index - Track index
 */
function handleCardClick(index) {
  state.setFocusIndex(index);
  renderTrackList(state.allTracks, state.currentFocusIndex, handleCardClick);

  // Auto-play the focused track
  playSong(state.allUris, state.currentFocusIndex);
}

/**
 * Move through track list
 * @param {number} direction - Direction: -1 (up) or 1 (down)
 */
window.moveStack = (direction) => {
  if (state.allTracks.length === 0) return;

  const newIndex = state.currentFocusIndex + direction;
  state.setFocusIndex(newIndex);
  renderTrackList(state.allTracks, state.currentFocusIndex, handleCardClick);
};

/**
 * Play tracks starting at index
 * @param {string[]} uriList - Array of track URIs
 * @param {number} startIndex - Starting index
 */
async function playSong(uriList, startIndex) {
  try {
    await playTracks(uriList, startIndex);
  } catch (err) {
    console.error("Playback error:", err);
    displayError("Failed to play track. Make sure Spotify device is active.");
  }
}

// ============================================
// PLAYBACK CONTROLS
// ============================================

// Attach player controls to window for HTML onclick access
window.resume = () => resume();
window.pause = () => pause();
window.nextTrack = () => nextTrack();
window.previousTrack = () => previousTrack();
window.setVolume = (v) => setVolume(v);

/**
 * Toggle play/pause — reads current icon state to determine action
 */
window.togglePlayback = () => {
  const pauseIcon = document.getElementById("pauseIcon");
  if (pauseIcon && !pauseIcon.classList.contains("hidden")) {
    pause();
  } else {
    resume();
  }
};

/**
 * Set volume from a 0-100 integer (from the HTML range slider)
 * @param {number|string} percent - Volume percent 0-100
 */
window.setVolumeLevel = (percent) => {
  const normalizedVol = Math.max(0, Math.min(100, parseFloat(percent))) / 100;
  setVolume(normalizedVol);
};

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Arrow navigation
    if (e.key === "ArrowUp") {
      e.preventDefault();
      window.moveStack(-1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      window.moveStack(1);
    }

    // Playback shortcuts (work in both emotion and gesture modes)
    switch (e.key.toLowerCase()) {
      case "p": // Play
        resume();
        showToast("▶ Play");
        break;
      case " ": // Pause
        e.preventDefault();
        pause();
        showToast("⏸ Pause");
        break;
      case "n": // Next
        nextTrack();
        showToast("⏭ Next");
        break;
      case "b": // Back/Previous
        previousTrack();
        showToast("⏮ Previous");
        break;
      case "+":
      case "=": // Volume Up
        {
          const currentVol = parseInt(
            document.getElementById("volumeControl")?.value ?? 50,
          );
          const newVol = Math.min(currentVol + 10, 100);
          setVolume(newVol / 100);
          const vc = document.getElementById("volumeControl");
          if (vc) vc.value = newVol;
          showToast("🔊 Volume Up");
        }
        break;
      case "-": // Volume Down
        {
          const currentVol = parseInt(
            document.getElementById("volumeControl")?.value ?? 50,
          );
          const newVol = Math.max(currentVol - 10, 0);
          setVolume(newVol / 100);
          const vc = document.getElementById("volumeControl");
          if (vc) vc.value = newVol;
          showToast("🔉 Volume Down");
        }
        break;
    }
  });
}

// ============================================
// CAMERA & VISION MODES
// ============================================

/**
 * Switch between emotion and gesture modes
 * @param {string} mode - Mode: 'emotion' or 'gesture'
 */
window.switchMode = (mode) => {
  if (!state.setMode(mode)) {
    displayError("Invalid mode");
    return;
  }

  updateModeButtons(mode);
  console.log(`📱 Switched to ${mode} mode`);
  showToast(`📱 ${mode === 'emotion' ? '😊 Emotion' : '🖐️ Gesture'} Mode`);

  // If camera is already active, restart it in the newly selected mode
  if (state.cameraActive) {
    stopCamera();
    setTimeout(async () => {
      try {
        if (state.currentMode === "emotion") {
          await startEmotionMode();
        } else {
          await startGestureMode();
        }
      } catch (err) {
        console.error("Mode switch camera restart error:", err);
        displayError("Failed to switch camera mode");
      }
    }, 150);
  }
};

/**
 * Start camera in appropriate mode
 */
window.startCamera = async () => {
  try {
    if (state.currentMode === "emotion") {
      await startEmotionMode();
    } else {
      await startGestureMode();
    }
  } catch (err) {
    console.error("Camera start error:", err);
    displayError(err.message);
  }
};

/**
 * Stop camera
 */
window.stopCamera = () => {
  stopCamera();
};

// ============================================
// TEXT-BASED MOOD DETECTION
// ============================================

/**
 * Detect mood from text input and play playlist
 */
window.detectMood = async () => {
  const input = document.getElementById("moodInput");
  if (!input || !input.value.trim()) {
    displayError("Please describe your mood");
    return;
  }

  try {
    await detectAndPlayMood(input.value);
  } catch (err) {
    console.error("Mood detection error:", err);
    displayError("Failed to detect mood");
  }
};

// ============================================
// LOGOUT
// ============================================

/**
 * Logout user
 */
window.logout = async () => {
  try {
    showLoading("Logging out...");
    disconnectPlayer();

    // Call logout endpoint
    await logout();

    hideLoading();
    window.location.href = "/";
  } catch (err) {
    hideLoading();
    console.error("Logout error:", err);
    // Still redirect even if logout fails
    window.location.href = "/";
  }
};

// ============================================
// PROGRESS POLLER
// ============================================

/** @type {number|null} Interval handle so the poller can be stopped if needed */
let progressPollerHandle = null;

/**
 * Poll Spotify player state every second to update progress bar and play state.
 * The SDK fires onPlayerStateChanged for track/pause changes, but continuous
 * position updates require polling.
 */
function startProgressPoller() {
  if (progressPollerHandle !== null) return; // Guard: only one poller at a time

  progressPollerHandle = setInterval(async () => {
    if (!state.player) return;
    try {
      const playerState = await state.player.getCurrentState();
      if (playerState && !playerState.paused) {
        updateProgress(playerState.position, playerState.duration);
      }
    } catch (_err) {
      // Silently ignore — player may not be ready
    }
  }, 1000);
}

// ============================================
// STARTUP
// ============================================

// Setup keyboard shortcuts
setupKeyboardShortcuts();

// Initialize application when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
