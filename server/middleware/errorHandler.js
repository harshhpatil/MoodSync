// middleware/errorHandler.js - Centralized error handling
/**
 * Global error handler middleware
 * Catches all errors and returns consistent error responses
 */
export const globalErrorHandler = (err, req, res, next) => {
  console.error(
    `[ERROR] ${new Date().toISOString()} - ${req.method} ${req.path}:`,
    err.message,
  );

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation error",
      details: err.message,
    });
  }

  // Authentication errors
  if (err.status === 401 || err.message === "Unauthorized") {
    return res.status(401).json({
      error: "Authentication failed. Please login again.",
    });
  }

  // Authorization errors
  if (err.status === 403 || err.message === "Forbidden") {
    return res.status(403).json({
      error: "You do not have permission to access this resource.",
    });
  }

  // Database/Service errors
  if (err.message.includes("timeout") || err.message.includes("connection")) {
    return res.status(503).json({
      error: "Service temporarily unavailable. Please try again.",
    });
  }

  // Axios/Network errors
  if (err.isAxiosError) {
    return res.status(err.response?.status || 500).json({
      error: err.response?.data?.error || "External service error",
    });
  }

  // Default error
  return res.status(err.status || 500).json({
    error: "Internal server error",
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
  });
};

export default {
  globalErrorHandler,
  notFoundHandler,
};
