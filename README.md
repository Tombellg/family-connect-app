# Family Connect 2.0

Nouvelle version de Family Connect bâtie sur Next.js 14. L'application propose une expérience unifiée pour synchroniser votre agenda Google Calendar et vos Google Tasks, avec authentification OAuth2 gérée par NextAuth et stockage Postgres sur Neon.

## Fonctionnalités

- Authentification Google OAuth2 avec accès hors ligne et rafraîchissement automatique des tokens.
- Synchronisation à la demande des événements Google Calendar (agenda principal) et des tâches Google Tasks (liste par défaut).
- Persistance des sessions et des comptes via PostgreSQL (Neon) grâce à l'adaptateur officiel Auth.js.
- Interface unique et responsive (Next.js App Router + React Server Components).
- Configuration centralisée via variables d'environnement.

## Prérequis

- Node.js 18+
- Accès à une base PostgreSQL (Neon conseillé)
- Identifiants OAuth Google Cloud (client ID + client secret)

## Installation

```bash
npm install
```

## Configuration

1. Copiez `.env.example` en `.env.local` et renseignez les valeurs :

```ini
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=... # peut être généré avec `openssl rand -base64 32`
NEXTAUTH_URL=http://localhost:3000
```

2. Dans la console Google Cloud, activez les APIs Calendar et Tasks pour votre projet OAuth et ajoutez `http://localhost:3000/api/auth/callback/google` comme URI de redirection autorisée.

## Développement

```bash
npm run dev
```

L'application est disponible sur http://localhost:3000.

## Production

```bash
npm run build
npm start
```

## Tests

Aucun test automatisé n'est encore fourni. Ajoutez vos suites de tests selon vos besoins.

## Structure principale

- `app/` : routes, pages et composants Next.js (App Router).
- `app/api/` : routes API (authentification, synchronisation Google).
- `lib/` : configuration NextAuth, accès base de données, clients Google.

## Licence

Projet privé — usage interne uniquement.
