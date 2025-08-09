/**
 * Main page component for the Portuguese learning application.
 * 
 * This is the primary interface where users practice Portuguese vocabulary
 * through an interactive quiz system with XP tracking, explanations,
 * and speech synthesis.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
  shuffleArray
} from '@/utils/vocabulary';
import { fetchExplanation, ApiError } from '@/lib/apiClient';
import { QuizInterface, ExplanationPanel, ErrorBoundary } from '@/components';

/**
 * Interface for the external vocabulary API response
 */
interface VocabularyApiResponse {
  words: Word[];
}

/**
 * Main learning application component
 */
function LearnPortugueseApp(): React.JSX.Element {
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

      const shuffledWords = shuffleArray(data.words);
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

  // Load vocabulary on component mount
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

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Loading vocabulary...</p>
        </div>
      </div>
    );
  }

  // Show error state if vocabulary failed to load
  if (error && !isInitialized) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center">
        <div className="max-w-md p-6 bg-neutral-800 rounded-lg border border-neutral-700 text-center">
          <h2 className="text-xl font-bold text-red-400 mb-4">Error Loading App</h2>
          <p className="text-neutral-300 mb-4">{error}</p>
          <button
            onClick={loadVocabulary}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 text-neutral-100 flex flex-col lg:flex-row w-full h-screen">
      {/* Main Quiz Interface */}
      <div className="flex-1 flex">
        <QuizInterface
          vocabularyXP={vocabularyXP}
          currentWord={currentWord}
          userInput={userInput}
          result={result}
          isEditable={isEditable}
          timer={timer}
          dailyStats={dailyStatsDisplay}
          loadingExplanation={loadingExplanation}
          isAuthenticated={isAuthenticated}
          onInputChange={handleInputChange}
          onShow={handleShow}
          onNext={handleNext}
          onSpeak={handleSpeak}
          onExplain={handleExplain}
        />
      </div>

      {/* Explanation Panel */}
      <div className="lg:w-[800px] lg:border-l border-neutral-700 font-mono lg:h-screen lg:overflow-hidden">
        <ExplanationPanel
          explanation={explanation}
          loading={loadingExplanation}
          className="lg:border-t-0 border-t border-neutral-700 h-full"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed top-4 left-4 right-4 lg:right-4 lg:left-auto lg:max-w-md p-4 bg-red-900/90 border border-red-700 rounded-lg z-50">
          <p className="text-red-100 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-300 hover:text-red-100 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Main page component wrapped with error boundary
 */
export default function Home(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <LearnPortugueseApp />
    </ErrorBoundary>
  );
}
