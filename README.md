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
│   └── seed.py       # Demo data
└── frontend/         # React UI (Sneha) — coming soon
```

## Quick Start (Backend)

### 1. Start PostgreSQL

```bash
cd backend
docker compose up -d
```

### 2. Run the API

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python3 seed.py
uvicorn app.main:app --reload --port 8000
```

> On macOS, use `python3` (not `python`). If port 8000 is in use, either stop the existing server (`lsof -i :8000` then `kill <PID>`) or use another port: `uvicorn app.main:app --reload --port 8001`

**Database:** PostgreSQL via Docker on `localhost:5433` (user/password/db: `converge` / `converge` / `converge`). Port 5433 avoids conflicts with a local Postgres on 5432.

API docs: http://localhost:8000/docs

## Team Integration Points

| Team     | Endpoint                        | Purpose                          |
|----------|---------------------------------|----------------------------------|
| Tanay    | `POST /api/intents/parse`       | Replace stub with LLM parser     |
| Tanay    | `POST /api/intents/match`       | Replace with group optimizer     |
| Vandanaa | `GET /api/intents/emergent-events` | Emergent event clustering     |
| Sneha    | `WS /ws?token=<jwt>`            | Real-time intent/group updates   |

## Demo Credentials

All seeded users use password: `password123`

Example: `alex.chen@uni.edu` / `password123`
