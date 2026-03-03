// routes/authRoutes.js - Authentication routes
import express from "express";
import crypto from "crypto";
import { config } from "../config.js";
import { SpotifyService } from "../services/spotifyService.js";
import { validateOAuthState, debugMiddleware } from "../middleware/authMiddleware.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: config.rateLimits.login.windowMs,
  max: config.rateLimits.login.max,
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /login
 * Initiates OAuth flow with Spotify
 * Generates and stores CSRF state token in session
 */
router.get("/login", debugMiddleware, loginLimiter, (req, res) => {
  try {
    // Generate secure random state token for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");

    // Store state in session
    req.session.oauthState = state;
    console.log(`[LOGIN] Generated state for session: ${req.sessionID}`);

    // Save session before redirecting
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ error: "Session error" });
      }

      console.log(`[LOGIN] Session saved successfully`);

      // Build Spotify authorization URL
      const params = new URLSearchParams({
        response_type: "code",
        client_id: config.spotify.clientId,
        scope: config.spotify.scopes,
        redirect_uri: config.spotify.redirectUri,
        state: state,
      });

      const authUrl = `${config.spotify.authUrl}?${params.toString()}`;
      res.redirect(authUrl);
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * GET /callback
 * OAuth callback from Spotify
 * Exchanges authorization code for access tokens
 * Validates CSRF state parameter
 */
router.get(
  "/callback",
  debugMiddleware,
  validateOAuthState,
  async (req, res) => {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    try {
      // Exchange code for tokens
      const { accessToken, refreshToken, expiresIn } =
        await SpotifyService.exchangeCodeForTokens(code);

      // Store tokens in secure session
      req.session.accessToken = accessToken;
      req.session.refreshToken = refreshToken;
      req.session.expiresAt = Date.now() + expiresIn * 1000;
      delete req.session.oauthState; // Clear state after use

      console.log("✅ Tokens received and stored in session");

      req.session.save((err) => {
        if (err) {
          console.error("❌ Session save error:", err);
          return res.status(500).json({ error: "Session error" });
        }

        console.log("✅ Redirecting to dashboard");
        res.redirect(`${config.clientUrl}/dashboard.html`);
      });
    } catch (error) {
      console.error("❌ OAuth callback error:", error.message);
      return res.status(500).json({ error: "Authentication failed" });
    }
  },
);

/**
 * GET /logout
 * Clears session and logs user out
 */
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destruction error:", err);
      return res.status(500).json({ error: "Logout failed" });
    }

    console.log("✅ User logged out successfully");
    res.json({ message: "Logged out successfully" });
  });
});

export default router;
