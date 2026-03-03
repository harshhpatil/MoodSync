// middleware/authMiddleware.js - Authentication and authorization middleware
import { SpotifyService } from "../services/spotifyService.js";

/**
 * Middleware to check if user is authenticated
 * Validates that session has an access token
 */
export const requireAuth = (req, res, next) => {
  const token = req.session?.accessToken;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated. Please login first." });
  }

  next();
};

/**
 * Middleware to validate OAuth state parameter
 * CSRF protection - ensures state matches session state
 */
export const validateOAuthState = (req, res, next) => {
  const { state } = req.query;

  if (!state) {
    console.error("❌ CSRF attack detected: No state parameter in response");
    return res.status(403).json({ error: "Invalid state parameter: missing state" });
  }

  if (!req.session?.oauthState) {
    console.error("❌ CSRF attack detected: No state stored in session");
    return res.status(403).json({ error: "Invalid state parameter: no session state" });
  }

  if (state !== req.session.oauthState) {
    console.error(
      `❌ CSRF attack detected: State mismatch.\nExpected: ${req.session.oauthState}\nGot: ${state}`,
    );
    return res.status(403).json({ error: "Invalid state parameter: mismatch" });
  }

  next();
};

/**
 * Middleware to log requests for debugging
 */
export const debugMiddleware = (req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] [${req.method}] ${req.path}`);
  console.log(`  Session ID: ${req.sessionID}`);
  console.log(`  Has access token: ${req.session?.accessToken ? "YES" : "NO"}`);
  next();
};

export default {
  requireAuth,
  validateOAuthState,
  debugMiddleware,
};
