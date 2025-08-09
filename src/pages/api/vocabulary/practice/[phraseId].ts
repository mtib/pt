/**
 * API route for getting practice data for a specific phrase
 * 
 * This endpoint returns practice data for a specific phrase by its ID,
 * including the phrase and its possible translations.
 * 
 * GET /api/vocabulary/practice/[phraseId]
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { VOCAB_CONFIG, VocabularyAPI, VocabularyResponse } from '@/lib/database';
import { formatSqlError } from '@/lib/database';

/**
 * API response types
 */
interface PracticeSuccessResponse {
    success: true;
    data: VocabularyResponse;
}

interface ErrorResponse {
    success: false;
    error: string;
    details?: string;
}

type ApiResponse = PracticeSuccessResponse | ErrorResponse;

/**
 * Main API handler for practice vocabulary
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
        // Extract phrase ID from URL
        const { phraseId } = req.query;

        // Validate phrase ID
        if (!phraseId || Array.isArray(phraseId)) {
            res.status(400).json({
                success: false,
                error: 'Invalid phrase ID',
                details: 'Phrase ID must be provided as a single numeric value'
            });
            return;
        }

        const phraseIdNum = parseInt(phraseId, 10);
        if (isNaN(phraseIdNum) || phraseIdNum <= 0) {
            res.status(400).json({
                success: false,
                error: 'Invalid phrase ID format',
                details: 'Phrase ID must be a positive integer'
            });
            return;
        }

        // Initialize database if needed
        await VocabularyAPI.init();

        // Get practice data for the specific phrase
        const practiceData = await VocabularyAPI.getPracticeWord(phraseIdNum);

        if (!practiceData) {
            res.status(404).json({
                success: false,
                error: 'Phrase not found',
                details: `No phrase found with ID ${phraseIdNum} or it has no available translations`
            });
            return;
        }

        // Prepare response data
        const responseData: VocabularyResponse = {
            sourcePhrase: practiceData.sourcePhrase,
            targetOptions: practiceData.targetOptions,
            direction: practiceData.direction,
            acceptableSimilarity: VOCAB_CONFIG.ACCEPTABLE_SIMILARITY
        };

        // Set cache headers (cache for 5 minutes to improve performance)
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
        res.setHeader('ETag', `"practice-${phraseIdNum}-${Date.now()}"`);

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Practice vocabulary API error:', error);

        const errorMessage = error instanceof Error
            ? formatSqlError(error)
            : 'Failed to fetch practice vocabulary';

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
