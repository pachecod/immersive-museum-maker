/*
Immersive Museum Maker - A tool that helps people create immersive storytelling worlds using the A-Frame open source library. Output is optimized for mobile phones, desktop (WASD keys) and the Meta Quest headset browser.

Copyright (C) 2025  Dan Pacheco

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License in the LICENSE file of this repository for more details.
*/
// Express server for Immersive Museum VR Experience
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const unzipper = require("unzipper");

const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from the root directory
app.use(express.json({ limit: '2mb' }));

// Professor routes (must be before static middleware)
app.get("/professor/submissions", (req, res) => {
  try {
    if (!fs.existsSync(submissionsLog)) return res.json([]);
    const logs = fs
      .readFileSync(submissionsLog, "utf8")
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/professor/download/:filename", (req, res) => {
  try {
    const zipPath = path.join(submissionsDir, req.params.filename);
    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ error: "File not found" });
    }
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${req.params.filename}"`
    );
    res.setHeader("Content-Type", "application/zip");
    res.download(zipPath, req.params.filename, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: "Download failed" });
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/professor/download-html/:filename", (req, res) => {
  try {
    const zipPath = path.join(submissionsDir, req.params.filename);
    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Extract the zip to a temporary directory
    const tempDir = path.join(__dirname, 'temp', Date.now().toString());
    fs.mkdirSync(tempDir, { recursive: true });

    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: tempDir }))
      .on('close', () => {
        try {
          // Look for museum-scene.html first, then fall back to export/index.html
          let htmlPath = path.join(tempDir, 'museum-scene.html');
          let downloadName = 'museum-scene.html';
          
          if (!fs.existsSync(htmlPath)) {
            htmlPath = path.join(tempDir, 'export', 'index.html');
            downloadName = 'index.html';
          }
          
          if (!fs.existsSync(htmlPath)) {
            // Final fallback to root index.html
            htmlPath = path.join(tempDir, 'index.html');
            downloadName = 'index.html';
          }

          if (!fs.existsSync(htmlPath)) {
            return res.status(404).json({ error: "HTML file not found in submission" });
          }

          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${downloadName}"`
          );
          res.setHeader("Content-Type", "text/html");
          res.sendFile(htmlPath, (err) => {
            // Clean up temp directory
            fs.rmSync(tempDir, { recursive: true, force: true });
            if (err && !res.headersSent) {
              res.status(500).json({ error: "Download failed" });
            }
          });
        } catch (e) {
          // Clean up temp directory
          fs.rmSync(tempDir, { recursive: true, force: true });
          res.status(500).json({ error: e.message });
        }
      })
      .on('error', (err) => {
        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });
        res.status(500).json({ error: "Failed to extract submission" });
      });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use(express.static("."));

// Data directories
const submissionsDir = path.join(__dirname, "student-projects");
const hostedDirRoot = path.join(__dirname, "hosted-projects");
const submissionsLog = path.join(__dirname, "submissions.json");
const assetLibraryPath = path.join(__dirname, "asset-library.json");

// Ensure folders exist
for (const dir of [submissionsDir, hostedDirRoot]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Ensure asset library file exists
if (!fs.existsSync(assetLibraryPath)) {
  fs.writeFileSync(assetLibraryPath, JSON.stringify({ assets: [] }, null, 2));
}

// Multer upload config
const upload = multer({ dest: submissionsDir });

// Health check endpoint for Render (must be before template routes)
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "Immersive Museum VR Experience is running",
    timestamp: new Date().toISOString()
  });
});

// Serve the template selection page at root
app.get("/", (req, res) => {
  console.log("Serving template selection page at root");
  res.sendFile(path.join(__dirname, "index.html"));
});

// Serve the main VR experience at /editor
app.get("/editor", (req, res) => {
  res.sendFile(path.join(__dirname, "editor.html"));
});

// Admin tools (experimental)
app.get("/admin-tools", (req, res) => {
  res.sendFile(path.join(__dirname, "admin-tools.html"));
});

// Asset Library API
app.get('/api/assets', (req, res) => {
  try {
    const raw = fs.readFileSync(assetLibraryPath, 'utf8');
    const data = JSON.parse(raw || '{"assets":[]}');
    res.json({ success: true, assets: Array.isArray(data.assets) ? data.assets : [] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/assets', (req, res) => {
  try {
    const { url, name, type, thumbnail } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'url is required' });
    }
    const raw = fs.readFileSync(assetLibraryPath, 'utf8');
    const data = JSON.parse(raw || '{"assets":[]}');
    const now = new Date().toISOString();
    const asset = { id: Date.now().toString(36), url, name: name || '', type: type || '', thumbnail: thumbnail || '', createdAt: now };
    data.assets = Array.isArray(data.assets) ? data.assets : [];
    data.assets.push(asset);
    fs.writeFileSync(assetLibraryPath, JSON.stringify(data, null, 2));
    res.json({ success: true, asset });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.delete('/api/assets/:id', (req, res) => {
  try {
    const { id } = req.params;
    const raw = fs.readFileSync(assetLibraryPath, 'utf8');
    const data = JSON.parse(raw || '{"assets":[]}');
    const before = (data.assets || []).length;
    data.assets = (data.assets || []).filter(a => a.id !== id);
    const after = data.assets.length;
    fs.writeFileSync(assetLibraryPath, JSON.stringify(data, null, 2));
    res.json({ success: true, removed: before - after });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Bulk import assets: expects { assets: [...], mode?: 'merge'|'replace' }
app.post('/api/assets/import', (req, res) => {
  try {
    const { assets, mode } = req.body || {};
    if (!Array.isArray(assets)) {
      return res.status(400).json({ success: false, error: 'assets must be an array' });
    }
    const raw = fs.readFileSync(assetLibraryPath, 'utf8');
    const data = JSON.parse(raw || '{"assets":[]}');
    const current = Array.isArray(data.assets) ? data.assets : [];
    const now = new Date().toISOString();

    const normalized = assets.map((a) => ({
      id: (a && a.id) ? String(a.id) : Date.now().toString(36) + Math.random().toString(36).slice(2,7),
      url: a && a.url ? String(a.url) : '',
      name: a && a.name ? String(a.name) : '',
      type: a && a.type ? String(a.type) : '',
      thumbnail: a && a.thumbnail ? String(a.thumbnail) : '',
      createdAt: a && a.createdAt ? String(a.createdAt) : now
    })).filter(a => a.url);

    let updated;
    if (mode === 'replace') {
      updated = normalized;
    } else {
      // merge by id (if present) else by url
      const byId = new Map(current.map(a => [a.id, a]));
      const byUrl = new Map(current.map(a => [a.url, a]));
      for (const a of normalized) {
        const existing = (a.id && byId.get(a.id)) || byUrl.get(a.url);
        if (existing) {
          existing.url = a.url;
          existing.name = a.name;
          existing.type = a.type;
          existing.thumbnail = a.thumbnail;
        } else {
          current.push(a);
        }
      }
      updated = current;
    }

    fs.writeFileSync(assetLibraryPath, JSON.stringify({ assets: updated }, null, 2));
    res.json({ success: true, count: updated.length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Template-specific routes
app.get("/:template", (req, res) => {
  const template = req.params.template;
  
  // Handle template aliases
  const templateAliases = {
    'house': 'house-template',
    'outdoor': 'outdoor-exploration',
    'classroom': 'classroom'
  };
  
  const actualTemplate = templateAliases[template] || template;
  const templatePath = path.join(__dirname, "templates", `${actualTemplate}.json`);
  
  // Check if template exists
  if (!fs.existsSync(templatePath)) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Template Not Found</title></head>
      <body>
        <h1>Template Not Found</h1>
        <p>Template "${template}" does not exist.</p>
        <p>Available templates:</p>
        <ul>
          <li><a href="/outdoor-exploration">outdoor-exploration</a></li>
          <li><a href="/house">house</a></li>
          <li><a href="/classroom">classroom</a></li>
        </ul>
      </body>
      </html>
    `);
  }
  
  // Serve the main editor with template parameter
  res.sendFile(path.join(__dirname, "editor.html"));
});

// Professor API: list submissions

// Student: submit project zip
app.post("/submit-project", upload.single("project"), (req, res) => {
  try {
    const { studentName = "anonymous", projectName = "untitled" } = req.body || {};
    const projectFile = req.file;
    if (!projectFile) return res.status(400).json({ error: "No file uploaded" });

    const safeStudent = String(studentName).replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${safeStudent}_${Date.now()}.zip`;
    const finalPath = path.join(submissionsDir, fileName);
    fs.renameSync(projectFile.path, finalPath);

    const submission = {
      studentName,
      projectName,
      fileName,
      filePath: finalPath,
      submittedAt: new Date().toISOString(),
      isHosted: false,
    };
    fs.appendFileSync(submissionsLog, JSON.stringify(submission) + "\n");

    res.json({ success: true, message: "Project submitted", fileName });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Professor: host a submission at /hosted/:urlPath
app.use("/hosted", express.static(hostedDirRoot));
app.post("/professor/host/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const { urlPath } = req.body || {};
    if (!urlPath || !/^[a-zA-Z0-9_-]+$/.test(urlPath)) {
      return res.status(400).json({ success: false, message: "Invalid urlPath" });
    }

    const zipPath = path.join(submissionsDir, filename);
    if (!fs.existsSync(zipPath)) return res.status(404).json({ success: false, message: "File not found" });

    const targetDir = path.join(hostedDirRoot, urlPath);
    if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true, force: true });
    fs.mkdirSync(targetDir, { recursive: true });

    await new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: targetDir }))
        .on("close", resolve)
        .on("error", reject);
    });

    // Determine preferred index path (prefer standalone museum-scene.html over export/index.html)
    function resolveHostedIndex(dir) {
      // Prefer standalone museum-scene.html first
      const museumScenePath = path.join(dir, 'museum-scene.html');
      if (fs.existsSync(museumScenePath)) {
        return 'museum-scene.html';
      }
      
      // Fallback to export/index.html if museum-scene.html doesn't exist
      const stack = [dir];
      let fallback = null;
      let exportCandidate = null;
      while (stack.length) {
        const current = stack.pop();
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const ent of entries) {
          const full = path.join(current, ent.name);
          const rel = path.relative(dir, full).replace(/\\/g, '/');
          if (ent.isDirectory()) {
            stack.push(full);
          } else if (ent.isFile()) {
            // Capture any path that ends with /export/index.html
            if (/\/export\/index\.html$/i.test(rel)) exportCandidate = rel;
            if (!fallback && /(^|\/)index\.html$/i.test(rel)) fallback = rel;
          }
        }
      }
      if (exportCandidate) return exportCandidate;
      // If we didn't find nested export, check common build folders at top-level
      const prefer = [
        "dist/index.html",
        "build/index.html",
        "public/index.html",
        "index.html",
      ];
      for (const rel of prefer) {
        const p = path.join(dir, rel);
        if (fs.existsSync(p)) return rel;
      }
      return fallback || "index.html";
    }

    // Strong preference: standalone museum-scene.html, then export/index.html
    const museumSceneRel = fs.existsSync(path.join(targetDir, 'museum-scene.html'))
      ? 'museum-scene.html'
      : null;
    const exportRel = fs.existsSync(path.join(targetDir, 'export', 'index.html'))
      ? 'export/index.html'
      : null;
    const relIndex = museumSceneRel || exportRel || resolveHostedIndex(targetDir);

    // Update submissions log
    const logs = fs.existsSync(submissionsLog)
      ? fs
          .readFileSync(submissionsLog, "utf8")
          .split("\n")
          .filter((l) => l.trim())
          .map((l) => JSON.parse(l))
      : [];
    const updated = logs.map((s) => {
      if (s.fileName === filename) {
        s.isHosted = true;
        s.hostedPath = urlPath;
        s.hostedUrl = `/hosted/${urlPath}/${relIndex}`;
        s.hostedAt = new Date().toISOString();
      }
      return s;
    });
    fs.writeFileSync(submissionsLog, updated.map((s) => JSON.stringify(s)).join("\n") + (updated.length ? "\n" : ""));

    const hostedUrl = `${req.protocol}://${req.get("host")}/hosted/${urlPath}/${relIndex}`;
    res.json({ success: true, hostedUrl, urlPath });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Professor: unhost
app.post("/professor/unhost/:filename", (req, res) => {
  try {
    if (!fs.existsSync(submissionsLog)) return res.status(404).json({ success: false, message: "No submissions" });
    const logs = fs
      .readFileSync(submissionsLog, "utf8")
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
    const sub = logs.find((s) => s.fileName === req.params.filename);
    if (!sub) return res.status(404).json({ success: false, message: "Submission not found" });
    const hostedPath = sub.hostedPath || (sub.hostedUrl && (sub.hostedUrl.match(/\/hosted\/([^/]+)/) || [])[1]);
    if (hostedPath) {
      const dir = path.join(hostedDirRoot, hostedPath);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    }
    const updated = logs.map((s) => {
      if (s.fileName === req.params.filename) {
        delete s.hostedUrl;
        delete s.hostedPath;
        delete s.hostedAt;
        s.isHosted = false;
      }
      return s;
    });
    fs.writeFileSync(submissionsLog, updated.map((s) => JSON.stringify(s)).join("\n") + (updated.length ? "\n" : ""));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Professor: delete
app.delete("/professor/delete/:filename", (req, res) => {
  try {
    const zipPath = path.join(submissionsDir, req.params.filename);
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (fs.existsSync(submissionsLog)) {
      const logs = fs
        .readFileSync(submissionsLog, "utf8")
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l));
      const sub = logs.find((s) => s.fileName === req.params.filename);
      if (sub && sub.hostedPath) {
        const dir = path.join(hostedDirRoot, sub.hostedPath);
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
      }
      const updated = logs.filter((s) => s.fileName !== req.params.filename);
      fs.writeFileSync(submissionsLog, updated.map((s) => JSON.stringify(s)).join("\n") + (updated.length ? "\n" : ""));
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Save template configuration
app.post("/save-template", (req, res) => {
  try {
    const { template, config } = req.body;
    
    if (!template || !config) {
      return res.status(400).json({ 
        success: false, 
        error: "Template name and config are required" 
      });
    }

    // Handle template aliases
    const templateAliases = {
      'house': 'house-template',
      'outdoor': 'outdoor-exploration',
      'classroom': 'classroom'
    };
    
    const actualTemplate = templateAliases[template] || template;
    const templatePath = path.join(__dirname, "templates", `${actualTemplate}.json`);
    
    // Check if template exists
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ 
        success: false, 
        error: `Template "${template}" does not exist` 
      });
    }

    // Write the updated config to the template file
    fs.writeFileSync(templatePath, JSON.stringify(config, null, 2));
    
    console.log(`✅ Template "${template}" updated successfully`);
    res.json({ 
      success: true, 
      message: `Template "${template}" updated successfully` 
    });
    
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`🌐 Immersive Museum VR Experience running on port ${PORT}`);
  console.log(`🎮 Open your browser to: http://localhost:${PORT}`);
  console.log(`📱 VR-ready for desktop, mobile, and VR headsets`);
});


