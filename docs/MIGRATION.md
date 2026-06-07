# Plan de migration — JSONBin / localStorage → MySQL

## Prérequis

1. MySQL 8+ installé et `database/schema.sql` exécuté
2. Backend configuré (`backend/.env` avec `DATABASE_URL`)
3. `npx prisma migrate deploy` ou `npx prisma db push`
4. Export des données actuelles depuis JSONBin ou localStorage

## Étape 1 — Exporter les données legacy

### Depuis JSONBin
```bash
curl -X GET "https://api.jsonbin.io/v3/b/{BIN_ID}/latest" \
  -H "X-Master-Key: {MASTER_KEY}" \
  -o export.json
```

Le fichier doit contenir : `{ "guests": [ ... ], "updatedAt": "..." }`

### Depuis mode hors-ligne
Dans la console navigateur sur l'ancienne app :
```javascript
copy(localStorage.getItem('em-guests-offline'))
```
Coller le résultat dans `export.json` sous la forme `{ "guests": [...] }`

## Étape 2 — Mapping des champs

| Legacy (HTML) | MySQL / Prisma |
|---------------|----------------|
| `id` (string) | `guests.legacy_id` |
| `prenom` | `guests.first_name` |
| `nom` | `guests.last_name` |
| `entreprise` | `guests.company` |
| `secteur` | `guests.sector` |
| `ville` | `guests.city` |
| `source` | `guests.source` |
| `contact` | `guests.contact` |
| `langue` | `guests.language` |
| `stade` | `guests.stage_id` via mapping clé → position |
| `dateTournage` | `guests.shooting_date` |
| `pourquoi` | `guests.why_elmaakoul` |
| `angleEmotionnel` | `guests.emotional_angle` |
| `notes` | `guests.notes` |
| `dateAjout` | `guests.created_at` |
| `interactions[]` | table `interactions` |
| `episode` | table `episodes` + `shorts` + `sponsors` |

### Mapping stades pipeline

| stade legacy | position | stage_id |
|--------------|----------|----------|
| idee | 1 | 1 |
| contacte | 2 | 2 |
| discussion | 3 | 3 |
| confirme | 4 | 4 |
| enregistre | 5 | 5 |
| publie | 6 | 6 |

## Étape 3 — Exécuter le script de migration

```bash
cd backend
npm install
# Placer export.json à la racine du projet
node ../scripts/migrate-from-jsonbin.js ../export.json
```

Le script :
1. Lit `export.json`
2. Pour chaque guest : INSERT guest + interactions + episode + shorts + sponsors
3. Préserve `legacy_id` pour traçabilité
4. Ignore les doublons si `legacy_id` déjà présent

## Étape 4 — Vérification

```sql
SELECT COUNT(*) FROM guests;
SELECT COUNT(*) FROM interactions;
SELECT COUNT(*) FROM episodes;
SELECT COUNT(*) FROM shorts;
SELECT COUNT(*) FROM sponsors;

-- Comparer portée totale
SELECT SUM(listens + views) AS podcast_metrics FROM episodes;
```

## Étape 5 — Créer un compte admin

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullname":"Admin El Maakoul","email":"admin@elmaakoul.ma","password":"ChangeMe123!"}'
```

## Rollback

Sauvegarder avant migration :
```bash
mysqldump -u root -p podcast_crm > backup_pre_migration.sql
```

## Notes

- Les clés JSONBin (`em-cfg` dans localStorage) ne sont plus nécessaires après migration
- Un seul épisode par invité est supporté (comme l'app legacy)
- `partages` shorts legacy → `shares` en base
- Sponsors sans `notes` en legacy : champ NULL accepté
