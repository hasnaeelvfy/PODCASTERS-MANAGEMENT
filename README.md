# Prodcasters — El Maakoul CRM SaaS

Application CRM professionnelle pour podcast, migrée depuis `elmaakoul_crm_sync.html`.

## Stack

- **Frontend** : Next.js 15, TypeScript, Tailwind CSS 4, Framer Motion, React Query, Recharts
- **Backend** : Express, TypeScript, Prisma, JWT, Cloudinary (prêt)
- **Database** : MySQL 8

## Démarrage rapide

### 1. Base de données

```bash
mysql -u root -p < database/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Éditer DATABASE_URL et JWT_SECRET
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

API : http://localhost:4000/api

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

App : http://localhost:3000

### 4. Compte par défaut (seed)

- Email : `admin@elmaakoul.ma`
- Mot de passe : `ChangeMe123!`

## Migration données legacy

Voir [docs/MIGRATION.md](docs/MIGRATION.md)

```bash
node scripts/migrate-from-jsonbin.js export.json
```

## Documentation

| Fichier | Contenu |
|---------|---------|
| [docs/AUDIT.md](docs/AUDIT.md) | Audit complet app HTML |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture finale |
| [docs/ER_DIAGRAM.md](docs/ER_DIAGRAM.md) | Diagramme relationnel |
| [docs/MIGRATION.md](docs/MIGRATION.md) | Plan migration |
| [docs/STRUCTURE.md](docs/STRUCTURE.md) | Arborescence dossiers |
| [docs/API.md](docs/API.md) | API REST |
| [database/schema.sql](database/schema.sql) | Script SQL complet |
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) | Schéma Prisma |

## Design

Dark mode premium — couleurs `#0B0F19`, `#111827`, accents `#8B5CF6` / `#EC4899`.

Glassmorphism, neon glow, gradient borders, animations Framer Motion sur hover.
