# Migration Guide: From JSON Cache to SQLite Database

## Overview

This document outlines the migration from the current JSON-based vocabulary cache system to a SQLite database-backed system.

## What's Changing

### Current System
- Single JSON file (`cache/vocabulary.json`) containing all vocabulary
- Client downloads entire vocabulary list on load
- Practice words stored client-side with simple matching logic
- Fixed word pairs with 1:1 English-Portuguese mapping

### New System
- SQLite database (`cache/vocabulary.db`) with normalized data structure
- Client requests individual words/phrases on-demand
- Practice words tracked by phrase IDs with server-side validation
- Flexible similarity system supporting multiple translations and related words

## Client-Side Changes

### Practice Word Storage

**Before:**
```typescript
interface PracticeWord extends Word {
  correctCount: number;
  incorrectCount: number;
  lastPracticed: number;
  isEnglishToPortuguese: boolean;
}
```

**After:**
```typescript
interface PracticeWord {
  phraseId: number;           // References phrases.id from database
  correctCount: number;
  incorrectCount: number;
  lastPracticed: number;
  // Direction is determined server-side when fetching practice data
}
```

### API Calls

**Before:**
```typescript
// Load all vocabulary at startup
const response = await fetch('/api/vocabulary');
const { words } = await response.json();
```

**After:**
```typescript
// Get random word for practice
const response = await fetch('/api/vocabulary/random');
const { data } = await response.json();

// Or get specific practice word
const response = await fetch(`/api/vocabulary/practice/${phraseId}`);
const { data } = await response.json();
```

### Answer Validation

**Before:**
```typescript
// Client-side validation
const isCorrect = isAnswerCorrect(userInput, word.targetWord);
```

**After:**
```typescript
// Server-side validation with similarity matching
const response = await fetch('/api/vocabulary/validate', {
  method: 'POST',
  body: JSON.stringify({
    sourcePhraseId: currentWord.sourcePhrase.id,
    userAnswer: userInput
  })
});
const { data } = await response.json();
const isCorrect = data.isCorrect;
```

## Data Migration Process

### 1. Database Initialization
The migration script will:
1. Create the SQLite database with proper schema
2. Add indexes for performance
3. Set up foreign key constraints

### 2. Data Import
1. Fetch current vocabulary from existing JSON cache or external source
2. Filter invalid/duplicate entries as before
3. Insert phrases into the `phrases` table
4. Create similarity relationships in the `similarity` table
5. Set initial similarity to 0.9 for direct translations

### 3. Validation
1. Verify all data imported correctly
2. Check foreign key relationships
3. Validate similarity score ranges
4. Ensure bidirectional relationships exist

## Backward Compatibility

### Graceful Degradation
The system will include fallback mechanisms:
1. If database is unavailable, fall back to JSON cache if it exists
2. Client-side error handling for network issues
3. Offline mode support using cached practice words

### Migration Script Safety
1. Backup existing cache files before migration
2. Atomic database operations (transaction-based)
3. Rollback capability if migration fails
4. Data integrity checks throughout process

## Performance Considerations

### Improvements
- Reduced initial load time (no large JSON download)
- Better memory usage on client
- Faster search capabilities with database indexes
- Scalable to much larger vocabularies

### Potential Issues
- Increased API calls (mitigated by smart caching)
- Database query overhead (optimized with proper indexes)
- Network dependency for each word (addressed with offline support)

## Configuration Changes

### New Constants
```typescript
export const VOCAB_CONFIG = {
  ACCEPTABLE_SIMILARITY: 0.5,    // Minimum similarity for correct answers
  IMPORT_SIMILARITY: 0.9,        // Default similarity for imported pairs
  DB_PATH: 'cache/vocabulary.db', // Database location
  CACHE_DURATION: 300000,        // 5 minutes cache for API responses
};
```

### Environment Variables
```bash
# Optional: External database URL for production
VOCABULARY_DATABASE_URL=sqlite:./cache/vocabulary.db

# Import source configuration
VOCABULARY_IMPORT_SOURCE=https://raw.githubusercontent.com/SMenigat/thousand-most-common-words/refs/heads/master/words/pt.json
```

## Testing Strategy

### Unit Tests
- Database operations (CRUD)
- Similarity calculations
- Data validation functions
- API endpoint responses

### Integration Tests
- Full migration process
- Client-server communication
- Practice word flow
- Answer validation accuracy

### Performance Tests
- Database query performance
- API response times
- Memory usage comparison
- Concurrent user handling

## Rollback Plan

If issues occur with the new system:

1. **Immediate Rollback:**
   - Revert to previous JSON-based API endpoints
   - Restore backup of original cache files
   - Update client to use old API structure

2. **Data Preservation:**
   - Export practice word progress from new format
   - Convert back to old format if necessary
   - Maintain user progress during transition

3. **Monitoring:**
   - Error rate monitoring
   - Performance metric comparison
   - User experience feedback collection

## Timeline

1. **Phase 1:** Database schema and migration script (Current)
2. **Phase 2:** Server-side API implementation
3. **Phase 3:** Client-side refactoring
4. **Phase 4:** Testing and validation
5. **Phase 5:** Deployment and monitoring
6. **Phase 6:** Cleanup of old system components
