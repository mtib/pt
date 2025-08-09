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
import { DatabasePracticeWord, Explanation, QuizResult, CONFIG } from '@/types';
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
    const [practiceWords, setPracticeWords] = useState<DatabasePracticeWord[]>([]);

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
        setPracticeWords(prev => {
            const exists = prev.find(w => w.id === word.id);
            if (!exists) {
                return [...prev, word];
            }
            return prev;
        });
    }, []);
    const incrementTodayCount = useCallback(() => setDailyCount(prev => prev + 1), []);

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
            const practiceWord: DatabasePracticeWord = {
                id: wordData.sourcePhrase.id,
                translation_pt: wordData.sourcePhrase.phrase,
                translation_en: wordData.targetOptions[0]?.phrase || '',
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
    }, [currentWord, questionStartTime, addXP, incrementTodayCount, speakPortuguese, startTimer, validateAnswer]);

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

        // Load next word
        loadNewWord();
    }, [clearTimer, loadNewWord]);

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

            // Load first word
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
        practiceListLength: practiceWords.length,
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
