/**
 * Database operations for vocabulary management
 * 
 * This module provides high-level database operations for managing phrases,
 * similarities, and vocabulary data. It includes functions for creating,
 * reading, updating, and deleting vocabulary data.
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import { getDatabase } from './connection';
import {
    VOCAB_CONFIG,
    SQL_QUERIES,
    DbPhrase,
    DbStats,
    PhraseWithSimilarity,
    SupportedLanguage,
    PhrasePairImport
} from './config';
import { normalizeText } from '@/utils/vocabulary';

/**
 * Insert a new phrase into the database
 * Returns the ID of the inserted phrase
 */
export async function insertPhrase(
    phrase: string,
    language: SupportedLanguage,
    relativeFrequency?: number,
    category?: string
): Promise<number> {
    const db = getDatabase();

    return db.runQueryWithLastId(
        SQL_QUERIES.INSERT_PHRASE,
        [phrase, language, relativeFrequency, category]
    );
}

/**
 * Insert a similarity relationship between two phrases
 * Automatically handles bidirectional relationships
 */
export async function insertSimilarity(
    fromPhraseId: number,
    toPhraseId: number,
    similarity: number,
    bidirectional: boolean = true
): Promise<void> {
    const db = getDatabase();

    await db.withTransaction(async () => {
        await insertSimilarityWithoutTransaction(db, fromPhraseId, toPhraseId, similarity, bidirectional);
    });
}

/**
 * Insert a similarity relationship without starting a new transaction
 * Used when already within a transaction context
 */
async function insertSimilarityWithoutTransaction(
    db: ReturnType<typeof getDatabase>,
    fromPhraseId: number,
    toPhraseId: number,
    similarity: number,
    bidirectional: boolean = true
): Promise<void> {
    // Insert the primary relationship
    await db.runQuery(
        SQL_QUERIES.INSERT_SIMILARITY,
        [fromPhraseId, toPhraseId, similarity]
    );

    // Insert the reverse relationship if bidirectional
    if (bidirectional && fromPhraseId !== toPhraseId) {
        await db.runQuery(
            SQL_QUERIES.INSERT_SIMILARITY,
            [toPhraseId, fromPhraseId, similarity]
        );
    }
}

/**
 * Check if a phrase already exists in the database
 * Returns the phrase ID if found, undefined otherwise
 */
export async function findExistingPhrase(
    phrase: string,
    language: SupportedLanguage
): Promise<number | undefined> {
    const db = getDatabase();

    const result = await db.getQuery<{ id: number; }>(
        SQL_QUERIES.PHRASE_EXISTS,
        [phrase, language]
    );

    return result?.id;
}

/**
 * Get a phrase by its ID
 */
export async function getPhraseById(id: number): Promise<DbPhrase | undefined> {
    const db = getDatabase();
    return db.getQuery<DbPhrase>(SQL_QUERIES.GET_PHRASE_BY_ID, [id]);
}

/**
 * Search for phrases in the database with fuzzy matching
 */
export async function searchPhrases(query: string): Promise<DbPhrase[]> {
    const db = getDatabase();
    const searchQuery = `%${query}%`;
    return db.allQuery<DbPhrase>(SQL_QUERIES.SEARCH_PHRASES, [searchQuery]);
}

/**
 * Get a random phrase from the database for a given language
 * Ensures that the phrase has at least one translation
 */
export async function getRandomPhrase(language: SupportedLanguage): Promise<DbPhrase | undefined> {
    const db = getDatabase();

    return db.getQuery<DbPhrase>(
        SQL_QUERIES.GET_RANDOM_PHRASE_WITH_TRANSLATION,
        [language]
    );
}

/**
 * Get translations for a given phrase
 * Returns phrases in different languages with similarity scores
 */
export async function getTranslations(
    phraseId: number,
    minSimilarity: number = VOCAB_CONFIG.ACCEPTABLE_SIMILARITY,
    limit: number = VOCAB_CONFIG.DEFAULT_LIMIT
): Promise<PhraseWithSimilarity[]> {
    const db = getDatabase();

    return db.allQuery<PhraseWithSimilarity>(
        SQL_QUERIES.GET_TRANSLATIONS,
        [phraseId, minSimilarity, Math.min(limit, VOCAB_CONFIG.MAX_LIMIT)]
    );
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<DbStats> {
    const db = getDatabase();

    const stats = await db.getQuery<DbStats>(SQL_QUERIES.GET_STATS);

    if (!stats) {
        throw new Error('Failed to retrieve database statistics');
    }

    return stats;
}

/**
 * Validate a user's answer against possible correct answers
 * Returns information about correctness and matched phrases
 */
export async function validateAnswer(
    sourcePhraseId: number,
    userAnswer: string,
    acceptableSimilarity: number = VOCAB_CONFIG.ACCEPTABLE_SIMILARITY
): Promise<{
    isCorrect: boolean;
    matchedPhrase?: PhraseWithSimilarity;
    correctAnswers: PhraseWithSimilarity[];
    normalizedUserInput: string;
}> {
    // Get all possible correct answers
    const correctAnswers = await getTranslations(sourcePhraseId, acceptableSimilarity);

    // Normalize user input for comparison
    const normalizedUserInput = normalizeText(userAnswer);

    // Check if user input matches any correct answer
    let matchedPhrase: PhraseWithSimilarity | undefined;

    for (const answer of correctAnswers) {
        if (normalizeText(answer.phrase) === normalizedUserInput) {
            matchedPhrase = answer;
            break;
        }
    }

    return {
        isCorrect: !!matchedPhrase,
        matchedPhrase,
        correctAnswers,
        normalizedUserInput
    };
}

/**
 * Import vocabulary from phrase pairs
 * Returns statistics about the import process
 */
export async function importVocabularyFromPairs(
    phrasePairs: PhrasePairImport[],
    overwrite: boolean = false
): Promise<{
    imported: number;
    skipped: number;
    errors: number;
    message: string;
}> {
    const db = getDatabase();

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    try {
        await db.withTransaction(async () => {
            // Clear existing data if overwrite is requested
            if (overwrite) {
                await db.runQuery(SQL_QUERIES.DELETE_ALL_SIMILARITY);
                await db.runQuery(SQL_QUERIES.DELETE_ALL_PHRASES);
                console.log('Cleared existing vocabulary data');
            }

            for (const pair of phrasePairs) {
                try {
                    // Validate the phrase pair
                    // Validate pair structure
                    if (!pair.phrase1 || !pair.phrase2 ||
                        !pair.language1 || !pair.language2 ||
                        pair.phrase1.trim().length === 0 ||
                        pair.phrase2.trim().length === 0 ||
                        pair.similarity < 0 || pair.similarity > 1) {
                        skipped++;
                        continue;
                    }

                    // Skip if phrases are identical in same language
                    if (pair.phrase1.trim() === pair.phrase2.trim() && pair.language1 === pair.language2) {
                        skipped++;
                        continue;
                    }

                    const phrase1 = pair.phrase1.trim();
                    const phrase2 = pair.phrase2.trim();

                    // Check if phrases already exist
                    let phrase1Id = await findExistingPhrase(phrase1, pair.language1 as SupportedLanguage);
                    let phrase2Id = await findExistingPhrase(phrase2, pair.language2 as SupportedLanguage);

                    // Insert first phrase if it doesn't exist
                    if (!phrase1Id) {
                        phrase1Id = await insertPhrase(
                            phrase1,
                            pair.language1 as SupportedLanguage,
                            pair.similarity, // Use similarity as relative frequency
                            pair.category1
                        );
                    }

                    // Insert second phrase if it doesn't exist
                    if (!phrase2Id) {
                        phrase2Id = await insertPhrase(
                            phrase2,
                            pair.language2 as SupportedLanguage,
                            pair.similarity, // Use similarity as relative frequency  
                            pair.category2
                        );
                    }

                    // Create similarity relationship
                    await insertSimilarityWithoutTransaction(
                        db,
                        phrase1Id,
                        phrase2Id,
                        pair.similarity,
                        true // bidirectional
                    );

                    imported++;
                } catch (error) {
                    console.error('Error importing word pair:', pair, error);
                    errors++;
                }
            }
        });

        const message = `Import completed: ${imported} imported, ${skipped} skipped, ${errors} errors`;
        console.log(message);

        return { imported, skipped, errors, message };

    } catch (error) {
        console.error('Import transaction failed:', error);
        throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Clear all vocabulary data from the database
 * This is a destructive operation - use with caution!
 */
export async function clearAllVocabulary(): Promise<void> {
    const db = getDatabase();

    await db.withTransaction(async () => {
        await db.runQuery(SQL_QUERIES.DELETE_ALL_SIMILARITY);
        await db.runQuery(SQL_QUERIES.DELETE_ALL_PHRASES);
    });

    console.log('All vocabulary data cleared from database');
}

/**
 * Get a random phrase pair for practice
 * Returns a source phrase and its possible translations
 */
export async function getRandomPracticePair(
    sourceLanguage?: SupportedLanguage
): Promise<{
    sourcePhrase: DbPhrase;
    targetOptions: PhraseWithSimilarity[];
    direction: 'en-to-pt' | 'pt-to-en';
} | null> {
    // Determine source language
    const language = sourceLanguage ||
        (Math.random() < VOCAB_CONFIG.RANDOM_LANGUAGE_CHANCE ? 'en' : 'pt');

    // Get random phrase
    const sourcePhrase = await getRandomPhrase(language);
    if (!sourcePhrase) {
        return null;
    }

    // Get translations for the phrase
    const targetOptions = await getTranslations(sourcePhrase.id);
    if (targetOptions.length === 0) {
        return null;
    }

    // Determine direction
    const direction = language === 'en' ? 'en-to-pt' : 'pt-to-en';

    return {
        sourcePhrase,
        targetOptions,
        direction
    };
}

/**
 * Get practice data for a specific phrase ID
 */
export async function getPracticeDataForPhrase(
    phraseId: number
): Promise<{
    sourcePhrase: DbPhrase;
    targetOptions: PhraseWithSimilarity[];
    direction: 'en-to-pt' | 'pt-to-en';
} | null> {
    const sourcePhrase = await getPhraseById(phraseId);
    if (!sourcePhrase) {
        return null;
    }

    const targetOptions = await getTranslations(sourcePhrase.id);
    if (targetOptions.length === 0) {
        return null;
    }

    // Determine direction based on source language
    const direction = sourcePhrase.language === 'en' ? 'en-to-pt' : 'pt-to-en';

    return {
        sourcePhrase,
        targetOptions,
        direction
    };
}

/**
 * Update phrase frequency information
 */
export async function updatePhraseFrequency(
    phraseId: number,
    relativeFrequency: number
): Promise<void> {
    const db = getDatabase();

    await db.runQuery(
        SQL_QUERIES.UPDATE_PHRASE_FREQUENCY,
        [relativeFrequency, phraseId]
    );
}

/**
 * Delete a phrase from the database by its ID
 */
export async function deletePhrase(phraseId: number): Promise<void> {
    const db = getDatabase();
    await db.runQuery(SQL_QUERIES.DELETE_PHRASE_BY_ID, [phraseId]);
}

/**
 * Get all distinct categories from the database
 */
export async function getAllCategories(): Promise<string[]> {
    const db = getDatabase();
    const results = await db.allQuery<{ category: string; }>(SQL_QUERIES.GET_ALL_CATEGORIES);
    return results.map(row => row.category);
}

/**
 * Get all phrases that do not have a translation
 */
export async function getOrphanPhrases(): Promise<DbPhrase[]> {
    const db = getDatabase();
    return db.allQuery<DbPhrase>(SQL_QUERIES.GET_ORPHAN_PHRASES);
}

/**
 * Batch insert phrases and similarities
 * More efficient for large imports
 */
export async function batchInsertVocabulary(
    phrases: Array<{
        phrase: string;
        language: SupportedLanguage;
        relativeFrequency?: number;
        category?: string;
    }>,
    similarities: Array<{
        fromPhrase: string;
        fromLanguage: SupportedLanguage;
        toPhrase: string;
        toLanguage: SupportedLanguage;
        similarity: number;
    }>
): Promise<void> {
    const db = getDatabase();
    const phraseMap = new Map<string, number>(); // phrase_language -> id

    await db.withTransaction(async () => {
        // Insert all phrases first
        for (const phrase of phrases) {
            const key = `${phrase.phrase}_${phrase.language}`;

            // Check if phrase already exists
            const existingId = await findExistingPhrase(phrase.phrase, phrase.language);
            if (existingId) {
                phraseMap.set(key, existingId);
            } else {
                const id = await insertPhrase(
                    phrase.phrase,
                    phrase.language,
                    phrase.relativeFrequency,
                    phrase.category
                );
                phraseMap.set(key, id);
            }
        }

        // Insert similarities
        for (const sim of similarities) {
            const fromKey = `${sim.fromPhrase}_${sim.fromLanguage}`;
            const toKey = `${sim.toPhrase}_${sim.toLanguage}`;

            const fromId = phraseMap.get(fromKey);
            const toId = phraseMap.get(toKey);

            if (fromId && toId) {
                await insertSimilarity(fromId, toId, sim.similarity, false);
            }
        }
    });
}

/**
 * Get all phrase-phrase pairs by joining through the similarity table.
 */
export async function getPhrasePairs(): Promise<{ fromPhrase: DbPhrase; toPhrase: DbPhrase; similarity: number; }[]> {
    const db = getDatabase();
    return db.allQuery<{ fromPhrase: DbPhrase; toPhrase: DbPhrase; similarity: number; }>(
        `SELECT 
            p1.id AS fromId, p1.phrase AS fromPhrase, p1.language AS fromLanguage,
            p2.id AS toId, p2.phrase AS toPhrase, p2.language AS toLanguage,
            s.similarity
         FROM similarity s
         JOIN phrases p1 ON s.from_phrase_id = p1.id
         JOIN phrases p2 ON s.to_phrase_id = p2.id`
    );
}

/**
 * Delete all similarity relationships for a given phrase ID.
 */
export async function deleteSimilaritiesForPhrase(fromPhraseId: number, toPhraseId: number): Promise<void> {
    const db = getDatabase();
    await db.runQuery(
        `DELETE FROM similarity WHERE (from_phrase_id = ? AND to_phrase_id = ?) OR (from_phrase_id = ? AND to_phrase_id = ?)`,
        [fromPhraseId, toPhraseId, toPhraseId, fromPhraseId]
    );
}

/**
 * Search for phrase pairs grouped by category.
 */
export async function searchPhrasePairs(query: string): Promise<Record<string, { fromPhrase: DbPhrase; toPhrase: DbPhrase; }[]>> {
    const db = getDatabase();
    const searchQuery = `%${query}%`;

    const results = await db.allQuery<{
        category: string | null;
        fromPhraseId: number;
        fromPhrase: string;
        fromLanguage: string;
        toPhraseId: number;
        toPhrase: string;
        toLanguage: string;
    }>(
        `SELECT
            COALESCE(p1.category, 'Uncategorized') AS category,
            p1.id AS fromPhraseId,
            p1.phrase AS fromPhrase,
            p1.language AS fromLanguage,
            p2.id AS toPhraseId,
            p2.phrase AS toPhrase,
            p2.language AS toLanguage
         FROM similarity s
         JOIN phrases p1 ON s.from_phrase_id = p1.id
         JOIN phrases p2 ON s.to_phrase_id = p2.id
         WHERE p1.phrase LIKE ? OR p2.phrase LIKE ?
         ORDER BY p1.category`,
        [searchQuery, searchQuery]
    );

    return results.reduce((acc, row) => {
        const category = row.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push({
            fromPhrase: {
                id: row.fromPhraseId,
                phrase: row.fromPhrase,
                language: row.fromLanguage,
            },
            toPhrase: {
                id: row.toPhraseId,
                phrase: row.toPhrase,
                language: row.toLanguage,
            },
        });
        return acc;
    }, {} as Record<string, { fromPhrase: DbPhrase; toPhrase: DbPhrase; }[]>);
}
