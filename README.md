# syncs_hack — Converge AI Layer

AI-powered intent parsing and group-optimization engine for [Converge](https://github.com/tanay-sgl/syncs_hack): a coordination platform that understands what you're trying to accomplish and assembles the right people to make it happen.

This repo contains the two core API endpoints — the intent parser (LLM) and the matching/group-optimization algorithm — deployed as Vercel serverless functions.

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

Health check. Returns `200 { "status": "ok" }`.

---

### `POST /api/parse-intent`

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

### `POST /api/match`

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

**Scoring dimensions**

| Dimension           | How it works                                                                                          |
|---------------------|-------------------------------------------------------------------------------------------------------|
| Skill relevance     | Semantic matching via 18 skill clusters (e.g. "react" ~ "frontend"). Factors in experience level.     |
| Availability overlap| Day overlap (70%) + timezone proximity by UTC hour difference (30%).                                   |
| Location proximity  | Same city/campus = 1.0, nearby = 0.8, remote-flexible = 0.7, mismatch = 0.2.                         |
| Complementarity     | Penalizes skill duplication in the group. Bonus for filling unfilled roles. Greedy sequential selection.|
| Contextual          | Category-specific: course enrollment (study), commitment/style compatibility, seniority (mentor), preference/bio matching (investor/coffee). |

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
    "roles": [
      { "userId": "1", "role": "frontend" }
    ],
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

## Project structure

```
api/
  health.ts            -- Health check endpoint
  parse-intent.ts      -- Intent parsing (Gemini + Zod validation)
  match.ts             -- Candidate matching and group assembly
lib/
  types.ts             -- Shared TypeScript types
  prompts.ts           -- System prompt with schema and 6 few-shot examples
  scoring.ts           -- Category-aware weighted scoring with group optimization
  skills.ts            -- 18 skill similarity clusters
  timezones.ts         -- UTC offset map and timezone proximity scoring
```
