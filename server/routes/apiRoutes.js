// routes/apiRoutes.js - API routes for music and player control
import express from "express";
import { config } from "../config.js";
import { SpotifyService } from "../services/spotifyService.js";
import { requireAuth, debugMiddleware } from "../middleware/authMiddleware.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiter for API endpoints
const apiLimiter = rateLimit({
  windowMs: config.rateLimits.api.windowMs,
  max: config.rateLimits.api.max,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /api/token
 * Returns access token from session for Spotify SDK
 * Client uses this to initialize Spotify Web Playback SDK
 */
router.get(
  "/api/token",
  debugMiddleware,
  apiLimiter,
  requireAuth,
  (req, res) => {
    const token = req.session?.accessToken;
    res.json({ token });
  },
);

/**
 * GET /top-tracks
 * Fetches user's top tracks from Spotify
 * Returns paginated list of user's most played/saved tracks
 */
router.get(
  "/top-tracks",
  debugMiddleware,
  apiLimiter,
  requireAuth,
  async (req, res, next) => {
    try {
      const token = req.session.accessToken;

      // Fetch tracks from Spotify service
      const data = await SpotifyService.getTopTracks(token);

      // Validate minimum tracks availability
      if (!data.items || data.items.length === 0) {
        console.warn("User has no top tracks available");
        return res.status(200).json({
          items: [],
          message: "No tracks available. Please add tracks to Spotify.",
        });
      }

      console.log(
        `✅ Successfully fetched ${data.items.length} top tracks for user`,
      );
      res.json(data);
    } catch (error) {
      if (error.message === "Token expired") {
        return res.status(401).json({ error: "Token expired. Please login again." });
      }

      console.error("Error in /top-tracks:", error.message);
      next(error); // Pass to error handler
    }
  },
);

/**
 * GET /health
 * Health check endpoint - useful for monitoring
 */
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
