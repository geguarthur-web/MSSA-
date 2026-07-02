export const CATEGORY_COLORS = {
  route: "#e63946",
  rue: "#8338ec",
};

export const CATEGORY_LABELS = {
  route: "Incident de route",
  rue: "Incident de rue",
};

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}
