import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { CATEGORY_COLORS, CATEGORY_LABELS, formatDateTime } from "../categories.js";

const PARIS_CENTER = [48.8566, 2.3522];

function makeIcon(color) {
  return L.divIcon({
    className: "incident-marker",
    html: `<span style="background:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
}

const ICONS = {
  route: makeIcon(CATEGORY_COLORS.route),
  rue: makeIcon(CATEGORY_COLORS.rue),
};

const PIN_ICON = L.divIcon({
  className: "pin-marker",
  html: `<span>📍</span>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function ClickHandler({ onMapClick, isPlacingPin }) {
  useMapEvents({
    click(e) {
      if (isPlacingPin) onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapView({ incidents, onMapClick, isPlacingPin, reportingLocation, onSelectIncident }) {
  return (
    <MapContainer
      center={PARIS_CENTER}
      zoom={13}
      className={`leaflet-map ${isPlacingPin ? "placing-mode" : ""}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onMapClick={onMapClick} isPlacingPin={isPlacingPin} />

      {incidents.map((incident) => (
        <Marker
          key={incident.id}
          position={[incident.latitude, incident.longitude]}
          icon={ICONS[incident.category] || ICONS.rue}
        >
          <Popup>
            <div className="popup-content">
              <div className="popup-category" style={{ color: CATEGORY_COLORS[incident.category] }}>
                {CATEGORY_LABELS[incident.category]}
              </div>
              <div className="popup-subtype">{incident.subtype.replaceAll("_", " ")}</div>
              <div className="popup-meta">{formatDateTime(incident.occurred_at)}</div>
              {incident.address && <div className="popup-meta">{incident.address}</div>}
              <button className="btn small primary" onClick={() => onSelectIncident(incident.id)}>
                Voir les détails
              </button>
            </div>
          </Popup>
        </Marker>
      ))}

      {reportingLocation && (
        <Marker position={[reportingLocation.lat, reportingLocation.lng]} icon={PIN_ICON} />
      )}
    </MapContainer>
  );
}
