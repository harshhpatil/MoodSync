// modules/state.js - Centralized state management
/**
 * State Management Module
 * Single source of truth for application state
 * Reduces coupling between different features
 */

class AppState {
  constructor() {
    this.player = null;
    this.deviceId = null;
    this.allTracks = [];
    this.allUris = [];
    this.currentFocusIndex = 0;

    // Camera and gesture state
    this.cameraActive = false;
    this.currentMode = "emotion"; // 'emotion' or 'gesture'
    this.handsDetector = null;
    this.currentCamera = null;
    this.gestureControlLoop = null;

    // Emotion detection state
    this.faceModelsLoaded = false;
    this.currentEmotionLoop = null;
    this.lastEmotionSwitchAt = 0;
    this.lastEmotionPlayed = null;
    this.emotionSwitchCooldownMs = 5 * 60 * 1000; // 5 minutes

    // UI state
    this.isLoading = false;
    this.error = null;
    this.statusMessage = "";

    // Constants
    this.GESTURE_CONFIDENCE_THRESHOLD = 0.5;
  }

  // Player methods
  setPlayer(player) {
    this.player = player;
  }

  setDeviceId(deviceId) {
    this.deviceId = deviceId;
  }

  // Tracks methods
  setTracks(tracks) {
    this.allTracks = tracks || [];
    this.allUris = (tracks || []).map((t) => t.uri);
    this.currentFocusIndex = 0;
  }

  setFocusIndex(index) {
    this.currentFocusIndex = Math.max(
      0,
      Math.min(index, this.allTracks.length - 1),
    );
  }

  getCurrentTrack() {
    return this.allTracks[this.currentFocusIndex] || null;
  }

  // Camera state methods
  startCamera() {
    this.cameraActive = true;
  }

  stopCamera() {
    this.cameraActive = false;
  }

  setMode(mode) {
    if (["emotion", "gesture"].includes(mode)) {
      this.currentMode = mode;
      return true;
    }
    return false;
  }

  // Face models
  setFaceModelsLoaded(loaded) {
    this.faceModelsLoaded = loaded;
  }

  // UI state
  setLoading(isLoading) {
    this.isLoading = isLoading;
  }

  setError(error) {
    this.error = error;
  }

  clearError() {
    this.error = null;
  }

  setStatusMessage(message) {
    this.statusMessage = message;
  }

  // Emotion state management
  updateEmotionState(emotion) {
    this.lastEmotionPlayed = emotion;
    this.lastEmotionSwitchAt = Date.now();
  }

  getEmotionCooldownRemaining() {
    const elapsed = Date.now() - this.lastEmotionSwitchAt;
    return Math.max(0, this.emotionSwitchCooldownMs - elapsed);
  }

  canSwitchEmotion() {
    return this.getEmotionCooldownRemaining() === 0;
  }

  // Reset all state
  reset() {
    this.player = null;
    this.deviceId = null;
    this.allTracks = [];
    this.allUris = [];
    this.currentFocusIndex = 0;
    this.cameraActive = false;
    this.faceModelsLoaded = false;
    this.isLoading = false;
    this.error = null;
  }
}

// Singleton instance
export const state = new AppState();

export default state;
