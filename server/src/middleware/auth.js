import jwt from "jsonwebtoken";
import { db } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function signToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });
}

// Attache req.user si un token valide est fourni, sans bloquer la requête.
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET);
      const user = db.prepare("SELECT id, email, pseudo, verified FROM users WHERE id = ?").get(payload.sub);
      if (user) req.user = user;
    } catch {
      // token invalide ou expiré : on continue en anonyme
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Authentification requise." });
  next();
}

export function requireVerified(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Authentification requise." });
  if (!req.user.verified) return res.status(403).json({ error: "Seuls les utilisateurs vérifiés peuvent effectuer cette action." });
  next();
}
