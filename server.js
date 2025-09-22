// Express server for Immersive Museum VR Experience
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static("."));

// Serve the main VR experience
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Health check endpoint for Render
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "Immersive Museum VR Experience is running",
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🌐 Immersive Museum VR Experience running on port ${PORT}`);
  console.log(`🎮 Open your browser to: http://localhost:${PORT}`);
  console.log(`📱 VR-ready for desktop, mobile, and VR headsets`);
});


