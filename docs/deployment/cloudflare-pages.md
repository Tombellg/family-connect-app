# Déployer FamilyConnect sur Cloudflare Pages

Ce guide récapitule les champs à renseigner dans Cloudflare Pages ainsi que les prérequis côté projet pour réussir un déploiement continu.

## Prérequis

- Node.js 18 ou plus récent (aligné avec le runtime V8 de Cloudflare).
- Dépendances installées sur votre pipeline (`npm install`).
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) disponible dans l'environnement de build (Cloudflare l'installe automatiquement, mais vous pouvez aussi l'ajouter en devDependency).
- Un projet Pages créé dans votre compte Cloudflare (ex. `family-connect-app`).

## Configuration "Build & deploy commands"

| Champ | Valeur recommandée | Description |
| --- | --- | --- |
| **Build command** | `npm run build` | Lance la compilation Next.js en mode production. |
| **Deploy command** | `npx wrangler pages deploy --project-name <NOM_DU_PROJET> --branch $CF_PAGES_BRANCH` | Publie la version générée par `next build`. Remplacez `<NOM_DU_PROJET>` par le nom exact de votre projet Pages. |

> Cloudflare Pages définit automatiquement la variable `CF_PAGES_BRANCH`. Sur la branche de production, cette valeur correspond à la branche principale configurée (généralement `main`).

## Builds pour les branches non-production

Dans la section **Advanced settings**, vous pouvez réutiliser la même commande de déploiement en précisant la branche courante :

```bash
npx wrangler pages deploy --project-name <NOM_DU_PROJET> --branch $CF_PAGES_BRANCH
```

Vous pouvez également différencier votre commande (ex. ajouter `--env preview`) si vous maintenez plusieurs environnements Wrangler.

## Root directory

Laissez le champ vide ou renseignez `.` si votre projet se trouve à la racine du dépôt (c'est le cas ici).

## API Token

Générez un token depuis **My Profile → API Tokens → Create Token** en utilisant le template **Cloudflare Pages**. Le token doit au minimum disposer des permissions :

- Account → Cloudflare Pages → Edit
- Account → Workers KV Storage → Read (si vous utilisez KV)

Enregistrez ce token comme secret dans votre plate-forme CI (par exemple `CLOUDFLARE_API_TOKEN`).

## Variables d'environnement de build

Ajoutez les variables nécessaires à l'application dans la section **Build configuration → Environment variables** de Cloudflare Pages. À minima :

- `DATABASE_URL` : chaîne de connexion PostgreSQL pour Prisma.
- `NEXTAUTH_SECRET` : secret aléatoire pour sécuriser les sessions NextAuth.
- `NEXTAUTH_URL` : URL publique de votre déploiement (par ex. `https://familyconnect.example.com`).
- `NEXT_PUBLIC_APP_URL` : (optionnel) URL publique réutilisée côté client.

Ajoutez également les credentials de toute intégration supplémentaire (SMTP, stockage, etc.).

> Pensez à définir des valeurs distinctes pour les environnements de production et de prévisualisation.

## Étapes de déploiement locales (facultatif)

Pour valider la procédure localement :

```bash
npm install
npm run build
npx wrangler pages deploy --project-name <NOM_DU_PROJET> --branch local --commit-dirty=true
```

Le flag `--commit-dirty=true` permet de publier un build local même si votre dépôt possède des modifications non commises.

