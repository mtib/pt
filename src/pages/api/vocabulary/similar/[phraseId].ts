/**
 * API route for getting similar phrases (synonyms, related words)
 * 
 * This endpoint returns phrases that are similar to a given phrase,
 * including synonyms and related words based on similarity scores.
 * 
 * GET /api/vocabulary/similar/[phraseId]
 * 
 * Query parameters:
 * - minSimilarity: Minimum similarity threshold (default: 0.5)
 * - sameLanguage: Boolean, if true only returns phrases in the same language (default: false)
 * - limit: Maximum number of results to return (default: 10, max: 100)
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
    VocabularyAPI,
    VOCAB_CONFIG,
    SimilarPhrasesResponse,
    getSimilarPhrases,
    getTranslations,
    getPhraseById
} from '@/lib/database';
import { formatSqlError } from '@/lib/database';

/**
 * API response types
 */
interface SimilarSuccessResponse {
    success: true;
    data: SimilarPhrasesResponse;
}

interface ErrorResponse {
    success: false;
    error: string;
    details?: string;
}

type ApiResponse = SimilarSuccessResponse | ErrorResponse;

/**
 * Parse and validate query parameters
 */
function parseQueryParams(query: NextApiRequest['query']) {
    const {
        minSimilarity,
        sameLanguage,
        limit
    } = query;

    let parsedMinSimilarity = 0.5;
    if (minSimilarity && typeof minSimilarity === 'string') {
        const parsed = parseFloat(minSimilarity);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
            parsedMinSimilarity = parsed;
        }
    }

    let parsedSameLanguage = false;
    if (sameLanguage && typeof sameLanguage === 'string') {
        parsedSameLanguage = sameLanguage.toLowerCase() === 'true';
    }

    let parsedLimit: number = VOCAB_CONFIG.DEFAULT_LIMIT;
    if (limit && typeof limit === 'string') {
        const parsed = parseInt(limit, 10);
        if (!isNaN(parsed) && parsed > 0) {
            parsedLimit = Math.min(parsed, VOCAB_CONFIG.MAX_LIMIT);
        }
    }

    return {
        minSimilarity: parsedMinSimilarity,
        sameLanguage: parsedSameLanguage,
        limit: parsedLimit
    };
}

/**
 * Main API handler for similar phrases
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

        // Parse query parameters
        const { minSimilarity, sameLanguage, limit } = parseQueryParams(req.query);

        // Initialize database if needed
        await VocabularyAPI.init();

        // Get the source phrase to verify it exists
        const sourcePhrase = await getPhraseById(phraseIdNum);
        if (!sourcePhrase) {
            res.status(404).json({
                success: false,
                error: 'Phrase not found',
                details: `No phrase found with ID ${phraseIdNum}`
            });
            return;
        }

        // Get similar phrases based on the sameLanguage parameter
        let similarPhrases;
        if (sameLanguage) {
            // Get phrases in the same language (synonyms, related words)
            similarPhrases = await getSimilarPhrases(phraseIdNum, minSimilarity, limit);
        } else {
            // Get translations (different language) and similar phrases (same language)
            const [translations, sameLanguagePhrases] = await Promise.all([
                getTranslations(phraseIdNum, minSimilarity, Math.ceil(limit / 2)),
                getSimilarPhrases(phraseIdNum, minSimilarity, Math.ceil(limit / 2))
            ]);

            // Combine and sort by similarity
            similarPhrases = [...translations, ...sameLanguagePhrases]
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);
        }

        // Prepare response data
        const responseData: SimilarPhrasesResponse = {
            sourcePhrase,
            similarPhrases
        };

        // Set cache headers (cache for 1 hour as this data doesn't change frequently)
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        res.setHeader('ETag', `"similar-${phraseIdNum}-${minSimilarity}-${sameLanguage}-${limit}"`);

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Similar phrases API error:', error);

        const errorMessage = error instanceof Error
            ? formatSqlError(error)
            : 'Failed to fetch similar phrases';

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
