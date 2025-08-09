/**
 * Database index file
 * 
 * Exports all database-related utilities, configurations, and operations
 * for easy import throughout the application.
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

// Configuration and types
export * from './config';

// Database connection management
export { getDatabase, formatSqlError } from './connection';
export { default as db } from './connection';

// Database operations
export * from './operations';

// Re-export commonly used utilities
import { getDatabase } from './connection';
import {
    getRandomPracticePair,
    getPracticeDataForPhrase,
    validateAnswer,
    getDatabaseStats,
    importVocabularyFromPairs
} from './operations';
import { PhrasePairImport } from './config';

/**
 * High-level API for common vocabulary operations
 * These functions provide simplified interfaces for the most common use cases
 */
export const VocabularyAPI = {
    /**
     * Initialize the database
     */
    async init() {
        const db = getDatabase();
        await db.initialize();
    },

    /**
     * Get a random word for practice
     */
    async getRandomWord(sourceLanguage?: 'en' | 'pt') {
        return getRandomPracticePair(sourceLanguage);
    },

    /**
     * Get practice data for a specific phrase
     */
    async getPracticeWord(phraseId: number) {
        return getPracticeDataForPhrase(phraseId);
    },

    /**
     * Validate a user's answer
     */
    async validateAnswer(sourcePhraseId: number, userAnswer: string, acceptableSimilarity?: number) {
        return validateAnswer(sourcePhraseId, userAnswer, acceptableSimilarity);
    },

    /**
     * Get database statistics
     */
    async getStats() {
        return getDatabaseStats();
    },

    /**
     * Import vocabulary from phrase pairs
     */
    async importVocabularyFromPairs(phrasePairs: PhrasePairImport[], overwrite?: boolean) {
        return importVocabularyFromPairs(phrasePairs, overwrite);
    },

    /**
     * Check database health
     */
    async healthCheck() {
        const db = getDatabase();
        return db.healthCheck();
    }
};

// Export the API as default for convenience
export default VocabularyAPI;
