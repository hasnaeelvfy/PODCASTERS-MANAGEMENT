# Architecture finale — Prodcasters CRM

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  Next.js 15 · TypeScript · Tailwind · Framer Motion · RQ       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / REST + JWT
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API (Express + TypeScript)                     │
│  /auth  /guests  /episodes  /shorts  /sponsors  /dashboard      │
│  Middleware: auth · validation · error handler                   │
└────────────┬───────────────────────────────┬────────────────────┘
             │ Prisma ORM                    │ Cloudinary SDK
             ▼                               ▼
┌────────────────────────┐      ┌────────────────────────┐
│      MySQL 8.x         │      │   Cloudinary CDN       │
│   podcast_crm DB       │      │   (avatars uploads)    │
└────────────────────────┘      └────────────────────────┘
```

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS 4, CSS variables design tokens |
| Animations | Framer Motion 11 |
| Data fetching | TanStack React Query v5 |
| Charts | Recharts |
| Backend | Node.js 20+, Express 4, TypeScript |
| ORM | Prisma 6 |
| DB | MySQL 8 |
| Auth | JWT (access token) + bcrypt passwords |
| Upload | Cloudinary |
| Validation | Zod |

## Flux d'authentification

1. `POST /api/auth/register` → hash password → créer user → JWT
2. `POST /api/auth/login` → verify → JWT
3. Frontend stocke token en `httpOnly` cookie ou localStorage (impl: localStorage + header Authorization)
4. `POST /api/auth/logout` → blacklist optionnelle (impl: client-side clear)

## Modèle de domaine

- **User** : propriétaire du workspace (multi-user futur via organisation)
- **PipelineStage** : colonnes Kanban configurables
- **Guest** : prospect/invité lié à un stage
- **Interaction** : notes chronologiques sur guest
- **Episode** : 1:1 ou 1:N avec guest (impl: 1 guest peut avoir 1 episode principal — relation guest_id unique optionnelle)
- **Short** : clips liés à episode
- **Sponsor** : sponsoring lié à episode
- **Task** : tâches opérationnelles
- **Notification** : alertes utilisateur

## Sécurité

- CORS restreint à `FRONTEND_URL`
- Rate limiting sur `/auth`
- Helmet headers
- Validation Zod sur tous les body
- Passwords : bcrypt cost 12

## Déploiement recommandé

| Service | Rôle |
|---------|------|
| Vercel | Frontend Next.js |
| Railway / Render / VPS | API Express |
| PlanetScale / RDS / Docker MySQL | Base de données |
| Cloudinary | Médias |

## Variables d'environnement

### Backend (`backend/.env`)
```
DATABASE_URL="mysql://user:pass@localhost:3306/podcast_crm"
JWT_SECRET="..."
JWT_EXPIRES_IN="7d"
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
FRONTEND_URL="http://localhost:3000"
PORT=4000
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
```

## Structure des dossiers

Voir `docs/STRUCTURE.md` (généré ci-dessous dans le repo).
