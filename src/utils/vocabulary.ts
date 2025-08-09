/**
 * Utility functions for the Portuguese learning application.
 * 
 * This file contains pure functions that perform common operations
 * such as text normalization, XP calculation, and word selection logic.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

import { Word, PracticeWord, CONFIG } from '@/types';

/**
 * Normalizes text by removing accents, spaces, and converting to lowercase
 * for comparison purposes during quiz validation.
 * 
 * @param str - The string to normalize
 * @returns Normalized string
 * 
 * @example
 * ```typescript
 * normalizeText("São Paulo") // returns "saopaulo"
 * normalizeText("não fala") // returns "naofala"
 * ```
 */
export function normalizeText(str: string): string {
    return str
        .normalize('NFD') // Decompose accents
        .replace(/\p{Diacritic}/gu, '') // Remove accents
        .replace(/\s+/g, '') // Remove spaces
        .toLowerCase();
}

/**
 * Calculates XP points based on response time.
 * Faster responses earn more XP, with a linear decay from max to min XP.
 * 
 * @param responseTime - Time taken to respond in milliseconds
 * @returns XP points earned (1-10)
 * 
 * @example
 * ```typescript
 * calculateXP(1000) // returns 10 (very fast)
 * calculateXP(15000) // returns 5 (medium speed)
 * calculateXP(35000) // returns 1 (slow)
 * ```
 */
export function calculateXP(responseTime: number): number {
    const { MIN_XP, MAX_XP, FAST_RESPONSE_TIME, SLOW_RESPONSE_TIME } = CONFIG;

    if (responseTime <= FAST_RESPONSE_TIME) return MAX_XP;
    if (responseTime >= SLOW_RESPONSE_TIME) return MIN_XP;

    const timeRange = SLOW_RESPONSE_TIME - FAST_RESPONSE_TIME;
    const xpRange = MAX_XP - MIN_XP;
    const timeRatio = (responseTime - FAST_RESPONSE_TIME) / timeRange;

    return Math.ceil(MAX_XP - (timeRatio * xpRange));
}

/**
 * Checks if two strings match after normalization.
 * Used for validating user answers against correct answers.
 * 
 * @param userInput - User's input string
 * @param correctAnswer - The correct answer
 * @returns True if inputs match after normalization
 * 
 * @example
 * ```typescript
 * isAnswerCorrect("São Paulo", "sao paulo") // returns true
 * isAnswerCorrect("casa", "CASA") // returns true
 * isAnswerCorrect("gato", "cão") // returns false
 * ```
 */
export function isAnswerCorrect(userInput: string, correctAnswer: string): boolean {
    return normalizeText(userInput) === normalizeText(correctAnswer);
}

/**
 * Determines the practice probability based on the number of words in practice list.
 * More words in practice = higher chance of showing practice words.
 * 
 * @param practiceWordsCount - Number of words in the practice list
 * @returns Probability between 0 and 1
 * 
 * @example
 * ```typescript
 * getPracticeChance(0) // returns 0.3 (30% base chance)
 * getPracticeChance(10) // returns 0.65 (65% chance)
 * getPracticeChance(20) // returns 1.0 (100% chance)
 * ```
 */
export function getPracticeChance(practiceWordsCount: number): number {
    const { BASE_PRACTICE_CHANCE, PRACTICE_CHANCE_MULTIPLIER, PRACTICE_CHANCE_DIVISOR } = CONFIG;

    return Math.min(
        BASE_PRACTICE_CHANCE + (practiceWordsCount / PRACTICE_CHANCE_DIVISOR) * PRACTICE_CHANCE_MULTIPLIER,
        1
    );
}

/**
 * Selects the next word to display, either from practice list or available words.
 * Uses weighted random selection based on practice probability.
 * 
 * @param words - All available words
 * @param practiceWords - Words that need more practice
 * @returns Next word to display or null if no words available
 * 
 * @example
 * ```typescript
 * const nextWord = selectNextWord(allWords, practiceWords);
 * if (nextWord) {
 *   console.log(`Show word: ${nextWord.targetWord}`);
 * }
 * ```
 */
export function selectNextWord(
    words: Word[],
    practiceWords: PracticeWord[]
): (Word | PracticeWord) | null {
    const practiceChance = getPracticeChance(practiceWords.length);
    const shouldUsePracticeWord = practiceWords.length > 0 && Math.random() < practiceChance;

    if (shouldUsePracticeWord) {
        // Select random practice word
        return practiceWords[Math.floor(Math.random() * practiceWords.length)];
    } else {
        // Select random word not in practice list
        const availableWords = words.filter(word =>
            !practiceWords.some(pWord => pWord.rank === word.rank)
        );

        if (availableWords.length === 0) return null;

        return availableWords[Math.floor(Math.random() * availableWords.length)];
    }
}

/**
 * Adds random direction (English to Portuguese or vice versa) to a word.
 * 
 * @param word - Word to add direction to
 * @param forceDirection - Optional direction to force
 * @returns Word with direction property set
 */
export function addRandomDirection(
    word: Word | PracticeWord,
    forceDirection?: boolean
): Word | PracticeWord {
    const isEnglishToPortuguese = forceDirection ?? Math.random() < 0.5;
    return { ...word, isEnglishToPortuguese };
}

/**
 * Shuffles an array using Fisher-Yates algorithm.
 * 
 * @param array - Array to shuffle
 * @returns New shuffled array
 * 
 * @example
 * ```typescript
 * const shuffled = shuffleArray([1, 2, 3, 4, 5]);
 * console.log(shuffled); // e.g., [3, 1, 5, 2, 4]
 * ```
 */
export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

/**
 * Formats a timer value in milliseconds to a human-readable string.
 * 
 * @param ms - Time in milliseconds
 * @returns Formatted time string
 * 
 * @example
 * ```typescript
 * formatTimer(1500) // returns "1.5s"
 * formatTimer(500) // returns "500ms"
 * formatTimer(0) // returns "0ms"
 * ```
 */
export function formatTimer(ms: number): string {
    if (ms >= 1000) {
        return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${Math.ceil(ms)}ms`;
}

/**
 * Debounces a function call to prevent excessive executions.
 * 
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Creates a safe error message for display to users.
 * Filters out sensitive information and provides user-friendly messages.
 * 
 * @param error - Error object or string
 * @returns Safe error message for display
 */
export function createSafeErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        // Handle common error types
        if (error.message.includes('fetch')) {
            return 'Network error. Please check your connection and try again.';
        }
        if (error.message.includes('401') || error.message.includes('403')) {
            return 'Authentication failed. Please check your authorization.';
        }
        if (error.message.includes('429')) {
            return 'Too many requests. Please wait a moment and try again.';
        }
        if (error.message.includes('500')) {
            return 'Server error. Please try again later.';
        }

        return 'An unexpected error occurred. Please try again.';
    }

    return 'Something went wrong. Please try again.';
}
