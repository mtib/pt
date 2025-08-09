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

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
    Explanation,
    QuizResult,
    DatabasePracticeWord,
} from '@/types';
import DatabaseApiClient, { DatabaseStatsResponse } from '@/lib/database-api-client';
import { normalizeText, calculateXP } from '@/utils/vocabulary';
import { CONFIG, STORAGE_KEYS } from '@/types';
import { useDailyStats } from '@/hooks';

/**
 * Practice word metadata for local storage
 * Only stores essential tracking data, not the full word content
 */
interface PracticeWordMetadata {
    id: number;
    correctCount: number;
    lastPracticed: number;
}

/**
 * Learning context state interface
 */
interface LearningState {
    // Core quiz state
    vocabularyXP: number;
    currentWord: DatabasePracticeWord | null;
    userInput: string;
    result: QuizResult;
    isEditable: boolean;
    remainingTime: number | null;
    questionStartTime: number | null;

    // Explanation state
    explanation: Explanation | null;
    loadingExplanation: boolean;

    // App state
    isInitialized: boolean;
    error: string | null;
    isAuthenticated: boolean;

    // Database statistics
    databaseStats: DatabaseStatsResponse | null;

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
    validateAnswer: (answer: string) => boolean;
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

/**
 * Learning provider component that manages all quiz-related state using database API
 */
export const LearningProvider: React.FC<LearningProviderProps> = ({ children }) => {
    // Simple local state management (hooks can be added later)
    const [vocabularyXP, setVocabularyXP] = useState(0);
    const [practiceWordIds, setPracticeWordIds] = useState<PracticeWordMetadata[]>([]);

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

    // Simple speech synthesis
    const speakPortuguese = useCallback((text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-PT';
            speechSynthesis.speak(utterance);
        }
    }, []);

    const speak = useCallback((text: string, lang: 'en' | 'pt') => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang === 'pt' ? 'pt-PT' : 'en-US';
            speechSynthesis.speak(utterance);
        }
    }, []);

    // Timer management with countdown display
    const [timer, setTimer] = useState<number | null>(null);
    const [timerEndTime, setTimerEndTime] = useState<number | null>(null);
    const [remainingTime, setRemainingTime] = useState<number | null>(null);

    // Update remaining time display
    useEffect(() => {
        if (!timerEndTime) {
            setRemainingTime(null);
            return;
        }

        const updateRemainingTime = () => {
            const remaining = Math.max(0, timerEndTime - Date.now());
            setRemainingTime(remaining);

            if (remaining <= 0) {
                setRemainingTime(null);
            }
        };

        // Update immediately
        updateRemainingTime();

        // Update every 100ms for smooth countdown
        const interval = setInterval(updateRemainingTime, 100);

        return () => clearInterval(interval);
    }, [timerEndTime]);

    const startTimer = useCallback((delay: number) => {
        // Clear any existing timer first
        if (timer) {
            clearTimeout(timer);
        }

        const timeoutId = window.setTimeout(() => {
            handleNext();
        }, delay);
        setTimer(timeoutId);
        setTimerEndTime(Date.now() + delay);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timer]);

    const clearTimer = useCallback(() => {
        if (timer) {
            clearTimeout(timer);
            setTimer(null);
        }
        setTimerEndTime(null);
    }, [timer]);

    const addXP = useCallback((xp: number) => setVocabularyXP(prev => prev + xp), []);

    const addToPractice = useCallback((word: DatabasePracticeWord) => {
        setPracticeWordIds(prev => {
            const exists = prev.find(w => w.id === word.id);
            if (exists) {
                // Reset correctCount to 0 if it already exists
                return prev.map(w =>
                    w.id === word.id
                        ? { ...w, correctCount: 0, lastPracticed: Date.now() }
                        : w
                );
            } else {
                const newMetadata: PracticeWordMetadata = {
                    id: word.id,
                    correctCount: 0,
                    lastPracticed: Date.now()
                };

                // Also add the most similar acceptable answer to practice
                const practiceWordsToAdd = [newMetadata];

                if (word.acceptableAnswers && word.acceptableAnswers.length >= 1) {
                    // Find the most similar acceptable answer (excluding the main one)
                    const mostSimilar = word.acceptableAnswers
                        .filter(answer => answer.id !== word.id)
                        .sort((a, b) => b.similarity - a.similarity)[0];

                    if (mostSimilar && !prev.find(w => w.id === mostSimilar.id)) {
                        practiceWordsToAdd.push({
                            id: mostSimilar.id,
                            correctCount: 0,
                            lastPracticed: Date.now()
                        });
                    }
                }

                return [...prev, ...practiceWordsToAdd];
            }
        });
    }, []);

    const incrementCorrectCount = useCallback((wordId: number) => {
        setPracticeWordIds(prev => prev.map(w =>
            w.id === wordId
                ? { ...w, correctCount: w.correctCount + 1, lastPracticed: Date.now() }
                : w
        ));
    }, []);

    // Load practice words from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.PRACTICE_WORDS);
        if (saved) {
            try {
                const parsedWords = JSON.parse(saved);
                setPracticeWordIds(parsedWords);
            } catch (error) {
                console.error('Failed to load practice words from storage:', error);
            }
        }

        // Load XP from local storage
        const savedXP = localStorage.getItem(STORAGE_KEYS.VOCABULARY_XP);
        if (savedXP) {
            try {
                const xp = parseInt(savedXP, 10);
                if (!isNaN(xp)) {
                    setVocabularyXP(xp);
                }
            } catch (error) {
                console.error('Failed to load XP from storage:', error);
            }
        }
    }, []);

    // Save practice words to local storage whenever they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.PRACTICE_WORDS, JSON.stringify(practiceWordIds));
    }, [practiceWordIds]);

    // Save XP to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.VOCABULARY_XP, vocabularyXP.toString());
    }, [vocabularyXP]);

    // Clean up practice words that have reached max correct count
    useEffect(() => {
        setPracticeWordIds(prev => {
            const filtered = prev.filter(w => w.correctCount < CONFIG.PRACTICE_MAX_CORRECT_COUNT);
            // Only update if the filter actually removed items
            return filtered.length !== prev.length ? filtered : prev;
        });
    }, [practiceWordIds]);

    // Local component state
    const [currentWord, setCurrentWord] = useState<DatabasePracticeWord | null>(null);
    const [userInput, setUserInput] = useState('');
    const [result, setResult] = useState<QuizResult>('incorrect');
    const [isEditable, setIsEditable] = useState(true);
    const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
    const [explanation, setExplanation] = useState<Explanation | null>(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [databaseStats, setDatabaseStats] = useState<DatabaseStatsResponse | null>(null);

    /**
     * Loads a new random word from the database API
     */
    const loadNewWord = useCallback(async () => {
        try {
            setError(null);

            const wordData = await DatabaseApiClient.getRandomWord();

            if (!wordData) {
                throw new Error('No words available from database');
            }

            // Convert database response to practice word format
            // The sourcePhrase and targetOptions depend on direction:
            // - For 'pt-to-en': sourcePhrase is PT, targetOptions are EN
            // - For 'en-to-pt': sourcePhrase is EN, targetOptions are PT
            const practiceWord: DatabasePracticeWord = {
                id: wordData.sourcePhrase.id,
                translation_pt: wordData.direction === 'pt-to-en'
                    ? wordData.sourcePhrase.phrase
                    : wordData.targetOptions[0]?.phrase || '',
                translation_en: wordData.direction === 'en-to-pt'
                    ? wordData.sourcePhrase.phrase
                    : wordData.targetOptions[0]?.phrase || '',
                relative_frequency: wordData.sourcePhrase.relativeFrequency || 0,
                category: null,
                correctCount: 0,
                direction: wordData.direction,
                acceptableAnswers: wordData.targetOptions
            };

            setCurrentWord(practiceWord);
            setQuestionStartTime(Date.now());

            // Auto-speak Portuguese if showing Portuguese to English
            if (practiceWord.direction === 'pt-to-en') {
                setTimeout(() => speakPortuguese(practiceWord.translation_pt), 100);
            }

        } catch (err) {
            console.error('Failed to load word:', err);
            setError('Failed to load word from database. Please try again.');
        }
    }, [speakPortuguese]);

    /**
     * Loads a practice word by ID from the database API
     */
    const loadPracticeWord = useCallback(async () => {
        try {
            setError(null);

            if (practiceWordIds.length === 0) {
                // Fall back to loading a new random word
                await loadNewWord();
                return;
            }

            // Sample a random practice word ID from the available practice words
            const randomIndex = Math.floor(Math.random() * practiceWordIds.length);
            const practiceWordMetadata = practiceWordIds[randomIndex];

            // Fetch the full word data from the API
            const wordData = await DatabaseApiClient.getPracticeWord(practiceWordMetadata.id);

            if (!wordData) {
                throw new Error('Practice word not found in database');
            }

            // Convert database response to practice word format
            // The sourcePhrase and targetOptions depend on direction:
            // - For 'pt-to-en': sourcePhrase is PT, targetOptions are EN
            // - For 'en-to-pt': sourcePhrase is EN, targetOptions are PT
            const practiceWord: DatabasePracticeWord = {
                id: wordData.sourcePhrase.id,
                translation_pt: wordData.direction === 'pt-to-en'
                    ? wordData.sourcePhrase.phrase
                    : wordData.targetOptions[0]?.phrase || '',
                translation_en: wordData.direction === 'en-to-pt'
                    ? wordData.sourcePhrase.phrase
                    : wordData.targetOptions[0]?.phrase || '',
                relative_frequency: wordData.sourcePhrase.relativeFrequency || 0,
                category: null,
                correctCount: practiceWordMetadata.correctCount,
                direction: wordData.direction,
                acceptableAnswers: wordData.targetOptions
            };

            setCurrentWord(practiceWord);
            setQuestionStartTime(Date.now());

            // Auto-speak Portuguese if showing Portuguese to English
            if (practiceWord.direction === 'pt-to-en') {
                setTimeout(() => speakPortuguese(practiceWord.translation_pt), 100);
            }

        } catch (err) {
            console.error('Failed to load practice word:', err);
            setError('Failed to load practice word from database. Please try again.');
        }
    }, [practiceWordIds, speakPortuguese, loadNewWord]);

    /**
     * Validates an answer using local logic with acceptable answers
     */
    const validateAnswer = useCallback((answer: string): boolean => {
        if (!currentWord?.acceptableAnswers) return false;

        const normalizedAnswer = normalizeText(answer);

        return currentWord.acceptableAnswers.some(acceptable =>
            normalizeText(acceptable.phrase) === normalizedAnswer
        );
    }, [currentWord]);

    /**
     * Chooses whether to load a practice word or a new random word
     */
    const loadNextWord = useCallback(async () => {
        const practiceChance = practiceWordIds.length > 0
            ? CONFIG.BASE_PRACTICE_CHANCE + (0.9 - CONFIG.BASE_PRACTICE_CHANCE) * (1 - Math.exp(-practiceWordIds.length / 8))
            : 0;

        const shouldUsePractice = practiceWordIds.length > 0 &&
            Math.random() < practiceChance;

        if (shouldUsePractice) {
            await loadPracticeWord();
        } else {
            await loadNewWord();
        }
    }, [practiceWordIds, loadPracticeWord, loadNewWord]);

    /**
     * Handles user input changes and checks for correct answers
     */
    const handleInputChange = useCallback(async (value: string) => {
        setUserInput(value);

        if (!currentWord) return;

        // Check if answer is correct using local validation
        const isCorrect = validateAnswer(value);

        if (isCorrect) {
            const responseTime = Date.now() - (questionStartTime || Date.now());
            const xpGained = calculateXP(responseTime);

            // Award XP and update stats
            addXP(xpGained);
            incrementTodayCount();

            // Increment correct count for practice words
            if (currentWord.correctCount !== undefined) {
                incrementCorrectCount(currentWord.id);
            }

            // Update UI state
            setResult('correct');
            setIsEditable(false);
            startTimer(CONFIG.CORRECT_DELAY);

            // Speak the word if going to Portuguese
            if (currentWord.direction === 'en-to-pt') {
                speakPortuguese(currentWord.translation_pt);
            }
        } else {
            setResult('incorrect');
        }
    }, [currentWord, questionStartTime, addXP, incrementTodayCount, incrementCorrectCount, speakPortuguese, startTimer, validateAnswer]);

    /**
     * Reveals the correct answer and adds word to practice if needed
     */
    const handleShow = useCallback(() => {
        if (!currentWord) return;

        const correctAnswer = currentWord.direction === 'en-to-pt'
            ? currentWord.translation_pt
            : currentWord.translation_en;

        setUserInput(correctAnswer);
        setResult('revealed');
        setIsEditable(false);
        startTimer(CONFIG.REVEAL_DELAY);

        // Speak the Portuguese word
        speakPortuguese(currentWord.translation_pt);

        // Add to practice list
        addToPractice(currentWord);
    }, [currentWord, speakPortuguese, startTimer, addToPractice]);

    /**
     * Advances to the next word
     */
    const handleNext = useCallback(() => {
        clearTimer();
        setUserInput('');
        setResult('incorrect');
        setIsEditable(true);
        setQuestionStartTime(Date.now());
        setExplanation(null);
        setError(null);

        // Load next word (could be practice or new)
        loadNextWord();
    }, [clearTimer, loadNextWord]);

    /**
     * Speaks the current word
     */
    const handleSpeak = useCallback(() => {
        if (!currentWord) return;

        if (currentWord.direction === 'en-to-pt') {
            // Speaking the English prompt
            speak(currentWord.translation_en, 'en');
        } else {
            // Speaking the Portuguese word
            speak(currentWord.translation_pt, 'pt');
        }
    }, [currentWord, speak]);

    /**
     * Fetches and displays detailed explanation for the current word using phrase ID
     */
    const handleExplain = useCallback(async () => {
        if (!currentWord || !authToken) return;

        setLoadingExplanation(true);
        setResult('explaining');
        setError(null);

        try {
            const sourcePhraseId = currentWord.id; // The word that was shown to the user
            const expectedAnswerId = currentWord.acceptableAnswers[0]!.id; // The most similar acceptable answer

            if (!expectedAnswerId) {
                throw new Error("Could not determine the expected answer for the explanation.");
            }

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

            // Show the correct answer
            const correctAnswer = currentWord.direction === 'en-to-pt'
                ? currentWord.translation_pt
                : currentWord.translation_en;
            setUserInput(correctAnswer);

            // Speak the Portuguese word
            speakPortuguese(currentWord.translation_pt);
            addToPractice(currentWord);
        } catch (err) {
            console.error('Failed to explain word:', err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setLoadingExplanation(false);
            // Do not automatically advance, let user review explanation
        }
    }, [currentWord, authToken, speakPortuguese, addToPractice]);

    /**
     * Dismisses the current error message
     */
    const dismissError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Initialize the application by loading database stats and first word
     */
    const initialize = useCallback(async () => {
        try {
            setError(null);

            // Load database statistics
            const stats = await DatabaseApiClient.getStats();
            setDatabaseStats(stats);

            // Load first word (start with a new random word)
            await loadNewWord();

            setIsInitialized(true);
        } catch (err) {
            console.error('Failed to initialize:', err);
            setError('Failed to initialize the application. Please refresh the page.');
        }
    }, [loadNewWord]);

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
        remainingTime,
        questionStartTime,
        explanation,
        loadingExplanation,
        isInitialized,
        error,
        isAuthenticated,
        databaseStats,
        dailyStats: dailyStatsDisplay,

        // Actions
        handleInputChange,
        handleShow,
        handleNext,
        handleSpeak,
        handleExplain,
        loadNewWord,
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
