# Structure des dossiers

## Racine

```
Prodcasters/
├── docs/                    # Documentation (audit, archi, ER, migration)
├── database/                # schema.sql exécutable MySQL
├── scripts/                 # migrate-from-jsonbin.js
├── backend/                 # API Express + Prisma
├── frontend/                # Next.js App Router
└── elmaakoul_crm_sync.html  # Legacy (référence)
```

## Backend

```
backend/
├── package.json
├── tsconfig.json
├── .env.example
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── src/
    ├── index.ts
    ├── app.ts
    ├── lib/
    │   └── prisma.ts
    ├── middleware/
    │   ├── auth.ts
    │   ├── errorHandler.ts
    │   └── validate.ts
    ├── routes/
    │   ├── index.ts
    │   ├── auth.routes.ts
    │   ├── guests.routes.ts
    │   ├── episodes.routes.ts
    │   ├── shorts.routes.ts
    │   ├── sponsors.routes.ts
    │   └── dashboard.routes.ts
    ├── controllers/
    │   ├── auth.controller.ts
    │   ├── guests.controller.ts
    │   ├── episodes.controller.ts
    │   ├── shorts.controller.ts
    │   ├── sponsors.controller.ts
    │   └── dashboard.controller.ts
    ├── services/
    │   ├── auth.service.ts
    │   ├── guests.service.ts
    │   ├── episodes.service.ts
    │   ├── shorts.service.ts
    │   ├── sponsors.service.ts
    │   └── dashboard.service.ts
    └── utils/
        ├── jwt.ts
        └── password.ts
```

## Frontend

```
frontend/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.example
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css
    │   ├── (auth)/
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   └── (dashboard)/
    │       ├── layout.tsx
    │       ├── dashboard/page.tsx
    │       ├── pipeline/page.tsx
    │       ├── episodes/page.tsx
    │       └── guests/[id]/page.tsx
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   └── TopBar.tsx
    │   ├── ui/
    │   │   ├── GlowCard.tsx
    │   │   ├── GlowButton.tsx
    │   │   ├── StatCard.tsx
    │   │   ├── Badge.tsx
    │   │   └── Input.tsx
    │   ├── pipeline/
    │   │   ├── PipelineBoard.tsx
    │   │   └── GuestCard.tsx
    │   ├── dashboard/
    │   │   ├── AudienceChart.tsx
    │   │   ├── RevenueChart.tsx
    │   │   ├── PipelineChart.tsx
    │   │   ├── TopEpisodes.tsx
    │   │   └── TopSponsors.tsx
    │   └── guests/
    │       ├── GuestForm.tsx
    │       ├── InteractionsList.tsx
    │       ├── ShortsSection.tsx
    │       └── SponsorsSection.tsx
    ├── lib/
    │   ├── api.ts
    │   ├── auth.ts
    │   └── utils.ts
    ├── hooks/
    │   └── useAuth.ts
    ├── providers/
    │   └── QueryProvider.tsx
    └── types/
        └── index.ts
```
