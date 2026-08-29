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

Parses a natural language collaboration request into structured intent using Gemini.

**Request body**

```json
{
  "query": "Looking for 2 full-stack devs in NYC for a weekend hackathon, available Saturdays and Sundays"
}
```

| Field   | Type   | Required | Description                          |
|---------|--------|----------|--------------------------------------|
| `query` | string | yes      | Natural language collaboration request |

**Response** `200`

```json
{
  "intent": {
    "skills": ["full-stack"],
    "availability": {
      "days": ["saturday", "sunday"],
      "timezone": "America/New_York"
    },
    "location": "New York",
    "projectType": "hackathon",
    "teamSize": 2
  }
}
```

**Errors**

| Status | Reason                              |
|--------|-------------------------------------|
| 400    | Missing or invalid `query`          |
| 502    | Model returned invalid JSON/schema  |
| 500    | Internal server error               |

---

### `POST /api/match`

Scores and ranks candidates against a parsed intent. Pure scoring logic, no LLM call.

Candidates are scored on four weighted dimensions:
- **Skill relevance** (35%) -- how well the candidate's skills match the intent
- **Availability overlap** (25%) -- day overlap + timezone match
- **Location proximity** (20%) -- exact match, remote flexibility, or mismatch
- **Complementarity** (20%) -- penalizes skill duplication within the selected group

**Request body**

```json
{
  "intent": {
    "skills": ["full-stack"],
    "availability": { "days": ["saturday", "sunday"], "timezone": "America/New_York" },
    "location": "New York",
    "projectType": "hackathon",
    "teamSize": 2
  },
  "candidates": [
    {
      "id": "1",
      "name": "Alice",
      "skills": ["full-stack", "react", "node"],
      "availability": { "days": ["saturday", "sunday"], "timezone": "America/New_York" },
      "location": "New York"
    },
    {
      "id": "2",
      "name": "Bob",
      "skills": ["backend", "python"],
      "availability": { "days": ["saturday"], "timezone": "America/Chicago" },
      "location": "Chicago"
    }
  ],
  "topN": 2
}
```

| Field        | Type     | Required | Description                                      |
|--------------|----------|----------|--------------------------------------------------|
| `intent`     | Intent   | yes      | Parsed intent object (from `/api/parse-intent`)   |
| `candidates` | User[]   | yes      | Array of candidate users to rank                  |
| `topN`       | number   | no       | Number of results to return (defaults to `intent.teamSize`) |

**Response** `200`

```json
{
  "results": [
    {
      "user": { "id": "1", "name": "Alice", "skills": ["full-stack", "react", "node"], "..." : "..." },
      "score": 1.0,
      "breakdown": {
        "skillRelevance": 1.0,
        "availabilityOverlap": 1.0,
        "locationProximity": 1.0,
        "complementarity": 1.0
      }
    }
  ]
}
```

**Errors**

| Status | Reason                                |
|--------|---------------------------------------|
| 400    | Missing/invalid `intent` or `candidates` |

## Project structure

```
api/
  health.ts          -- Health check endpoint
  parse-intent.ts    -- Intent parsing (Gemini)
  match.ts           -- Candidate matching (scoring)
lib/
  types.ts           -- Shared TypeScript types (Intent, User, MatchResult)
  prompts.ts         -- System prompt with JSON schema and few-shot examples
  scoring.ts         -- Weighted scoring logic
```
