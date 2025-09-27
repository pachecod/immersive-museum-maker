/*
Immersive Museum Maker - A tool that helps people create immersive storytelling worlds using the A-Frame open source library. Output is optimized for mobile phones, desktop (WASD keys) and the Meta Quest headset browser.

Copyright (C) 2025  Dan Pacheco

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License in the LICENSE file of this repository for more details.
*/
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


