/**
 * API route for getting random vocabulary for practice
 * 
 * This endpoint returns a random phrase with its possible translations,
 * supporting the new database-backed vocabulary system.
 * 
 * GET /api/vocabulary/random
 * 
 * Query parameters:
 * - language: Optional preferred source language ("en" or "pt")
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { VocabularyAPI, VOCAB_CONFIG, VocabularyResponse } from '@/lib/database';
import { formatSqlError } from '@/lib/database';

/**
 * API response types
 */
interface RandomVocabularySuccessResponse {
    success: true;
    data: VocabularyResponse;
}

interface ErrorResponse {
    success: false;
    error: string;
    details?: string;
}

type ApiResponse = RandomVocabularySuccessResponse | ErrorResponse;

/**
 * Main API handler for random vocabulary
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
): Promise<void> {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        res.status(405).json({
            success: false,
            error: 'Method not allowed. Only GET requests are supported.'
        });
        return;
    }

    try {
        // Extract and validate query parameters
        const { language } = req.query;

        let sourceLanguage: 'en' | 'pt' | undefined;
        if (language) {
            if (typeof language !== 'string' || !VOCAB_CONFIG.SUPPORTED_LANGUAGES.includes(language as 'en' | 'pt')) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid language parameter',
                    details: `Language must be one of: ${VOCAB_CONFIG.SUPPORTED_LANGUAGES.join(', ')}`
                });
                return;
            }
            sourceLanguage = language as 'en' | 'pt';
        }

        // Initialize database if needed
        await VocabularyAPI.init();

        // Get random vocabulary
        const vocabularyData = await VocabularyAPI.getRandomWord(sourceLanguage);

        if (!vocabularyData) {
            res.status(404).json({
                success: false,
                error: 'No vocabulary data available',
                details: 'The database may be empty or contain no valid translations for the requested language.'
            });
            return;
        }

        // Prepare response data
        const responseData: VocabularyResponse = {
            sourcePhrase: vocabularyData.sourcePhrase,
            targetOptions: vocabularyData.targetOptions,
            direction: vocabularyData.direction,
            acceptableSimilarity: VOCAB_CONFIG.ACCEPTABLE_SIMILARITY
        };

        // Set cache headers (don't cache random responses to ensure randomness)
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Random vocabulary API error:', error);

        const errorMessage = error instanceof Error
            ? formatSqlError(error)
            : 'Failed to fetch random vocabulary';

        // Check if it's a database connection issue
        if (error instanceof Error && error.message.includes('SQLITE_CANTOPEN')) {
            res.status(503).json({
                success: false,
                error: 'Database unavailable',
                details: 'The vocabulary database could not be opened. Please try again later or run the migration script.'
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ?
                (error instanceof Error ? error.stack : String(error)) : undefined
        });
    }
}
