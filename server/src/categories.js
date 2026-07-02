export const CATEGORIES = {
  route: {
    label: "Incident de route",
    subtypes: {
      conduite_agressive: "Conduite agressive",
      insulte: "Insulte",
      comportement_violent: "Comportement violent",
      delit_de_fuite: "Délit de fuite",
      mauvaise_conduite: "Mauvaise conduite",
      autre: "Autre",
    },
  },
  rue: {
    label: "Incident de rue",
    subtypes: {
      comportement_violent: "Comportement violent",
      insultes: "Insultes",
      harcelement: "Harcèlement",
      violence: "Violence",
      autre: "Autre",
    },
  },
};

export function isValidCategory(category) {
  return Object.prototype.hasOwnProperty.call(CATEGORIES, category);
}

export function isValidSubtype(category, subtype) {
  return isValidCategory(category) && Object.prototype.hasOwnProperty.call(CATEGORIES[category].subtypes, subtype);
}
