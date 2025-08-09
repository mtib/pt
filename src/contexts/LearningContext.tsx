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

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { DatabasePracticeWord, Explanation, QuizResult, CONFIG, STORAGE_KEYS } from '@/types';
// TODO: Re-enable hooks when they're properly exported
// import {
//     useVocabularyProgress,
//     useDailyStats,
//     useAuth,
//     useSpeechSynthesis,
//     useTimer
// } from '@/hooks';
import {
    calculateXP,
    normalizeText
} from '@/utils/vocabulary';
import DatabaseApiClient, { DatabaseStatsResponse } from '@/lib/database-api-client';

/**
 * Practice word metadata for local storage
 * Only stores essential tracking data, not the full word content
 */
interface PracticeWordMetadata {
    id: number;
    correctCount: number;
    incorrectCount: number;
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
    timer: number | null;
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

    // Mock authentication (replace with real auth hook later)
    const authKey = process.env.NEXT_PUBLIC_PRESHARED_KEY || '';
    const isAuthenticated = !!authKey;

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

    // Simple timer management
    const [timer, setTimer] = useState<number | null>(null);

    const startTimer = useCallback((delay: number) => {
        const timeoutId = window.setTimeout(() => {
            handleNext();
        }, delay);
        setTimer(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const clearTimer = useCallback(() => {
        if (timer) {
            clearTimeout(timer);
            setTimer(null);
        }
    }, [timer]);

    // Simple stats tracking (replace with proper hooks later)
    const [dailyCount, setDailyCount] = useState(0);
    const getTodayCount = () => dailyCount;
    const getDaysDiff = () => 0;
    const getLast14DaysHistogram = () => '■'.repeat(14);

    const addXP = useCallback((xp: number) => setVocabularyXP(prev => prev + xp), []);

    const addToPractice = useCallback((word: DatabasePracticeWord) => {
        setPracticeWordIds(prev => {
            const exists = prev.find(w => w.id === word.id);
            if (!exists) {
                const newMetadata: PracticeWordMetadata = {
                    id: word.id,
                    correctCount: 0,
                    incorrectCount: 0,
                    lastPracticed: Date.now()
                };
                return [...prev, newMetadata];
            }
            return prev;
        });
    }, []);

    const incrementCorrectCount = useCallback((wordId: number) => {
        setPracticeWordIds(prev => prev.map(w =>
            w.id === wordId
                ? { ...w, correctCount: w.correctCount + 1, lastPracticed: Date.now() }
                : w
        ));
    }, []);

    const incrementTodayCount = useCallback(() => setDailyCount(prev => prev + 1), []);

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
                acceptableAnswers: wordData.targetOptions.map(option => option.phrase)
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

            // Get a practice word that needs work (hasn't been correct too many times)
            const availablePracticeWords = practiceWordIds.filter(w => w.correctCount < CONFIG.MAX_CORRECT_COUNT);

            if (availablePracticeWords.length === 0) {
                // Fall back to loading a new random word
                await loadNewWord();
                return;
            }

            // Sort by last practiced (oldest first) and lowest correct count
            availablePracticeWords.sort((a, b) => {
                const correctCountDiff = a.correctCount - b.correctCount;
                if (correctCountDiff !== 0) return correctCountDiff;
                return a.lastPracticed - b.lastPracticed;
            });

            const practiceWordMetadata = availablePracticeWords[0];

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
                acceptableAnswers: wordData.targetOptions.map(option => option.phrase)
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
            normalizeText(acceptable) === normalizedAnswer
        );
    }, [currentWord]);

    /**
     * Chooses whether to load a practice word or a new random word
     */
    const loadNextWord = useCallback(async () => {
        // Check if we have practice words that need attention
        const availablePracticeWords = practiceWordIds.filter(w => w.correctCount < CONFIG.MAX_CORRECT_COUNT);

        // Use practice words 30% of the time if available, or if we have many practice words
        const shouldUsePractice = availablePracticeWords.length > 0 &&
            (Math.random() < CONFIG.BASE_PRACTICE_CHANCE || availablePracticeWords.length > 10);

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
        if (!currentWord || !authKey) return;

        setLoadingExplanation(true);
        setResult('explaining');
        setError(null);

        try {
            const response = await fetch('/api/explain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authKey}`
                },
                body: JSON.stringify({
                    phraseId: currentWord.id
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch explanation: ${response.status}`);
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

            // Add to practice list
            addToPractice(currentWord);
        } catch (err) {
            console.error('Failed to fetch explanation:', err);
            setError('Failed to load explanation. Please try again.');
            setResult('incorrect');
        } finally {
            setLoadingExplanation(false);
        }
    }, [currentWord, authKey, speakPortuguese, addToPractice]);

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
        timer,
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
