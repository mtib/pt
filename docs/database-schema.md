# Database Schema Documentation

## Overview

The Portuguese Learning App uses a SQLite database to store vocabulary phrases and their relationships. This document describes the database schema, its purpose, and how it supports the learning functionality.

## Database Location

The SQLite database is stored at: `cache/vocabulary.db`

## Tables

### phrases

Stores individual words and phrases in different languages.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier for each phrase |
| phrase | TEXT | NOT NULL | The actual word or phrase text |
| language | TEXT | NOT NULL | Language code ("en" for English, "pt" for Portuguese) |
| relative_frequency | REAL | NULLABLE | Frequency of the phrase in the language (0.0 to 1.0), null if unknown |

**Indexes:**
- `idx_phrases_language` on `language`
- `idx_phrases_phrase` on `phrase`
- `idx_phrases_frequency` on `relative_frequency`

**Example data:**
```sql
INSERT INTO phrases (phrase, language, relative_frequency) VALUES
('hello', 'en', 0.95),
('olá', 'pt', 0.92),
('house', 'en', 0.85),
('casa', 'pt', 0.88);
```

### categories

Stores category classifications for relationships.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier for each category |
| name | TEXT | NOT NULL, UNIQUE | Name of the category |

**Indexes:**
- `idx_categories_name` on `name`

**Example data:**
```sql
INSERT INTO categories (name) VALUES
('greeting'),
('household');
```

### similarity

Stores relationships between phrases, including translations and synonyms.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier for each similarity relationship |
| from_phrase_id | INTEGER | NOT NULL, FOREIGN KEY | Reference to phrases.id (source phrase) |
| to_phrase_id | INTEGER | NOT NULL, FOREIGN KEY | Reference to phrases.id (target phrase) |
| similarity | REAL | NOT NULL, CHECK(similarity >= 0.0 AND similarity <= 1.0) | Similarity score between phrases |
| category_id | INTEGER | NULLABLE, FOREIGN KEY | Reference to categories.id |

**Foreign Key Constraints:**
- `from_phrase_id` REFERENCES `phrases(id)` ON DELETE CASCADE
- `to_phrase_id` REFERENCES `phrases(id)` ON DELETE CASCADE
- `category_id` REFERENCES `categories(id)` ON DELETE SET NULL

**Indexes:**
- `idx_similarity_from` on `from_phrase_id`
- `idx_similarity_to` on `to_phrase_id`
- `idx_similarity_score` on `similarity`
- `idx_similarity_category` on `category_id`
- `idx_similarity_bidirectional` on `from_phrase_id, to_phrase_id` (unique)

**Example data:**
```sql
-- Translation relationship (high similarity)
INSERT INTO similarity (from_phrase_id, to_phrase_id, similarity, category_id) VALUES
(1, 2, 0.9, 1),  -- 'hello' -> 'olá' (greeting)
(2, 1, 0.9, 1),  -- 'olá' -> 'hello' (greeting, bidirectional)
(3, 4, 0.9, 2),  -- 'house' -> 'casa' (household)
(4, 3, 0.9, 2);  -- 'casa' -> 'house' (household)
```

## Relationship Types

### Cross-Language Relationships (Translations)
- Similarity score typically 0.7 - 1.0
- Represents translation quality
- Always bidirectional (both directions stored)

### Same-Language Relationships (Synonyms/Related)
- Similarity score varies based on relationship strength
- 0.8 - 1.0: Near synonyms
- 0.6 - 0.8: Related words
- 0.3 - 0.6: Loosely related
- Always bidirectional

## Data Integrity Rules

1. **No Self-References**: `from_phrase_id` cannot equal `to_phrase_id`
2. **Bidirectional Consistency**: If phrase A relates to phrase B with similarity X, then phrase B should relate to phrase A with the same similarity X
3. **Similarity Range**: All similarity values must be between 0.0 and 1.0 inclusive
4. **Language Validation**: Language codes must be valid ISO 639-1 codes
5. **No Duplicate Relationships**: Each phrase pair can only have one similarity relationship

## Query Patterns

### Get Translations for Practice
```sql
SELECT 
    p_to.id,
    p_to.phrase,
    p_to.language,
    s.similarity,
    c.name AS category
FROM similarity s
JOIN phrases p_from ON s.from_phrase_id = p_from.id
JOIN phrases p_to ON s.to_phrase_id = p_to.id
LEFT JOIN categories c ON s.category_id = c.id
WHERE p_from.id = ? 
    AND p_from.language != p_to.language
    AND s.similarity >= 0.5
ORDER BY s.similarity DESC;
```

### Get Random Phrase for Practice
```sql
SELECT id, phrase, language 
FROM phrases 
WHERE language = ?
ORDER BY RANDOM() 
LIMIT 1;
```

### Get Synonyms/Related Words
```sql
SELECT 
    p_to.id,
    p_to.phrase,
    s.similarity,
    c.name AS category
FROM similarity s
JOIN phrases p_from ON s.from_phrase_id = p_from.id
JOIN phrases p_to ON s.to_phrase_id = p_to.id
LEFT JOIN categories c ON s.category_id = c.id
WHERE p_from.id = ? 
    AND p_from.language = p_to.language
    AND s.similarity >= 0.6
ORDER BY s.similarity DESC;
```
