# Reynard

Application web de gestion de tâches partagées pour le foyer, propulsée par un backend Express intégralement réécrit et connecté à PostgreSQL Neon.

## Aperçu

- **Backend** : Express 5 + TypeScript, connexion PostgreSQL gérée par `pg`, sécurisation via `helmet`, compression HTTP, authentification JWT stockée en cookie HTTPOnly.
- **Frontend** : React + Vite + Tailwind + Framer Motion pour une interface fluide et responsive.
- **Données** : un semis initial crée un foyer type (utilisateur, listes et tâches) directement dans la base Neon si elle est vide.

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
- Frontend : http://localhost:5173 (configurer `VITE_API_URL` si besoin)

## Build production

```bash
npm run build
```

- `server/dist` : code compilé de l'API
- `client/dist` : bundle frontend

## Configuration de l'environnement

Le backend est prêt à dialoguer avec l'instance Neon fournie. Par défaut, il charge les valeurs suivantes :

```
DATABASE_URL=postgresql://neondb_owner:npg_MpQBUN7bFzl6@ep-shy-dream-abcslgpk-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_MpQBUN7bFzl6@ep-shy-dream-abcslgpk.eu-west-2.aws.neon.tech/neondb?sslmode=require
PGHOST=ep-shy-dream-abcslgpk-pooler.eu-west-2.aws.neon.tech
PGHOST_UNPOOLED=ep-shy-dream-abcslgpk.eu-west-2.aws.neon.tech
PGUSER=neondb_owner
PGPASSWORD=npg_MpQBUN7bFzl6
PGDATABASE=neondb
```

Vous pouvez surcharger chaque valeur via des variables d'environnement ou un fichier `.env` à la racine du dossier `server/`.

Autres variables utiles côté serveur :

- `PORT` (défaut `4000`)
- `JWT_SECRET`
- `CORS_ORIGINS` (liste séparée par des virgules, défaut `*`)
- `COOKIE_NAME` (nom du cookie de session, défaut `reynard_session`)

Côté client :

- `VITE_API_URL` (défaut `http://localhost:4000/api`)

## Fonctionnalités clés du backend

- Authentification complète (inscription, connexion, déconnexion, profil) avec hachage `bcrypt` et jetons JWT.
- Middleware d'authentification, sécurisation par `helmet`, compression automatique et gestion des erreurs centralisée.
- Gestion des listes et tâches (création, lecture, mise à jour, bascule d'état, suppression) directement en base Neon.
- Migrations SQL exécutées au démarrage et semis automatique des données si la base est vide.

Bon build !
