/**
 * Core type definitions for the Portuguese learning application.
 * 
 * This file contains all the TypeScript interfaces and types used
 * throughout the application for better type safety and maintainability.
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

export const SUPPORTED_LANGUAGES = [
    'en',
    'de',
    'pt'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export function toFullLanguageName(lang: SupportedLanguage): string {
    switch (lang) {
        case 'en':
            return 'English';
        case 'de':
            return 'German';
        case 'pt':
            return 'European Portuguese';

        default:
            throw new Error(`Unknown language ${lang}`);
    }
};


/**
 * API response interfaces
 */
export interface Phrase {
    id: number;
    phrase: string;
    language: SupportedLanguage;
    relativeFrequency?: number;
}

export interface PhraseWithSimilarity extends Phrase {
    similarity: number;
}

export interface VocabularyResponse {
    sourcePhrase: Phrase;
    /** 
     * All acceptable answers for current direction (includes synonyms and alternatives with metadata)
     * Guaranteed to be sorted in descending similarity, with acceptableAnswers[0].phrase being identical to translation_pt (when direction is en-to-pt) or translation_en (when direction is pt-to-en)
     */
    targetOptions: PhraseWithSimilarity[];
}

export interface StatsResponse {
    totalPhrases: number;
    totalSimilarities: number;
    languageBreakdown: Record<SupportedLanguage, number>,
}

export interface ImportResponse {
    imported: number;
    skipped: number;
    errors: number;
    message: string;
}

/**
 * Database-backed practice word format
 * Contains full phrase data from database with practice tracking
 */
export interface PracticePhrase {
    phraseId: number;
    /** Practice tracking - number of correct answers */
    correctCount: number;
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
    foreignPhrase: string;
    /** Reference translation */
    englishPhrase: string;
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
export type Direction = {
    from: SupportedLanguage,
    to: SupportedLanguage;
};

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
    // Practice tracking (local)
    VOCABULARY_XP: 'vocabularyXP',
    PRACTICE_WORDS: 'practiceWords',

    // Daily statistics
    DAILY_STATS: 'pt-daily-stats',
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
    /** Maximum correct count before removing from practice (configurable) */
    PRACTICE_MAX_CORRECT_COUNT: 3,
    /** Base practice chance */
    BASE_PRACTICE_CHANCE: 0.3,
} as const;
