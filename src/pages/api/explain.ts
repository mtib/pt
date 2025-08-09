/**
 * API route for explaining Portuguese phrases using OpenAI.
 * 
 * This endpoint accepts a phrase ID and generates a comprehensive explanation
 * including pronunciation, examples, grammar information, cultural context,
 * and information about synonyms and alternative translations.
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Explanation, ApiErrorResponse } from '@/types';
import { VocabularyAPI, DbPhrase, PhraseWithSimilarity } from '@/lib/database';

// Input validation schema - now takes both source and expected answer phrase IDs
const RequestSchema = z.object({
    sourcePhraseId: z.number().positive('Source phrase ID must be a positive number'),
    expectedAnswerId: z.number().positive('Expected answer ID must be a positive number'),
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
    synonyms: z.string().describe('List of synonyms and similar phrases with brief usage notes'),
    alternatives: z.string().describe('Alternative translations and their contexts'),
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
 * Generates a cache key for source and expected answer phrase IDs
 */
function getCacheKey(sourcePhraseId: number, expectedAnswerId: number): string {
    return crypto.createHash('sha256').update(`phrase-${sourcePhraseId}-${expectedAnswerId}`).digest('hex');
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
async function getCachedExplanation(sourcePhraseId: number, expectedAnswerId: number): Promise<Explanation | null> {
    try {
        const cacheKey = getCacheKey(sourcePhraseId, expectedAnswerId);
        const cachePath = path.join(CACHE_CONFIG.directory, `${cacheKey}.json`);

        const cacheData = await fs.readFile(cachePath, 'utf-8');
        const cached: CachedExplanation = JSON.parse(cacheData);

        if (Date.now() < cached.expiresAt) {
            console.log(`Serving cached explanation for phrase IDs: ${sourcePhraseId} -> ${expectedAnswerId}`);
            return cached.data;
        }

        // Clean up expired cache file
        await fs.unlink(cachePath).catch(() => { });
        return null;
    } catch {
        return null;
    }
}

/**
 * Caches an explanation
 */
async function cacheExplanation(sourcePhraseId: number, expectedAnswerId: number, explanation: Explanation): Promise<void> {
    try {
        await ensureCacheDirectory();

        const cacheKey = getCacheKey(sourcePhraseId, expectedAnswerId);
        const cachePath = path.join(CACHE_CONFIG.directory, `${cacheKey}.json`);

        const cachedData: CachedExplanation = {
            data: explanation,
            timestamp: Date.now(),
            expiresAt: Date.now() + CACHE_CONFIG.maxAge
        };

        await fs.writeFile(cachePath, JSON.stringify(cachedData, null, 2));
        console.log(`Cached explanation for phrase IDs: ${sourcePhraseId} -> ${expectedAnswerId}`);
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
 * Creates an optimized prompt for explaining a Portuguese phrase
 */
function createPrompt(portuguesePhrase: DbPhrase, englishTranslation: DbPhrase, synonyms: PhraseWithSimilarity[], alternatives: PhraseWithSimilarity[]): string {
    const portugueseSynonymsList = synonyms.filter(s => s.language === 'pt').map(s => `"${s.phrase}" (similarity: ${s.similarity})`).join(', ');
    const alternativesList = alternatives.map(a => `"${a.phrase}" (similarity: ${a.similarity})`).join(', ');

    return `You are explaining the Portuguese phrase "${portuguesePhrase.phrase}" for language learners. The primary English translation is "${englishTranslation.phrase}".

CONTEXT:
- Portuguese phrase to explain: "${portuguesePhrase.phrase}"
- Primary English translation: "${englishTranslation.phrase}"
- Available Portuguese synonyms: ${portugueseSynonymsList || 'None available'}
- Available English alternatives: ${alternativesList || 'None available'}

IMPORTANT: Always focus your explanation on the Portuguese phrase "${portuguesePhrase.phrase}", explaining its meaning, usage, and cultural context in European Portuguese, but your answer is always in english, excluding portuguese examples or referencing portuguese words or phrases in explanations.

REQUIRED FORMAT - Provide exactly these fields:

example: Create ONE practical portuguese sentence using "${portuguesePhrase.phrase}" with the complete English translation in parentheses, like this: '<portuguese text containing example> (<english translation>). Make it relevant to everyday situations in Portuguese-speaking contexts. In this section all the <portuguese text containing example> is allowed to be portuguese.

explanation: Write 3-4 clear sentences explaining: (1) the meaning and usage of "${portuguesePhrase.phrase}" in Portuguese, (2) why "${englishTranslation.phrase}" is a good English translation, (3) key learning points about context, register, or cultural usage, and (4) any important usage notes for Portuguese learners.

definition: Write a precise 1-2 sentence definition of the Portuguese phrase "${portuguesePhrase.phrase}" that clearly connects to the English meaning "${englishTranslation.phrase}".

grammar: State the part of speech and essential Portuguese grammar information (gender for nouns, conjugation type for verbs, irregular forms, preposition requirements, etc.).

facts: Write 2-3 sentences covering: Portuguese etymology, cultural context in Portuguese-speaking countries, frequency of use in Brazilian vs European Portuguese, or interesting linguistic connections. Make it memorable and educational.

pronunciationIPA: Provide accurate IPA notation for the Portuguese phrase "${portuguesePhrase.phrase}".

pronunciationEnglish: Give a clear English approximation for Portuguese pronunciation using familiar sounds and syllable breakdown (e.g., "sounds like 'CAH-zah' where 'CAH' rhymes with 'spa'").

synonyms: For each provided Portuguese synonym, explain: meaning differences, formality levels, regional preferences (Brazil vs Portugal), and when to use each in Portuguese. Format: "Word1: specific usage context and nuance in Portuguese; Word2: different context and meaning shade"

alternatives: Explain alternative English translations and their contexts. Focus on: when to use "${englishTranslation.phrase}" vs other English options, register differences (formal/informal), and subtle meaning changes. Help learners understand which English translation best captures the Portuguese meaning in different situations.

Be educational, practical, and help learners understand Portuguese language and culture through this phrase.`;
}

/**
 * Generates explanation using OpenAI API with caching - always explains the Portuguese phrase
 */
async function generateExplanationForPhrase(sourcePhraseId: number, expectedAnswerId: number): Promise<Explanation> {
    // Check cache first
    const cachedExplanation = await getCachedExplanation(sourcePhraseId, expectedAnswerId);
    if (cachedExplanation) {
        return cachedExplanation;
    }

    // Initialize database and get phrase data
    await VocabularyAPI.init();

    // Get the source phrase data
    const practiceData = await VocabularyAPI.getPracticeWord(sourcePhraseId);
    if (!practiceData) {
        throw new Error(`Source phrase with ID ${sourcePhraseId} not found`);
    }

    const { sourcePhrase, targetOptions } = practiceData;

    // Find the expected answer in the target options
    const expectedAnswer = targetOptions.find(option => option.id === expectedAnswerId);
    if (!expectedAnswer) {
        throw new Error(`Expected answer with ID ${expectedAnswerId} not found in target options`);
    }

    // Always identify the Portuguese phrase and English translation for explanation
    let portuguesePhrase: DbPhrase;
    let englishTranslation: DbPhrase;

    if (sourcePhrase.language === 'pt') {
        portuguesePhrase = sourcePhrase;
        englishTranslation = expectedAnswer.language === 'en' ? expectedAnswer :
            targetOptions.find(option => option.language === 'en') || expectedAnswer;
    } else {
        // Source is English, so Portuguese phrase must be in targetOptions
        portuguesePhrase = expectedAnswer.language === 'pt' ? expectedAnswer :
            targetOptions.find(option => option.language === 'pt') || sourcePhrase;
        englishTranslation = sourcePhrase;
    }

    // Ensure we have a Portuguese phrase to explain
    if (portuguesePhrase.language !== 'pt') {
        throw new Error('No Portuguese phrase found to explain');
    }

    // Get all available phrases for synonyms and alternatives
    const allPhrases = [sourcePhrase, ...targetOptions];

    // Portuguese synonyms are other Portuguese phrases
    const synonyms = allPhrases
        .filter(phrase => phrase.language === 'pt' && phrase.id !== portuguesePhrase.id)
        .map(phrase => ({
            ...phrase,
            similarity: targetOptions.find(option => option.id === phrase.id)?.similarity || 0
        }));

    // English alternatives are all English phrases
    const alternatives = allPhrases
        .filter(phrase => phrase.language === 'en')
        .map(phrase => ({
            ...phrase,
            similarity: targetOptions.find(option => option.id === phrase.id)?.similarity || 0
        }));

    // Generate new explanation
    try {
        const response = await openai.responses.parse({
            model: 'gpt-5-nano',
            reasoning: { effort: 'minimal' },
            input: [
                {
                    role: 'system',
                    content: 'You are a Portuguese language expert helping English-speaking learners understand Portuguese phrases, their meanings, usage, and cultural context. Always focus on explaining the Portuguese language and culture. Provide clear, accurate, and beginner-friendly explanations.'
                },
                {
                    role: 'user',
                    content: createPrompt(portuguesePhrase, englishTranslation, synonyms, alternatives),
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
            word: portuguesePhrase.phrase, // Always the Portuguese phrase
            englishReference: englishTranslation.phrase,
        };

        // Cache the result asynchronously
        cacheExplanation(sourcePhraseId, expectedAnswerId, fullExplanation).catch(error => {
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

        const { sourcePhraseId, expectedAnswerId } = parseResult.data;

        // Generate explanation
        const explanation = await generateExplanationForPhrase(sourcePhraseId, expectedAnswerId);

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
