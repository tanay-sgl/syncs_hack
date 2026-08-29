# Converge

**Turn intent into people.**

AI-powered real-time coordination platform that connects people based on what they want to accomplish right now.

## Project Structure

```
syncs_hack/
├── backend/          # API server (Maria)
│   ├── app/
│   │   ├── routers/  # REST endpoints
│   │   ├── models/   # Database schema
│   │   ├── schemas/  # Request/response types
│   │   ├── services/ # Business logic
│   │   └── websocket/# Real-time updates
│   ├── alembic/      # DB migrations
│   └── seed.py       # Demo data
└── frontend/         # React UI (Sneha) — coming soon
```

## Quick Start (Backend)

### 1. Start PostgreSQL

```bash
cd backend
docker compose up -d
```

### 2. Run migrations, seed, and start the API

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python3 seed.py
uvicorn app.main:app --reload --port 8000
```

> On macOS, use `python3` (not `python`). If port 8000 is in use, either stop the existing server (`lsof -i :8000` then `kill <PID>`) or use another port: `uvicorn app.main:app --reload --port 8001`

**Database:** PostgreSQL via Docker on `localhost:5433` (user/password/db: `converge` / `converge` / `converge`).

API docs: http://localhost:8000/docs

### Schema changes later

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## Auth notes

- Login returns `access_token` (1 hour) + `refresh_token` (7 days)
- Refresh: `POST /api/auth/refresh` with `{ "refresh_token": "..." }`
- Change password (logged in): `POST /api/auth/change-password`
- Forgot/reset: `POST /api/auth/forgot-password` → `POST /api/auth/reset-password`
  - In `ENVIRONMENT=development`, forgot-password returns `reset_token` in the response

## Team Integration Points

| Team     | Endpoint                        | Purpose                          |
|----------|---------------------------------|----------------------------------|
| Tanay    | `POST /api/intents/parse`       | Replace stub with LLM parser     |
| Tanay    | `POST /api/intents/match`       | Replace with group optimizer     |
| Vandanaa | `GET /api/intents/emergent-events` | Emergent event clustering     |
| Sneha    | `WS /ws?token=<jwt>`            | Real-time intent/group updates   |

## Reputation & collaboration graph

- Score starts at **3.0** (neutral)
- Needs **3+ signals** before `reputation_trusted=true` (early noise is blended toward 3.0)
- Recent signals weigh more (90-day half-life)
- Idle decay after 180 days without new signals pulls score toward 3.0
- Collaboration graph endpoints:
  - `GET /api/users/me/reputation`
  - `GET /api/users/{id}/reputation`
  - `GET /api/users/me/collaborators`
  - `GET /api/users/{id}/collaborators`
  - `GET /api/users/{id}/compatibility/{other_id}`

## Demo Credentials

All seeded users use password: `Password1!`

Example: `alex_chen` or `alex.chen@uni.edu` / `Password1!`
