# Diagramme relationnel — podcast_crm

## Mermaid ER Diagram

```mermaid
erDiagram
    users ||--o{ notifications : receives
    users ||--o{ tasks : assigned_to
    pipeline_stages ||--o{ guests : contains
    guests ||--o{ interactions : has
    guests ||--o| episodes : may_have
    guests ||--o{ tasks : has
    episodes ||--o{ shorts : contains
    episodes ||--o{ sponsors : has

    users {
        int id PK
        varchar fullname
        varchar email UK
        varchar password_hash
        varchar avatar
        enum role
        datetime created_at
        datetime updated_at
    }

    pipeline_stages {
        int id PK
        varchar name
        varchar color
        int position UK
    }

    guests {
        int id PK
        varchar first_name
        varchar last_name
        varchar company
        varchar sector
        varchar city
        varchar source
        varchar contact
        enum language
        int stage_id FK
        datetime shooting_date
        text why_elmaakoul
        text emotional_angle
        text notes
        datetime created_at
        datetime updated_at
    }

    interactions {
        int id PK
        int guest_id FK
        text note
        datetime created_at
    }

    episodes {
        int id PK
        int guest_id FK UK
        int episode_number
        varchar title
        date recording_date
        date publication_date
        varchar spotify_link
        varchar youtube_link
        int listens
        int views
        int shares
        decimal completion_rate
        datetime created_at
        datetime updated_at
    }

    shorts {
        int id PK
        int episode_id FK
        enum platform
        varchar title
        int views
        int likes
        int shares
        varchar url
    }

    sponsors {
        int id PK
        int episode_id FK
        varchar name
        enum sponsor_type
        decimal amount
        enum status
        text notes
    }

    tasks {
        int id PK
        int guest_id FK
        int assigned_to FK
        varchar title
        text description
        date due_date
        enum status
    }

    notifications {
        int id PK
        int user_id FK
        varchar title
        text content
        boolean is_read
        datetime created_at
    }
```

## Cardinalités

| Relation | Type |
|----------|------|
| pipeline_stages → guests | 1:N |
| guests → interactions | 1:N |
| guests → episodes | 1:0..1 (un épisode principal par invité) |
| episodes → shorts | 1:N |
| episodes → sponsors | 1:N |
| guests → tasks | 1:N |
| users → tasks (assigned) | 1:N |
| users → notifications | 1:N |

## Index principaux

- `guests.stage_id` — filtrage pipeline
- `guests(shooting_date)` — tournages planifiés
- `episodes.guest_id` — jointure unique
- `interactions.guest_id, created_at` — historique
- `shorts.episode_id` — agrégation vues
- `sponsors.episode_id, status` — revenus
- `notifications(user_id, is_read)` — inbox
