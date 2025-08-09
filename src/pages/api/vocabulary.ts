/**
 * API route for serving cached Portuguese vocabulary.
 * 
 * This endpoint fetches and caches vocabulary data from the external source
 * to improve performance and reduce external API calls.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { Word } from '@/types';

/**
 * Interface for the external vocabulary API response
 */
interface VocabularyApiResponse {
    words: Word[];
}

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
    filePath: path.join(process.cwd(), 'cache', 'vocabulary.json'),
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    externalUrl: 'https://raw.githubusercontent.com/SMenigat/thousand-most-common-words/refs/heads/master/words/pt.json'
};

/**
 * Filters out words where Portuguese and English are identical
 * This prevents showing unhelpful word pairs like "I" -> "I"
 */
function filterWords(words: Word[]): Word[] {
    return words.filter(word =>
        word.targetWord !== word.englishWord &&
        word.targetWord.trim().length > 0 &&
        word.englishWord.trim().length > 0
    );
}

/**
 * Interface for cached vocabulary data
 */
interface CachedVocabulary {
    data: VocabularyApiResponse;
    timestamp: number;
    expiresAt: number;
}

/**
 * Ensures the cache directory exists
 */
async function ensureCacheDirectory(): Promise<void> {
    const cacheDir = path.dirname(CACHE_CONFIG.filePath);
    try {
        await fs.access(cacheDir);
    } catch {
        await fs.mkdir(cacheDir, { recursive: true });
    }
}

/**
 * Checks if cached data exists and is still valid
 */
async function getCachedVocabulary(): Promise<VocabularyApiResponse | null> {
    try {
        const cacheData = await fs.readFile(CACHE_CONFIG.filePath, 'utf-8');
        const cached: CachedVocabulary = JSON.parse(cacheData);

        if (Date.now() < cached.expiresAt) {
            console.log('Serving vocabulary from cache');
            return cached.data;
        }

        console.log('Cache expired, will fetch fresh data');
        return null;
    } catch (error) {
        console.log('No valid cache found, will fetch fresh data');
        return null;
    }
}

/**
 * Fetches vocabulary from external source and caches it
 */
async function fetchAndCacheVocabulary(): Promise<VocabularyApiResponse> {
    console.log('Fetching vocabulary from external source...');

    const response = await fetch(CACHE_CONFIG.externalUrl, {
        headers: {
            'User-Agent': 'Portuguese-Learning-App/1.0.0'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch vocabulary: ${response.status} ${response.statusText}`);
    }

    const data: VocabularyApiResponse = await response.json();

    if (!data.words || !Array.isArray(data.words)) {
        throw new Error('Invalid vocabulary data format received from external source');
    }

    // Validate and filter the data
    const validWords = data.words.filter(word =>
        word &&
        typeof word.englishWord === 'string' &&
        typeof word.targetWord === 'string' &&
        word.englishWord.length > 0 &&
        word.targetWord.length > 0
    );

    if (validWords.length === 0) {
        throw new Error('No valid words found in vocabulary data');
    }

    // Filter out words where Portuguese and English are identical
    const filteredWords = filterWords(validWords);

    if (filteredWords.length === 0) {
        throw new Error('No usable words found after filtering');
    }

    const vocabularyData: VocabularyApiResponse = { words: filteredWords };

    // Cache the data
    await ensureCacheDirectory();
    const cachedData: CachedVocabulary = {
        data: vocabularyData,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_CONFIG.maxAge
    };

    await fs.writeFile(CACHE_CONFIG.filePath, JSON.stringify(cachedData, null, 2));
    console.log(`Cached ${filteredWords.length} filtered vocabulary words`);

    return vocabularyData;
}

/**
 * Main API handler for vocabulary data
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<VocabularyApiResponse | { error: string; }>
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
        res.status(405).json({ error: 'Method not allowed. Only GET requests are supported.' });
        return;
    }

    try {
        // Try to get cached data first
        let vocabularyData = await getCachedVocabulary();

        // If no valid cache, fetch fresh data
        if (!vocabularyData) {
            vocabularyData = await fetchAndCacheVocabulary();
        }

        // Set cache headers for client-side caching (longer cache due to server-side filtering)
        res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800'); // 1 day cache, 1 week stale
        res.setHeader('CDN-Cache-Control', 'public, s-maxage=86400');

        res.status(200).json(vocabularyData);

    } catch (error) {
        console.error('Vocabulary API Error:', error);

        const errorMessage = error instanceof Error
            ? error.message
            : 'Failed to load vocabulary data';

        res.status(500).json({ error: errorMessage });
    }
}
