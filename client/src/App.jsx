import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import { useAuth } from "./AuthContext.jsx";
import MapView from "./components/MapView.jsx";
import ReportModal from "./components/ReportModal.jsx";
import IncidentDetail from "./components/IncidentDetail.jsx";
import AuthPanel from "./components/AuthPanel.jsx";
import Filters from "./components/Filters.jsx";

export default function App() {
  const { user, logout, loading } = useAuth();
  const [categories, setCategories] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [filters, setFilters] = useState({ category: "", subtype: "" });
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [reportingLocation, setReportingLocation] = useState(null); // {lat, lng}
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [error, setError] = useState("");

  const loadIncidents = useCallback(async () => {
    try {
      const data = await api.listIncidents(filters);
      setIncidents(data);
    } catch (e) {
      setError(e.message);
    }
  }, [filters]);

  useEffect(() => {
    api.categories().then(setCategories).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const handleMapClick = (latlng) => {
    if (isPlacingPin) {
      setReportingLocation(latlng);
      setIsPlacingPin(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setReportingLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setError("Impossible d'obtenir votre position. Placez le repère manuellement sur la carte.")
    );
  };

  const handleReportSubmitted = (incident) => {
    setReportingLocation(null);
    setIncidents((prev) => [incident, ...prev]);
    setSelectedIncidentId(incident.id);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">📍</span>
          <span>SignalCivic</span>
        </div>
        <div className="topbar-actions">
          {!loading && user && (
            <>
              <span className="user-chip">
                {user.pseudo} {user.verified ? <span className="badge-verified">vérifié ✓</span> : <span className="badge-unverified">non vérifié</span>}
              </span>
              <button className="btn ghost" onClick={logout}>Déconnexion</button>
            </>
          )}
          {!loading && !user && (
            <button className="btn ghost" onClick={() => setShowAuth(true)}>Connexion / Inscription</button>
          )}
          <button
            className="btn primary"
            onClick={() => {
              setSelectedIncidentId(null);
              setIsPlacingPin(true);
            }}
          >
            🚨 Signaler une incivilité
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner" onClick={() => setError("")}>
          {error} <span className="dismiss">✕</span>
        </div>
      )}

      {isPlacingPin && (
        <div className="placing-banner">
          Cliquez sur la carte à l'endroit de l'incident, ou{" "}
          <button className="link-btn" onClick={handleUseMyLocation}>utiliser ma position actuelle</button>.
          <button className="link-btn" onClick={() => setIsPlacingPin(false)}>Annuler</button>
        </div>
      )}

      <div className="main-layout">
        <aside className="sidebar">
          {categories && (
            <Filters categories={categories} filters={filters} onChange={setFilters} count={incidents.length} />
          )}
        </aside>

        <main className="map-area">
          <MapView
            incidents={incidents}
            onMapClick={handleMapClick}
            isPlacingPin={isPlacingPin}
            reportingLocation={reportingLocation}
            onSelectIncident={setSelectedIncidentId}
          />
        </main>

        {selectedIncidentId && (
          <IncidentDetail
            incidentId={selectedIncidentId}
            onClose={() => setSelectedIncidentId(null)}
            onUpdated={loadIncidents}
          />
        )}
      </div>

      {reportingLocation && categories && (
        <ReportModal
          location={reportingLocation}
          categories={categories}
          onClose={() => setReportingLocation(null)}
          onSubmitted={handleReportSubmitted}
        />
      )}

      {showAuth && <AuthPanel onClose={() => setShowAuth(false)} />}
    </div>
  );
}
