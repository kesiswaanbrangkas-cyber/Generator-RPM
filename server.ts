import express from "express";
import path from "path";
import fs from "fs";
import admin from 'firebase-admin';

// Load Firebase config to get project ID
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));

// Initialize Firebase Admin (this will bypass security rules)
// On Google Cloud / Vercel, it can often use default credentials or just the project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId
  });
}
const db = admin.firestore();

const app = express();
const PORT = 3000;

// Use JSON body parser
app.use(express.json());

// Simple persistence for the access code (now using Firestore)
let config = {
  accessCode: "BRANGKAS2026",
  masterKey: process.env.MASTER_KEY || "ADMIN123"
};

// Function to sync config from Firestore
const syncConfigFromFirestore = async () => {
  try {
    const configDoc = await db.collection("settings").doc("appConfig").get();
    if (configDoc.exists) {
      config = { ...config, ...configDoc.data() as any };
      console.log("Config synced from Firestore:", config.accessCode);
    } else {
      // Initialize Firestore with default config if it doesn't exist
      await db.collection("settings").doc("appConfig").set(config);
      console.log("Firestore initialized with default config.");
    }
  } catch (e) {
    console.error("Failed to sync config from Firestore:", e);
  }
};

// Initial sync
syncConfigFromFirestore();

// API: Verify the access code
app.post("/api/auth/verify-code", async (req, res) => {
  const { code } = req.body;
  await syncConfigFromFirestore(); // Ensure we have the latest code
  if (code === config.accessCode) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Kode akses salah." });
  }
});

// API: Get current config (requires master key)
app.post("/api/admin/get-config", async (req, res) => {
  const { masterKey } = req.body;
  await syncConfigFromFirestore();
  if (masterKey === config.masterKey) {
    res.json({ success: true, accessCode: config.accessCode });
  } else {
    res.status(401).json({ success: false, message: "Master key salah." });
  }
});

// API: Update access code (requires master key)
app.post("/api/admin/update-code", async (req, res) => {
  const { masterKey, newCode } = req.body;
  await syncConfigFromFirestore();
  if (masterKey === config.masterKey) {
    if (!newCode || newCode.length < 4) {
      return res.status(400).json({ success: false, message: "Kode minimal 4 karakter." });
    }
    config.accessCode = newCode;
    try {
      await db.collection("settings").doc("appConfig").update({ accessCode: newCode });
      res.json({ success: true, message: "Kode akses berhasil diubah dan tersimpan di Firestore." });
    } catch (e) {
      console.error("Failed to update Firestore:", e);
      res.status(500).json({ success: false, message: "Gagal menyimpan ke database." });
    }
  } else {
    res.status(401).json({ success: false, message: "Master key salah." });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  // Only listen if not running as a serverless function
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
