# Converge

**Turn intent into people.**

AI-powered real-time coordination platform that understands what you're trying to accomplish and assembles the right people to make it happen.

## Repository layout

```
syncs_hack/
├── backend/          # FastAPI server + Postgres (auth, intents, groups, WS)
├── api/              # Vercel serverless AI layer (parse / match / clusters)
├── lib/              # Shared AI matching & clustering logic
├── frontend/         # React UI (points at http://localhost:8000 by default)
└── tests/            # AI layer unit tests
```

| Layer | Owner focus | Run locally |
|-------|-------------|-------------|
| Backend API | Maria | `uvicorn` on port 8000 |
| AI / matching | Tanay | `vercel dev` |
| Frontend | Sneha | Vite (see `frontend/`) |

---

## Backend (FastAPI + PostgreSQL)

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

> On macOS, use `python3` (not `python`). If port 8000 is in use: `lsof -i :8000` then `kill <PID>`, or use `--port 8001`.

**Database:** PostgreSQL via Docker on `localhost:5433` (user/password/db: `converge` / `converge` / `converge`).

**API docs:** http://localhost:8000/docs

### Schema changes

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

### Auth notes

- Login returns `access_token` (1 hour) + `refresh_token` (7 days)
- Refresh: `POST /api/auth/refresh` with `{ "refresh_token": "..." }`
- Change password: `POST /api/auth/change-password`
- Forgot/reset: `POST /api/auth/forgot-password` → `POST /api/auth/reset-password`
  - In `ENVIRONMENT=development`, forgot-password returns `reset_token` in the response

### Demo credentials

All seeded users use password: `Password1!`

Example: `alex_chen` or `alex.chen@uni.edu` / `Password1!`

### Reputation & collaboration graph

- Score starts at **3.0** (neutral)
- Needs **3+ signals** before `reputation_trusted=true`
- Recent signals weigh more (90-day half-life); idle decay after 180 days
- Endpoints: `/api/users/me/reputation`, `/api/users/{id}/collaborators`, `/api/users/{id}/compatibility/{other_id}`

### Backend ↔ AI integration points

| Team     | FastAPI hook                    | AI layer equivalent        |
|----------|---------------------------------|----------------------------|
| Tanay    | `POST /api/intents/parse`       | `POST /api/parse-intent`   |
| Tanay    | `POST /api/intents/match`       | `POST /api/match`          |
| Vandanaa | `GET /api/intents/emergent-events` | `POST /api/detect-clusters` |
| Sneha    | `WS /ws?token=<jwt>`            | Real-time updates          |

---

## AI layer (Vercel serverless)

Intent parsing, group-optimization, and emergent event detection — deployed as Vercel serverless functions.

### Setup

```bash
npm install
```

Create a `.env.local` file:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

Run locally:

```bash
vercel dev
```

Run tests:

```bash
npm test
```

Deploy:

```bash
vercel --prod
```

### Endpoints

#### `GET /api/health`

Health check. Returns `200 { "status": "ok" }`.

---

#### `POST /api/parse-intent`

Converts natural language into structured coordination intent using Google Gemini. Handles all Converge intent categories.

**Request**

```json
{
  "query": "I need three people to cram COMP2022 tonight, preferably on campus"
}
```

| Field   | Type   | Required | Constraints       |
|---------|--------|----------|-------------------|
| `query` | string | yes      | 1–2000 characters |

**Response** `200`

```json
{
  "intent": {
    "category": "study",
    "roles": [{ "skill": "COMP2022", "level": "any", "count": 3 }],
    "availability": {
      "days": ["today"],
      "timezone": "UTC",
      "timeWindow": "tonight"
    },
    "location": "campus",
    "projectType": "exam cram",
    "teamSize": 3,
    "preferences": ["on campus"],
    "course": "COMP2022",
    "topic": null,
    "commitment": "moderate",
    "urgency": "high"
  }
}
```

**Intent categories**

| Category      | Example query                                                        |
|---------------|----------------------------------------------------------------------|
| `study`       | "I need three people to cram COMP2022 tonight"                       |
| `hackathon`   | "We need a frontend developer and designer for this hackathon"       |
| `project`     | "Looking for a backend dev for my side project"                      |
| `cofounder`   | "I'm looking for a technical cofounder for a health-tech startup"    |
| `volunteer`   | "Our society needs five volunteers for Saturday"                     |
| `coffee`      | "Coffee with someone interested in startups in the next hour"        |
| `mentor`      | "Need help from someone experienced with distributed systems"        |
| `investor`    | "I'm an investor looking for early-stage student AI startups"        |
| `other`       | Anything that doesn't fit the above                                  |

**Intent fields**

| Field                      | Type                | Description                                                   |
|----------------------------|---------------------|---------------------------------------------------------------|
| `category`                 | string              | One of the 9 intent categories above                          |
| `roles`                    | RoleRequirement[]   | Skills/roles needed with experience level and count            |
| `roles[].skill`            | string              | Skill, role, or course code                                    |
| `roles[].level`            | enum                | `"beginner"` \| `"intermediate"` \| `"senior"` \| `"any"`    |
| `roles[].count`            | number              | How many people needed for this role                           |
| `availability.days`        | string[]            | Day names or `"today"`                                         |
| `availability.timezone`    | string              | IANA timezone                                                  |
| `availability.timeWindow`  | string \| null      | Specific time like `"tonight"`, `"after 6 PM"`, `"next hour"` |
| `location`                 | string              | City, `"campus"`, `"nearby"`, or `"remote"`                    |
| `projectType`              | string              | Nature of the activity                                         |
| `teamSize`                 | number              | Total people needed                                            |
| `preferences`              | string[]            | Soft requirements                                              |
| `course`                   | string \| null      | Course code if mentioned (e.g. `"COMP2022"`)                   |
| `topic`                    | string \| null      | Specific topic within a course or field                        |
| `commitment`               | enum                | `"casual"` \| `"moderate"` \| `"dedicated"`                   |
| `urgency`                  | enum                | `"low"` \| `"medium"` \| `"high"`                             |

**Errors**

| Status | Reason                                        |
|--------|-----------------------------------------------|
| 400    | Missing/invalid `query` or exceeds 2000 chars |
| 502    | Model returned invalid JSON or schema         |
| 500    | Internal server error                         |

---

#### `POST /api/match`

Scores and ranks candidates against a parsed intent, then assembles a group with a collaboration space. Pure scoring logic, no LLM call.

**Category-aware scoring**

Weights shift based on what kind of coordination is happening:

| Category    | Skill | Availability | Location | Complementarity | Contextual |
|-------------|-------|--------------|----------|-----------------|------------|
| `study`     | 15%   | 25%          | 15%      | 5%              | **40%**    |
| `hackathon` | 30%   | 20%          | 10%      | **25%**         | 15%        |
| `project`   | 30%   | 20%          | 10%      | **25%**         | 15%        |
| `cofounder` | 25%   | 10%          | 10%      | **30%**         | 25%        |
| `volunteer` | 10%   | **35%**      | 30%      | 5%              | 20%        |
| `coffee`    | 10%   | 25%          | **35%**  | 0%              | 30%        |
| `mentor`    | **40%** | 15%        | 5%       | 5%              | 35%        |
| `investor`  | 30%   | 5%           | 10%      | 10%             | **45%**    |

**Five scoring dimensions**

| Dimension           | How it works                                                                                          |
|---------------------|-------------------------------------------------------------------------------------------------------|
| Skill relevance     | Semantic matching via 18 skill clusters (e.g. "react" ~ "frontend"). Course enrollment counts for study intents. Factors in experience level vs. requirement. |
| Availability overlap| Day overlap (70%) + timezone proximity by UTC hour difference (30%).                                   |
| Location proximity  | Same city/campus = 1.0, nearby = 0.8, remote-flexible = 0.7, mismatch = 0.2.                         |
| Complementarity     | Penalizes skill duplication in the group. Bonus for filling unfilled roles. Greedy sequential selection.|
| Contextual          | Category-specific: course enrollment (study), commitment/style compatibility (cofounder/hackathon), seniority (mentor), preference/bio matching (investor/coffee). |

**Request**

```json
{
  "intent": { "..." : "from /api/parse-intent" },
  "candidates": [
    {
      "id": "1",
      "name": "Alice",
      "skills": [{ "name": "react", "level": "senior" }],
      "availability": { "days": ["saturday", "sunday"], "timezone": "Australia/Sydney" },
      "location": "campus",
      "courses": ["COMP3900"],
      "year": 3,
      "major": "Computer Science",
      "commitment": "dedicated",
      "workingStyle": "sync",
      "bio": "Frontend enthusiast"
    }
  ],
  "topN": 4
}
```

| Field        | Type   | Required | Constraints | Description                                    |
|--------------|--------|----------|-------------|------------------------------------------------|
| `intent`     | Intent | yes      |             | Parsed intent from `/api/parse-intent`          |
| `candidates` | User[] | yes      | 1–500 items | Candidate users to rank                         |
| `topN`       | number | no       | max 50      | Results to return (defaults to `intent.teamSize`) |

**User object**

| Field            | Type                              | Required | Description                        |
|------------------|-----------------------------------|----------|------------------------------------|
| `id`             | string                            | yes      | Unique identifier                  |
| `name`           | string                            | yes      | Display name                       |
| `skills`         | `{ name, level }[]`               | yes      | Skills with beginner/intermediate/senior |
| `availability`   | `{ days, timezone }`              | yes      | When they're free                  |
| `location`       | string                            | yes      | City, `"campus"`, or `"remote"`    |
| `courses`        | string[]                          | yes      | Enrolled course codes              |
| `year`           | number \| null                    | yes      | University year (1–6+) or null     |
| `major`          | string \| null                    | yes      | Field of study                     |
| `commitment`     | `"casual"` \| `"moderate"` \| `"dedicated"` | yes | How much they want to commit |
| `workingStyle`   | `"async"` \| `"sync"` \| `"flexible"`       | yes | How they prefer to collaborate |
| `bio`            | string \| null                    | yes      | Short bio for preference matching  |

**Response** `200`

```json
{
  "results": [
    {
      "user": { "id": "1", "name": "Alice", "..." : "..." },
      "score": 0.895,
      "breakdown": {
        "skillRelevance": 0.7,
        "availabilityOverlap": 1.0,
        "locationProximity": 1.0,
        "complementarity": 1.0,
        "contextual": 0.9
      },
      "matchedRole": "frontend"
    }
  ],
  "groupSpace": {
    "objective": "Hackathon team — hackathon",
    "roles": [{ "userId": "1", "role": "frontend" }],
    "suggestedTime": "saturday",
    "nextSteps": [
      "Agree on project idea and tech stack",
      "Divide responsibilities by role",
      "Set up shared repo and communication channel"
    ]
  }
}
```

The `groupSpace` is auto-generated based on the intent category and provides a ready-to-render collaboration space with objective, assigned roles, suggested meeting time, and category-specific next steps.

**Errors**

| Status | Reason                                                    |
|--------|-----------------------------------------------------------|
| 400    | Missing/invalid `intent`, `candidates`, or bad user at index N |

---

#### `POST /api/detect-clusters`

Detects emergent events by clustering similar active intents. When multiple people want the same thing at the same time, Converge can auto-suggest a group session instead of waiting for someone to organise it.

**How clustering works**

Intents are grouped when they share:
- Same category (study + study, not study + coffee)
- Same course code (if applicable)
- Overlapping skills (via skill similarity clusters)
- Overlapping availability days
- Compatible locations

High-urgency intents are used as cluster seeds first. Clusters below `minSize` are discarded.

**Request**

```json
{
  "intents": [
    {
      "id": "i1",
      "userId": "u1",
      "intent": { "..." : "parsed intent object" }
    },
    {
      "id": "i2",
      "userId": "u2",
      "intent": { "..." : "parsed intent object" }
    }
  ],
  "minSize": 3
}
```

| Field     | Type            | Required | Constraints  | Description                              |
|-----------|-----------------|----------|--------------|------------------------------------------|
| `intents` | ActiveIntent[]  | yes      | 1–1000 items | Array of active intents with user IDs     |
| `minSize` | number          | no       | 2–50         | Minimum cluster size (default 3)          |

**Response** `200`

```json
{
  "clusters": [
    {
      "category": "study",
      "course": "COMP2022",
      "topic": null,
      "location": "campus",
      "timeWindow": "tonight",
      "intentIds": ["i1", "i2", "i3", "i4"],
      "userIds": ["u1", "u2", "u3", "u4"],
      "size": 4,
      "suggestedEvent": "COMP2022 Study Session — 4 people"
    }
  ]
}
```

Clusters are sorted by size descending. The `suggestedEvent` is a human-readable event name generated from the intent category and details.

**Errors**

| Status | Reason                                        |
|--------|-----------------------------------------------|
| 400    | Missing/invalid `intents` or bad intent at index N |

### AI layer tests

31 tests covering the core matching and clustering logic:

```
tests/
  skills.test.ts       -- Skill similarity and cluster matching (7 tests)
  timezones.test.ts    -- Timezone offset and proximity scoring (5 tests)
  scoring.test.ts      -- Category-aware scoring and group optimization (12 tests)
  clustering.test.ts   -- Emergent event detection (7 tests)
```

Run with `npm test`.

### AI layer project structure

```
api/
  health.ts              -- Health check endpoint
  parse-intent.ts        -- Intent parsing (Gemini + Zod validation)
  match.ts               -- Candidate matching and group assembly
  detect-clusters.ts     -- Emergent event detection
lib/
  types.ts               -- Shared TypeScript types
  prompts.ts             -- System prompt with schema and 6 few-shot examples
  scoring.ts             -- Category-aware weighted scoring with group optimization
  skills.ts              -- 18 skill similarity clusters
  timezones.ts           -- UTC offset map and timezone proximity scoring
  clustering.ts          -- Intent clustering algorithm
tests/
  skills.test.ts         -- Skill matching tests
  timezones.test.ts      -- Timezone scoring tests
  scoring.test.ts        -- Scoring engine tests (study, hackathon, cofounder, coffee, mentor)
  clustering.test.ts     -- Clustering algorithm tests
```
