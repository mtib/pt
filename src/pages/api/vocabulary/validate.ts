/**
 * API route for validating user answersfunction validateRequestBody(body: unknown): body is ValidationRequest {against vocabulary
 * 
 * This endpoint validates a user's answer and returns information about
 * correctness, matched phrases, and all acceptable answers.
 * 
 * POST /api/vocabulary/validate
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { VocabularyAPI, VOCAB_CONFIG, ValidationResponse } from '@/lib/database';
import { formatSqlError } from '@/lib/database';

/**
 * Request body interface
 */
interface ValidateRequest {
    sourcePhraseId: number;
    userAnswer: string;
    acceptableSimilarity?: number;
}

/**
 * API response types
 */
interface ValidateSuccessResponse {
    success: true;
    data: ValidationResponse;
}

interface ErrorResponse {
    success: false;
    error: string;
    details?: string;
}

type ApiResponse = ValidateSuccessResponse | ErrorResponse;

/**
 * Validate request body structure
 */
function validateRequestBody(body: unknown): body is ValidateRequest {
    if (!body || typeof body !== 'object') {
        return false;
    }

    const candidate = body as Record<string, unknown>;

    if (typeof candidate.sourcePhraseId !== 'number' || candidate.sourcePhraseId <= 0) {
        return false;
    }

    if (typeof candidate.userAnswer !== 'string' || candidate.userAnswer.trim().length === 0) {
        return false;
    }

    if (candidate.acceptableSimilarity !== undefined && typeof candidate.acceptableSimilarity !== 'number') {
        return false;
    }

    return true;
}

/**
 * Main API handler for answer validation
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
                details: 'Request must include sourcePhraseId (positive number) and userAnswer (non-empty string). acceptableSimilarity is optional (0-1).'
            });
            return;
        }

        const { sourcePhraseId, userAnswer, acceptableSimilarity } = body;

        // Use provided similarity threshold or default
        const similarityThreshold = acceptableSimilarity ?? VOCAB_CONFIG.ACCEPTABLE_SIMILARITY;

        // Initialize database if needed
        await VocabularyAPI.init();

        // Validate the user's answer
        const validation = await VocabularyAPI.validateAnswer(
            sourcePhraseId,
            userAnswer.trim(),
            similarityThreshold
        );

        // Prepare response data
        const responseData: ValidationResponse = {
            isCorrect: validation.isCorrect,
            matchedPhrase: validation.matchedPhrase,
            correctAnswers: validation.correctAnswers,
            normalizedUserInput: validation.normalizedUserInput
        };

        // Don't cache validation responses as they contain user input
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Validate vocabulary API error:', error);

        const errorMessage = error instanceof Error
            ? formatSqlError(error)
            : 'Failed to validate vocabulary answer';

        // Check for specific error types
        if (error instanceof Error) {
            if (error.message.includes('SQLITE_CANTOPEN')) {
                res.status(503).json({
                    success: false,
                    error: 'Database unavailable',
                    details: 'The vocabulary database could not be opened. Please try again later.'
                });
                return;
            }

            if (error.message.includes('no such table')) {
                res.status(503).json({
                    success: false,
                    error: 'Database not initialized',
                    details: 'The vocabulary database has not been set up. Please run the migration script.'
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
