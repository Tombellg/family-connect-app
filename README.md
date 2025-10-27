# Reynard

Application web de gestion de tâches partagées pour le foyer, avec authentification légère, récurrence avancée et persistance sur PostgreSQL Neon.

## Aperçu

- **Backend** : Express + TypeScript, stockage PostgreSQL (Neon), auth JWT en cookie HTTPOnly, logique de récurrence avec `rrule`.
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
- Connexion base :
  - `DATABASE_URL` (pooler Neon)
  - `DATABASE_URL_UNPOOLED` (connexion directe pour migrations)
  - compatibles également : `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD`
- `PGSSLMODE` / `DB_SSL` (facultatif, `require` activé par défaut)
- `netlify/db/setup.sql` reste disponible pour provisionner la base via SQL brut

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
- Sécuriser la base (sauvegardes, rotation des secrets Neon)

Bon build !
