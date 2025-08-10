# API Endpoints

This document reflects the current API implemented in `src/pages/api`.

## Conventions

- Base path: `/api`
- Content type: JSON for requests and responses
- Success wrapper: Most endpoints return `{ success: boolean, data?: T, error?: string }`
- CORS: Public endpoints set permissive CORS headers; admin endpoints require auth

## Authentication

- Header: `Authorization: Bearer ${PRESHARED_KEY}`
- Required for admin endpoints only: categories, search, orphans, deletePair, phrase delete, import
- Configure `PRESHARED_KEY` in `.env`

## Health

GET `/api/health`
- Purpose: Service health for CI/Docker
- Response: `{ status: 'healthy' | 'unhealthy', timestamp, uptime, version, environment }`

## Explanations (OpenAI)

POST `/api/explain`
- Auth: Required (`Authorization: Bearer ...`)
- Body: `{ sourcePhraseId: number, expectedAnswerId: number }`
- Response: Explanation object
  - Fields: `example, explanation, definition, grammar, facts, pronunciationIPA, pronunciationEnglish, synonyms, alternatives, word, englishReference`
- Notes: Caches results under `cache/explanations/`

## Vocabulary (information)

GET `/api/vocabulary`
- Purpose: Guidance endpoint that summarizes DB status and points to the new routes
- Response: `{ words: [], source: 'database', totalPhrases, message, newEndpoints }`

## Vocabulary (public)

GET `/api/vocabulary/random`
- Query: `language=en|pt` (optional)
- Response data shape:
  ```ts
  {
    sourcePhrase: { id, phrase, language, relativeFrequency? },
    targetOptions: Array<{ id, phrase, language, similarity, relativeFrequency? }>,
    direction: 'en-to-pt' | 'pt-to-en',
    acceptableSimilarity: number
  }
  ```
- Caching: Disabled (ensures randomness)

GET `/api/vocabulary/practice/[phraseId]`
- Path: `phraseId` is a positive integer
- Response: Same shape as `/random`
- Errors: `400` invalid id, `404` not found
- Caching: Public for 5 minutes

POST `/api/vocabulary/validate`
- Body: `{ sourcePhraseId: number, userAnswer: string, acceptableSimilarity?: number }`
- Response data shape:
  ```ts
  {
    isCorrect: boolean,
    matchedPhrase?: { id, phrase, language, similarity, relativeFrequency? },
    correctAnswers: Array<{ id, phrase, language, similarity, relativeFrequency? }>,
    normalizedUserInput: string
  }
  ```
- Caching: Disabled (contains user input)

GET `/api/vocabulary/stats`
- Response data shape:
  ```ts
  {
    totalPhrases: number,
    totalSimilarities: number,
    languageBreakdown: { en: number, pt: number },
    averageSimilarity: number,
    lastUpdated: string
  }
  ```
- Caching: 15 minutes

## Vocabulary (admin)

All routes below require `Authorization: Bearer ${PRESHARED_KEY}`.

GET `/api/vocabulary/categories`
- Response: `Array<{ id: number, name: string }>`

POST `/api/vocabulary/categories`
- Body: `{ name: string }`
- Response: `{ id: number, name: string }`

GET `/api/vocabulary/orphans`
- Response: `Array<{ id, phrase, language }>` (phrases with no translations)

GET `/api/vocabulary/search?q=...`
- Response: `{ [category: string]: Array<{ fromPhrase: {id, phrase, language}, toPhrase: {id, phrase, language} }> }`

DELETE `/api/vocabulary/phrase/[phraseId]`
- Deletes a phrase by id
- Response: `204 No Content`

DELETE `/api/vocabulary/deletePair?phrase1=ID&phrase2=ID`
- Deletes a specific similarity relationship in both directions
- Response: `{ message: 'Ok' }`

POST `/api/vocabulary/import`
- Body: `{ data: PhrasePairImport[] | PhrasePairImport, overwrite?: boolean }`
  - `PhrasePairImport` = `{ phrase1: string, language1: string, phrase2: string, language2: string, similarity: number, categoryId?: number | category?: string|number }`
- Response: `{ success: true, data: { imported, skipped, errors, message } }`
- Notes: Auth required via header; request body `authKey` is not used by the server

## Constants

Selected values from `VOCAB_CONFIG` used by the API:
```ts
ACCEPTABLE_SIMILARITY = 0.5
DEFAULT_LIMIT = 10
MAX_LIMIT = 100
RANDOM_LANGUAGE_CHANCE = 0.5
```

## Caching Summary

- `/vocabulary/random`: no-cache
- `/vocabulary/practice/[id]`: 5 minutes
- `/vocabulary/stats`: 15 minutes
- Validation and admin endpoints: no-cache
