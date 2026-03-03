// modules/validation.js - Input validation and data verification
/**
 * Validation Module
 * Provides input validation and data verification
 * Prevents common runtime errors and edge cases
 */

/**
 * Validate track data structure
 * @param {Array} tracks - Tracks to validate
 * @returns {boolean} True if valid, throws error if not
 */
export function validateTracks(tracks) {
  if (!Array.isArray(tracks)) {
    throw new Error("Tracks must be an array");
  }

  if (tracks.length === 0) {
    console.warn("Warning: Empty tracks array");
    return false;
  }

  // Validate each track has required fields
  tracks.forEach((track, index) => {
    if (!track.uri || !track.name) {
      throw new Error(
        `Track at index ${index} missing required fields (uri, name)`,
      );
    }

    if (typeof track.uri !== "string") {
      throw new Error(`Track ${index} URI must be a string`);
    }

    if (typeof track.name !== "string") {
      throw new Error(`Track ${index} name must be a string`);
    }
  });

  return true;
}

/**
 * Validate Spotify URI format
 * @param {string} uri - Spotify URI to validate
 * @returns {boolean}
 */
export function validateSpotifyUri(uri) {
  if (!uri || typeof uri !== "string") {
    return false;
  }
  return uri.startsWith("spotify:track:");
}

/**
 * Validate token format
 * @param {string} token - Token to validate
 * @returns {boolean}
 */
export function validateToken(token) {
  if (!token || typeof token !== "string") {
    return false;
  }
  // Spotify tokens are typically long alphanumeric strings
  return token.length > 50;
}

/**
 * Validate device ID format
 * @param {string} deviceId - Device ID to validate
 * @returns {boolean}
 */
export function validateDeviceId(deviceId) {
  if (!deviceId || typeof deviceId !== "string") {
    return false;
  }
  return deviceId.length > 5;
}

/**
 * Validate index is within array bounds
 * @param {number} index - Index to validate
 * @param {Array} array - Array to check bounds against
 * @returns {boolean}
 */
export function validateIndex(index, array) {
  if (!Array.isArray(array)) {
    return false;
  }

  const num = parseInt(index);
  return !isNaN(num) && num >= 0 && num < array.length;
}

/**
 * Validate volume value (0-1)
 * @param {number} volume - Volume to validate
 * @returns {boolean}
 */
export function validateVolume(volume) {
  const num = parseFloat(volume);
  return !isNaN(num) && num >= 0 && num <= 1;
}

/**
 * Validate and sanitize text input
 * @param {string} text - Text to validate
 * @param {number} maxLength - Maximum length (default 1000)
 * @returns {string} Sanitized text
 */
export function validateAndSanitizeText(text, maxLength = 1000) {
  if (typeof text !== "string") {
    throw new Error("Input must be a string");
  }

  // Trim whitespace
  const sanitized = text.trim();

  // Check length
  if (sanitized.length > maxLength) {
    throw new Error(`Text exceeds maximum length of ${maxLength} characters`);
  }

  return sanitized;
}

/**
 * Validate emotion name
 * @param {string} emotion - Emotion to validate
 * @returns {boolean}
 */
export function validateEmotion(emotion) {
  const validEmotions = [
    "happy",
    "sad",
    "angry",
    "energetic",
    "calm",
    "neutral",
  ];
  return validEmotions.includes(emotion?.toLowerCase());
}

/**
 * Safe JSON parse with default fallback
 * @param {string} jsonString - JSON string to parse
 * @param {any} defaultValue - Default if parse fails
 * @returns {any}
 */
export function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.warn("JSON parse error:", err);
    return defaultValue;
  }
}

export default {
  validateTracks,
  validateSpotifyUri,
  validateToken,
  validateDeviceId,
  validateIndex,
  validateVolume,
  validateAndSanitizeText,
  validateEmotion,
  safeJsonParse,
};
