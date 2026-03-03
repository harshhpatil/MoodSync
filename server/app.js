// Main application setup
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import session from "express-session";
import FileStore from "session-file-store";
import { config } from "./config.js";
import { debugMiddleware } from "./middleware/authMiddleware.js";
import {
  globalErrorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import apiRoutes from "./routes/apiRoutes.js";

const fileStore = new FileStore(session);

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Security middleware - CORS MUST come before session
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware with file-based store
app.use(
  session({
    store: new fileStore(),
    secret: config.session.secret,
    resave: false,
    saveUninitialized: true,
    name: "sessionId",
    cookie: {
      httpOnly: true,
      secure: config.session.secure,
      sameSite: config.session.sameSite,
      maxAge: config.session.maxAge,
      path: "/",
    },
  }),
);

// Debug middleware
app.use(debugMiddleware);

// Canonical origin enforcement - redirect to proper origin
app.use((req, res, next) => {
  const requestOrigin = `${req.protocol}://${req.get("host")}`;

  // Only redirect GET requests
  if (req.method !== "GET") {
    return next();
  }

  if (requestOrigin !== config.canonicalOrigin) {
    console.log(`[REDIRECT] ${requestOrigin} → ${config.canonicalOrigin}`);
    return res.redirect(`${config.canonicalOrigin}${req.originalUrl}`);
  }

  next();
});

// Serve static files from client directory
app.use(express.static(path.join(__dirname, "../client")));

// ============================================
// ============================================
// ROUTES
// ============================================

// Mount route handlers
app.use("/", authRoutes);
app.use("/", apiRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler - catch all unmatched routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

export default app;
