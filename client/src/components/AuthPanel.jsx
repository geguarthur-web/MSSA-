import { useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

export default function AuthPanel({ onClose }) {
  const { login, register, refresh } = useAuth();
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(null); // devVerificationToken

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
        onClose();
      } else {
        const data = await register(email, password, pseudo);
        setPendingVerification(data.devVerificationToken);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyNow = async () => {
    try {
      await api.verify(pendingVerification);
      await refresh();
      onClose();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === "login" ? "Connexion" : "Créer un compte"}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        {pendingVerification ? (
          <div className="verification-box">
            <p>
              Votre compte a été créé. Dans une vraie messagerie, un email de vérification vous serait envoyé.
              Pour cette démonstration, cliquez ci-dessous pour simuler la vérification de votre compte.
            </p>
            <button className="btn primary" onClick={handleVerifyNow}>Vérifier mon compte maintenant</button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "register" && (
              <label className="field">
                <span>Pseudo</span>
                <input type="text" value={pseudo} onChange={(e) => setPseudo(e.target.value)} required />
              </label>
            )}
            <label className="field">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="field">
              <span>Mot de passe</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </label>

            {error && <p className="form-error">{error}</p>}

            <button className="btn primary" type="submit" disabled={submitting}>
              {submitting ? "Chargement…" : mode === "login" ? "Se connecter" : "S'inscrire"}
            </button>

            <p className="switch-mode">
              {mode === "login" ? (
                <>Pas encore de compte ? <button type="button" className="link-btn" onClick={() => setMode("register")}>Inscrivez-vous</button></>
              ) : (
                <>Déjà un compte ? <button type="button" className="link-btn" onClick={() => setMode("login")}>Connectez-vous</button></>
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
