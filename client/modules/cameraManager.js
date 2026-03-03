// modules/cameraManager.js - Camera input and video stream management
/**
 * Camera Manager Module
 * Handles camera access, video stream setup
 * Manages emotion detection and gesture mode camera initialization
 */

import { state } from "./state.js";
import { loadFaceModels, startEmotionDetection, stopEmotionDetection } from "./emotionDetector.js";
import { 
  resetGestureState, 
  detectGesture, 
  detectSwipeGesture, 
  mapGestureToAction, 
  executeGestureAction,
  drawConnectors,
  drawLandmarks 
} from "./gestureController.js";
import { displayError, updateGestureDisplay } from "./uiRenderer.js";

/**
 * Check if camera is already active
 * @returns {boolean}
 */
export function isCameraActive() {
  return state.cameraActive;
}

/**
 * Start camera for emotion detection
 * @returns {Promise<void>}
 */
export async function startEmotionMode() {
  try {
    const video = document.getElementById("video");

    if (!video) {
      throw new Error("Video element not found");
    }

    // Ensure previous camera sessions are closed before switching mode
    stopGestureMode();

    // Ensure models are loaded
    await loadFaceModels();

    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    video.srcObject = stream;
    state.startCamera();

    // Start emotion detection loop
    startEmotionDetection();

    console.log("✅ Emotion mode started");
  } catch (err) {
    console.error("Camera access denied or error:", err);
    displayError("Camera access denied. Check browser permissions.");
  }
}

/**
 * Start camera for gesture mode
 * @returns {Promise<void>}
 */
export async function startGestureMode() {
  try {
    const video = document.getElementById("video");

    if (!video) {
      throw new Error("Video element not found");
    }

    // Ensure previous camera sessions are closed before switching mode
    stopEmotionMode();
    stopGestureMode();

    // Check if MediaPipe Hands is available
    if (!window.Hands) {
      throw new Error("MediaPipe Hands not loaded");
    }

    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    video.srcObject = stream;
    state.startCamera();

    // Initialize MediaPipe Hands detector
    const hands = new window.Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: state.GESTURE_CONFIDENCE_THRESHOLD,
      minTrackingConfidence: 0.5,
    });

    state.handsDetector = hands;

    // Setup canvas for gesture visualization
    const canvas = document.getElementById("gestureCanvas");
    if (!canvas) {
      throw new Error("Gesture canvas element not found");
    }
    canvas.classList.remove("hidden");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Update canvas dimensions after video loads
    video.addEventListener("loadedmetadata", () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    });

    updateGestureDisplay("🖐️ Gesture Control Active");
    resetGestureState();

    // Setup hand detection callback
    hands.onResults(onGestureResults);

    // Setup camera for MediaPipe
    const camera = new window.Camera(video, {
      onFrame: async () => {
        try {
          await hands.send({ image: video });
        } catch (frameError) {
          console.warn("Gesture frame processing error:", frameError);
        }
      },
      width: 640,
      height: 480,
    });

    camera.start();
    state.currentCamera = camera;

    console.log("✅ Gesture mode started");
  } catch (err) {
    console.error("Gesture mode error:", err);
    displayError("Failed to start gesture mode. Check permissions.");
  }
}

/**
 * Callback for MediaPipe gesture results
 * @param {Object} results - Hand detection results
 */
function onGestureResults(results) {
  const canvas = document.getElementById("gestureCanvas");
  if (!canvas) return;

  const canvasCtx = canvas.getContext("2d");
  if (!canvasCtx) return;

  // Clear canvas
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

  // Update debug info
  if (window.gestureDebug) {
    window.gestureDebug.setTracking(
      results.multiHandLandmarks && results.multiHandLandmarks.length > 0
    );
  }

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks;

    // Update landmarks count in debug panel
    if (window.gestureDebug) {
      window.gestureDebug.updateLandmarks(landmarks[0]?.length || 0);
    }

    // Draw hand landmarks
    for (const hand of landmarks) {
      drawConnectors(canvasCtx, hand);
      drawLandmarks(canvasCtx, hand);
    }

    // Detect gesture
    const gesture = detectGesture(landmarks);
    const swipeGesture = detectSwipeGesture(landmarks);
    const detectedGesture = swipeGesture || gesture;

    if (detectedGesture) {
      const actionData = mapGestureToAction(detectedGesture);
      if (actionData) {
        if (window.gestureDebug) {
          window.gestureDebug.updateGesture(detectedGesture);
          window.gestureDebug.setCooldown(false);
        }
        executeGestureAction(actionData.action);
        updateGestureDisplay(actionData.label);
      }
    } else {
      if (window.gestureDebug) {
        window.gestureDebug.updateGesture('Analyzing...');
      }
    }
  } else {
    if (window.gestureDebug) {
      window.gestureDebug.updateLandmarks(0);
      window.gestureDebug.updateGesture('None');
      window.gestureDebug.setTracking(false);
    }
    const gestureResult = document.getElementById("gestureResult");
    if (gestureResult && gestureResult.textContent !== "🖐️ Show your hand to control") {
      gestureResult.textContent = "🖐️ Show your hand to control";
    }
  }
}

/**
 * Stop camera and cleanup
 * @returns {void}
 */
export function stopCamera() {
  stopEmotionMode();
  stopGestureMode();
  state.stopCamera();
}

/**
 * Stop emotion detection mode
 * @returns {void}
 */
function stopEmotionMode() {
  stopEmotionDetection();
}

/**
 * Stop gesture mode
 * @returns {void}
 */
function stopGestureMode() {
  if (state.handsDetector) {
    state.handsDetector.close();
    state.handsDetector = null;
  }

  if (state.currentCamera) {
    state.currentCamera.stop();
    state.currentCamera = null;
  }

  const video = document.getElementById("video");
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }

  const canvas = document.getElementById("gestureCanvas");
  if (canvas) {
    canvas.classList.add("hidden");
    canvas.width = 0;
    canvas.height = 0;
  }

  const gestureResult = document.getElementById("gestureResult");
  if (gestureResult) {
    gestureResult.textContent = "";
  }

  resetGestureState();
  console.log("✅ Gesture mode stopped");
}

export default {
  isCameraActive,
  startEmotionMode,
  startGestureMode,
  stopCamera,
};
