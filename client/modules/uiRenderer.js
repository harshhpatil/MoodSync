// modules/uiRenderer.js - UI rendering and DOM manipulation
/**
 * UI Renderer Module
 * Centralized DOM manipulation and rendering
 * Separates view logic from business logic
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

/**
 * Render a scrollable track list
 * @param {Array} tracks - Array of track objects
 * @param {number} focusIndex - Index of the currently focused track
 * @param {Function} onTrackClick - Callback when a track item is clicked
 */
export function renderTrackList(tracks, focusIndex, onTrackClick) {
  const container = document.getElementById("track-list");
  if (!container) return;

  container.innerHTML = "";

  const countDisplay = document.getElementById("trackCountDisplay");
  if (countDisplay) countDisplay.textContent = `${(tracks || []).length} tracks`;

  if (!Array.isArray(tracks) || tracks.length === 0) {
    container.innerHTML =
      '<p class="text-stone-500 text-xs text-center py-4">No tracks loaded</p>';
    return;
  }

  tracks.forEach((track, index) => {
    const item = document.createElement("div");
    const isFocused = index === focusIndex;
    const artistName = escapeHtml(
      track.artists && track.artists.length > 0
        ? track.artists[0].name
        : "Unknown",
    );
    const trackName = escapeHtml(track.name);

    item.className =
      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-xs " +
      (isFocused
        ? "bg-white/10 border border-white/20"
        : "hover:bg-stone-800/60 border border-transparent");

    item.innerHTML = `
      <span class="text-stone-500 font-mono w-5 flex-shrink-0 text-right">${index + 1}</span>
      <div class="flex-1 min-w-0">
        <p class="font-medium truncate ${isFocused ? "text-white" : "text-stone-300"}">${trackName}</p>
        <p class="text-stone-500 truncate">${artistName}</p>
      </div>
      ${isFocused ? '<span class="text-emerald-400 flex-shrink-0 text-[10px]">▶</span>' : ""}
    `;

    item.addEventListener("click", () => onTrackClick(index));
    container.appendChild(item);
  });

  // Scroll focused item into view
  const focusedItem = container.children[focusIndex];
  if (focusedItem) {
    focusedItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

/**
 * Update the Now Playing display with track information
 * @param {Object} track - Spotify track object from SDK state
 */
export function updateNowPlaying(track) {
  if (!track) return;

  const trackEl = document.getElementById("nowPlayingTrack");
  const artistEl = document.getElementById("nowPlayingArtist");
  const albumImg = document.getElementById("albumArtImg");
  const albumPlaceholder = document.getElementById("albumArtPlaceholder");

  if (trackEl) trackEl.textContent = track.name || "Unknown Track";

  const artistName =
    track.artists && track.artists.length > 0
      ? track.artists[0].name
      : "—";
  if (artistEl) artistEl.textContent = artistName;

  // Update album art (SDK provides album.images array; highest res is first)
  const albumImageUrl = track.album?.images?.[0]?.url ?? null;

  if (albumImg && albumPlaceholder) {
    if (albumImageUrl) {
      albumImg.src = albumImageUrl;
      albumImg.alt = escapeHtml(track.album ? track.album.name || "" : "");
      albumImg.classList.remove("hidden");
      albumPlaceholder.classList.add("hidden");
    } else {
      albumImg.classList.add("hidden");
      albumPlaceholder.classList.remove("hidden");
    }
  }
}

/**
 * Update the playback progress bar and time display
 * @param {number} position - Current position in milliseconds
 * @param {number} duration - Total track duration in milliseconds
 */
export function updateProgress(position, duration) {
  const progressFill = document.getElementById("progressFill");
  const currentTimeEl = document.getElementById("currentTime");
  const totalTimeEl = document.getElementById("totalTime");

  const formatTime = (ms) => {
    const totalSeconds = Math.floor((ms || 0) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const safeDuration = duration && duration > 0 ? duration : 1;
  const percent = Math.min(100, ((position || 0) / safeDuration) * 100);

  if (progressFill) progressFill.style.width = `${percent}%`;
  if (currentTimeEl) currentTimeEl.textContent = formatTime(position);
  if (totalTimeEl) totalTimeEl.textContent = formatTime(duration);
}

/**
 * Update the play/pause button icon to reflect current playback state
 * @param {boolean} paused - Whether playback is currently paused
 */
export function updatePlaybackState(paused) {
  const playIcon = document.getElementById("playIcon");
  const pauseIcon = document.getElementById("pauseIcon");

  if (!playIcon || !pauseIcon) return;

  if (paused) {
    playIcon.classList.remove("hidden");
    pauseIcon.classList.add("hidden");
  } else {
    playIcon.classList.add("hidden");
    pauseIcon.classList.remove("hidden");
  }
}

/**
 * Render the track stack (card stack UI) — legacy, kept for compatibility
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
    const rawArtistName =
      track.artists && track.artists.length > 0
        ? track.artists[0].name
        : "Unknown Artist";
    const artistName = escapeHtml(rawArtistName);
    const trackName = escapeHtml(track.name);

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
        <span class="text-2xl font-semibold text-white truncate">${trackName}</span>
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
    trackList.innerHTML = `<li class="text-red-500 p-4">Error: ${escapeHtml(message)}</li>`;
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
const MODE_BTN_ACTIVE_CLASS = "bg-blue-600";
const MODE_BTN_INACTIVE_CLASS = "bg-stone-800";

export function updateModeButtons(mode) {
  const emotionBtn = document.getElementById("emotionModeBtn");
  const gestureBtn = document.getElementById("gestureModeBtn");
  const emotionResult = document.getElementById("emotionResult");
  const gestureResult = document.getElementById("gestureResult");

  if (!emotionBtn || !gestureBtn) return;

  if (mode === "emotion") {
    emotionBtn.classList.remove(MODE_BTN_INACTIVE_CLASS);
    emotionBtn.classList.add(MODE_BTN_ACTIVE_CLASS);

    gestureBtn.classList.remove(MODE_BTN_ACTIVE_CLASS);
    gestureBtn.classList.add(MODE_BTN_INACTIVE_CLASS);

    if (gestureResult) {
      gestureResult.textContent = "";
    }
  } else {
    gestureBtn.classList.remove(MODE_BTN_INACTIVE_CLASS);
    gestureBtn.classList.add(MODE_BTN_ACTIVE_CLASS);

    emotionBtn.classList.remove(MODE_BTN_ACTIVE_CLASS);
    emotionBtn.classList.add(MODE_BTN_INACTIVE_CLASS);

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
    "fixed inset-0 bg-black/50 flex items-center justify-center z-[100]";
  loader.style.display = "none";
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
 * @param {number} value - Volume value (0-1 float)
 */
export function updateVolumeSlider(value) {
  const volumeControl = document.getElementById("volumeControl");
  if (volumeControl) {
    // Slider is now 0-100; convert incoming 0-1 float
    volumeControl.value = Math.round(Math.max(0, Math.min(1, value)) * 100);
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
  renderTrackList,
  renderTrackStack,
  displayError,
  showToast,
  updateNowPlaying,
  updateProgress,
  updatePlaybackState,
  updateEmotionDisplay,
  updateGestureDisplay,
  updateModeButtons,
  showLoading,
  hideLoading,
  updateVolumeSlider,
  clearErrors,
};
