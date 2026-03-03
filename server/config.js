// config.js - Centralized configuration management
import "dotenv/config";
import crypto from "node:crypto";

// Validate required environment variables
const requiredEnvVars = [
  "CLIENT_ID",
  "CLIENT_SECRET",
  "PORT",
  "CLIENT_URL",
  "REDIRECT_URI",
];

const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error(
    `ERROR: Missing environment variables: ${missingEnvVars.join(", ")}`,
  );
  process.exit(1);
}

export const config = {
  // Server
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: (process.env.NODE_ENV || "development") === "development",
  isProd: process.env.NODE_ENV === "production",

  // Spotify
  spotify: {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
    authUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    apiBase: "https://api.spotify.com/v1",
    scopes: "user-top-read streaming user-read-email user-read-private",
  },

  // Client
  clientUrl: process.env.CLIENT_URL,
  canonicalOrigin: new URL(process.env.REDIRECT_URI).origin,

  // Session
  session: {
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
    maxAge: 3600000, // 1 hour in milliseconds
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },

  // Rate limiting
  rateLimits: {
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 requests per window
    },
    api: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30, // 30 requests per minute
    },
  },

  // Gesture confidence and thresholds
  thresholds: {
    confidenceMin: 0.5,
  },
};

export default config;
