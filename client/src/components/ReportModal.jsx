import { useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

function nowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function ReportModal({ location, categories, onClose, onSubmitted }) {
  const { user } = useAuth();
  const [category, setCategory] = useState("");
  const [subtype, setSubtype] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [occurredAt, setOccurredAt] = useState(nowForInput());
  const [anonymous, setAnonymous] = useState(!user);
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const subtypes = category ? categories[category].subtypes : {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!category || !subtype) {
      setError("Merci de choisir une catégorie et un type d'incident.");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("subtype", subtype);
      formData.append("description", description);
      formData.append("address", address);
      formData.append("occurred_at", occurredAt);
      formData.append("latitude", location.lat);
      formData.append("longitude", location.lng);
      formData.append("anonymous", anonymous ? "true" : "false");
      for (const file of photos) formData.append("photos", file);

      const incident = await api.createIncident(formData);
      onSubmitted(incident);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Signaler une incivilité</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <form className="report-form" onSubmit={handleSubmit}>
          <div className="field-row">
            <label className="field">
              <span>Catégorie *</span>
              <select value={category} onChange={(e) => { setCategory(e.target.value); setSubtype(""); }} required>
                <option value="">Choisir…</option>
                {Object.entries(categories).map(([key, cat]) => (
                  <option key={key} value={key}>{cat.label}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Type d'incident *</span>
              <select value={subtype} onChange={(e) => setSubtype(e.target.value)} required disabled={!category}>
                <option value="">Choisir…</option>
                {Object.entries(subtypes).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Date et heure *</span>
              <input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} required />
            </label>
            <label className="field">
              <span>Adresse (optionnel)</span>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ex : 12 rue de la Paix, Paris" />
            </label>
          </div>

          <p className="hint">
            Position choisie : {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </p>

          <label className="field">
            <span>Description / témoignage</span>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez ce qui s'est passé…"
            />
          </label>

          <label className="field">
            <span>Photos (optionnel, 5 max)</span>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp, image/gif"
              multiple
              onChange={(e) => setPhotos(Array.from(e.target.files).slice(0, 5))}
            />
          </label>

          {user && (
            <label className="checkbox-field">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              <span>Publier ce signalement de manière anonyme</span>
            </label>
          )}
          {!user && <p className="hint">Vous signalez en tant qu'invité (anonyme). Connectez-vous pour associer ce signalement à votre profil.</p>}

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? "Envoi…" : "Publier le signalement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
