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
import { withApiAuth } from '@/lib/auth';

/**
 * Request body interface
 */
interface ImportRequest {
    // Accept flexible shape from clients; we will normalize
    data: unknown[] | unknown; // Can be an array or single object
    overwrite?: boolean;
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

    // Data array is required
    if (!candidate.data || (typeof candidate.data !== 'object' && !Array.isArray(candidate.data))) {
        return false;
    }

    // If data is an array, validate each item as a phrase pair
    const validatePair = (pair: Record<string, unknown>) => {
        if (
            typeof pair.phrase1 !== 'string' ||
            typeof pair.phrase2 !== 'string' ||
            typeof pair.language1 !== 'string' ||
            typeof pair.language2 !== 'string' ||
            typeof pair.similarity !== 'number'
        ) {
            return false;
        }
        // Accept either categoryId as number or category as string/number; both optional
        if (
            pair.categoryId !== undefined && typeof pair.categoryId !== 'number'
        ) {
            return false;
        }
        if (
            pair.category !== undefined && typeof pair.category !== 'string' && typeof pair.category !== 'number'
        ) {
            return false;
        }
        return true;
    };

    if (Array.isArray(candidate.data)) {
        for (const item of candidate.data) {
            if (!item || typeof item !== 'object' || !validatePair(item as Record<string, unknown>)) {
                return false;
            }
        }
    } else {
        if (!validatePair(candidate.data as Record<string, unknown>)) return false;
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
async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
        return;
    }

    if (!validateRequestBody(req.body)) {
        return res.status(400).json({ success: false, error: 'Invalid request body' });
    }

    const { data, overwrite } = req.body;
    const incoming = (Array.isArray(data) ? data : [data]) as unknown[];

    const toPhrasePairImport = (p: unknown): PhrasePairImport => {
        const obj = p as Record<string, unknown>;
        const phrase1 = obj.phrase1 as string;
        const language1 = obj.language1 as string;
        const phrase2 = obj.phrase2 as string;
        const language2 = obj.language2 as string;
        const similarity = obj.similarity as number;
        const categoryId = (obj.categoryId as number | undefined) ?? (
            obj.category !== undefined ? Number(obj.category) : undefined
        );
        return { phrase1, language1, phrase2, language2, similarity, categoryId };
    };

    const phrasePairs: PhrasePairImport[] = incoming.map(toPhrasePairImport);

    try {
        const result = await VocabularyAPI.importVocabularyFromPairs(phrasePairs, overwrite);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Vocabulary import failed:', error);
        const sqlErrorDetails = formatSqlError(error);
        res.status(500).json({
            success: false,
            error: 'Failed to import vocabulary',
            details: sqlErrorDetails || (error as Error).message,
        });
    }
}

export default withApiAuth(handler);
