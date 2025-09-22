// Educational backend server for VR Hotspots

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const unzipper = require("unzipper");

const app = express();
const upload = multer({ dest: "student-projects/" });

// Serve the VR editor
app.use(express.static("."));
app.use(express.json());

// Serve hosted student projects
app.use("/hosted", express.static("hosted-projects"));

// Collect student project submissions
app.post("/submit-project", upload.single("project"), (req, res) => {
  const { studentName, projectName } = req.body;
  const projectFile = req.file;

  // Rename and organize the file
  const fileName = `${studentName.replace(
    /[^a-zA-Z0-9]/g,
    "_"
  )}_${Date.now()}.zip`;
  const finalPath = path.join("student-projects", fileName);

  fs.renameSync(projectFile.path, finalPath);

  // Log submission
  const submission = {
    studentName,
    projectName,
    fileName,
    submittedAt: new Date().toISOString(),
  };

  // Save to log file
  fs.appendFileSync("submissions.json", JSON.stringify(submission) + "\n");

  res.json({
    success: true,
    message: "Project submitted successfully!",
    fileName,
  });
});

// Professor can view all submissions (API endpoint)
app.get("/professor/submissions", (req, res) => {
  try {
    const logs = fs
      .readFileSync("submissions.json", "utf8")
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));

    res.json(logs);
  } catch (error) {
    res.json([]);
  }
});

// Professor can download individual projects
app.get("/professor/download/:filename", (req, res) => {
  try {
    const filePath = path.join("student-projects", req.params.filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Set proper headers for download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${req.params.filename}"`
    );
    res.setHeader("Content-Type", "application/zip");

    res.download(filePath, req.params.filename, (err) => {
      if (err) {
        console.error("Download error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Download failed" });
        }
      }
    });
  } catch (error) {
    console.error("Download endpoint error:", error);
    res.status(500).json({ error: "Server error during download" });
  }
});

// Professor can delete individual projects
app.delete("/professor/delete/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join("student-projects", filename);

    // Delete the ZIP file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Find and delete any hosted project folder for this submission
    if (fs.existsSync("submissions.json")) {
      const logs = fs
        .readFileSync("submissions.json", "utf8")
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));

      const submission = logs.find((sub) => sub.fileName === filename);

      // If this project was hosted, delete the hosted folder
      if (submission) {
        let hostedPath = submission.hostedPath;

        // Handle legacy format where only hostedUrl exists
        if (!hostedPath && submission.hostedUrl) {
          const urlMatch = submission.hostedUrl.match(/\/hosted\/([^\/]+)\//);
          if (urlMatch) {
            hostedPath = urlMatch[1];
          }
        }

        if (hostedPath) {
          const hostedDir = path.join("hosted-projects", hostedPath);
          if (fs.existsSync(hostedDir)) {
            fs.rmSync(hostedDir, { recursive: true, force: true });
            console.log(`Deleted hosted folder: ${hostedDir}`);
          }
        }
      }

      // Remove from submissions log
      const updatedLogs = logs.filter(
        (submission) => submission.fileName !== filename
      );

      // Rewrite the log file
      fs.writeFileSync(
        "submissions.json",
        updatedLogs.map((log) => JSON.stringify(log)).join("\n") +
          (updatedLogs.length > 0 ? "\n" : "")
      );
    }

    res.json({
      success: true,
      message: "Project and hosted files deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting project: " + error.message,
    });
  }
});

// Professor can host individual projects
app.post("/professor/host/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const { urlPath } = req.body;

    if (!urlPath || !/^[a-zA-Z0-9_-]+$/.test(urlPath)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid URL path. Use only letters, numbers, underscores, and hyphens.",
      });
    }

    const filePath = path.join("student-projects", filename);
    const hostedDir = path.join("hosted-projects", urlPath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Project file not found",
      });
    }

    // Check if project is already hosted somewhere else and remove it
    if (fs.existsSync("submissions.json")) {
      const logs = fs
        .readFileSync("submissions.json", "utf8")
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));

      const existingSubmission = logs.find((sub) => sub.fileName === filename);
      if (
        existingSubmission &&
        existingSubmission.hostedPath &&
        existingSubmission.hostedPath !== urlPath
      ) {
        // Remove old hosted version
        const oldHostedDir = path.join(
          "hosted-projects",
          existingSubmission.hostedPath
        );
        if (fs.existsSync(oldHostedDir)) {
          fs.rmSync(oldHostedDir, { recursive: true, force: true });
          console.log(
            `Removed old hosted version at: ${existingSubmission.hostedPath}`
          );
        }
      }
    }

    // Create hosted-projects directory if it doesn't exist
    if (!fs.existsSync("hosted-projects")) {
      fs.mkdirSync("hosted-projects");
    }

    // Remove existing hosted version if it exists (in case URL path is being reused)
    if (fs.existsSync(hostedDir)) {
      fs.rmSync(hostedDir, { recursive: true, force: true });
    }

    // Create directory for this hosted project
    fs.mkdirSync(hostedDir, { recursive: true });

    // Extract ZIP to hosted directory
    fs.createReadStream(filePath)
      .pipe(unzipper.Extract({ path: hostedDir }))
      .on("close", () => {
        // Update submissions log with hosted URL and path
        if (fs.existsSync("submissions.json")) {
          const logs = fs
            .readFileSync("submissions.json", "utf8")
            .split("\n")
            .filter((line) => line.trim())
            .map((line) => {
              const submission = JSON.parse(line);
              if (submission.fileName === filename) {
                submission.hostedUrl = `/hosted/${urlPath}/index.html`;
                submission.hostedPath = urlPath;
                submission.hostedAt = new Date().toISOString();
                submission.isHosted = true;
              }
              return JSON.stringify(submission);
            });

          fs.writeFileSync("submissions.json", logs.join("\n") + "\n");
        }

        const hostedUrl = `${req.protocol}://${req.get(
          "host"
        )}/hosted/${urlPath}/index.html`;
        res.json({
          success: true,
          message: "Project hosted successfully!",
          hostedUrl: hostedUrl,
          urlPath: urlPath,
        });
      })
      .on("error", (error) => {
        console.error("Extract error:", error);
        res.status(500).json({
          success: false,
          message: "Error extracting project: " + error.message,
        });
      });
  } catch (error) {
    console.error("Host endpoint error:", error);
    res.status(500).json({
      success: false,
      message: "Error hosting project: " + error.message,
    });
  }
});

// Professor can unhost individual projects
app.post("/professor/unhost/:filename", (req, res) => {
  try {
    const filename = req.params.filename;

    // Find the project in submissions log to get hosted path
    if (fs.existsSync("submissions.json")) {
      const logs = fs
        .readFileSync("submissions.json", "utf8")
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));

      const submission = logs.find((sub) => sub.fileName === filename);

      if (!submission || (!submission.hostedPath && !submission.hostedUrl)) {
        return res.status(404).json({
          success: false,
          message: "Project is not currently hosted",
        });
      }

      let hostedPath = submission.hostedPath;

      // Handle legacy format where only hostedUrl exists
      if (!hostedPath && submission.hostedUrl) {
        // Extract path from URL like "/hosted/sagarg/index.html" -> "sagarg"
        const urlMatch = submission.hostedUrl.match(/\/hosted\/([^\/]+)\//);
        if (urlMatch) {
          hostedPath = urlMatch[1];
        }
      }

      if (!hostedPath) {
        return res.status(404).json({
          success: false,
          message: "Could not determine hosted path",
        });
      }

      // Remove hosted directory
      const hostedDir = path.join("hosted-projects", hostedPath);
      if (fs.existsSync(hostedDir)) {
        fs.rmSync(hostedDir, { recursive: true, force: true });
      }

      // Update submissions log to remove hosting info
      const updatedLogs = logs.map((line) => {
        const sub = JSON.parse(JSON.stringify(line));
        if (sub.fileName === filename) {
          delete sub.hostedUrl;
          delete sub.hostedPath;
          delete sub.hostedAt;
          sub.isHosted = false;
        }
        return JSON.stringify(sub);
      });

      fs.writeFileSync("submissions.json", updatedLogs.join("\n") + "\n");

      res.json({
        success: true,
        message: "Project unhosted successfully!",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "No submissions found",
      });
    }
  } catch (error) {
    console.error("Unhost endpoint error:", error);
    res.status(500).json({
      success: false,
      message: "Error unhosting project: " + error.message,
    });
  }
});

app.listen(3000, () => {
  console.log("🌐 Server running on http://localhost:3000");
  console.log(
    "👨‍🏫 Professor dashboard: http://localhost:3000/professor-dashboard.html"
  );
});
