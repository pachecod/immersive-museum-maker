// Simple test script to verify deployment
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static("."));

// Test endpoint
app.get("/test", (req, res) => {
  res.json({ 
    message: "Deployment test successful",
    timestamp: new Date().toISOString(),
    files: {
      index: "exists",
      script: "exists", 
      style: "exists",
      config: "exists"
    }
  });
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "Test deployment is running",
    timestamp: new Date().toISOString()
  });
});

// Main route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🧪 Test deployment running on port ${PORT}`);
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});


