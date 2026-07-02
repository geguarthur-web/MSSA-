import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();

function publicUser(user) {
  return { id: user.id, email: user.email, pseudo: user.pseudo, verified: !!user.verified };
}

router.post("/register", async (req, res) => {
  const { email, password, pseudo } = req.body;
  if (!email || !password || !pseudo) {
    return res.status(400).json({ error: "Email, pseudo et mot de passe sont requis." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: "Un compte existe déjà avec cet email." });

  const id = uuid();
  const passwordHash = await bcrypt.hash(password, 10);
  const verificationToken = uuid();
  db.prepare(
    "INSERT INTO users (id, email, password_hash, pseudo, verified, verification_token) VALUES (?, ?, ?, ?, 0, ?)"
  ).run(id, email.toLowerCase(), passwordHash, pseudo, verificationToken);

  // Aucun service d'email n'est configuré : le lien de vérification est loggé côté serveur
  // et renvoyé dans la réponse pour permettre une démonstration sans SMTP.
  console.log(`[verification] Lien pour ${email}: /api/auth/verify/${verificationToken}`);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user), devVerificationToken: verificationToken });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis." });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: "Identifiants invalides." });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Identifiants invalides." });

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get("/verify/:token", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE verification_token = ?").get(req.params.token);
  if (!user) return res.status(404).json({ error: "Jeton de vérification invalide." });

  db.prepare("UPDATE users SET verified = 1, verification_token = NULL WHERE id = ?").run(user.id);
  res.json({ message: "Compte vérifié avec succès.", user: publicUser({ ...user, verified: 1 }) });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
