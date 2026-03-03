// modules/emotionDetector.js - Emotion detection system
/**
 * Emotion Detector Module
 * Handles face detection and emotion analysis
 * Controls emotion-based music switching
 */

import { state } from "./state.js";
import { updateEmotionDisplay, displayError, showToast } from "./uiRenderer.js";
import { playTracks } from "./playerManager.js";

// Emotion to playlist index mapping
export const MOOD_PLAYLIST_INDICES = {
  happy: 0,
  sad: 5,
  angry: 8,
  energetic: 1,
  calm: 3,
  neutral: 2,
};

// Confidence thresholds
const FACE_DETECTION_THRESHOLD = 0.5;
const EMOTION_UPDATE_INTERVAL = 2000; // Update every 2 seconds

/**
 * Load face detection models
 * @returns {Promise<boolean>}
 * @throws {Error} If face-api not loaded
 */
export async function loadFaceModels() {
  if (state.faceModelsLoaded) return true;

  if (typeof window.faceapi === "undefined") {
    throw new Error("Face API not available");
  }

  try {
    console.log("📦 Loading face detection models...");

    await Promise.all([
      window.faceapi.nets.tinyFaceDetector.loadFromUri(
        "/model/tiny_face_detector",
      ),
      window.faceapi.nets.faceExpressionNet.loadFromUri("/model/face_expression"),
    ]);

    state.setFaceModelsLoaded(true);
    console.log("✅ Face models loaded successfully");
    return true;
  } catch (error) {
    console.error("Failed to load face models:", error);
    throw new Error("Failed to load face detection models");
  }
}

/**
 * Start emotion detection loop
 * @returns {void}
 */
export function startEmotionDetection() {
  const video = document.getElementById("video");

  if (!video) {
    console.error("Video element not found");
    return;
  }

  updateEmotionDisplay("SCANNING", "Analyzing... 👁️");

  // Clear existing loop
  if (state.currentEmotionLoop) {
    clearInterval(state.currentEmotionLoop);
  }

  // Reset emotion state
  state.lastEmotionSwitchAt = 0;
  state.lastEmotionPlayed = null;

  state.currentEmotionLoop = setInterval(async () => {
    try {
      const detections = await window.faceapi
        .detectAllFaces(
          video,
          new window.faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: FACE_DETECTION_THRESHOLD,
          }),
        )
        .withFaceExpressions();

      if (detections.length === 0) {
        updateEmotionDisplay("NO FACE", "Please face the camera");
        return;
      }

      const expressions = detections[0].expressions;

      // Find dominant emotion
      const dominantEmotion = Object.entries(expressions).reduce(
        (a, b) => (a[1] > b[1] ? a : b),
      )[0];

      const now = Date.now();
      const canSwitch = state.canSwitchEmotion();

      if (state.lastEmotionPlayed === null) {
        // First emotion detected
        updateEmotionDisplay(dominantEmotion, "Switching now");

        const playlistIndex = MOOD_PLAYLIST_INDICES[dominantEmotion] || 2;
        if (state.allUris.length > playlistIndex) {
          try {
            await playTracks(
              state.allUris,
              Math.min(playlistIndex, state.allUris.length - 1),
            );
            state.updateEmotionState(dominantEmotion);
          } catch (err) {
            console.error("Failed to play track:", err);
            displayError("Failed to play track");
          }
        }
        return;
      }

      if (!canSwitch) {
        // Cooldown active
        const remainingMs = state.getEmotionCooldownRemaining();
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        updateEmotionDisplay(
          dominantEmotion,
          `Next in ${remainingMinutes}m`,
        );
      } else if (dominantEmotion !== state.lastEmotionPlayed) {
        // Emotion changed and cooldown expired
        updateEmotionDisplay(dominantEmotion, "Switching now");

        const playlistIndex = MOOD_PLAYLIST_INDICES[dominantEmotion] || 2;
        if (state.allUris.length > playlistIndex) {
          try {
            await playTracks(
              state.allUris,
              Math.min(playlistIndex, state.allUris.length - 1),
            );
            state.updateEmotionState(dominantEmotion);
          } catch (err) {
            console.error("Failed to play track:", err);
            displayError("Failed to play track");
          }
        }
      } else {
        // Same emotion, cooldown expired
        updateEmotionDisplay(dominantEmotion, "No change");
      }
    } catch (err) {
      console.error("Emotion detection error:", err);
      updateEmotionDisplay("ERROR", "Detection failed");
    }
  }, EMOTION_UPDATE_INTERVAL);
}

/**
 * Stop emotion detection
 * @returns {void}
 */
export function stopEmotionDetection() {
  if (state.currentEmotionLoop) {
    clearInterval(state.currentEmotionLoop);
    state.currentEmotionLoop = null;
  }

  const video = document.getElementById("video");
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }

  const emotionResult = document.getElementById("emotionResult");
  if (emotionResult) {
    emotionResult.textContent = "";
  }

  console.log("✅ Emotion detection stopped");
}

/**
 * Parse mood from text input
 * @param {string} text - User text input
 * @returns {string} Detected mood
 */
export function parseMoodFromText(text) {
  const moodKeywords = {
    happy: ["happy", "great", "amazing", "wonderful", "excited"],
    sad: ["sad", "tired", "down", "lonely", "depressed"],
    angry: ["angry", "mad", "annoyed", "frustrated"],
    energetic: ["pumped", "excited", "energy", "hype"],
    calm: ["relaxed", "chill", "peaceful", "zen"],
  };

  const cleanText = text.toLowerCase();

  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    if (keywords.some((kw) => cleanText.includes(kw))) {
      return mood;
    }
  }

  return "neutral";
}

/**
 * Detect mood from text and play appropriate playlist
 * @param {string} text - User text input
 * @returns {Promise<void>}
 */
export async function detectAndPlayMood(text) {
  try {
    const mood = parseMoodFromText(text);
    const playlistIndex = MOOD_PLAYLIST_INDICES[mood] || 2;

    if (state.allUris.length === 0) {
      displayError("No tracks available");
      return;
    }

    await playTracks(
      state.allUris,
      Math.min(playlistIndex, state.allUris.length - 1),
    );

    updateEmotionDisplay(mood, "Playlist selected");
    showToast(`🎵 Playing ${mood} playlist`, "success");
  } catch (err) {
    console.error("Mood detection error:", err);
    displayError("Failed to play mood playlist");
  }
}

export default {
  loadFaceModels,
  startEmotionDetection,
  stopEmotionDetection,
  parseMoodFromText,
  detectAndPlayMood,
  MOOD_PLAYLIST_INDICES,
};
