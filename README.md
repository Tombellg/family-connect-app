# Family Connect

Application web de gestion de tâches partagées pour le foyer, avec authentification légère, récurrence avancée et persistance sur Netlify DB (PostgreSQL).

## Aperçu

- **Backend** : Express + TypeScript, stockage PostgreSQL (Netlify DB/Neon), auth JWT en cookie HTTPOnly, logique de récurrence avec `rrule`.
- **Frontend** : React + Vite + Tailwind + Framer Motion, interface animée, responsive, et focus productivité.
- **Données** : import initial des listes/tâches issues de Google Tasks (fournies), visibles par tous les utilisateurs.

## Installation

```bash
npm install
npm install --prefix server
npm install --prefix client
```

## Développement local

```bash
npm run dev
```

- API : http://localhost:4000
- Frontend : http://localhost:5173 (configure `VITE_API_URL` si besoin)

## Build production

```bash
npm run build
```

- `server/dist` : code compilé de l'API
- `client/dist` : bundle frontend

## Environnement

Variables utiles côté serveur :

- `PORT` (défaut `4000`)
- `JWT_SECRET`
- `CORS_ORIGIN` (défaut `http://localhost:5173`)
- `COOKIE_SAME_SITE` (`lax`, `strict` ou `none` — défaut `lax` en dev, `none` en prod)
- `COOKIE_SECURE` (`true`/`false` — défaut `true` en prod)
- Connexion base : `NETLIFY_DB_CONNECTION_STRING` **ou** couples `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD` (Netlify renseigne automatiquement les variables `NETLIFY_DB_*`).
- `NETLIFY_DB_SSLMODE` / `PGSSLMODE` (facultatif, `require` activé par défaut)
- `netlify/db/setup.sql` provisionne les tables lors du build Netlify DB

Côté client :

- `VITE_API_URL` (défaut `http://localhost:4000/api`)

## Fonctionnalités clés

- Création/connexion depuis l'UI
- Session persistée via cookie sécurisé
- Tableaux partagés avec stats par liste
- Récurrence ultra modulable (jour/semaine/mois/année, fins configurables)
- Historique des occurrences terminées
- Interface réactive, animations, thème glassmorphism

## Prochaines étapes suggérées

- Ajouter des tests unitaires (Vitest côté client, Jest/Supertest côté serveur)
- Mettre en place ESLint/Prettier et workflows CI
- Sécuriser la base (sauvegardes, rotation des secrets Netlify DB)

Bon build !
