import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { CATEGORY_COLORS, CATEGORY_LABELS, formatDateTime } from "../categories.js";

export default function IncidentDetail({ incidentId, onClose, onUpdated }) {
  const { user } = useAuth();
  const [incident, setIncident] = useState(null);
  const [error, setError] = useState("");
  const [testimony, setTestimony] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    api.getIncident(incidentId).then(setIncident).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  const handleAddTestimony = async (e) => {
    e.preventDefault();
    if (!testimony.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await api.addTestimony(incidentId, testimony.trim());
      setTestimony("");
      load();
      onUpdated?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!incident) {
    return (
      <aside className="detail-panel">
        <button className="icon-btn detail-close" onClick={onClose}>✕</button>
        <p>Chargement…</p>
        {error && <p className="form-error">{error}</p>}
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      <button className="icon-btn detail-close" onClick={onClose}>✕</button>

      <div className="detail-category" style={{ color: CATEGORY_COLORS[incident.category] }}>
        {CATEGORY_LABELS[incident.category]}
      </div>
      <h2 className="detail-subtype">{incident.subtype.replaceAll("_", " ")}</h2>

      <dl className="detail-meta">
        <dt>Date et heure</dt>
        <dd>{formatDateTime(incident.occurred_at)}</dd>
        {incident.address && (
          <>
            <dt>Adresse</dt>
            <dd>{incident.address}</dd>
          </>
        )}
        <dt>Position</dt>
        <dd>{incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}</dd>
        <dt>Signalé par</dt>
        <dd>{incident.reporter || "Anonyme"}</dd>
      </dl>

      {incident.description && (
        <div className="detail-description">
          <h3>Description</h3>
          <p>{incident.description}</p>
        </div>
      )}

      {incident.photos.length > 0 && (
        <div className="detail-photos">
          <h3>Photos</h3>
          <div className="photo-grid">
            {incident.photos.map((photo) => (
              <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer">
                <img src={photo.url} alt="Preuve du signalement" loading="lazy" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="detail-testimonies">
        <h3>Témoignages ({incident.testimonies.length})</h3>
        {incident.testimonies.length === 0 && <p className="hint">Aucun témoignage pour le moment.</p>}
        <ul>
          {incident.testimonies.map((t) => (
            <li key={t.id}>
              <strong>{t.author}</strong> <span className="hint">· {formatDateTime(t.created_at)}</span>
              <p>{t.content}</p>
            </li>
          ))}
        </ul>

        {user && user.verified && (
          <form className="testimony-form" onSubmit={handleAddTestimony}>
            <textarea
              rows={3}
              placeholder="Vous avez assisté à cette scène ? Ajoutez votre témoignage…"
              value={testimony}
              onChange={(e) => setTestimony(e.target.value)}
            />
            <button className="btn primary small" type="submit" disabled={submitting}>
              {submitting ? "Envoi…" : "Ajouter mon témoignage"}
            </button>
          </form>
        )}
        {user && !user.verified && (
          <p className="hint">Seuls les comptes vérifiés peuvent ajouter un témoignage. Vérifiez votre compte pour contribuer.</p>
        )}
        {!user && (
          <p className="hint">Connectez-vous avec un compte vérifié pour ajouter votre témoignage.</p>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
    </aside>
  );
}
