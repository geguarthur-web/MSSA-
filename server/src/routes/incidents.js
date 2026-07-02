import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";
import { requireVerified } from "../middleware/auth.js";
import { CATEGORIES, isValidCategory, isValidSubtype } from "../categories.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Format de fichier non supporté. Formats acceptés : JPEG, PNG, WEBP, GIF."));
    }
    cb(null, true);
  },
});

const router = Router();

router.get("/categories", (_req, res) => {
  res.json(CATEGORIES);
});

function serializeIncident(incident) {
  const photos = db
    .prepare("SELECT id, filename, created_at FROM photos WHERE incident_id = ? ORDER BY created_at ASC")
    .all(incident.id)
    .map((p) => ({ id: p.id, url: `/uploads/${p.filename}`, created_at: p.created_at }));

  const testimonies = db
    .prepare(
      `SELECT t.id, t.content, t.created_at, u.pseudo AS author
       FROM testimonies t JOIN users u ON u.id = t.user_id
       WHERE t.incident_id = ? ORDER BY t.created_at ASC`
    )
    .all(incident.id);

  return {
    id: incident.id,
    category: incident.category,
    subtype: incident.subtype,
    description: incident.description,
    latitude: incident.latitude,
    longitude: incident.longitude,
    address: incident.address,
    occurred_at: incident.occurred_at,
    created_at: incident.created_at,
    reporter: incident.anonymous ? null : incident.reporter_pseudo || null,
    photos,
    testimonies,
  };
}

// Liste des incidents, avec filtres optionnels : category, subtype, since (date ISO)
router.get("/", (req, res) => {
  const { category, subtype, since } = req.query;
  let sql = `
    SELECT incidents.*, users.pseudo AS reporter_pseudo
    FROM incidents LEFT JOIN users ON users.id = incidents.user_id
    WHERE 1=1
  `;
  const params = [];
  if (category) {
    sql += " AND incidents.category = ?";
    params.push(category);
  }
  if (subtype) {
    sql += " AND incidents.subtype = ?";
    params.push(subtype);
  }
  if (since) {
    sql += " AND incidents.occurred_at >= ?";
    params.push(since);
  }
  sql += " ORDER BY incidents.occurred_at DESC LIMIT 500";

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(serializeIncident));
});

router.get("/:id", (req, res) => {
  const incident = db
    .prepare(
      `SELECT incidents.*, users.pseudo AS reporter_pseudo
       FROM incidents LEFT JOIN users ON users.id = incidents.user_id
       WHERE incidents.id = ?`
    )
    .get(req.params.id);
  if (!incident) return res.status(404).json({ error: "Signalement introuvable." });
  res.json(serializeIncident(incident));
});

router.post("/", upload.array("photos", 5), (req, res) => {
  const { category, subtype, description, latitude, longitude, address, occurred_at, anonymous } = req.body;

  if (!isValidCategory(category)) {
    return res.status(400).json({ error: "Catégorie invalide. Choisir 'route' ou 'rue'." });
  }
  if (!isValidSubtype(category, subtype)) {
    return res.status(400).json({ error: "Type d'incident invalide pour cette catégorie." });
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: "Coordonnées géographiques invalides." });
  }
  if (!occurred_at) {
    return res.status(400).json({ error: "La date et l'heure de l'incident sont requises." });
  }

  const id = uuid();
  const isAnonymous = anonymous === "true" || anonymous === true || !req.user;
  db.prepare(
    `INSERT INTO incidents (id, user_id, category, subtype, description, latitude, longitude, address, occurred_at, anonymous)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    req.user ? req.user.id : null,
    category,
    subtype,
    description || null,
    lat,
    lng,
    address || null,
    occurred_at,
    isAnonymous ? 1 : 0
  );

  const files = req.files || [];
  const insertPhoto = db.prepare(
    "INSERT INTO photos (id, incident_id, filename, uploaded_by) VALUES (?, ?, ?, ?)"
  );
  for (const file of files) {
    insertPhoto.run(uuid(), id, file.filename, req.user ? req.user.id : null);
  }

  const incident = db
    .prepare(
      `SELECT incidents.*, users.pseudo AS reporter_pseudo
       FROM incidents LEFT JOIN users ON users.id = incidents.user_id
       WHERE incidents.id = ?`
    )
    .get(id);
  res.status(201).json(serializeIncident(incident));
});

// Ajout de photos supplémentaires à un signalement existant
router.post("/:id/photos", upload.array("photos", 5), (req, res) => {
  const incident = db.prepare("SELECT id FROM incidents WHERE id = ?").get(req.params.id);
  if (!incident) return res.status(404).json({ error: "Signalement introuvable." });

  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ error: "Aucune photo fournie." });

  const insertPhoto = db.prepare(
    "INSERT INTO photos (id, incident_id, filename, uploaded_by) VALUES (?, ?, ?, ?)"
  );
  for (const file of files) {
    insertPhoto.run(uuid(), incident.id, file.filename, req.user ? req.user.id : null);
  }
  res.status(201).json({ message: "Photos ajoutées." });
});

// Témoignage : réservé aux utilisateurs vérifiés ayant assisté à la scène
router.post("/:id/testimonies", requireVerified, (req, res) => {
  const incident = db.prepare("SELECT id FROM incidents WHERE id = ?").get(req.params.id);
  if (!incident) return res.status(404).json({ error: "Signalement introuvable." });

  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Le témoignage ne peut pas être vide." });
  }

  const id = uuid();
  db.prepare("INSERT INTO testimonies (id, incident_id, user_id, content) VALUES (?, ?, ?, ?)").run(
    id,
    incident.id,
    req.user.id,
    content.trim()
  );

  const testimony = db
    .prepare(
      `SELECT t.id, t.content, t.created_at, u.pseudo AS author
       FROM testimonies t JOIN users u ON u.id = t.user_id WHERE t.id = ?`
    )
    .get(id);
  res.status(201).json(testimony);
});

export default router;
