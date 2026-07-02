import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

import authRoutes from "./routes/auth.js";
import incidentRoutes from "./routes/incidents.js";
import { optionalAuth } from "./middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use(optionalAuth);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/incidents", incidentRoutes);

// Sert le frontend buildé (client/dist) s'il existe, pour un déploiement en une seule URL.
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api|\/uploads).*/, (_req, res, next) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

// Gestion centralisée des erreurs (dont les erreurs multer : taille/format de fichier)
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err) {
    console.error(err.message);
    return res.status(400).json({ error: err.message || "Une erreur est survenue." });
  }
  res.status(500).json({ error: "Erreur interne du serveur." });
});

app.listen(PORT, () => {
  console.log(`API incivilités démarrée sur http://localhost:${PORT}`);
});
