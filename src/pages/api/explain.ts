/**
 * API route for explaining Portuguese words using OpenAI.
 * 
 * This endpoint accepts a Portuguese word and English reference,
 * then generates a comprehensive explanation including pronunciation,
 * examples, grammar information, and cultural context.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Explanation, ApiErrorResponse } from '@/types';

// Input validation schema
const RequestSchema = z.object({
    word: z.string().min(1, 'Portuguese word is required').max(100, 'Word too long'),
    englishReference: z.string().min(1, 'English reference is required').max(100, 'Reference too long'),
});

// OpenAI response schema for structured output
const ExplanationSchema = z.object({
    example: z.string().describe('Example sentence in Portuguese with English translation in parentheses'),
    explanation: z.string().describe('Clear explanation for beginners in 2-3 sentences about usage and meaning'),
    definition: z.string().describe('Concise definition in 1-2 sentences'),
    grammar: z.string().describe('Part of speech and key grammatical information (gender, conjugation pattern, etc.)'),
    facts: z.string().describe('Brief cultural or etymological note in 1-2 sentences'),
    pronunciationIPA: z.string().describe('IPA pronunciation notation'),
    pronunciationEnglish: z.string().describe('English approximation using familiar sounds'),
});

// Cache configuration
const CACHE_CONFIG = {
    directory: path.join(process.cwd(), 'cache', 'explanations'),
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days in milliseconds
};

/**
 * Interface for cached explanation data
 */
interface CachedExplanation {
    data: Explanation;
    timestamp: number;
    expiresAt: number;
}

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Validates environment variables
 */
function validateEnvironment(): void {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required');
    }

    if (!process.env.PRESHARED_KEY) {
        throw new Error('PRESHARED_KEY environment variable is required');
    }
}

/**
 * Generates a cache key for a word-reference pair
 */
function getCacheKey(word: string, englishReference: string): string {
    const input = `${word.toLowerCase()}-${englishReference.toLowerCase()}`;
    return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Ensures the cache directory exists
 */
async function ensureCacheDirectory(): Promise<void> {
    try {
        await fs.access(CACHE_CONFIG.directory);
    } catch {
        await fs.mkdir(CACHE_CONFIG.directory, { recursive: true });
    }
}

/**
 * Gets cached explanation if it exists and is still valid
 */
async function getCachedExplanation(word: string, englishReference: string): Promise<Explanation | null> {
    try {
        const cacheKey = getCacheKey(word, englishReference);
        const cachePath = path.join(CACHE_CONFIG.directory, `${cacheKey}.json`);

        const cacheData = await fs.readFile(cachePath, 'utf-8');
        const cached: CachedExplanation = JSON.parse(cacheData);

        if (Date.now() < cached.expiresAt) {
            console.log(`Serving cached explanation for: ${word}`);
            return cached.data;
        }

        // Clean up expired cache file
        await fs.unlink(cachePath).catch(() => { });
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Caches an explanation
 */
async function cacheExplanation(word: string, englishReference: string, explanation: Explanation): Promise<void> {
    try {
        await ensureCacheDirectory();

        const cacheKey = getCacheKey(word, englishReference);
        const cachePath = path.join(CACHE_CONFIG.directory, `${cacheKey}.json`);

        const cachedData: CachedExplanation = {
            data: explanation,
            timestamp: Date.now(),
            expiresAt: Date.now() + CACHE_CONFIG.maxAge
        };

        await fs.writeFile(cachePath, JSON.stringify(cachedData, null, 2));
        console.log(`Cached explanation for: ${word}`);
    } catch (error) {
        console.error('Failed to cache explanation:', error);
        // Don't throw - caching failure shouldn't break the request
    }
}

/**
 * Validates the authentication key from the request
 */
function validateAuth(req: NextApiRequest): void {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        throw new Error('Authorization header is required');
    }

    const authKey = authHeader.split(' ')[1];

    if (!authKey) {
        throw new Error('Bearer token is required');
    }

    if (authKey !== process.env.PRESHARED_KEY) {
        throw new Error('Invalid authorization token');
    }
}

/**
 * Sends error response with proper HTTP status and message
 */
function sendErrorResponse(
    res: NextApiResponse<ApiErrorResponse>,
    status: number,
    message: string
): void {
    res.status(status).json({ error: message });
}

/**
 * Creates an optimized prompt for nano models
 */
function createPrompt(word: string, englishReference: string): string {
    return `Explain the Portuguese word "${word}" (English: "${englishReference}") for English-speaking beginners learning European Portuguese.

REQUIRED FORMAT - Provide exactly these fields:

example: Write ONE sentence in Portuguese using "${word}" with English translation in parentheses. Format: "Portuguese sentence (English translation)"

explanation: Write 2-3 clear sentences explaining how "${word}" is used, any European Portuguese specifics, and key usage notes.

definition: Write a concise 1-2 sentence definition of "${word}".

grammar: State the part of speech and essential grammar info (gender for nouns, conjugation type for verbs, etc.).

facts: Write 1-2 sentences about etymology, cultural context, or interesting linguistic facts.

pronunciationIPA: Provide IPA notation for "${word}".

pronunciationEnglish: Describe pronunciation using English sounds (like "sounds like 'X' in English").

Be concise but informative. Focus on practical learning.`;
}

/**
 * Generates explanation using OpenAI API with caching
 */
async function generateExplanation(word: string, englishReference: string): Promise<Explanation> {
    // Check cache first
    const cachedExplanation = await getCachedExplanation(word, englishReference);
    if (cachedExplanation) {
        return cachedExplanation;
    }

    // Generate new explanation
    try {
        const response = await openai.responses.parse({
            model: 'gpt-5-nano',
            reasoning: { effort: 'minimal' },
            input: [
                {
                    role: 'system',
                    content: 'You are a Portuguese language expert helping English speakers learn European Portuguese. Provide clear, accurate, and beginner-friendly explanations. Be concise but informative.'
                },
                {
                    role: 'user',
                    content: createPrompt(word, englishReference),
                },
            ],
            text: {
                format: zodTextFormat(ExplanationSchema, 'explanation'),
            },
        });

        const explanation = response.output_parsed;

        if (!explanation) {
            throw new Error('OpenAI returned no explanation data');
        }

        const fullExplanation: Explanation = {
            ...explanation,
            word,
            englishReference,
        };

        // Cache the result asynchronously
        cacheExplanation(word, englishReference, fullExplanation).catch(error => {
            console.error('Failed to cache explanation:', error);
        });

        return fullExplanation;
    } catch (error) {
        console.error('OpenAI API Error:', error);

        if (error instanceof Error) {
            if (error.message.includes('rate_limit')) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            if (error.message.includes('insufficient_quota')) {
                throw new Error('API quota exceeded. Please contact support.');
            }
            if (error.message.includes('invalid_request')) {
                throw new Error('Invalid request to OpenAI API.');
            }
        }

        throw new Error('Failed to generate explanation. Please try again.');
    }
}

/**
 * Main API handler for Portuguese word explanations
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Explanation | ApiErrorResponse>
): Promise<void> {
    // Set CORS headers for security
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        sendErrorResponse(res, 405, 'Method not allowed. Only POST requests are supported.');
        return;
    }

    try {
        // Validate environment
        validateEnvironment();

        // Validate authentication
        validateAuth(req);

        // Validate request body
        const parseResult = RequestSchema.safeParse(req.body);

        if (!parseResult.success) {
            const errorMessage = parseResult.error.errors
                .map(err => `${err.path.join('.')}: ${err.message}`)
                .join(', ');
            sendErrorResponse(res, 400, `Validation error: ${errorMessage}`);
            return;
        }

        const { word, englishReference } = parseResult.data;

        // Generate explanation
        const explanation = await generateExplanation(word, englishReference);

        // Send successful response
        res.status(200).json(explanation);

    } catch (error) {
        console.error('API Handler Error:', error);

        if (error instanceof Error) {
            // Handle authentication errors
            if (error.message.includes('Authorization') || error.message.includes('Bearer') || error.message.includes('Invalid authorization')) {
                sendErrorResponse(res, 403, 'Forbidden: Invalid or missing authentication');
                return;
            }

            // Handle rate limiting
            if (error.message.includes('rate_limit') || error.message.includes('quota')) {
                sendErrorResponse(res, 429, error.message);
                return;
            }

            // Handle other known errors
            sendErrorResponse(res, 500, error.message);
            return;
        }

        // Handle unknown errors
        sendErrorResponse(res, 500, 'Internal server error. Please try again later.');
    }
}
