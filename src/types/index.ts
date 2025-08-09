/**
 * Core type definitions for the Portuguese learning application.
 * 
 * This file contains all the TypeScript interfaces and types used
 * throughout the application for better type safety and maintainability.
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

/**
 * Database-backed practice word format
 * Contains full phrase data from database with practice tracking
 */
export interface DatabasePracticeWord {
    /** Unique ID from the database */
    id: number;
    /** Portuguese phrase (most similar representative - other similar phrases will also be accepted) */
    translation_pt: string;
    /** English translation (most similar representative - other similar phrases will also be accepted) */
    translation_en: string;
    /** Relative frequency (0.0 to 1.0) */
    relative_frequency: number;
    /** Category/topic classification */
    category: string | null;
    /** Quiz direction for this session - determines what to show and what to expect */
    direction: Direction;
    /** Practice tracking - number of correct answers */
    correctCount?: number;
    /** Practice tracking - last practice timestamp */
    lastPracticed?: number;
    /** 
     * All acceptable answers for current direction (includes synonyms and alternatives with metadata)
     * Guaranteed to be sorted in descending similarity, with acceptableAnswers[0].phrase being identical to translation_pt (when direction is en-to-pt) or translation_en (when direction is pt-to-en)
     */
    acceptableAnswers: Array<{
        phrase: string;
        id: number;
        similarity: number;
    }>;
}

/**
 * Detailed explanation of a phrase from OpenAI API
 * Now includes information about synonyms and alternative translations
 */
export interface Explanation {
    /** Example usage with translation */
    example: string;
    /** Detailed explanation for language learners */
    explanation: string;
    /** Simple definition */
    definition: string;
    /** Grammatical information */
    grammar: string;
    /** Cultural/historical facts */
    facts: string;
    /** IPA pronunciation */
    pronunciationIPA: string;
    /** English phonetic pronunciation */
    pronunciationEnglish: string;
    /** Information about synonyms and similar phrases */
    synonyms: string;
    /** Information about alternative translations */
    alternatives: string;
    /** The phrase being explained */
    word: string;
    /** Reference translation (for backward compatibility) */
    englishReference: string;
}

/**
 * Quiz result states
 */
export type QuizResult =
    | 'incorrect'
    | 'correct'
    | 'revealed'
    | 'explaining'
    | 'explained';

/**
 * Quiz direction for database-driven system
 */
export type Direction = 'pt-to-en' | 'en-to-pt';

/**
 * Learning statistics for database-driven system
 */
export interface WordStats {
    /** Total number of quiz attempts */
    totalAttempts: number;
    /** Number of correct answers */
    correctAnswers: number;
    /** Average response time in milliseconds */
    averageResponseTime: number;
    /** Current streak of correct answers */
    streakCount: number;
    /** Set of phrase IDs that have been learned */
    wordsLearned: Set<number>;
}


/**
 * API request body for word explanation
 */
export interface ExplainRequest {
    /** Portuguese word to explain */
    word: string;
    /** English reference for context */
    englishReference: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
    error: string;
}

/**
 * Local storage keys used by the application
 */
export const STORAGE_KEYS = {
    // Database system keys
    AUTH_KEY: 'auth_key',
    USER_PREFERENCES: 'user_preferences',

    // Practice tracking (local)
    VOCABULARY_XP: 'vocabularyXP',
    PRACTICE_WORDS: 'practiceWords',
    EXPLANATIONS: 'explanations',
} as const;

/**
 * Configuration constants
 */
export const CONFIG = {
    /** Minimum XP for fastest response */
    MIN_XP: 1,
    /** Maximum XP for slowest response */
    MAX_XP: 10,
    /** Fast response threshold (ms) */
    FAST_RESPONSE_TIME: 2000,
    /** Slow response threshold (ms) */
    SLOW_RESPONSE_TIME: 30000,
    /** Auto-advance delay after correct answer (ms) */
    CORRECT_DELAY: 500,
    /** Auto-advance delay after showing answer (ms) */
    REVEAL_DELAY: 2000,
    /** Maximum correct count before removing from practice */
    MAX_CORRECT_COUNT: 3,
    /** Maximum correct count before removing from practice (configurable) */
    PRACTICE_MAX_CORRECT_COUNT: 3,
    /** Base practice chance */
    BASE_PRACTICE_CHANCE: 0.3,
    /** Practice chance multiplier */
    PRACTICE_CHANCE_MULTIPLIER: 0.7,
    /** Practice chance divisor */
    PRACTICE_CHANCE_DIVISOR: 20,
    /** Minimum similarity for accepting database answers */
    ACCEPTABLE_SIMILARITY: 0.5,
    /** Similarity threshold for showing related words */
    RELATED_WORDS_SIMILARITY: 0.6,
} as const;
