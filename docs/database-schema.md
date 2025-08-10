# Database Schema

This reflects the schema created by `src/lib/database/config.ts` and initialized by `DatabaseManager`.

## Location

- SQLite file: `cache/vocabulary.db`

## Tables

### phrases

Stores individual words and phrases.

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Phrase id |
| phrase | TEXT | NOT NULL | Phrase text |
| language | TEXT | NOT NULL | Language code (`'en'` or `'pt'`) |
| relative_frequency | REAL | NULL | Optional frequency score (0–1) |

Indexes:
- `idx_phrases_language (language)`
- `idx_phrases_phrase (phrase)`
- `idx_phrases_frequency (relative_frequency)`

### categories

Stores category labels used on relationships.

| Column | Type | Constraints |
| --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| name | TEXT | NOT NULL UNIQUE |

### similarity

Stores relationships (translations, synonyms, related terms).

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Relationship id |
| from_phrase_id | INTEGER | NOT NULL REFERENCES phrases(id) ON DELETE CASCADE | Source phrase id |
| to_phrase_id | INTEGER | NOT NULL REFERENCES phrases(id) ON DELETE CASCADE | Target phrase id |
| similarity | REAL | NOT NULL CHECK(0.0 <= similarity AND similarity <= 1.0) | Similarity score |
| category_id | INTEGER | NULL REFERENCES categories(id) ON DELETE SET NULL | Optional category |

Uniqueness and indexes:
- UNIQUE(from_phrase_id, to_phrase_id)
- `idx_similarity_from (from_phrase_id)`
- `idx_similarity_to (to_phrase_id)`
- `idx_similarity_score (similarity)`
- `idx_similarity_bidirectional (from_phrase_id, to_phrase_id)`
- `idx_similarity_category (category_id)`

## Initialization Notes

- Foreign keys are enabled via `PRAGMA foreign_keys = ON`.
- Schema is created idempotently on first access.

## Common Queries

Translations for practice (cross-language):
```sql
SELECT 
  p_to.id,
  p_to.phrase,
  p_to.language,
  p_to.relative_frequency,
  s.similarity
FROM similarity s
JOIN phrases p_from ON s.from_phrase_id = p_from.id
JOIN phrases p_to   ON s.to_phrase_id   = p_to.id
WHERE p_from.id = ?
  AND p_from.language <> p_to.language
  AND s.similarity >= ?
ORDER BY s.similarity DESC
LIMIT ?;
```

Random phrase that has at least one translation:
```sql
SELECT p.id, p.phrase, p.language, p.relative_frequency
FROM phrases p
WHERE p.language = ?
  AND EXISTS (
    SELECT 1
    FROM similarity s
    JOIN phrases p2 ON s.to_phrase_id = p2.id
    WHERE s.from_phrase_id = p.id AND p.language <> p2.language
  )
ORDER BY RANDOM()
LIMIT 1;
```

Database statistics:
```sql
SELECT 
  (SELECT COUNT(*) FROM phrases)             AS total_phrases,
  (SELECT COUNT(*) FROM similarity)          AS total_similarities,
  (SELECT AVG(similarity) FROM similarity)   AS avg_similarity,
  (SELECT COUNT(*) FROM phrases WHERE language = 'en') AS english_phrases,
  (SELECT COUNT(*) FROM phrases WHERE language = 'pt') AS portuguese_phrases;
```

Search phrases (simple LIKE):
```sql
SELECT p.id, p.phrase, p.language, c.name AS category
FROM phrases p
LEFT JOIN similarity s ON p.id = s.from_phrase_id
LEFT JOIN categories c ON s.category_id = c.id
WHERE p.phrase LIKE ?
LIMIT 100;
```

Orphan phrases (no outgoing relationships):
```sql
SELECT p.id, p.phrase, p.language
FROM phrases p
WHERE NOT EXISTS (
  SELECT 1 FROM similarity s WHERE s.from_phrase_id = p.id
);
```
