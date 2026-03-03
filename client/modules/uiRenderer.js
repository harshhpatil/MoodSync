// modules/uiRenderer.js - UI rendering and DOM manipulation
/**
 * UI Renderer Module
 * Centralized DOM manipulation and rendering
 * Separates view logic from business logic
 */

/**
 * Render the track stack (card stack UI)
 * @param {Array} tracks - Array of track objects
 * @param {number} focusIndex - Index of focused track
 * @param {Function} onCardClick - Callback when card is clicked
 */
export function renderTrackStack(tracks, focusIndex, onCardClick) {
  const container = document.getElementById("track-stack-container");
  if (!container) {
    console.error("track-stack-container not found");
    return;
  }

  container.innerHTML = "";

  if (!Array.isArray(tracks) || tracks.length === 0) {
    container.innerHTML =
      '<div class="text-stone-400 p-4">No tracks available</div>';
    return;
  }

  tracks.forEach((track, index) => {
    const card = document.createElement("div");
    const offset = index - focusIndex;
    const artistName =
      track.artists && track.artists.length > 0
        ? track.artists[0].name
        : "Unknown Artist";

    // Determine styling based on position relative to focus
    let className =
      "absolute w-full max-w-sm p-6 rounded-2xl border transition-all duration-300 cursor-pointer ";
    let zIndex, scale, opacity, transform;

    if (offset === 0) {
      // Focused card - center, full size
      className +=
        "bg-[#1c1c1c] border-stone-500 z-20 scale-100 opacity-100 shadow-2xl";
      zIndex = 20;
      scale = 100;
      opacity = 100;
      transform = "translateY(0px)";
    } else if (offset === -1) {
      // Card above
      className +=
        "bg-[#252525] border-stone-800 z-10 scale-90 opacity-40 shadow-lg";
      zIndex = 10;
      scale = 90;
      opacity = 40;
      transform = "translateY(-32px)";
    } else if (offset === 1) {
      // Card below
      className +=
        "bg-[#252525] border-stone-800 z-10 scale-90 opacity-40 shadow-lg";
      zIndex = 10;
      scale = 90;
      opacity = 40;
      transform = "translateY(32px)";
    } else {
      // Hidden cards
      className +=
        "bg-[#1a1a1a] border-stone-900 z-0 scale-75 opacity-0 pointer-events-none";
      zIndex = 0;
      scale = 75;
      opacity = 0;
      transform = offset < -1 ? "translateY(-64px)" : "translateY(64px)";
    }

    card.className = className;
    card.style.cssText = `
      z-index: ${zIndex};
      transform: scale(${scale / 100}) ${transform};
      opacity: ${opacity / 100};
    `;

    card.innerHTML = `
      <div class="flex flex-col">
        <span class="text-2xl font-semibold text-white truncate">${track.name}</span>
        <span class="text-stone-400 text-sm mt-1">${artistName}</span>
      </div>
      <div class="mt-4 flex justify-between items-center">
        <span class="text-xs text-stone-500 uppercase tracking-widest font-bold">
          ${index + 1} / ${tracks.length}
        </span>
        ${offset === 0 ? '<span class="text-stone-300 font-mono text-sm">NOW PLAYING</span>' : ""}
      </div>
    `;

    card.addEventListener("click", (e) => {
      e.stopPropagation();
      onCardClick(index);
    });

    container.appendChild(card);
  });
}

/**
 * Display error message in UI
 * @param {string} message - Error message to display
 */
export function displayError(message) {
  const trackList = document.getElementById("tracks");
  if (trackList) {
    trackList.innerHTML = `<li class="text-red-500 p-4">Error: ${message}</li>`;
  }

  // Also show as toast
  showToast(`❌ ${message}`, "error");
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'info', 'error', 'success'
 * @param {number} duration - Duration in milliseconds (default 2000)
 */
export function showToast(message, type = "info", duration = 2000) {
  const toast = document.createElement("div");

  // Color based on type
  let bgColor = "bg-stone-700";
  if (type === "error") bgColor = "bg-red-600";
  if (type === "success") bgColor = "bg-green-600";

  toast.className = `fixed bottom-6 right-6 ${bgColor} text-white px-4 py-2 rounded-lg text-sm font-semibold z-50 animate-bounce`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duration);
}

/**
 * Update emotion result display
 * @param {string} emotion - Emotion name
 * @param {string} status - Status message ('Analyzing', 'Switching', etc.)
 */
export function updateEmotionDisplay(emotion, status) {
  const emotionResult = document.getElementById("emotionResult");
  if (emotionResult) {
    emotionResult.textContent = `😊 ${emotion.toUpperCase()} · ${status}`;
  }
}

/**
 * Update gesture result display
 * @param {string} label - Gesture label
 */
export function updateGestureDisplay(label) {
  const gestureResult = document.getElementById("gestureResult");
  if (gestureResult) {
    gestureResult.textContent = label;
    gestureResult.classList.add('gesture-card-action');
    showToast(`🖐️ ${label}`);
    setTimeout(() => {
      if (gestureResult) {
        gestureResult.textContent = "🖐️ Listening for gestures...";
        gestureResult.classList.remove('gesture-card-action');
      }
    }, 1200);
  }
}

/**
 * Switch mode button UI update
 * @param {string} mode - 'emotion' or 'gesture'
 */
export function updateModeButtons(mode) {
  const emotionBtn = document.getElementById("emotionModeBtn");
  const gestureBtn = document.getElementById("gestureModeBtn");
  const emotionResult = document.getElementById("emotionResult");
  const gestureResult = document.getElementById("gestureResult");

  if (!emotionBtn || !gestureBtn) return;

  if (mode === "emotion") {
    emotionBtn.classList.remove("bg-transparent", "text-white");
    emotionBtn.classList.add("bg-white", "text-black");

    gestureBtn.classList.remove("bg-white", "text-black");
    gestureBtn.classList.add("bg-transparent", "text-white");

    if (gestureResult) {
      gestureResult.textContent = "";
    }
  } else {
    gestureBtn.classList.remove("bg-transparent", "text-white");
    gestureBtn.classList.add("bg-white", "text-black");

    emotionBtn.classList.remove("bg-white", "text-black");
    emotionBtn.classList.add("bg-transparent", "text-white");

    if (emotionResult) {
      emotionResult.textContent = "";
    }
  }
}

/**
 * Show loading indicator
 * @param {string} message - Loading message
 */
export function showLoading(message = "Loading...") {
  const loader = document.getElementById("loadingIndicator") ||
    createLoadingIndicator();
  const loaderText = loader.querySelector("p");
  if (loaderText) {
    loaderText.textContent = message;
  }
  loader.style.display = "flex";
}

/**
 * Hide loading indicator
 */
export function hideLoading() {
  const loader = document.getElementById("loadingIndicator");
  if (loader) {
    loader.style.display = "none";
  }
}

/**
 * Create loading indicator element
 * @returns {HTMLElement}
 */
function createLoadingIndicator() {
  const loader = document.createElement("div");
  loader.id = "loadingIndicator";
  loader.className =
    "fixed inset-0 bg-black/50 flex items-center justify-center z-[100] hidden";
  loader.innerHTML = `
    <div class="bg-[#1c1c1c] border border-stone-700 rounded-lg p-6 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
      <p class="text-white text-sm">Loading...</p>
    </div>
  `;
  document.body.appendChild(loader);
  return loader;
}

/**
 * Update volume slider
 * @param {number} value - Volume value (0-1)
 */
export function updateVolumeSlider(value) {
  const volumeControl = document.getElementById("volumeControl");
  if (volumeControl) {
    volumeControl.value = Math.max(0, Math.min(1, value));
  }
}

/**
 * Clear all UI error states
 */
export function clearErrors() {
  const trackList = document.getElementById("tracks");
  if (trackList) {
    trackList.innerHTML = "";
  }
}

export default {
  renderTrackStack,
  displayError,
  showToast,
  updateEmotionDisplay,
  updateGestureDisplay,
  updateModeButtons,
  showLoading,
  hideLoading,
  updateVolumeSlider,
  clearErrors,
};
