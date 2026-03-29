import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 3000;

// Use JSON body parser
app.use(express.json());

// Simple persistence for the access code
const CONFIG_FILE = path.join(process.cwd(), "config.json");
let config = {
  accessCode: "BRANGKAS2026",
  masterKey: process.env.MASTER_KEY || "ADMIN123" // Default master key for the owner
};

// Load config if exists
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    config = { ...config, ...savedConfig };
  } catch (e) {
    console.error("Failed to load config:", e);
  }
}

// Function to save config
const saveConfig = () => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error("Failed to save config:", e);
  }
};

// API: Verify the access code
app.post("/api/auth/verify-code", (req, res) => {
  const { code } = req.body;
  if (code === config.accessCode) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Kode akses salah." });
  }
});

// API: Get current config (requires master key)
app.post("/api/admin/get-config", (req, res) => {
  const { masterKey } = req.body;
  if (masterKey === config.masterKey) {
    res.json({ success: true, accessCode: config.accessCode });
  } else {
    res.status(401).json({ success: false, message: "Master key salah." });
  }
});

// API: Update access code (requires master key)
app.post("/api/admin/update-code", (req, res) => {
  const { masterKey, newCode } = req.body;
  if (masterKey === config.masterKey) {
    if (!newCode || newCode.length < 4) {
      return res.status(400).json({ success: false, message: "Kode minimal 4 karakter." });
    }
    config.accessCode = newCode;
    saveConfig();
    res.json({ success: true, message: "Kode akses berhasil diubah." });
  } else {
    res.status(401).json({ success: false, message: "Master key salah." });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
