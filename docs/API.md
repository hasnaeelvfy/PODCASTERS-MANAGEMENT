# API REST — Prodcasters CRM

Base URL : `http://localhost:4000/api`

Authentification : header `Authorization: Bearer <token>` (sauf routes auth publiques)

---

## AUTH

### POST /auth/register
```json
{ "fullname": "Admin", "email": "admin@elmaakoul.ma", "password": "ChangeMe123!" }
```
**Réponse 201**
```json
{ "user": { "id": 1, "fullname": "...", "email": "...", "role": "admin" }, "token": "eyJ..." }
```

### POST /auth/login
```json
{ "email": "admin@elmaakoul.ma", "password": "ChangeMe123!" }
```

### POST /auth/logout
Requiert JWT. Réponse : `{ "message": "Logged out successfully" }`

### GET /auth/me
Requiert JWT.

---

## GUESTS

### GET /guests/stages
Liste des colonnes pipeline.

### GET /guests
Query : `?stageId=1&search=tarik`

### GET /guests/:id
Détail avec interactions, episode, shorts, sponsors.

### POST /guests
```json
{
  "firstName": "Tarik",
  "lastName": "Lallouch",
  "company": "Akenoo",
  "stageId": 4,
  "language": "mixte"
}
```

### PUT /guests/:id
Mise à jour partielle des champs guest.

### DELETE /guests/:id
**Réponse 204**

### POST /guests/:id/interactions
```json
{ "note": "Relance effectuée par email." }
```

---

## EPISODES

### GET /episodes
Tous les épisodes avec guest, shorts, sponsors.

### POST /episodes
```json
{
  "guestId": 1,
  "episodeNumber": 1,
  "title": "Pilote",
  "listens": 0,
  "views": 0
}
```

### PUT /episodes/:id
```json
{
  "listens": 1200,
  "views": 800,
  "completionRate": 68,
  "publicationDate": "2025-03-01"
}
```

### DELETE /episodes/:id

---

## SHORTS

### GET /shorts?episodeId=1

### POST /shorts
```json
{
  "episodeId": 1,
  "platform": "yt_shorts",
  "title": "Extrait IA",
  "views": 5000
}
```

---

## SPONSORS

### GET /sponsors?episodeId=1

### POST /sponsors
```json
{
  "episodeId": 1,
  "name": "Maroc Telecom",
  "sponsorType": "preroll",
  "amount": 15000,
  "status": "confirme"
}
```

---

## DASHBOARD

### GET /dashboard/stats
```json
{
  "stats": {
    "totalGuests": 12,
    "conversionRate": 25.5,
    "publishedEpisodes": 3,
    "totalAudience": 45000,
    "sponsorRevenue": 75000,
    "monthlyGrowth": 12.3
  },
  "pipelineDistribution": [...],
  "audienceEvolution": [...],
  "revenueEvolution": [...],
  "topEpisodes": [...],
  "topSponsors": [...],
  "upcomingShoots": [...]
}
```

---

## Codes d'erreur

| Code | Signification |
|------|---------------|
| 400 | Validation Zod échouée |
| 401 | Token manquant/invalide |
| 404 | Ressource introuvable |
| 409 | Conflit (email existant, episode dupliqué) |
| 500 | Erreur serveur |
