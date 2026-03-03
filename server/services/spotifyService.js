// services/spotifyService.js - Spotify API integration layer
import axios from "axios";
import { config } from "../config.js";

/**
 * Spotify Service - Handles all Spotify API interactions
 * Separates API logic from route handlers
 */
export class SpotifyService {
  /**
   * Exchange authorization code for access tokens
   * @param {string} code - Authorization code from Spotify
   * @returns {Promise<{accessToken, refreshToken, expiresIn}>}
   */
  static async exchangeCodeForTokens(code) {
    if (!code) {
      throw new Error("Authorization code is required");
    }

    const authHeader =
      "Basic " +
      Buffer.from(
        `${config.spotify.clientId}:${config.spotify.clientSecret}`,
      ).toString("base64");

    try {
      const response = await axios.post(
        config.spotify.tokenUrl,
        new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: config.spotify.redirectUri,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: authHeader,
          },
          timeout: 10000, // 10 second timeout
        },
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      console.error(
        "Spotify token exchange failed:",
        error.response?.data?.error || error.message,
      );
      throw new Error(
        "Failed to exchange authorization code for tokens",
      );
    }
  }

  /**
   * Fetch user's top tracks from Spotify
   * @param {string} accessToken - Spotify access token
   * @returns {Promise<{items: Array, ...}>}
   */
  static async getTopTracks(accessToken) {
    if (!accessToken) {
      throw new Error("Access token is required");
    }

    try {
      const response = await axios.get(
        `${config.spotify.apiBase}/me/top/tracks`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 10000,
        },
      );

      // Validate response structure
      if (!response.data.items || !Array.isArray(response.data.items)) {
        throw new Error("Invalid response format from Spotify");
      }

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error("Token expired");
      }
      console.error(
        "Failed to fetch top tracks:",
        error.response?.data?.error || error.message,
      );
      throw new Error("Failed to fetch top tracks");
    }
  }

  /**
   * Validate access token is still valid
   * @param {string} accessToken - Spotify access token
   * @returns {Promise<boolean>}
   */
  static async validateToken(accessToken) {
    if (!accessToken) {
      return false;
    }

    try {
      const response = await axios.get(`${config.spotify.apiBase}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

export default SpotifyService;
