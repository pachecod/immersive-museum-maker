// Express server for Immersive Museum VR Experience
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const unzipper = require("unzipper");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static("."));
app.use(express.json());

// Data directories
const submissionsDir = path.join(__dirname, "student-projects");
const hostedDirRoot = path.join(__dirname, "hosted-projects");
const submissionsLog = path.join(__dirname, "submissions.json");

// Ensure folders exist
for (const dir of [submissionsDir, hostedDirRoot]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Multer upload config
const upload = multer({ dest: submissionsDir });

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

// Professor API: list submissions
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
    res.status(500).json({ error: "Unable to read submissions" });
  }
});

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
        s.hostedUrl = `/hosted/${urlPath}/index.html`;
        s.hostedAt = new Date().toISOString();
      }
      return s;
    });
    fs.writeFileSync(submissionsLog, updated.map((s) => JSON.stringify(s)).join("\n") + (updated.length ? "\n" : ""));

    const hostedUrl = `${req.protocol}://${req.get("host")}/hosted/${urlPath}/index.html`;
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

// Start the server
app.listen(PORT, () => {
  console.log(`🌐 Immersive Museum VR Experience running on port ${PORT}`);
  console.log(`🎮 Open your browser to: http://localhost:${PORT}`);
  console.log(`📱 VR-ready for desktop, mobile, and VR headsets`);
});


