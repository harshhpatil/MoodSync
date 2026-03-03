// modules/playerManager.js - Spotify player control  
/**
 * Player Manager Module
 * Handles Spotify Web Playback SDK integration
 * Controls playback, volume, and device selection
 */

import { fetchToken } from "./apiClient.js";
import { state } from "./state.js";
import { showToast, displayError, updateNowPlaying, updateProgress, updatePlaybackState } from "./uiRenderer.js";

/**
 * Initialize Spotify Player
 * Sets up player instance and event listeners
 * @returns {Promise<void>}
 */
export async function initializePlayer() {
  if (typeof window.Spotify === "undefined") {
    throw new Error("Spotify SDK not loaded");
  }

  return new Promise((resolve, reject) => {
    try {
      const player = new Spotify.Player({
        name: "AI MoodSync",
        getOAuthToken: async (callback) => {
          try {
            const token = await fetchToken();
            callback(token);
          } catch (err) {
            console.error("Failed to fetch token:", err);
            displayError("Authentication failed. Please login again.");
            reject(err);
          }
        },
        volume: 0.5,
      });

      // Connect to player events
      player.addListener("ready", ({ device_id }) => {
        console.log(`✅ Player ready with device ID: ${device_id}`);
        state.setDeviceId(device_id);
        resolve();
      });

      player.addListener("player_state_changed", (playerState) => {
        onPlayerStateChanged(playerState);
      });

      player.addListener("initialization_error", ({ message }) => {
        console.error("Player init error:", message);
        displayError("Player initialization failed");
        reject(new Error(message));
      });

      player.addListener("authentication_error", ({ message }) => {
        console.error("Player auth error:", message);
        displayError("Player authentication failed");
        reject(new Error(message));
      });

      player.addListener("account_error", ({ message }) => {
        console.error("Player account error:", message);
        displayError("Spotify account error");
        reject(new Error(message));
      });

      // Connect player
      player.connect().then((success) => {
        if (success) {
          console.log("✅ Spotify player connected successfully");
          state.setPlayer(player);
        } else {
          reject(new Error("Failed to connect player"));
        }
      });
    } catch (error) {
      console.error("Player initialization error:", error);
      reject(error);
    }
  });
}

/**
 * Handle player state changes
 * @param {Object} playerState - Current player state from Spotify Web Playback SDK
 */
function onPlayerStateChanged(playerState) {
  if (!playerState) {
    console.log("Player is offline");
    return;
  }

  // Spotify SDK nests current track under track_window
  const { paused, position, duration, track_window } = playerState;
  const current_track = track_window && track_window.current_track;

  if (current_track) {
    updateNowPlaying(current_track);
  }

  updateProgress(position, duration);
  updatePlaybackState(paused);

  console.log("Player state:", {
    track: current_track && current_track.name,
    paused,
    position,
    duration,
  });
}

/**
 * Play tracks starting at specified index
 * @param {string[]} uriList - Array of track URIs
 * @param {number} startIndex - Starting track index
 * @returns {Promise<void>}
 */
export async function playTracks(uriList, startIndex) {
  if (!state.deviceId) {
    throw new Error("Player not ready. Wait for Spotify SDK to initialize.");
  }

  if (!Array.isArray(uriList) || uriList.length === 0) {
    throw new Error("No tracks to play");
  }

  if (startIndex < 0 || startIndex >= uriList.length) {
    throw new Error("Invalid track index");
  }

  try {
    const { playSpotifyUri } = await import("./apiClient.js");
    const token = await fetchToken();

    await playSpotifyUri(token, state.deviceId, uriList, startIndex);

    console.log(`✅ Playing track at index ${startIndex}`);
    showToast(`▶ Now playing track ${startIndex + 1}`);
  } catch (err) {
    console.error("Playback error:", err);
    throw err;
  }
}

/**
 * Resume playback
 * @returns {void}
 */
export function resume() {
  if (state.player) {
    state.player.resume();
    showToast("▶ Playing", "success");
  }
}

/**
 * Pause playback
 * @returns {void}
 */
export function pause() {
  if (state.player) {
    state.player.pause();
    showToast("⏸ Paused", "success");
  }
}

/**
 * Skip to next track
 * @returns {void}
 */
export function nextTrack() {
  if (state.player) {
    state.player.nextTrack();
    showToast("⏭ Next track", "info");
  }
}

/**
 * Skip to previous track
 * @returns {void}
 */
export function previousTrack() {
  if (state.player) {
    state.player.previousTrack();
    showToast("⏮ Previous track", "info");
  }
}

/**
 * Set player volume
 * @param {number} volume - Volume level (0-1)
 * @returns {void}
 */
export function setVolume(volume) {
  const normalizedVolume = Math.max(0, Math.min(1, parseFloat(volume)));

  if (state.player) {
    state.player.setVolume(normalizedVolume);
    const percent = Math.round(normalizedVolume * 100);
    console.log(`🔊 Volume set to ${percent}%`);
  }
}

/**
 * Disconnect player on logout
 * @returns {void}
 */
export function disconnectPlayer() {
  if (state.player) {
    state.player.disconnect();
    state.setPlayer(null);
    state.setDeviceId(null);
  }
}

export default {
  initializePlayer,
  playTracks,
  resume,
  pause,
  nextTrack,
  previousTrack,
  setVolume,
  disconnectPlayer,
};
