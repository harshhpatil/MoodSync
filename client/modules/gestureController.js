// modules/gestureController.js - Hand gesture recognition and control
/**
 * Gesture Controller Module
 * Handles hand pose detection and gesture-based music control
 * Maps gestures to player actions
 */

import { state } from "./state.js";
import {
  showToast,
  updateGestureDisplay,
  displayError,
} from "./uiRenderer.js";
import { resume, pause, nextTrack, previousTrack, setVolume } from "./playerManager.js";

// Gesture types
export const GESTURES = {
  THUMBS_UP: "thumbs_up",
  THUMBS_DOWN: "thumbs_down",
  PEACE_SIGN: "peace_sign",
  ROCK_SIGN: "rock_sign",
  OPEN_PALM: "open_palm",
  POINT_FINGER: "point_finger",
  CLOSED_FIST: "closed_fist",
  SWIPE_LEFT: "swipe_left",
  SWIPE_RIGHT: "swipe_right",
};

const GESTURE_COOLDOWN_MS = 900;
const SWIPE_HISTORY_LENGTH = 6;
const SWIPE_THRESHOLD = 0.08;

let gestureHistory = {};
let handPositionHistory = [];

/**
 * Detect gesture from hand landmarks (using face-api landmarks)
 * @param {Array} landmarks - Hand landmarks from MediaPipe
 * @returns {string|null} Detected gesture type
 */
export function detectGesture(landmarks) {
  if (!landmarks || landmarks.length === 0) return null;

  const hand = landmarks[0];

  // Get key finger positions (MediaPipe format uses direct array indices)
  const thumb = hand[4];
  const indexFinger = hand[8];
  const middleFinger = hand[12];
  const ringFinger = hand[16];
  const pinky = hand[20];
  const wrist = hand[0];

  if (!thumb || !indexFinger || !middleFinger || !wrist) return null;

  const indexPip = hand[6];
  const middlePip = hand[10];
  const ringPip = hand[14];
  const pinkyPip = hand[18];
  const thumbIp = hand[3];
  const indexMcp = hand[5];

  if (!indexPip || !middlePip || !ringPip || !pinkyPip || !thumbIp || !indexMcp) {
    return null;
  }

  // Helper functions
  const distance = (p1, p2) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const isFingerUp = (tip, pip) => tip.y < pip.y - 0.02;
  const isFingerFolded = (tip, pip) => tip.y > pip.y - 0.005;
  const isClosed = (p1, p2) => distance(p1, p2) < 0.11;

  // Check finger positions
  const thumbUp = thumb.y < thumbIp.y - 0.015 || thumb.y < wrist.y - 0.03;
  const indexUp = isFingerUp(indexFinger, indexPip);
  const middleUp = isFingerUp(middleFinger, middlePip);
  const ringUp = isFingerUp(ringFinger, ringPip);
  const pinkyUp = isFingerUp(pinky, pinkyPip);

  const indexFolded = isFingerFolded(indexFinger, indexPip);
  const middleFolded = isFingerFolded(middleFinger, middlePip);
  const ringFolded = isFingerFolded(ringFinger, ringPip);
  const pinkyFolded = isFingerFolded(pinky, pinkyPip);

  const indexClosed = isClosed(indexFinger, thumb);
  const middleClosed = isClosed(middleFinger, thumb);
  const ringClosed = isClosed(ringFinger, thumb);
  const pinkyClosed = isClosed(pinky, thumb);

  // Gesture detection logic
  if (thumbUp && indexFolded && middleFolded && ringFolded && pinkyFolded) {
    return GESTURES.THUMBS_UP;
  }

  if (!thumbUp && indexFolded && middleFolded && ringFolded && pinkyFolded) {
    return GESTURES.THUMBS_DOWN;
  }

  if (indexUp && middleUp && !ringUp && !pinkyUp && !thumbUp) {
    return GESTURES.PEACE_SIGN;
  }

  if (indexUp && pinkyUp && !middleUp && !ringUp) {
    return GESTURES.ROCK_SIGN;
  }

  if (indexUp && middleUp && ringUp && pinkyUp && thumbUp) {
    return GESTURES.OPEN_PALM;
  }

  if (indexUp && !middleUp && !ringUp && !pinkyUp) {
    return GESTURES.POINT_FINGER;
  }

  if (indexClosed && middleClosed && ringClosed && pinkyClosed && !indexUp && !middleUp) {
    return GESTURES.CLOSED_FIST;
  }

  return null;
}

/**
 * Detect swipe gestures from hand movement history
 * @param {Array} landmarks - Hand landmarks from MediaPipe
 * @returns {string|null} Swipe gesture type or null
 */
export function detectSwipeGesture(landmarks) {
  if (!landmarks || landmarks.length === 0) return null;

  const hand = landmarks[0];
  const palm = hand[9]; // Palm center in MediaPipe
  if (!palm) return null;

  handPositionHistory.push(palm);

  if (handPositionHistory.length > SWIPE_HISTORY_LENGTH) {
    handPositionHistory.shift();
  }

  if (handPositionHistory.length < SWIPE_HISTORY_LENGTH) return null;

  const startPos = handPositionHistory[0];
  const endPos = handPositionHistory[SWIPE_HISTORY_LENGTH - 1];
  const deltaX = endPos.x - startPos.x;

  if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
    handPositionHistory = []; // Reset after detecting swipe
    return deltaX > 0 ? GESTURES.SWIPE_RIGHT : GESTURES.SWIPE_LEFT;
  }

  return null;
}

/**
 * Map gesture to player action
 * @param {string} gesture - Gesture type
 * @returns {Object|null} Action object with action and label
 */
export function mapGestureToAction(gesture) {
  const now = Date.now();

  // Check cooldown
  if (
    gestureHistory[gesture] &&
    now - gestureHistory[gesture] < GESTURE_COOLDOWN_MS
  ) {
    if (window.gestureDebug) {
      window.gestureDebug.setCooldown(true);
    }
    return null;
  }

  gestureHistory[gesture] = now;
  if (window.gestureDebug) {
    window.gestureDebug.setCooldown(false);
  }

  const actionMap = {
    [GESTURES.THUMBS_UP]: { action: "resume", label: "▶ Play" },
    [GESTURES.THUMBS_DOWN]: { action: "pause", label: "⏸ Pause" },
    [GESTURES.PEACE_SIGN]: { action: "nextTrack", label: "⏭ Next" },
    [GESTURES.ROCK_SIGN]: { action: "previousTrack", label: "⏮ Previous" },
    [GESTURES.OPEN_PALM]: { action: "neutral", label: "🛑 Stop" },
    [GESTURES.POINT_FINGER]: { action: "volumeUp", label: "🔊 Volume Up" },
    [GESTURES.CLOSED_FIST]: { action: "volumeDown", label: "🔉 Volume Down" },
    [GESTURES.SWIPE_LEFT]: { action: "previousTrack", label: "⬅️  Previous" },
    [GESTURES.SWIPE_RIGHT]: { action: "nextTrack", label: "➡️ Next" },
  };

  return actionMap[gesture] || null;
}

/**
 * Execute gesture action
 * @param {string} action - Action type
 */
export function executeGestureAction(action) {
  switch (action) {
    case "resume":
      resume();
      break;
    case "pause":
      pause();
      break;
    case "nextTrack":
      nextTrack();
      break;
    case "previousTrack":
      previousTrack();
      break;
    case "volumeUp": {
      const currentVol = parseFloat(
        document.getElementById("volumeControl")?.value || 0.5,
      );
      const newVolUp = Math.min(currentVol + 0.1, 1);
      setVolume(newVolUp);
      document.getElementById("volumeControl").value = newVolUp;
      break;
    }
    case "volumeDown": {
      const currentVolDown = parseFloat(
        document.getElementById("volumeControl")?.value || 0.5,
      );
      const newVolDown = Math.max(currentVolDown - 0.1, 0);
      setVolume(newVolDown);
      document.getElementById("volumeControl").value = newVolDown;
      break;
    }
    case "neutral":
      console.log("Neutral gesture");
      break;
    default:
      console.warn(`Unknown action: ${action}`);
  }
}

/**
 * Draw hand landmarks on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} landmarks - Hand landmarks
 */
export function drawConnectors(ctx, landmarks) {
  const connections = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [0, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [5, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [9, 13],
    [13, 14],
    [14, 15],
    [15, 16],
    [13, 17],
    [17, 18],
    [18, 19],
    [19, 20],
    [0, 17],
  ];

  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 2;

  for (const [start, end] of connections) {
    const p1 = landmarks[start];
    const p2 = landmarks[end];

    if (!p1 || !p2) continue;

    ctx.beginPath();
    ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
    ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
    ctx.stroke();
  }
}

/**
 * Draw hand keypoints on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} landmarks - Hand landmarks
 */
export function drawLandmarks(ctx, landmarks) {
  ctx.fillStyle = "#ff0000";
  for (const landmark of landmarks) {
    ctx.beginPath();
    ctx.arc(
      landmark.x * ctx.canvas.width,
      landmark.y * ctx.canvas.height,
      3,
      0,
      2 * Math.PI,
    );
    ctx.fill();
  }
}

/**
 * Reset gesture detection state
 */
export function resetGestureState() {
  handPositionHistory = [];
  gestureHistory = {};
}

export default {
  detectGesture,
  detectSwipeGesture,
  mapGestureToAction,
  executeGestureAction,
  drawConnectors,
  drawLandmarks,
  resetGestureState,
  GESTURES,
};
