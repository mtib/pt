# API Endpoints Documentation

## Overview

This document describes the new API endpoints for the database-backed vocabulary system.

## Base Configuration

All API endpoints are located under `/api/` and return JSON responses.

### Error Respons### POST /api/vocabulary/import

**Purpose**: Import phrase pairs into the vocabulary database (admin only)

**Authentication**: Requires `PRESHARED_KEY`

**Request Body**:
```json
{
  "data": [
    {
      "phrase1": "hello",
      "language1": "en",
      "phrase2": "olá", 
      "language2": "pt",
      "similarity": 0.95,
      "category": null
    }
  ],
  "overwrite": false,
  "authKey": "your-import-auth-key"
}```typescript
{
  error: string;
  details?: string; // Optional additional error information
}
```

### Success Response Format
Varies by endpoint, but generally includes:
- `success: boolean`
- Data fields specific to the endpoint

## Endpoints

### GET /api/vocabulary/random

Returns a random phrase for practice, with its possible translations/answers.

#### Query Parameters
- `language` (optional): Preferred source language ("en" or "pt"). If not provided, randomly selects between languages.

#### Response Format
```typescript
{
  success: true;
  data: {
    sourcePhrase: {
      id: number;
      phrase: string;
      language: string;
      relativeFrequency?: number;
    };
    targetOptions: Array<{
      id: number;
      phrase: string;
      language: string;
      similarity: number;
      relativeFrequency?: number;
    }>;
    direction: "en-to-pt" | "pt-to-en";
    acceptableSimilarity: number; // Minimum similarity threshold for correct answers
  };
}
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "sourcePhrase": {
      "id": 1,
      "phrase": "hello",
      "language": "en",
      "relativeFrequency": 0.95
    },
    "targetOptions": [
      {
        "id": 2,
        "phrase": "olá",
        "language": "pt",
        "similarity": 0.9,
        "relativeFrequency": 0.92
      },
      {
        "id": 15,
        "phrase": "oi",
        "language": "pt",
        "similarity": 0.8,
        "relativeFrequency": 0.88
      }
    ],
    "direction": "en-to-pt",
    "acceptableSimilarity": 0.5
  }
}
```

### GET /api/vocabulary/practice/:phraseId

Returns practice data for a specific phrase by its ID.

#### Path Parameters
- `phraseId`: Integer ID of the phrase to practice

#### Response Format
```typescript
{
  success: true;
  data: {
    sourcePhrase: {
      id: number;
      phrase: string;
      language: string;
      relativeFrequency?: number;
    };
    targetOptions: Array<{
      id: number;
      phrase: string;
      language: string;
      similarity: number;
      relativeFrequency?: number;
    }>;
    direction: "en-to-pt" | "pt-to-en";
    acceptableSimilarity: number;
  };
}
```

#### Error Cases
- `404`: Phrase ID not found
- `400`: Invalid phrase ID format

### POST /api/vocabulary/validate

Validates a user's answer against the correct options.

#### Request Body
```typescript
{
  sourcePhraseId: number;
  userAnswer: string;
  acceptableSimilarity?: number; // Optional, defaults to CONFIG.ACCEPTABLE_SIMILARITY
}
```

#### Response Format
```typescript
{
  success: true;
  data: {
    isCorrect: boolean;
    matchedPhrase?: {
      id: number;
      phrase: string;
      similarity: number;
    };
    correctAnswers: Array<{
      id: number;
      phrase: string;
      similarity: number;
    }>;
    normalizedUserInput: string;
  };
}
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "isCorrect": true,
    "matchedPhrase": {
      "id": 2,
      "phrase": "olá",
      "similarity": 0.9
    },
    "correctAnswers": [
      {
        "id": 2,
        "phrase": "olá",
        "similarity": 0.9
      },
      {
        "id": 15,
        "phrase": "oi",
        "similarity": 0.8
      }
    ],
    "normalizedUserInput": "ola"
  }
}
```

### GET /api/vocabulary/similar/:phraseId

Returns phrases similar to the given phrase ID (synonyms, related words).

#### Path Parameters
- `phraseId`: Integer ID of the phrase to find similarities for

#### Query Parameters
- `minSimilarity` (optional): Minimum similarity threshold (default: 0.5)
- `sameLanguage` (optional): Boolean, if true only returns phrases in the same language (default: false)
- `limit` (optional): Maximum number of results to return (default: 10)

#### Response Format
```typescript
{
  success: true;
  data: {
    sourcePhrase: {
      id: number;
      phrase: string;
      language: string;
    };
    similarPhrases: Array<{
      id: number;
      phrase: string;
      language: string;
      similarity: number;
      relativeFrequency?: number;
    }>;
  };
}
```

### GET /api/vocabulary/stats

Returns database statistics and health information.

#### Response Format
```typescript
{
  success: true;
  data: {
    totalPhrases: number;
    totalSimilarities: number;
    languageBreakdown: {
      [languageCode: string]: number;
    };
    averageSimilarity: number;
    lastUpdated?: string; // ISO timestamp
  };
}
```

### POST /api/vocabulary/import

Administrative endpoint to import vocabulary data from external sources.

#### Request Body
```typescript
{
  source: "github-common-words" | "custom";
  data?: Array<{ // Only for custom source
    englishWord: string;
    targetWord: string;
    rank?: number;
  }>;
  overwrite?: boolean; // Whether to clear existing data first
}
```

#### Response Format
```typescript
{
  success: true;
  data: {
    imported: number;
    skipped: number;
    errors: number;
    message: string;
  };
}
```

## Configuration Constants

The following constants control API behavior:

```typescript
export const VOCAB_CONFIG = {
  ACCEPTABLE_SIMILARITY: 0.5,    // Minimum similarity for correct answers
  DEFAULT_LIMIT: 10,             // Default number of results to return
  MAX_LIMIT: 100,                // Maximum results per request
  IMPORT_SIMILARITY: 0.9,        // Default similarity for imported word pairs
  RANDOM_LANGUAGE_CHANCE: 0.5,   // Probability of selecting each language randomly
};
```

## Rate Limiting

- All endpoints are subject to rate limiting: 100 requests per minute per IP
- Import endpoint has stricter limits: 5 requests per hour per IP

## Caching

- Random endpoint responses are not cached (to ensure randomness)
- Practice endpoint responses are cached for 5 minutes per phrase ID
- Similar phrases responses are cached for 1 hour per phrase ID
- Stats endpoint is cached for 15 minutes
