// Load environment variables
import "dotenv/config";
import app from "./app.js";

// Validate PORT environment variable
const PORT = process.env.PORT;
if (!PORT) {
  console.error("ERROR: PORT must be defined in .env file");
  process.exit(1);
}

// Start the server
app.listen(PORT, () => {
  const appUrl = process.env.CLIENT_URL || `http://127.0.0.1:${PORT}`;
  console.log(`✅ Server running on ${appUrl}`);
  console.log(`📝 Login at: ${appUrl}/login`);
});
