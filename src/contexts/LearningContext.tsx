/**
 * Learning Context for the Portuguese learning application.
 * 
 * This context manages all the state and actions related to the quiz interface,
 * explanations, and user progress using the new database API system.
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
    Explanation,
    QuizResult,
    Direction,
    PracticePhrase,
    StatsResponse,
    VocabularyResponse,
    PhraseWithSimilarity,
} from '@/types';
import { normalizeText, calculateXP } from '@/utils/vocabulary';
import { CONFIG, STORAGE_KEYS } from '@/types';
import { useDailyStats, useLocalStorage } from '@/hooks';
import { speak } from '@/lib/utils';
import DatabaseVocabularyApi from '@/lib/database-api-client';

/**
 * Learning context state interface
 */
interface LearningState {
    // Core quiz state
    vocabularyXP: number;
    currentWord: VocabularyResponse | null;
    userInput: string;
    result: QuizResult;
    isEditable: boolean;
    direction: Direction | null;

    // Explanation state
    explanation: Explanation | null;
    loadingExplanation: boolean;

    // App state
    isInitialized: boolean;
    error: string | null;
    isAuthenticated: boolean;

    // Database statistics
    databaseStats: StatsResponse | null;

    // Daily statistics (using hooks for local tracking)
    dailyStats: {
        todayCount: number;
        diff: number;
        histogram: string;
        practiceListLength: number;
    };
}

/**
 * Learning context actions interface
 */
interface LearningActions {
    // Quiz actions
    handleInputChange: (value: string) => void;
    handleShow: () => void;
    handleNext: () => void;
    handleSpeak: () => void;
    handleExplain: () => void;

    // Utility actions
    loadNewWord: () => Promise<void>;
    loadPracticeWord: () => Promise<void>;
    validateAnswer: (answer: string) => PhraseWithSimilarity | null;
    dismissError: () => void;
}

/**
 * Combined learning context interface
 */
interface LearningContextType extends LearningState, LearningActions { }

/**
 * Learning context
 */
const LearningContext = createContext<LearningContextType | undefined>(undefined);

/**
 * Props for the LearningProvider component
 */
interface LearningProviderProps {
    children: ReactNode;
}

export const LANGUAGES = ['en', 'pt'] as const;

/**
 * Learning provider component that manages all quiz-related state using database API
 */
export const LearningProvider: React.FC<LearningProviderProps> = ({ children }) => {
    // Simple local state management (hooks can be added later)
    const [vocabularyXP, setVocabularyXP] = useLocalStorage(STORAGE_KEYS.VOCABULARY_XP, 0);
    const [practiceWordIds, setPracticeWordIds] = useLocalStorage<PracticePhrase[]>(STORAGE_KEYS.PRACTICE_WORDS, []);
    const hasPracticeWords = useMemo(() => practiceWordIds.length > 0, [practiceWordIds.length]);
    const lastQuestionRevealTimeRef = useRef<number>(0);

    // Get auth token from the new AuthContext
    const { authToken } = useAuth();
    const isAuthenticated = !!authToken;

    // Daily stats management
    const {
        getTodayCount,
        getDaysDiff,
        getLast14DaysHistogram,
        incrementTodayCount,
    } = useDailyStats();

    const addXP = useCallback((xp: number) => setVocabularyXP(prev => prev + xp), [setVocabularyXP]);

    const addToPractice = useCallback((vocabularyResponse: VocabularyResponse) => {
        const sourcePhrase = vocabularyResponse.sourcePhrase;
        setPracticeWordIds(prev => {
            const exists = prev.find(w => w.phraseId === sourcePhrase.id);
            if (exists) {
                // Reset correctCount to 0 if it already exists
                return prev.map(w =>
                    w.phraseId === sourcePhrase.id
                        ? { ...w, correctCount: 0, lastPracticed: Date.now() }
                        : w
                );
            } else {
                const newMetadata: PracticePhrase = {
                    phraseId: sourcePhrase.id,
                    correctCount: 0,
                };

                // Also add the most similar acceptable answer to practice
                const practiceWordsToAdd = [newMetadata];
                const targetWords = vocabularyResponse.targetOptions;

                if (targetWords && targetWords.length >= 1) {
                    const mostSimilar = targetWords[0];

                    if (mostSimilar && !prev.find(w => w.phraseId === mostSimilar.id)) {
                        practiceWordsToAdd.push({
                            phraseId: mostSimilar.id,
                            correctCount: 0,
                        });
                    }
                }

                return [...prev, ...practiceWordsToAdd];
            }
        });
    }, [setPracticeWordIds]);

    const incrementCorrectCount = useCallback((phraseId: number) => {
        setPracticeWordIds(prev => {
            if (prev.find(w => w.phraseId === phraseId) === undefined) {
                return prev;
            }
            return prev.map(w => w.phraseId === phraseId
                ? { ...w, correctCount: w.correctCount + 1 }
                : w
            );
        });
    }, [setPracticeWordIds]);

    // Clean up practice words that have reached max correct count
    useEffect(() => {
        setPracticeWordIds(prev => {
            const filtered = prev.filter(w => w.correctCount < CONFIG.PRACTICE_MAX_CORRECT_COUNT);
            // Only update if the filter actually removed items
            return filtered.length !== prev.length ? filtered : prev;
        });
    }, [practiceWordIds, setPracticeWordIds]);

    // Local component state
    const [currentWord, setCurrentWord] = useState<VocabularyResponse | null>(null);
    const [userInput, setUserInput] = useState('');
    const [result, setResult] = useState<QuizResult>('incorrect');
    const [isEditable, setIsEditable] = useState(true);
    const [explanation, setExplanation] = useState<Explanation | null>(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [databaseStats, setDatabaseStats] = useState<StatsResponse | null>(null);

    const direction: Direction | null = useMemo(() => {
        if (!currentWord) {
            return null;
        }
        return {
            from: currentWord.sourcePhrase.language,
            to: currentWord.targetOptions[0]!.language,
        } as Direction;
    }, [currentWord]);

    /**
     * Loads a new random word from the database API
     */
    const loadRandomWord = useCallback(async () => {
        try {
            setError(null);

            const wordData = await DatabaseVocabularyApi.getRandomWord(LANGUAGES);

            if (!wordData) {
                throw new Error('No words available from database');
            }

            setCurrentWord(wordData);

            // Auto-speak Portuguese if not showing English
            if (wordData.sourcePhrase.language !== 'en') {
                speak(wordData.sourcePhrase);
            }
        } catch (err) {
            console.error('Failed to load word:', err);
            setError('Failed to load word from database. Please try again.');
        }
    }, []);

    /**
     * Loads a practice word by ID from the database API
     */
    const loadPracticeWord = useCallback(async () => {
        try {
            setError(null);

            if (practiceWordIds.length === 0) {
                // Fall back to loading a new random word
                await loadRandomWord();
                return;
            }

            // Sample a random practice word ID from the available practice words
            const randomIndex = Math.floor(Math.random() * practiceWordIds.length);
            const practiceWordMetadata = practiceWordIds[randomIndex];

            // Fetch the full word data from the API
            const wordData = await DatabaseVocabularyApi.getPracticeWord(practiceWordMetadata.phraseId, LANGUAGES);

            if (!wordData) {
                // Remove the word from the practice list if not found
                setPracticeWordIds(prev => prev.filter(w => w.phraseId !== practiceWordMetadata.phraseId));
                // Fall back to loading a new random word
                await loadRandomWord();
                return;
            }

            setCurrentWord(wordData);

            // Auto-speak Portuguese if not showing English
            if (wordData.sourcePhrase.language !== 'en') {
                speak(wordData.sourcePhrase);
            }

        } catch (err) {
            console.error('Failed to load practice word:', err);
            setError('Failed to load practice word from database. Please try again.');
        }
    }, [practiceWordIds, loadRandomWord, setPracticeWordIds]);

    /**
     * Validates an answer using local logic with acceptable answers
     * 
     * Returns null if invalid
     */
    const validateAnswer = useCallback((answer: string): PhraseWithSimilarity | null => {
        if (!currentWord?.targetOptions) return null;

        const normalizedAnswer = normalizeText(answer);

        return currentWord.targetOptions.find(acceptable =>
            normalizeText(acceptable.phrase) === normalizedAnswer
        ) || null;
    }, [currentWord?.targetOptions]);

    /**
     * Chooses whether to load a practice word or a new random word
     */
    const loadNextWord = useCallback(async () => {
        const practiceChance = CONFIG.BASE_PRACTICE_CHANCE + (0.9 - CONFIG.BASE_PRACTICE_CHANCE) * (1 - Math.exp(-practiceWordIds.length / 8));

        const shouldUsePractice = hasPracticeWords &&
            Math.random() < practiceChance;

        if (shouldUsePractice) {
            await loadPracticeWord();
        } else {
            await loadRandomWord();
        }
    }, [hasPracticeWords, practiceWordIds.length, loadPracticeWord, loadRandomWord]);

    useEffect(() => {
        setResult('incorrect');
        setUserInput('');
        setIsEditable(true);
        setExplanation(null);
        setError(null);
        lastQuestionRevealTimeRef.current = Date.now();
    }, [currentWord]);

    /**
     * Handles user input changes and checks for correct answers
     */
    const handleInputChange = useCallback(async (value: string) => {
        setUserInput(value);

        if (!currentWord) return;

        // Check if answer is correct using local validation
        const isCorrect = validateAnswer(value);

        if (isCorrect) {
            const responseTime = Date.now() - (lastQuestionRevealTimeRef.current);
            const xpGained = calculateXP(responseTime);

            // Award XP and update stats
            addXP(xpGained);
            incrementTodayCount();

            // Increment correct count for practice words
            incrementCorrectCount(currentWord.sourcePhrase.id);

            // Update UI state
            setResult('correct');
            setIsEditable(false);

            // Speak the word if it's not English
            if (isCorrect.language !== 'en') {
                speak(isCorrect);
            }
        } else {
            setResult('incorrect');
        }
    }, [currentWord, addXP, incrementTodayCount, incrementCorrectCount, validateAnswer]);

    /**
     * Reveals the correct answer and adds word to practice if needed
     */
    const handleShow = useCallback(() => {
        if (!currentWord) return;

        const correctAnswer = currentWord.targetOptions[0];

        setUserInput(correctAnswer.phrase);
        setResult('revealed');
        setIsEditable(false);

        // Speak the Portuguese word
        if (correctAnswer.language !== 'en') {
            speak(correctAnswer);
        }

        // Add to practice list
        addToPractice(currentWord);
    }, [currentWord, addToPractice]);

    useEffect(() => {
        if (result === 'correct' || result === 'revealed') {
            const timeout = setTimeout(() => {
                loadNextWord();
            }, CONFIG.REVEAL_DELAY);

            return () => {
                clearTimeout(timeout);
            };
        } else {
            return () => { };
        }
    }, [result, loadNextWord]);

    /**
     * Advances to the next word
     */
    const handleNext = useCallback(() => {
        if (result === 'incorrect' || 'explained') {
            loadNextWord();
        }
    }, [loadNextWord, result]);

    /**
     * Speaks the current word
     */
    const handleSpeak = useCallback(() => {
        if (!currentWord) return;
        speak(currentWord.sourcePhrase);
    }, [currentWord]);

    /**
     * Fetches and displays detailed explanation for the current word using phrase ID
     */
    const handleExplain = useCallback(async () => {
        if (!currentWord || !authToken) return;

        setLoadingExplanation(true);
        setResult('explaining');
        setError(null);

        const sourcePhraseId = currentWord.sourcePhrase.id; // The word that was shown to the user
        const expectedAnswer = currentWord.targetOptions[0]!;
        const expectedAnswerId = expectedAnswer.id; // The most similar acceptable answer

        // Show the correct answer
        setUserInput(expectedAnswer.phrase);

        // Speak the Portuguese word
        if (expectedAnswer.language !== 'en') {
            speak(expectedAnswer);
        } else {
            speak(currentWord.sourcePhrase);
        }
        addToPractice(currentWord);

        try {
            const response = await fetch('/api/explain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    sourcePhraseId,
                    expectedAnswerId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch explanation');
            }

            const explanationData: Explanation = await response.json();

            setExplanation(explanationData);
            setResult('explained');

        } catch (err) {
            console.error('Failed to explain word:', err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setLoadingExplanation(false);
            // Do not automatically advance, let user review explanation
        }
    }, [currentWord, authToken, addToPractice]);

    /**
     * Dismisses the current error message
     */
    const dismissError = useCallback(() => {
        setError(null);
    }, []);

    const loadNextRef = useRef(null as (() => Promise<void>) | null);

    loadNextRef.current = async () => {
        if (practiceWordIds.length > 0) {
            await loadPracticeWord();
        } else {
            await loadRandomWord();
        }
    };
    /**
     * Initialize the application by loading database stats and first word
     */
    const initialize = useCallback(async () => {
        try {
            setError(null);

            // Load database statistics
            const stats = await DatabaseVocabularyApi.getStats();
            setDatabaseStats(stats);

            loadNextRef.current?.();

            setIsInitialized(true);
        } catch (err) {
            console.error('Failed to initialize:', err);
            setError('Failed to initialize the application. Please refresh the page.');
        }
    }, []);

    // Initialize on provider mount
    useEffect(() => {
        initialize();
    }, [initialize]);

    // Prepare daily statistics for display
    const dailyStatsDisplay = {
        todayCount: getTodayCount(),
        diff: getDaysDiff(),
        histogram: getLast14DaysHistogram(),
        practiceListLength: practiceWordIds.length,
    };

    // Context value
    const contextValue: LearningContextType = {
        // State
        vocabularyXP,
        currentWord,
        userInput,
        result,
        isEditable,
        explanation,
        loadingExplanation,
        isInitialized,
        error,
        isAuthenticated,
        databaseStats,
        dailyStats: dailyStatsDisplay,
        direction,

        // Actions
        handleInputChange,
        handleShow,
        handleNext,
        handleSpeak,
        handleExplain,
        loadNewWord: loadRandomWord,
        loadPracticeWord,
        validateAnswer,
        dismissError,
    };

    return (
        <LearningContext.Provider value={contextValue}>
            {children}
        </LearningContext.Provider>
    );
};

/**
 * Custom hook to use the learning context
 * @returns The learning context
 * @throws Error if used outside of LearningProvider
 */
export const useLearningContext = (): LearningContextType => {
    const context = useContext(LearningContext);

    if (context === undefined) {
        throw new Error('useLearningContext must be used within a LearningProvider');
    }

    return context;
};
