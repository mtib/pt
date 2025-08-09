/**
 * Database configuration and constants
 * 
 * This file contains configuration settings for the SQLite vocabulary database,
 * including paths, connection settings, and vocabulary-specific constants.
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import path from 'path';

/**
 * Database configuration constants
 */
export const DB_CONFIG = {
    /** Path to the SQLite database file */
    DB_PATH: path.join(process.cwd(), 'cache', 'vocabulary.db'),

    /** Database connection timeout in milliseconds */
    CONNECTION_TIMEOUT: 10000,

    /** Maximum number of concurrent connections */
    MAX_CONNECTIONS: 10,

    /** Enable foreign key constraints */
    ENABLE_FOREIGN_KEYS: true,

    /** Enable WAL mode for better concurrent access */
    ENABLE_WAL_MODE: true,
} as const;

/**
 * Vocabulary-specific configuration constants
 */
export const VOCAB_CONFIG = {
    /** Minimum similarity score for accepting an answer as correct */
    ACCEPTABLE_SIMILARITY: 0.5,

    /** Default similarity score for imported word pairs */
    IMPORT_SIMILARITY: 0.9,

    /** Default number of results to return in API responses */
    DEFAULT_LIMIT: 10,

    /** Maximum number of results allowed in a single request */
    MAX_LIMIT: 100,

    /** Probability of selecting each language when getting random words */
    RANDOM_LANGUAGE_CHANCE: 0.5,

    /** Cache duration for API responses in milliseconds (5 minutes) */
    CACHE_DURATION: 5 * 60 * 1000,

    /** Supported language codes */
    SUPPORTED_LANGUAGES: ['en', 'pt'] as const,
} as const;

/**
 * SQL query constants for database operations
 */
export const SQL_QUERIES = {
    /** Create phrases table */
    CREATE_PHRASES_TABLE: `
        CREATE TABLE IF NOT EXISTS phrases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phrase TEXT NOT NULL,
            language TEXT NOT NULL,
            relative_frequency REAL,
            category TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,

    /** Create similarity table */
    CREATE_SIMILARITY_TABLE: `
        CREATE TABLE IF NOT EXISTS similarity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_phrase_id INTEGER NOT NULL,
            to_phrase_id INTEGER NOT NULL,
            similarity REAL NOT NULL CHECK(similarity >= 0.0 AND similarity <= 1.0),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (from_phrase_id) REFERENCES phrases(id) ON DELETE CASCADE,
            FOREIGN KEY (to_phrase_id) REFERENCES phrases(id) ON DELETE CASCADE,
            UNIQUE(from_phrase_id, to_phrase_id)
        )
    `,

    /** Create indexes for better query performance */
    CREATE_INDEXES: [
        'CREATE INDEX IF NOT EXISTS idx_phrases_language ON phrases(language)',
        'CREATE INDEX IF NOT EXISTS idx_phrases_phrase ON phrases(phrase)',
        'CREATE INDEX IF NOT EXISTS idx_phrases_frequency ON phrases(relative_frequency)',
        'CREATE INDEX IF NOT EXISTS idx_phrases_category ON phrases(category)',
        'CREATE INDEX IF NOT EXISTS idx_similarity_from ON similarity(from_phrase_id)',
        'CREATE INDEX IF NOT EXISTS idx_similarity_to ON similarity(to_phrase_id)',
        'CREATE INDEX IF NOT EXISTS idx_similarity_score ON similarity(similarity)',
        'CREATE INDEX IF NOT EXISTS idx_similarity_bidirectional ON similarity(from_phrase_id, to_phrase_id)',
    ],

    /** Insert a new phrase */
    INSERT_PHRASE: `
        INSERT INTO phrases (phrase, language, relative_frequency, category)
        VALUES (?, ?, ?, ?)
    `,

    /** Insert a new similarity relationship */
    INSERT_SIMILARITY: `
        INSERT OR IGNORE INTO similarity (from_phrase_id, to_phrase_id, similarity)
        VALUES (?, ?, ?)
    `,

    /** Get a random phrase by language */
    GET_RANDOM_PHRASE: `
        SELECT id, phrase, language, relative_frequency
        FROM phrases
        WHERE language = ?
        ORDER BY RANDOM()
        LIMIT 1
    `,

    /** Get translations for a phrase */
    GET_TRANSLATIONS: `
        SELECT 
            p_to.id,
            p_to.phrase,
            p_to.language,
            p_to.relative_frequency,
            s.similarity
        FROM similarity s
        JOIN phrases p_from ON s.from_phrase_id = p_from.id
        JOIN phrases p_to ON s.to_phrase_id = p_to.id
        WHERE p_from.id = ? 
            AND p_from.language != p_to.language
            AND s.similarity >= ?
        ORDER BY s.similarity DESC
        LIMIT ?
    `,

    /** Get phrase by ID */
    GET_PHRASE_BY_ID: `
        SELECT id, phrase, language, relative_frequency
        FROM phrases
        WHERE id = ?
    `,

    /** Get similar phrases (same language) */
    GET_SIMILAR_PHRASES: `
        SELECT 
            p_to.id,
            p_to.phrase,
            p_to.language,
            p_to.relative_frequency,
            s.similarity
        FROM similarity s
        JOIN phrases p_from ON s.from_phrase_id = p_from.id
        JOIN phrases p_to ON s.to_phrase_id = p_to.id
        WHERE p_from.id = ? 
            AND p_from.language = p_to.language
            AND s.similarity >= ?
        ORDER BY s.similarity DESC
        LIMIT ?
    `,

    /** Get database statistics */
    GET_STATS: `
        SELECT 
            (SELECT COUNT(*) FROM phrases) as total_phrases,
            (SELECT COUNT(*) FROM similarity) as total_similarities,
            (SELECT AVG(similarity) FROM similarity) as avg_similarity,
            (SELECT COUNT(*) FROM phrases WHERE language = 'en') as english_phrases,
            (SELECT COUNT(*) FROM phrases WHERE language = 'pt') as portuguese_phrases
    `,

    /** Check if phrase exists */
    PHRASE_EXISTS: `
        SELECT id FROM phrases
        WHERE phrase = ? AND language = ?
        LIMIT 1
    `,

    /** Update phrase frequency */
    UPDATE_PHRASE_FREQUENCY: `
        UPDATE phrases 
        SET relative_frequency = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `,

    /** Delete all data (for import with overwrite) */
    DELETE_ALL_SIMILARITY: 'DELETE FROM similarity',
    DELETE_ALL_PHRASES: 'DELETE FROM phrases',
} as const;

/**
 * Type definitions for database entities
 */
export interface DbPhrase {
    id: number;
    phrase: string;
    language: string;
    relative_frequency?: number;
    category?: string;
    created_at?: string;
    updated_at?: string;
}

export interface DbSimilarity {
    id: number;
    from_phrase_id: number;
    to_phrase_id: number;
    similarity: number;
    created_at?: string;
}

export interface DbStats {
    total_phrases: number;
    total_similarities: number;
    avg_similarity: number;
    english_phrases: number;
    portuguese_phrases: number;
}

/**
 * API response type definitions
 */
export interface PhraseWithSimilarity extends DbPhrase {
    similarity: number;
}

export interface VocabularyResponse {
    sourcePhrase: DbPhrase;
    targetOptions: PhraseWithSimilarity[];
    direction: 'en-to-pt' | 'pt-to-en';
    acceptableSimilarity: number;
}

export interface ValidationResponse {
    isCorrect: boolean;
    matchedPhrase?: PhraseWithSimilarity;
    correctAnswers: PhraseWithSimilarity[];
    normalizedUserInput: string;
}

export interface SimilarPhrasesResponse {
    sourcePhrase: DbPhrase;
    similarPhrases: PhraseWithSimilarity[];
}

export interface StatsResponse {
    totalPhrases: number;
    totalSimilarities: number;
    languageBreakdown: {
        [languageCode: string]: number;
    };
    averageSimilarity: number;
    lastUpdated?: string;
}

export interface ImportResponse {
    imported: number;
    skipped: number;
    errors: number;
    message: string;
}

/**
 * Supported language type
 */
export type SupportedLanguage = typeof VOCAB_CONFIG.SUPPORTED_LANGUAGES[number];

/**
 * Direction type for vocabulary practice
 */
export type PracticeDirection = 'en-to-pt' | 'pt-to-en';

/**
 * Phrase pair import data structure
 * Used for importing phrase relationships with their similarity scores
 */
export interface PhrasePairImport {
    phrase1: string;
    language1: string;
    phrase2: string;
    language2: string;
    similarity: number;
    category1?: string;
    category2?: string;
}

export interface ImportDataResponse {
    phrasePairs: PhrasePairImport[];
}
