/**
 * API route for importing vocabulary data from external sources
 * 
 * This endpoint allows importing vocabulary data from various sources,
 * including the GitHub common words repository and custom data.
 * 
 * POST /api/vocabulary/import
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { VocabularyAPI, ImportResponse, PhrasePairImport } from '@/lib/database';
import { formatSqlError } from '@/lib/database';

/**
 * Request body interface
 */
interface ImportRequest {
    data: PhrasePairImport[]; // Array of phrase pairs to import
    overwrite?: boolean; // Whether to clear existing data first
    authKey: string; // Authentication key for import operations
}

/**
 * API response types
 */
interface ImportSuccessResponse {
    success: true;
    data: ImportResponse;
}

interface ErrorResponse {
    success: false;
    error: string;
    details?: string;
}

type ApiResponse = ImportSuccessResponse | ErrorResponse;

/**
 * Validate request body structure
 */
function validateRequestBody(body: unknown): body is ImportRequest {
    if (!body || typeof body !== 'object') {
        return false;
    }

    const candidate = body as Record<string, unknown>;

    // Auth key is required for import operations
    if (!candidate.authKey || typeof candidate.authKey !== 'string') {
        return false;
    }

    // Data array is required
    if (!candidate.data || !Array.isArray(candidate.data)) {
        return false;
    }

    // Validate each phrase pair in data array
    for (const item of candidate.data) {
        if (!item || typeof item !== 'object') {
            return false;
        }

        const pair = item as Record<string, unknown>;
        if (typeof pair.phrase1 !== 'string' || typeof pair.phrase2 !== 'string' ||
            typeof pair.language1 !== 'string' || typeof pair.language2 !== 'string' ||
            typeof pair.similarity !== 'number') {
            return false;
        }
    }

    // Overwrite is optional boolean
    if (candidate.overwrite !== undefined && typeof candidate.overwrite !== 'boolean') {
        return false;
    }

    return true;
}

/**
 * Main API handler for vocabulary import
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
): Promise<void> {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        res.status(405).json({
            success: false,
            error: 'Method not allowed. Only POST requests are supported.'
        });
        return;
    }

    try {
        // Validate request body
        const body = req.body;

        if (!validateRequestBody(body)) {
            res.status(400).json({
                success: false,
                error: 'Invalid request body',
                details: 'Request must include authKey and data array with phrase pairs. overwrite is optional boolean.'
            });
            return;
        }

        const { data: phrasePairs, overwrite = false, authKey } = body;

        // Authenticate the request
        const expectedAuthKey = process.env.PRESHARED_KEY;
        if (!expectedAuthKey) {
            res.status(500).json({
                success: false,
                error: 'Server configuration error',
                details: 'Import authentication is not configured on the server.'
            });
            return;
        }

        if (authKey !== expectedAuthKey) {
            res.status(401).json({
                success: false,
                error: 'Authentication failed',
                details: 'Invalid authentication key provided.'
            });
            return;
        }

        // Initialize database if needed
        await VocabularyAPI.init();

        console.log(`Starting vocabulary import with ${phrasePairs.length} phrase pairs`);

        if (phrasePairs.length === 0) {
            res.status(400).json({
                success: false,
                error: 'No phrase pairs provided',
                details: 'The data array cannot be empty.'
            });
            return;
        }

        // Perform the import using the new phrase pair system
        const importResult = await VocabularyAPI.importVocabularyFromPairs(
            phrasePairs,
            overwrite
        );

        console.log(`Import completed: ${importResult.message}`);

        // Don't cache import responses
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');

        res.status(200).json({
            success: true,
            data: importResult
        });

    } catch (error) {
        console.error('Vocabulary import API error:', error);

        const errorMessage = error instanceof Error
            ? formatSqlError(error)
            : 'Failed to import vocabulary data';

        // Check for specific error types
        if (error instanceof Error) {
            if (error.message.includes('SQLITE_CANTOPEN')) {
                res.status(503).json({
                    success: false,
                    error: 'Database unavailable',
                    details: 'The vocabulary database could not be opened. Please ensure the cache directory exists.'
                });
                return;
            }

            if (error.message.includes('fetch')) {
                res.status(502).json({
                    success: false,
                    error: 'External data source unavailable',
                    details: 'Could not fetch vocabulary data from external source. Please check network connectivity.'
                });
                return;
            }
        }

        res.status(500).json({
            success: false,
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ?
                (error instanceof Error ? error.stack : String(error)) : undefined
        });
    }
}
