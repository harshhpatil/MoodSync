// Gesture recognition using hand pose detection
// Maps hand gestures to music control commands

const GESTURE_COOLDOWN_MS = 800; // Prevent rapid repeated commands
let lastGestureTime = {};
let lastDetectedGesture = null;

// Gesture type definitions
const GESTURES = {
  THUMBS_UP: 'thumbs_up',      // 👍 = Play/Resume
  THUMBS_DOWN: 'thumbs_down',  // 👎 = Pause
  PEACE_SIGN: 'peace_sign',    // ✌️ = Next Track
  ROCK_SIGN: 'rock_sign',      // 🤘 = Previous Track
  OPEN_PALM: 'open_palm',      // ✋ = Stop/Neutral
  POINT_FINGER: 'point_finger', // ☝️ = Volume Up
  CLOSED_FIST: 'closed_fist',  // ✊ = Volume Down
  SWIPE_LEFT: 'swipe_left',    // Swipe left = Previous
  SWIPE_RIGHT: 'swipe_right',  // Swipe right = Next
};

// Analyze hand landmarks to detect gesture
export function detectGesture(landmarks) {
  if (!landmarks || landmarks.length === 0) return null;
  
  const hand = landmarks[0];
  
  // Get key finger positions (landmarks)
  const thumb = hand.keypoints[4];
  const indexFinger = hand.keypoints[8];
  const middleFinger = hand.keypoints[12];
  const ringFinger = hand.keypoints[16];
  const pinky = hand.keypoints[20];
  const wrist = hand.keypoints[0];
  const palm = hand.keypoints[9];
  
  if (!thumb || !indexFinger || !middleFinger || !wrist || !palm) return null;
  
  // Helper functions
  const distance = (p1, p2) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  const isRaised = (p1, p2) => p1.y < p2.y - 0.05;
  const isLowered = (p1, p2) => p1.y > p2.y + 0.05;
  const isClosed = (p1, p2) => distance(p1, p2) < 0.08;
  
  const thumbUp = isRaised(thumb, wrist);
  const indexUp = isRaised(indexFinger, wrist);
  const middleUp = isRaised(middleFinger, wrist);
  const ringUp = isRaised(ringFinger, wrist);
  const pinkyUp = isRaised(pinky, wrist);
  
  const indexClosed = isClosed(indexFinger, thumb);
  const middleClosed = isClosed(middleFinger, thumb);
  const ringClosed = isClosed(ringFinger, thumb);
  const pinkyClosed = isClosed(pinky, thumb);
  
  // Gesture detection logic
  
  // Thumbs Up: Only thumb raised
  if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
    return GESTURES.THUMBS_UP;
  }
  
  // Thumbs Down: Closed fist with thumb lowered
  if (!thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp && !isClosed(thumb, wrist)) {
    return GESTURES.THUMBS_DOWN;
  }
  
  // Peace Sign: Index and middle raised, others closed
  if (indexUp && middleUp && !ringUp && !pinkyUp && thumbUp) {
    return GESTURES.PEACE_SIGN;
  }
  
  // Rock Sign: Index and pinky raised, others closed
  if (indexUp && pinkyUp && !middleUp && !ringUp) {
    return GESTURES.ROCK_SIGN;
  }
  
  // Open Palm: All fingers raised
  if (indexUp && middleUp && ringUp && pinkyUp && thumbUp) {
    return GESTURES.OPEN_PALM;
  }
  
  // Point Finger: Only index raised
  if (indexUp && !middleUp && !ringUp && !pinkyUp && thumbUp) {
    return GESTURES.POINT_FINGER;
  }
  
  // Closed Fist: All fingers closed
  if (indexClosed && middleClosed && ringClosed && pinkyClosed) {
    return GESTURES.CLOSED_FIST;
  }
  
  return null;
}

// Track hand movement for swipe gestures
let handPositionHistory = [];
const HISTORY_LENGTH = 10;

export function detectSwipeGesture(landmarks) {
  if (!landmarks || landmarks.length === 0) return null;
  
  const palm = landmarks[0].keypoints[9];
  if (!palm) return null;
  
  handPositionHistory.push(palm);
  if (handPositionHistory.length > HISTORY_LENGTH) {
    handPositionHistory.shift();
  }
  
  if (handPositionHistory.length < HISTORY_LENGTH) return null;
  
  const startPos = handPositionHistory[0];
  const endPos = handPositionHistory[HISTORY_LENGTH - 1];
  const deltaX = endPos.x - startPos.x;
  const threshold = 0.1;
  
  if (Math.abs(deltaX) > threshold) {
    handPositionHistory = []; // Reset after detecting swipe
    return deltaX > 0 ? GESTURES.SWIPE_RIGHT : GESTURES.SWIPE_LEFT;
  }
  
  return null;
}

// Map gesture to controller action
export function mapGestureToAction(gesture) {
  const now = Date.now();
  
  // Check cooldown
  if (lastGestureTime[gesture] && (now - lastGestureTime[gesture]) < GESTURE_COOLDOWN_MS) {
    return null;
  }
  
  lastGestureTime[gesture] = now;
  lastDetectedGesture = gesture;
  
  const actionMap = {
    [GESTURES.THUMBS_UP]: { action: 'resume', label: '▶ Play' },
    [GESTURES.THUMBS_DOWN]: { action: 'pause', label: '⏸ Pause' },
    [GESTURES.PEACE_SIGN]: { action: 'nextTrack', label: '⏭ Next' },
    [GESTURES.ROCK_SIGN]: { action: 'previousTrack', label: '⏮ Previous' },
    [GESTURES.OPEN_PALM]: { action: 'neutral', label: '🛑 Stop' },
    [GESTURES.POINT_FINGER]: { action: 'volumeUp', label: '🔊 Volume Up' },
    [GESTURES.CLOSED_FIST]: { action: 'volumeDown', label: '🔉 Volume Down' },
    [GESTURES.SWIPE_LEFT]: { action: 'previousTrack', label: '⬅️ Swipe Left' },
    [GESTURES.SWIPE_RIGHT]: { action: 'nextTrack', label: '➡️ Swipe Right' },
  };
  
  return actionMap[gesture] || null;
}

// Get current gesture status for UI
export function getLastGesture() {
  return lastDetectedGesture;
}

export function resetGestureHistory() {
  handPositionHistory = [];
  lastDetectedGesture = null;
  lastGestureTime = {};
}
