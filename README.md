# syncs_hack

API for parsing collaboration intent from natural language and matching candidates to teams. Built with TypeScript, Vercel serverless functions, and the Vercel AI SDK (Google Gemini).

## Setup

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

Deploy:

```bash
vercel --prod
```

## Endpoints

### `GET /api/health`

Health check.

**Response** `200`

```json
{ "status": "ok" }
```

---

### `POST /api/parse-intent`

Parses a natural language collaboration request into structured intent using Gemini. The response is validated against a Zod schema to guarantee consistent structure.

**Request body**

```json
{
  "query": "Need a senior backend engineer and an intermediate designer for a hackathon in Austin, available weekends, preferably someone with startup experience"
}
```

| Field   | Type   | Required | Constraints        | Description                           |
|---------|--------|----------|--------------------|---------------------------------------|
| `query` | string | yes      | 1-2000 characters  | Natural language collaboration request |

**Response** `200`

```json
{
  "intent": {
    "roles": [
      { "skill": "backend", "level": "senior", "count": 1 },
      { "skill": "design", "level": "intermediate", "count": 1 }
    ],
    "availability": {
      "days": ["saturday", "sunday"],
      "timezone": "America/Chicago"
    },
    "location": "Austin",
    "projectType": "hackathon",
    "teamSize": 2,
    "preferences": ["startup experience"]
  }
}
```

**Intent fields**

| Field         | Type               | Description                                                    |
|---------------|--------------------|----------------------------------------------------------------|
| `roles`       | RoleRequirement[]  | Skills needed with experience level and count                  |
| `roles[].skill` | string           | Skill or role name (e.g. "backend", "react", "design")         |
| `roles[].level` | enum             | `"beginner"` \| `"intermediate"` \| `"senior"` \| `"any"`     |
| `roles[].count` | number           | How many people needed for this role                           |
| `availability`  | object           | When the team should be available                              |
| `availability.days` | string[]     | Lowercase day names (e.g. `["saturday", "sunday"]`)            |
| `availability.timezone` | string   | IANA timezone (e.g. `"America/Chicago"`)                       |
| `location`    | string             | City name or `"remote"`                                        |
| `projectType` | string             | e.g. `"hackathon"`, `"startup"`, `"open-source"`               |
| `teamSize`    | number             | Total people needed (sum of role counts)                       |
| `preferences` | string[]           | Soft requirements (e.g. `"startup experience"`)                |

**Errors**

| Status | Reason                                     |
|--------|--------------------------------------------|
| 400    | Missing/invalid `query` or exceeds 2000 chars |
| 502    | Model returned invalid JSON or schema      |
| 500    | Internal server error                      |

---

### `POST /api/match`

Scores and ranks candidates against a parsed intent. Pure scoring logic, no LLM call.

**Scoring dimensions**

| Dimension               | Weight | How it works                                                                 |
|--------------------------|--------|-----------------------------------------------------------------------------|
| Skill relevance          | 35%    | Semantic skill matching (cluster-aware, not just exact string). Factors in experience level vs. requirement. |
| Availability overlap     | 25%    | Day overlap (70%) + timezone proximity by UTC offset (30%).                  |
| Location proximity       | 20%    | Same city = 1.0, remote-friendly = 0.7, different city = 0.2.               |
| Complementarity          | 20%    | Penalizes skill duplication in the group. Bonus for filling unfilled roles.   |

Candidates are selected greedily -- each pick updates the group state so later picks favor diversity and unfilled roles.

**Skill clusters**: Related skills are recognized as similar (e.g. "react" ~ "frontend", "ML" ~ "data science"). See `lib/skills.ts` for the full list.

**Timezone scoring**: Scored by UTC hour difference, not string equality. 1-hour difference scores 0.95, 3-hour scores 0.75, 6+ hours drops sharply.

**Request body**

```json
{
  "intent": {
    "roles": [
      { "skill": "backend", "level": "senior", "count": 1 },
      { "skill": "design", "level": "intermediate", "count": 1 }
    ],
    "availability": { "days": ["saturday", "sunday"], "timezone": "America/Chicago" },
    "location": "Austin",
    "projectType": "hackathon",
    "teamSize": 2,
    "preferences": ["startup experience"]
  },
  "candidates": [
    {
      "id": "1",
      "name": "Alice",
      "skills": [{ "name": "backend", "level": "senior" }, { "name": "node", "level": "senior" }],
      "availability": { "days": ["saturday", "sunday"], "timezone": "America/Chicago" },
      "location": "Austin"
    },
    {
      "id": "2",
      "name": "Carol",
      "skills": [{ "name": "design", "level": "senior" }, { "name": "css", "level": "intermediate" }],
      "availability": { "days": ["saturday", "sunday"], "timezone": "America/Chicago" },
      "location": "Austin"
    }
  ],
  "topN": 2
}
```

| Field        | Type     | Required | Constraints           | Description                                       |
|--------------|----------|----------|-----------------------|---------------------------------------------------|
| `intent`     | Intent   | yes      |                       | Parsed intent object (from `/api/parse-intent`)    |
| `candidates` | User[]   | yes      | 1-500 items           | Array of candidate users to rank                   |
| `topN`       | number   | no       | max 50                | Results to return (defaults to `intent.teamSize`)  |

**User object**

| Field                    | Type     | Description                                          |
|--------------------------|----------|------------------------------------------------------|
| `id`                     | string   | Unique identifier                                    |
| `name`                   | string   | Display name                                         |
| `skills`                 | Skill[]  | Array of `{ name: string, level: "beginner" \| "intermediate" \| "senior" }` |
| `availability.days`      | string[] | Lowercase day names                                  |
| `availability.timezone`  | string   | IANA timezone                                        |
| `location`               | string   | City name or `"remote"`                              |

**Response** `200`

```json
{
  "results": [
    {
      "user": { "id": "1", "name": "Alice", "..." : "..." },
      "score": 1.0,
      "breakdown": {
        "skillRelevance": 1.0,
        "availabilityOverlap": 1.0,
        "locationProximity": 1.0,
        "complementarity": 1.0
      },
      "matchedRole": "backend"
    },
    {
      "user": { "id": "2", "name": "Carol", "..." : "..." },
      "score": 1.0,
      "breakdown": { "..." : "..." },
      "matchedRole": "design"
    }
  ]
}
```

**Errors**

| Status | Reason                                         |
|--------|------------------------------------------------|
| 400    | Missing/invalid `intent`, `candidates`, or bad user at index N |

## Project structure

```
api/
  health.ts          -- Health check endpoint
  parse-intent.ts    -- Intent parsing (Gemini + Zod validation)
  match.ts           -- Candidate matching (scoring)
lib/
  types.ts           -- Shared TypeScript types (Intent, User, MatchResult)
  prompts.ts         -- System prompt with JSON schema and few-shot examples
  scoring.ts         -- Weighted scoring with greedy group selection
  skills.ts          -- Skill similarity clusters (18 clusters)
  timezones.ts       -- UTC offset map and timezone proximity scoring
```
