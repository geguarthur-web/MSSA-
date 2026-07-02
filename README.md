# SignalCivic — Carte interactive des incivilités

Plateforme façon "Waze des incivilités" : une carte interactive sur laquelle
n'importe qui peut signaler une incivilité (route ou rue), avec date/heure,
adresse ou géolocalisation, photos et description. Les utilisateurs vérifiés
peuvent ajouter un témoignage sur un signalement existant s'ils ont assisté
à la scène.

## Catégories d'incidents

- **Incident de route** : conduite agressive, insulte, comportement violent,
  délit de fuite, mauvaise conduite, autre.
- **Incident de rue** : comportement violent, insultes, harcèlement,
  violence, autre.

## Architecture

- `server/` — API REST Node.js/Express, base SQLite (`better-sqlite3`),
  authentification par JWT, upload de photos (`multer`).
- `client/` — Application React (Vite) avec carte interactive Leaflet
  (fond de carte OpenStreetMap).

## Démarrage

### Backend

```bash
cd server
npm install
npm run dev        # démarre l'API sur http://localhost:4000
```

### Frontend

```bash
cd client
npm install
npm run dev         # démarre l'app sur http://localhost:5173 (proxy /api vers :4000)
```

Ouvrez ensuite http://localhost:5173.

## Fonctionnement

- **Signaler une incivilité** : cliquez sur "Signaler une incivilité", puis
  cliquez sur la carte à l'endroit de l'incident (ou utilisez votre position
  actuelle). Renseignez catégorie, type, date/heure, adresse (optionnelle),
  description et photos, puis publiez. La création est possible en
  anonyme ou en étant connecté.
- **Comptes et vérification** : l'inscription se fait par email/mot de passe.
  Aucun service d'envoi d'email n'étant configuré dans ce projet, la
  vérification de compte est simulée : après inscription, un bouton
  "Vérifier mon compte maintenant" est proposé (en conditions réelles, ce
  serait un lien envoyé par email). Pour brancher un vrai envoi d'email,
  remplacer la logique dans `server/src/routes/auth.js`
  (variable `verificationToken`) par un envoi SMTP/API tierce.
- **Témoignages** : seuls les comptes vérifiés peuvent ajouter un témoignage
  sur un signalement existant (endpoint protégé côté serveur par le
  middleware `requireVerified`).
- **Carte** : tous les signalements sont visibles publiquement, avec un
  code couleur par catégorie (rouge = route, violet = rue) et des filtres
  par catégorie/type dans la barre latérale.

## Variables d'environnement (optionnel)

Créer un fichier `server/.env` :

```
PORT=4000
JWT_SECRET=change-moi-en-production
```
