// modules/apiClient.js - Centralized API communication
/**
 * API Client Module
 * Handles all HTTP requests to the backend
 * Includes error handling and request validation
 */

const API_BASE_URL = window.location.origin;

/**
 * Fetch access token from server
 * @returns {Promise<string>} Access token
 * @throws {Error} If token fetch fails
 */
export async function fetchToken() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/token`, {
      credentials: "include",
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Auth failed");
      }
      throw new Error(`Token fetch failed: ${res.statusText}`);
    }

    const data = await res.json();

    if (!data.token) {
      throw new Error("No token in response");
    }

    return data.token;
  } catch (error) {
    console.error("fetchToken error:", error);
    throw error;
  }
}

/**
 * Get user's top tracks from server
 * @returns {Promise<{items: Array, ...}>} Spotify tracks data
 * @throws {Error} If tracks fetch fails
 */
export async function getTopTracks() {
  try {
    const res = await fetch(`${API_BASE_URL}/top-tracks`, {
      method: "GET",
      credentials: "include",
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Auth failed");
      }
      throw new Error(`Tracks fetch failed: ${res.statusText}`);
    }

    const data = await res.json();

    // Validate response structure
    if (!Array.isArray(data.items)) {
      throw new Error("Invalid tracks response structure");
    }

    return data;
  } catch (error) {
    console.error("getTopTracks error:", error);
    throw error;
  }
}

/**
 * Play a track using Spotify API
 * @param {string} token - Spotify access token
 * @param {string} deviceId - Spotify device ID
 * @param {string[]} uriList - Array of Spotify track URIs
 * @param {number} startIndex - Index to start playing from
 * @returns {Promise<Response>}
 * @throws {Error} If playback fails
 */
export async function playSpotifyUri(token, deviceId, uriList, startIndex) {
  // Input validation
  if (!token) throw new Error("Token required");
  if (!deviceId) throw new Error("Device ID required");
  if (!Array.isArray(uriList) || uriList.length === 0)
    throw new Error("URIs array required");
  if (startIndex < 0 || startIndex >= uriList.length)
    throw new Error("Invalid start index");

  try {
    const res = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          uris: uriList,
          offset: { position: startIndex },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!res.ok) {
      throw new Error(`Playback failed: ${res.statusText}`);
    }

    return res;
  } catch (error) {
    console.error("playSpotifyUri error:", error);
    throw error;
  }
}

/**
 * Logout user
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    const res = await fetch(`${API_BASE_URL}/logout`, {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Logout failed");
    }

    return await res.json();
  } catch (error) {
    console.error("logout error:", error);
    throw error;
  }
}

export default {
  fetchToken,
  getTopTracks,
  playSpotifyUri,
  logout,
};
