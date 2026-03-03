// modules/errorHandler.js - Centralized error handling and recovery
/**
 * Error Handler Module
 * Provides consistent error handling across application
 * Maps errors to user-friendly messages and recovery actions
 */

/**
 * Error codes and messages
 */
export const ERROR_CODES = {
  // Auth errors
  AUTH_REQUIRED: { code: 401, message: "Authentication required. Please login." },
  AUTH_FAILED: { code: 401, message: "Authentication failed. Please try again." },
  TOKEN_EXPIRED: { code: 401, message: "Session expired. Please login again." },

  // Camera/Permission errors
  CAMERA_DENIED: {
    code: 403,
    message: "Camera access denied. Check browser permissions.",
  },
  CAMERA_NOT_FOUND: {
    code: 404,
    message: "No camera found. Check your device.",
  },

  // Network errors
  NETWORK_ERROR: {
    code: 503,
    message: "Network error. Check your connection.",
  },
  TIMEOUT: { code: 408, message: "Request timeout. Please try again." },

  // Spotify errors
  NO_TRACKS: {
    code: 204,
    message: "No tracks available. Add songs to your Spotify library.",
  },
  DEVICE_OFFLINE: {
    code: 503,
    message: "Spotify device offline. Open Spotify on another device.",
  },
  PLAYBACK_FAILED: {
    code: 503,
    message: "Failed to play track. Ensure Spotify app is open.",
  },

  // Validation errors
  INVALID_INDEX: {
    code: 400,
    message: "Invalid track index.",
  },
  INVALID_VOLUME: {
    code: 400,
    message: "Invalid volume value (0-1).",
  },

  // Generic errors
  UNKNOWN: { code: 500, message: "An error occurred. Please try again." },
  NOT_FOUND: { code: 404, message: "Resource not found." },
  INVALID_REQUEST: { code: 400, message: "Invalid request." },
};

/**
 * Map error to user-friendly message
 * @param {Error|string} error - Error object or message
 * @returns {Object} { message, code, recoveryAction }
 */
export function mapErrorToMessage(error) {
  // Handle string errors
  if (typeof error === "string") {
    return mapErrorString(error);
  }

  if (!error) {
    return ERROR_CODES.UNKNOWN;
  }

  const message = error.message?.toLowerCase() || "";

  // Check error message for known patterns
  if (message.includes("auth") || message.includes("401")) {
    return ERROR_CODES.AUTH_FAILED;
  }

  if (message.includes("token") && message.includes("expired")) {
    return ERROR_CODES.TOKEN_EXPIRED;
  }

  if (message.includes("camera") || message.includes("permission")) {
    return ERROR_CODES.CAMERA_DENIED;
  }

  if (message.includes("network") || message.includes("timeout")) {
    return ERROR_CODES.NETWORK_ERROR;
  }

  if (
    message.includes("no tracks") ||
    message.includes("no device") ||
    message.includes("offline")
  ) {
    return ERROR_CODES.DEVICE_OFFLINE;
  }

  if (message.includes("playback") || message.includes("play failed")) {
    return ERROR_CODES.PLAYBACK_FAILED;
  }

  // Return error as-is if it has message property
  if (error.message) {
    return {
      code: error.code || 500,
      message: error.message,
    };
  }

  return ERROR_CODES.UNKNOWN;
}

/**
 * Map error string to error code
 * @param {string} errorString - Error string
 * @returns {Object}
 */
function mapErrorString(errorString) {
  const lower = errorString.toLowerCase();

  if (lower.includes("auth")) return ERROR_CODES.AUTH_FAILED;
  if (lower.includes("camera")) return ERROR_CODES.CAMERA_DENIED;
  if (lower.includes("network")) return ERROR_CODES.NETWORK_ERROR;
  if (lower.includes("timeout")) return ERROR_CODES.TIMEOUT;
  if (lower.includes("track")) return ERROR_CODES.NO_TRACKS;

  return ERROR_CODES.UNKNOWN;
}

/**
 * Handle API error response
 * @param {Response} response - HTTP response object
 * @returns {Object} Error object
 */
export async function handleApiError(response) {
  try {
    const data = await response.json();
    return {
      code: response.status,
      message: data.error || response.statusText,
    };
  } catch {
    return {
      code: response.status,
      message: response.statusText || "An error occurred",
    };
  }
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Maximum attempts
 * @param {number} initialDelay - Initial delay in ms
 * @returns {Promise}
 */
export async function retryWithBackoff(
  fn,
  maxAttempts = 3,
  initialDelay = 1000,
) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(
        `Attempt ${attempt}/${maxAttempts} failed:`,
        err.message,
      );

      if (attempt < maxAttempts) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Create error recovery guide
 * @param {Object} error - Error object from mapErrorToMessage
 * @returns {string} Recovery instructions
 */
export function getRecoveryGuide(error) {
  const { code } = error;

  switch (code) {
    case 401:
      return "Please log out and log back in.";
    case 403:
      return "Check your browser permissions and try again.";
    case 404:
      return "The requested resource was not found.";
    case 408:
      return "The request took too long. Check your connection and retry.";
    case 503:
      return "Please wait a moment and try again.";
    default:
      return "Please refresh the page and try again.";
  }
}

export default {
  ERROR_CODES,
  mapErrorToMessage,
  handleApiError,
  retryWithBackoff,
  getRecoveryGuide,
};
