/**
 * Utility functions for the Portuguese learning application (Database System).
 * 
 * This file contains pure functions that perform common operations
 * such as text normalization, XP calculation, and database practice word management.
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import { CONFIG } from '@/types';

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
        .replace(/[''-]/g, '') // Remove apostrophes and similar characters
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
