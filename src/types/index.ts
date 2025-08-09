/**
 * Core type definitions for the Portuguese learning application.
 * 
 * This file contains all the TypeScript interfaces and types used
 * throughout the application for better type safety and maintainability.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

/**
 * Represents a Portuguese word with its English translation
 */
export interface Word {
    /** Frequency rank of the word (lower = more common) */
    rank: number;
    /** The Portuguese word */
    targetWord: string;
    /** The English translation */
    englishWord: string;
    /** Whether the quiz shows English and asks for Portuguese */
    isEnglishToPortuguese?: boolean;
}

/**
 * Extends Word with practice tracking information
 */
export interface PracticeWord extends Word {
    /** Number of times the user got this word correct */
    correctCount: number;
    /** Whether the quiz shows English and asks for Portuguese (required for practice words) */
    isEnglishToPortuguese: boolean;
}

/**
 * Detailed explanation of a Portuguese word from OpenAI API
 */
export interface Explanation {
    /** Example usage with translation */
    example: string;
    /** Detailed explanation for English speakers */
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
    /** The Portuguese word being explained */
    word: string;
    /** The English reference word */
    englishReference: string;
}

/**
 * Daily learning statistics
 */
export interface DailyStats {
    [date: string]: number;
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
 * Application state for the learning interface
 */
export interface AppState {
    /** Current user XP points */
    vocabularyXP: number;
    /** All available words */
    words: Word[];
    /** Words that need more practice */
    practiceWords: PracticeWord[];
    /** Currently displayed word */
    currentWord: Word | PracticeWord | null;
    /** User's input text */
    userInput: string;
    /** Current quiz result state */
    result: QuizResult;
    /** Whether the input field is editable */
    isEditable: boolean;
    /** Timer for auto-advancing to next word */
    timer: number | null;
    /** Daily learning statistics */
    dailyStats: DailyStats;
    /** When the current question was shown */
    questionStartTime: number | null;
    /** Current word explanation */
    explanation: Explanation | null;
    /** Whether explanation is being loaded */
    loadingExplanation: boolean;
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
    VOCABULARY_XP: 'vocabularyXP',
    PRACTICE_WORDS: 'practiceWords',
    DAILY_STATS: 'dailyStats',
    EXPLANATIONS: 'explanations',
    AUTH: 'auth',
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
    /** Base practice chance */
    BASE_PRACTICE_CHANCE: 0.3,
    /** Practice chance multiplier */
    PRACTICE_CHANCE_MULTIPLIER: 0.7,
    /** Practice chance divisor */
    PRACTICE_CHANCE_DIVISOR: 20,
} as const;
