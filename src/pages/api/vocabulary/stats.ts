/**
 * API route for database statistics and health information
 * 
 * This endpoint returns comprehensive statistics about the vocabulary database
 * including counts, averages, and health information.
 * 
 * GET /api/vocabulary/stats
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { VocabularyAPI } from '@/lib/database';
import { formatSqlError } from '@/lib/database';
import { StatsResponse } from '@/types';

/**
 * API response types
 */
interface StatsSuccessResponse {
    success: true;
    data: StatsResponse;
}

interface ErrorResponse {
    success: false;
    error: string;
    details?: string;
}

type ApiResponse = StatsSuccessResponse | ErrorResponse;

/**
 * Main API handler for database statistics
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
        // Initialize database if needed
        await VocabularyAPI.init();

        // Get database statistics
        const dbStats = await VocabularyAPI.getStats();

        // Prepare response data
        const responseData: StatsResponse = {
            totalPhrases: dbStats.total_phrases,
            totalSimilarities: dbStats.total_similarities,
            languageBreakdown: {
                en: dbStats.english_phrases,
                pt: dbStats.portuguese_phrases,
                de: dbStats.german_phrases
            },
        };

        // Set cache headers (cache for 15 minutes as stats don't change frequently)
        res.setHeader('Cache-Control', 'public, max-age=900, s-maxage=900');
        res.setHeader('ETag', `"stats-${Date.now()}"`);

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Database stats API error:', error);

        const errorMessage = error instanceof Error
            ? formatSqlError(error)
            : 'Failed to fetch database statistics';

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
