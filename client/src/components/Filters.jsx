import { CATEGORY_LABELS } from "../categories.js";

export default function Filters({ categories, filters, onChange, count }) {
  const subtypes = filters.category ? categories[filters.category]?.subtypes || {} : {};

  return (
    <div className="filters">
      <h2>Signalements</h2>
      <p className="filters-count">{count} incident{count > 1 ? "s" : ""} affiché{count > 1 ? "s" : ""}</p>

      <label className="field">
        <span>Catégorie</span>
        <select
          value={filters.category}
          onChange={(e) => onChange({ category: e.target.value, subtype: "" })}
        >
          <option value="">Toutes</option>
          {Object.entries(categories).map(([key, cat]) => (
            <option key={key} value={key}>{cat.label}</option>
          ))}
        </select>
      </label>

      {filters.category && (
        <label className="field">
          <span>Type</span>
          <select
            value={filters.subtype}
            onChange={(e) => onChange({ ...filters, subtype: e.target.value })}
          >
            <option value="">Tous</option>
            {Object.entries(subtypes).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>
      )}

      <div className="legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: "#e63946" }} />
          {CATEGORY_LABELS.route}
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: "#8338ec" }} />
          {CATEGORY_LABELS.rue}
        </div>
      </div>

      <p className="hint">
        Cliquez sur « Signaler une incivilité » puis placez le repère sur la carte pour créer un signalement.
      </p>
    </div>
  );
}
