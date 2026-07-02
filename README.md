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

## Déploiement (obtenir une URL publique)

En production, le serveur Express sert directement le frontend buildé
(`client/dist`) en plus de l'API : une seule URL suffit, pas besoin
d'héberger le frontend séparément.

### Option rapide : Render (gratuit)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/geguarthur-web/MSSA-)

1. Cliquez sur le bouton ci-dessus (ou allez sur https://render.com et créez
   un "Blueprint" à partir de ce dépôt).
2. Connectez votre compte GitHub, sélectionnez le dépôt `geguarthur-web/MSSA-`
   et la branche `claude/incivility-map-reporting-lqoxye` (ou `main` une fois
   mergée).
3. Render détecte `render.yaml` à la racine et configure automatiquement le
   build (`npm install` + `npm run build` du client, puis démarrage du
   serveur) et un `JWT_SECRET` généré aléatoirement.
4. Cliquez sur "Apply" / "Deploy" : au bout de quelques minutes, Render
   fournit une URL publique du type `https://signalcivic.onrender.com`.

**Limite du plan gratuit** : le disque n'est pas persistant entre les
redémarrages du service (mise en veille après inactivité). La base SQLite et
les photos uploadées peuvent donc être réinitialisées de temps en temps.
Pour une utilisation réelle, passer à un disque persistant Render (payant)
ou migrer vers une base gérée (PostgreSQL) serait nécessaire.

### Déploiement manuel sur un serveur (VPS, etc.)

```bash
cd client && npm install && npm run build
cd ../server && npm install
JWT_SECRET=... PORT=4000 node src/index.js
```

L'application complète (API + carte) est alors servie sur
`http://<votre-domaine>:4000`.
