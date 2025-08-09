/**
 * API client for database-backed vocabulary system
 * 
 * This module provides functions for interacting with the new database-backed
 * vocabulary API endpoints, including error handling and response validation.
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import { PhrasePairImport } from '@/lib/database/config';

/**
 * Base API configuration
 */
const API_BASE = '/api/vocabulary';

/**
 * API response interfaces
 */
export interface DatabasePhrase {
    id: number;
    phrase: string;
    language: string;
    relativeFrequency?: number;
}

export interface DatabasePhraseWithSimilarity extends DatabasePhrase {
    similarity: number;
}

export interface VocabularyResponse {
    sourcePhrase: DatabasePhrase;
    targetOptions: DatabasePhraseWithSimilarity[];
    direction: 'en-to-pt' | 'pt-to-en';
    acceptableSimilarity: number;
}

export interface SimilarPhrasesResponse {
    sourcePhrase: DatabasePhrase;
    similarPhrases: DatabasePhraseWithSimilarity[];
}

export interface DatabaseStatsResponse {
    totalPhrases: number;
    totalSimilarities: number;
    languageBreakdown: {
        [languageCode: string]: number;
    };
    averageSimilarity: number;
    databaseSize: string;
    lastUpdated?: string;
}

export interface ImportResponse {
    imported: number;
    skipped: number;
    errors: number;
    message: string;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    details?: string;
}

/**
 * Custom error class for API errors
 */
export class VocabularyApiError extends Error {
    public readonly status: number;
    public readonly details?: string;

    constructor(message: string, status: number, details?: string) {
        super(message);
        this.name = 'VocabularyApiError';
        this.status = status;
        this.details = details;
    }
}

/**
 * Generic API request function with error handling
 */
async function apiRequest<T>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        const data: ApiResponse<T> = await response.json();

        if (!response.ok || !data.success) {
            throw new VocabularyApiError(
                data.error || `API request failed with status ${response.status}`,
                response.status,
                data.details
            );
        }

        return data.data!;
    } catch (error) {
        if (error instanceof VocabularyApiError) {
            throw error;
        }

        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new VocabularyApiError(
                'Network error. Please check your connection and try again.',
                0
            );
        }

        throw new VocabularyApiError(
            error instanceof Error ? error.message : 'Unknown API error',
            0
        );
    }
}

/**
 * Database vocabulary API client
 */
export const DatabaseVocabularyApi = {
    /**
     * Get a random word for practice
     */
    async getRandomWord(sourceLanguage?: 'en' | 'pt'): Promise<VocabularyResponse> {
        const params = sourceLanguage ? `?language=${sourceLanguage}` : '';
        return apiRequest<VocabularyResponse>(`${API_BASE}/random${params}`);
    },

    /**
     * Get practice data for a specific phrase ID
     */
    async getPracticeWord(phraseId: number): Promise<VocabularyResponse> {
        return apiRequest<VocabularyResponse>(`${API_BASE}/practice/${phraseId}`);
    },

    /**
     * Get similar phrases (synonyms, related words, translations)
     */
    async getSimilarPhrases(
        phraseId: number,
        options: {
            minSimilarity?: number;
            sameLanguage?: boolean;
            limit?: number;
        } = {}
    ): Promise<SimilarPhrasesResponse> {
        const params = new URLSearchParams();

        if (options.minSimilarity !== undefined) {
            params.set('minSimilarity', options.minSimilarity.toString());
        }
        if (options.sameLanguage !== undefined) {
            params.set('sameLanguage', options.sameLanguage.toString());
        }
        if (options.limit !== undefined) {
            params.set('limit', options.limit.toString());
        }

        const queryString = params.toString();
        const url = `${API_BASE}/similar/${phraseId}${queryString ? `?${queryString}` : ''}`;

        return apiRequest<SimilarPhrasesResponse>(url);
    },

    /**
     * Get database statistics
     */
    async getStats(): Promise<DatabaseStatsResponse> {
        return apiRequest<DatabaseStatsResponse>(`${API_BASE}/stats`);
    },

    /**
     * Import phrase pairs (admin function)
     */
    async importPhrasePairs(
        phrasePairs: PhrasePairImport[],
        options: {
            overwrite?: boolean;
            authKey: string;
        }
    ): Promise<ImportResponse> {
        return apiRequest<ImportResponse>(`${API_BASE}/import`, {
            method: 'POST',
            body: JSON.stringify({
                data: phrasePairs,
                overwrite: options.overwrite || false,
                authKey: options.authKey
            }),
        });
    },

    /**
     * Check if the database system is available and healthy
     */
    async healthCheck(): Promise<boolean> {
        try {
            const stats = await this.getStats();
            return stats.totalPhrases >= 0; // Even 0 is valid if database is working
        } catch (error) {
            console.warn('Database health check failed:', error);
            return false;
        }
    },
};

/**
 * Convenience function to handle API errors with user-friendly messages
 */
export function handleVocabularyApiError(error: unknown): string {
    if (error instanceof VocabularyApiError) {
        // Map specific error statuses to user-friendly messages
        switch (error.status) {
            case 404:
                return 'The requested word or phrase was not found.';
            case 503:
                return 'The vocabulary service is temporarily unavailable. Please try again later.';
            case 429:
                return 'Too many requests. Please wait a moment and try again.';
            case 0:
                return error.message; // Network errors are already user-friendly
            default:
                return error.details || error.message || 'An error occurred while loading vocabulary data.';
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
}

/**
 * Type guard to check if an error is a VocabularyApiError
 */
export function isVocabularyApiError(error: unknown): error is VocabularyApiError {
    return error instanceof VocabularyApiError;
}

export default DatabaseVocabularyApi;
