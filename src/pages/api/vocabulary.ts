/**
 * API route for serving Portuguese vocabulary (Database System Only).
 * 
 * This endpoint serves vocabulary data from the new SQLite database system.
 * It provides guidance to use the new specific API endpoints for better functionality.
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { VocabularyAPI } from '@/lib/database';

/**
 * Database-based vocabulary response
 */
interface DatabaseVocabularyResponse {
    words: never[]; // Empty array to encourage using new endpoints
    source: 'database';
    totalPhrases: number;
    message: string;
    newEndpoints: {
        random: string;
        practice: string;
        stats: string;
        similar: string;
        import: string;
    };
}

interface ErrorResponse {
    error: string;
    details?: string;
}

type ApiResponse = DatabaseVocabularyResponse | ErrorResponse;

/**
 * Main API handler for vocabulary data
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
): Promise<void> {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        res.status(405).json({
            error: 'Method not allowed. Only GET requests are supported.'
        });
        return;
    }

    try {
        // Initialize database if needed
        await VocabularyAPI.init();

        // Check if database is healthy and has data
        const isHealthy = await VocabularyAPI.healthCheck();
        if (!isHealthy) {
            res.status(503).json({
                error: 'Database unavailable',
                details: 'The vocabulary database could not be accessed. Please run the migration script first.'
            });
            return;
        }

        // Get database statistics
        const stats = await VocabularyAPI.getStats();

        if (stats.total_phrases === 0) {
            res.status(503).json({
                error: 'Database empty',
                details: 'The vocabulary database is empty. Please run the migration script to import data.'
            });
            return;
        }

        // Return response directing to use new endpoints
        const response: DatabaseVocabularyResponse = {
            words: [],
            source: 'database',
            totalPhrases: stats.total_phrases,
            message: 'This application now uses a database-backed vocabulary system. Please use the specific API endpoints for better functionality.',
            newEndpoints: {
                random: '/api/vocabulary/random',
                practice: '/api/vocabulary/practice/{phraseId}',
                stats: '/api/vocabulary/stats',
                similar: '/api/vocabulary/similar/{phraseId}',
                import: '/api/vocabulary/import'
            }
        };

        // Set cache headers (cache for a short time since this is just informational)
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');

        res.status(200).json(response);

    } catch (error) {
        console.error('Vocabulary API Error:', error);

        const errorMessage = error instanceof Error
            ? error.message
            : 'Failed to access vocabulary database';

        res.status(500).json({
            error: errorMessage,
            details: process.env.NODE_ENV === 'development'
                ? (error instanceof Error ? error.stack : String(error))
                : undefined
        });
    }
}
