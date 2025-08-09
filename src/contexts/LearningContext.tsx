/**
 * Learning Context for the Portuguese learning application.
 * 
 * This context manages all the state and actions related to the quiz interface,
 * explanations, and user progress. It centralizes state management and provides
 * a clean API for components to interact with.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Word, PracticeWord, Explanation, QuizResult, CONFIG } from '@/types';
import {
    useVocabularyProgress,
    useDailyStats,
    useAuth,
    useSpeechSynthesis,
    useTimer
} from '@/hooks';
import {
    isAnswerCorrect,
    calculateXP,
    selectNextWord,
    addRandomDirection,
    shuffleArray,
    filterWords
} from '@/utils/vocabulary';
import { fetchExplanation, ApiError } from '@/lib/apiClient';

/**
 * Interface for the external vocabulary API response
 */
interface VocabularyApiResponse {
    words: Word[];
}

/**
 * Learning context state interface
 */
interface LearningState {
    // Core quiz state
    vocabularyXP: number;
    words: Word[];
    practiceWords: PracticeWord[];
    currentWord: Word | PracticeWord | null;
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

    // Daily statistics
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
    loadVocabulary: () => Promise<void>;
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
 * Learning provider component that manages all quiz-related state
 */
export const LearningProvider: React.FC<LearningProviderProps> = ({ children }) => {
    // State management using custom hooks
    const { vocabularyXP, practiceWords, addXP, addToPractice, incrementCorrectCount } = useVocabularyProgress();
    const { incrementTodayCount, getTodayCount, getDaysDiff, getLast14DaysHistogram } = useDailyStats();
    const { authKey, isAuthenticated } = useAuth();
    const { speak, speakPortuguese } = useSpeechSynthesis();

    // Local component state
    const [words, setWords] = useState<Word[]>([]);
    const [currentWord, setCurrentWord] = useState<Word | PracticeWord | null>(null);
    const [userInput, setUserInput] = useState('');
    const [result, setResult] = useState<QuizResult>('incorrect');
    const [isEditable, setIsEditable] = useState(true);
    const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
    const [explanation, setExplanation] = useState<Explanation | null>(null);
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Timer management
    const { timer, startTimer, clearTimer } = useTimer(() => {
        handleNext();
    });

    /**
     * Loads and shuffles the vocabulary data from external source
     */
    const loadVocabulary = useCallback(async () => {
        try {
            setError(null);

            const response = await fetch(
                'https://raw.githubusercontent.com/SMenigat/thousand-most-common-words/refs/heads/master/words/pt.json'
            );

            if (!response.ok) {
                throw new Error(`Failed to load vocabulary: ${response.status}`);
            }

            const data: VocabularyApiResponse = await response.json();

            if (!data.words || !Array.isArray(data.words)) {
                throw new Error('Invalid vocabulary data format');
            }

            const shuffledWords = shuffleArray(filterWords(data.words));
            setWords(shuffledWords);

            // Set the first word
            const firstWord = addRandomDirection(shuffledWords[0]);
            setCurrentWord(firstWord);
            setQuestionStartTime(Date.now());

            // Speak the first word if it's Portuguese
            if (!firstWord.isEnglishToPortuguese) {
                setTimeout(() => speakPortuguese(firstWord.targetWord), 100);
            }

            setIsInitialized(true);

        } catch (err) {
            console.error('Failed to load vocabulary:', err);
            setError('Failed to load vocabulary. Please refresh the page to try again.');
        }
    }, [speakPortuguese]);

    /**
     * Handles user input changes and checks for correct answers
     */
    const handleInputChange = useCallback((value: string) => {
        setUserInput(value);

        if (!currentWord) return;

        const correctAnswer = currentWord.isEnglishToPortuguese
            ? currentWord.targetWord
            : currentWord.englishWord;

        if (isAnswerCorrect(value, correctAnswer)) {
            const responseTime = Date.now() - (questionStartTime || Date.now());
            const xpGained = calculateXP(responseTime);

            // Award XP and update stats
            addXP(xpGained);
            incrementTodayCount();

            // Update UI state
            setResult('correct');
            setIsEditable(false);
            startTimer(CONFIG.CORRECT_DELAY);

            // Speak the word if going from English to Portuguese
            if (currentWord.isEnglishToPortuguese) {
                speakPortuguese(currentWord.targetWord);
            }

            // Update practice progress for practice words
            if ('correctCount' in currentWord) {
                incrementCorrectCount(currentWord);
            }
        } else {
            setResult('incorrect');
        }
    }, [currentWord, questionStartTime, addXP, incrementTodayCount, speakPortuguese, incrementCorrectCount, startTimer]);

    /**
     * Reveals the correct answer and adds word to practice if needed
     */
    const handleShow = useCallback(() => {
        if (!currentWord) return;

        const correctAnswer = currentWord.isEnglishToPortuguese
            ? currentWord.targetWord
            : currentWord.englishWord;

        setUserInput(correctAnswer);
        setResult('revealed');
        setIsEditable(false);
        startTimer(CONFIG.REVEAL_DELAY);

        // Speak the Portuguese word
        speakPortuguese(currentWord.targetWord);

        // Add to practice list if not already there
        if (!('correctCount' in currentWord)) {
            addToPractice(currentWord);
        }
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

        const nextWord = selectNextWord(words, practiceWords);

        if (nextWord) {
            const wordWithDirection = addRandomDirection(nextWord);
            setCurrentWord(wordWithDirection);

            // Speak Portuguese word automatically
            if (!wordWithDirection.isEnglishToPortuguese) {
                setTimeout(() => speakPortuguese(wordWithDirection.targetWord), 100);
            }
        } else {
            setError('No more words available. Please refresh the page.');
        }
    }, [words, practiceWords, clearTimer, speakPortuguese]);

    /**
     * Speaks the current word
     */
    const handleSpeak = useCallback(() => {
        if (!currentWord) return;

        const textToSpeak = currentWord.isEnglishToPortuguese
            ? currentWord.englishWord
            : currentWord.targetWord;

        const language = currentWord.isEnglishToPortuguese ? 'en' : 'pt';
        speak(textToSpeak, language);
    }, [currentWord, speak]);

    /**
     * Fetches and displays detailed explanation for the current word
     */
    const handleExplain = useCallback(async () => {
        if (!currentWord || !authKey) return;

        setLoadingExplanation(true);
        setResult('explaining');
        setError(null);

        try {
            const explanationData = await fetchExplanation(
                currentWord.targetWord,
                currentWord.englishWord,
                authKey
            );

            setExplanation(explanationData);
            setResult('explained');

            // Show the correct answer
            const correctAnswer = currentWord.isEnglishToPortuguese
                ? currentWord.targetWord
                : currentWord.englishWord;
            setUserInput(correctAnswer);

            // Speak the Portuguese word
            speakPortuguese(currentWord.targetWord);

            // Add to practice list if not already there
            if (!('correctCount' in currentWord)) {
                addToPractice(currentWord);
            }

        } catch (err) {
            console.error('Failed to fetch explanation:', err);

            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Failed to load explanation. Please try again.');
            }

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

    // Load vocabulary on provider mount
    useEffect(() => {
        loadVocabulary();
    }, [loadVocabulary]);

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
        words,
        practiceWords,
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
        dailyStats: dailyStatsDisplay,

        // Actions
        handleInputChange,
        handleShow,
        handleNext,
        handleSpeak,
        handleExplain,
        loadVocabulary,
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
