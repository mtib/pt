#!/usr/bin/env node

/**
 * Vocabulary Database Migration Script
 * 
 * This script migrates vocabulary data from the external JSON source to the new
 * SQLite database structure using the secured import API. It fetches data from 
 * GitHub, converts it to phrase pairs, and imports via the authenticated API.
 * 
 * Usage:
 *   node scripts/migrate-vocabulary.js [--overwrite] [--dry-run]
 * 
 * Options:
 *   --overwrite: Clear existing database data before importing
 *   --dry-run: Show what would be imported without making changes
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

const { promises: fs } = require('fs');
const path = require('path');

// Configuration
const EXTERNAL_SOURCE_URL = 'https://raw.githubusercontent.com/SMenigat/thousand-most-common-words/refs/heads/master/words/pt.json';
const IMPORT_API_URL = 'http://localhost:3000/api/vocabulary/import';

async function main() {
    console.log('🚀 Starting vocabulary database migration...\n');
    
    const args = process.argv.slice(2);
    const overwrite = args.includes('--overwrite');
    const dryRun = args.includes('--dry-run');
    
    if (dryRun) {
        console.log('📋 DRY RUN MODE - No changes will be made\n');
    }
    
    if (overwrite) {
        console.log('⚠️  OVERWRITE MODE - Existing data will be cleared\n');
    }

    // Check for required environment variables
    const authKey = process.env.PRESHARED_KEY;
    if (!authKey && !dryRun) {
        console.error('❌ PRESHARED_KEY environment variable is required');
        console.error('   Set it in your .env.local file or environment');
        process.exit(1);
    }
    
    try {
        // Check current database state via API
        console.log('📊 Checking current database state...');
        try {
            const statsResponse = await fetch('http://localhost:3000/api/vocabulary/stats');
            if (statsResponse.ok) {
                const currentStats = (await statsResponse.json())["data"];
                console.log(`   Current phrases: ${currentStats.totalPhrases}`);
                console.log(`   Current similarities: ${currentStats.totalSimilarities}`);
                
                if (currentStats.totalPhrases > 0 && !overwrite && !dryRun) {
                    console.log('⚠️  Database contains existing data. Use --overwrite to clear it first.');
                    console.log('   Or use --dry-run to see what would be imported.\n');
                    process.exit(1);
                }
            } else {
                console.log('   Could not fetch database stats (server may not be running)\n');
                if (!dryRun) {
                    console.log('⚠️  Please ensure the Next.js server is running before importing');
                    console.log('   Run: npm run dev');
                    process.exit(1);
                }
            }
        } catch (error) {
            console.log('   Database API not accessible (server may not be running)\n');
            if (!dryRun) {
                console.log('⚠️  Please ensure the Next.js server is running before importing');
                console.log('   Run: npm run dev');
                process.exit(1);
            }
        }
        
        // Fetch vocabulary data from external source
        console.log('🌐 Fetching vocabulary data from external source...');
        console.log(`   Source: ${EXTERNAL_SOURCE_URL}`);
        
        const response = await fetch(EXTERNAL_SOURCE_URL, {
            headers: {
                'User-Agent': 'Portuguese-Learning-App-Migration/2.0.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch vocabulary: ${response.status} ${response.statusText}`);
        }
        
        const externalData = await response.json();
        console.log(`✅ Fetched ${externalData.words?.length || 0} words\n`);
        
        if (!externalData.words || !Array.isArray(externalData.words)) {
            throw new Error('Invalid vocabulary data format received from external source');
        }
        
        // Filter and validate the data
        console.log('🔍 Filtering and validating vocabulary data...');
        
        const validWords = externalData.words.filter(word => {
            return word &&
                   typeof word.englishWord === 'string' &&
                   typeof word.targetWord === 'string' &&
                   word.englishWord.length > 0 &&
                   word.targetWord.length > 0;
        });
        
        console.log(`   Valid words after basic validation: ${validWords.length}`);
        
        // Filter out words where Portuguese and English are identical
        const filteredWords = validWords.filter(word => {
            const englishNormalized = word.englishWord.trim().toLowerCase();
            const portugueseNormalized = word.targetWord.trim().toLowerCase();
            return englishNormalized !== portugueseNormalized;
        });
        
        console.log(`   Words after filtering identical pairs: ${filteredWords.length}`);
        
        // Additional quality filtering
        const qualityFilteredWords = filteredWords.filter(word => {
            const english = word.englishWord.trim();
            const portuguese = word.targetWord.trim();
            
            // Skip very short words (likely abbreviations or particles)
            if (english.length < 2 || portuguese.length < 2) {
                return false;
            }
            
            // Skip words that are just numbers or contain mostly numbers
            if (/^\d+$/.test(english) || /^\d+$/.test(portuguese)) {
                return false;
            }
            
            return true;
        });
        
        console.log(`   Words after quality filtering: ${qualityFilteredWords.length}\n`);
        
        if (qualityFilteredWords.length === 0) {
            throw new Error('No valid words remaining after filtering');
        }

        // Convert to phrase pairs format
        console.log('🔄 Converting to phrase pairs format...');
        const phrasePairs = qualityFilteredWords.map(word => ({
            phrase1: word.englishWord.trim(),
            language1: 'en',
            phrase2: word.targetWord.trim(), 
            language2: 'pt',
            similarity: 0.8, // Desired frequency as similarity score
            category1: undefined,
            category2: undefined
        }));

        console.log(`   Converted ${phrasePairs.length} phrase pairs\n`);
        
        // Show sample of data to be imported
        console.log('📝 Sample of phrase pairs to be imported:');
        const sampleSize = Math.min(10, phrasePairs.length);
        for (let i = 0; i < sampleSize; i++) {
            const pair = phrasePairs[i];
            console.log(`   ${i + 1}. "${pair.phrase1}" (${pair.language1}) ↔ "${pair.phrase2}" (${pair.language2})`);
        }
        
        if (phrasePairs.length > sampleSize) {
            console.log(`   ... and ${phrasePairs.length - sampleSize} more\n`);
        } else {
            console.log('');
        }
        
        if (dryRun) {
            console.log('📋 DRY RUN COMPLETE - No changes made');
            console.log(`   Would import ${phrasePairs.length} phrase pairs`);
            console.log(`   Would create approximately ${phrasePairs.length * 2} phrases`);
            console.log(`   Would create ${phrasePairs.length * 2} similarity relationships\n`);
            process.exit(0);
        }
        
        // Perform the actual import via API
        console.log('📥 Starting database import via API...');
        const startTime = Date.now();
        
        const importResponse = await fetch(IMPORT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: phrasePairs,
                overwrite: overwrite,
                authKey: authKey
            })
        });
        
        const duration = Date.now() - startTime;
        
        if (!importResponse.ok) {
            const errorData = await importResponse.json().catch(() => null);
            throw new Error(`Import API failed: ${importResponse.status} ${importResponse.statusText}${errorData?.error ? ` - ${errorData.error}` : ''}`);
        }
        
        const result = await importResponse.json();
        
        console.log('✅ Import completed!');
        console.log(`   Time taken: ${duration}ms`);
        console.log(`   Response: ${result.success ? 'Success' : 'Failed'}`);
        if (result.data) {
            console.log(`   Message: ${result.data.message || 'Import successful'}`);
        }
        
        // Show final database statistics
        console.log('\n📊 Final database statistics:');
        try {
            const finalStatsResponse = await fetch('http://localhost:3000/api/vocabulary/stats');
            if (finalStatsResponse.ok) {
                const finalStats = (await finalStatsResponse.json())["data"];
                console.log(`   Total phrases: ${finalStats.totalPhrases}`);
                console.log(`   Total similarities: ${finalStats.totalSimilarities}`);
                console.log(`   Average similarity: ${finalStats.averageSimilarity?.toFixed(3) || 'N/A'}\n`);
            }
        } catch (error) {
            console.log('   Could not fetch final statistics\n');
        }
        
        console.log('🎉 Migration completed successfully!');
        console.log('   The vocabulary database is ready for use.\n');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\nFull error details:');
        console.error(error);
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Promise Rejection:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Run the migration
main().catch((error) => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
});
