# Audit complet — El Maakoul CRM (elmaakoul_crm_sync.html)

## 1. Fonctionnalités existantes

### Pipeline invités
- Vue Kanban horizontale (6 colonnes) sur desktop
- Vue liste cartes sur mobile (< 600px)
- Filtres par stade (pills : Tous + chaque stade avec compteurs)
- Navigation scroll entre colonnes
- Ajout rapide par colonne (+ ajouter)
- Cartes : initiales, nom, entreprise, langue, date tournage, dernière interaction, portée si publié
- Changement de stade inline (select) depuis la fiche invité

### États du pipeline (6 stades)
| Clé | Label |
|-----|-------|
| idee | Idée |
| contacte | Contacté |
| discussion | En discussion |
| confirme | Confirmé |
| enregistre | Enregistré |
| publie | Publié |

### Gestion des invités
- CRUD complet (créer, lire, modifier, supprimer)
- Champs : prénom, nom, entreprise, secteur, ville, source, contact, langue, stade, créneau tournage, pourquoi El Maakoul, angle émotionnel, notes
- Langues : mixte, français, darija, à définir
- Données démo (Tarik Lallouch) au premier lancement vide

### Interactions / Historique
- Journal chronologique inversé (plus récent en haut)
- Ajout de notes avec date ISO automatique
- Affichage date formatée fr-MA

### Planification tournages
- Champ `datetime-local` sur fiche et formulaire
- Dashboard : prochains 4 tournages triés par date
- Badge date sur cartes pipeline

### Gestion des épisodes
- Onglet Épisodes : grille invités `enregistre` ou `publie`
- Métriques par carte : écoutes, YouTube, shorts, sponsoring
- Numéro d'épisode, titre, date enregistrement
- Liens Spotify / YouTube (stade publié)

### Shorts
- Plateformes : YouTube Shorts, Instagram, TikTok, LinkedIn, Facebook
- Champs : titre, vues, likes, partages (pas de URL dans UI actuelle mais `lien` en données)
- CRUD inline, total vues agrégé

### Sponsors
- Types : pré-roll, mid-roll, post-roll, mention, partenaire
- Statuts : prospect, négociation, confirmé, payé
- Montant MAD, nom
- Revenus agrégés par épisode et dashboard

### Métriques
- Écoutes D30, vues YouTube, partages, taux complétion %
- Portée totale = écoutes + vues + vues shorts
- Barres de répartition portée (épisode publié)
- Dashboard : pipeline total, publiés, portée cumulée, sponsoring MAD

### Dashboard
- 4 KPI cards
- Répartition pipeline (barres %)
- Tournages planifiés (4 prochains)

### Synchronisation
- JSONBin.io (Master Key + Bin ID)
- Setup wizard 3 étapes
- Mode hors-ligne (localStorage)
- Debounce sauvegarde 1,2s
- Indicateur sync (ok / saving / error / offline)
- Fallback local si cloud inaccessible

### Navigation
- 3 onglets : Pipeline, Épisodes, Dashboard
- Bottom nav mobile
- Vues imbriquées : guest, new, edit

---

## 2. Problèmes actuels

| Problème | Impact |
|----------|--------|
| Monolithique HTML/JS (~530 lignes) | Maintenance impossible, pas de tests |
| Pas de vraie base de données | Pas de requêtes, relations, intégrité |
| JSONBin comme backend | Limites API, pas de multi-utilisateur, sécurité clé exposée |
| Auth inexistante | Toute personne avec la clé accède aux données |
| Modèle imbriqué (episode dans guest) | Duplication, pas de requêtes épisodes isolées |
| innerHTML partout | Risque XSS si données malveillantes |
| Pas de validation serveur | Données incohérentes possibles |
| Design mobile-first basique | Pas de niveau SaaS professionnel |
| Pas de tâches / notifications | Tables demandées absentes |
| Pas d'historique d'audit | Qui a modifié quoi ? |
| Pas de recherche globale | Trouver un invité difficile à grande échelle |
| Graphiques dashboard limités | Barres pipeline seulement, pas de tendances |

---

## 3. Limitations techniques

- **Stockage** : un seul document JSON `{ guests: [], updatedAt }` — pas de pagination
- **Concurrence** : last-write-wins, pas de verrouillage optimiste
- **Scalabilité** : tout chargé en mémoire à chaque session
- **Sécurité** : Master Key dans localStorage (`em-cfg`)
- **Backup** : dépend de JSONBin, pas d'export structuré natif
- **Multi-tenant** : un bin = un workspace, pas d'équipe
- **API** : aucune API REST pour intégrations externes
- **Upload** : pas de gestion fichiers / avatars
- **Offline** : sync manuelle implicite, pas de file d'attente

---

## 4. Améliorations possibles (implémentées dans la refonte)

1. MySQL relationnel + Prisma ORM
2. API REST JWT avec rôles utilisateur
3. Next.js SSR/CSR, React Query cache
4. Dashboard analytics (Recharts) : audience, revenus, conversion, tops
5. Pipeline Kanban avec drag-and-drop (futur)
6. Notifications in-app
7. Tâches assignées par invité
8. Cloudinary pour avatars
9. Script migration JSONBin → MySQL
10. Design premium dark mode (glassmorphism, neon glow)
11. Séparation episodes / shorts / sponsors en tables
12. Index et contraintes FK pour intégrité référentielle
