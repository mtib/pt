/**
 * Custom React hooks for the Portuguese learning application.
 * 
 * This file contains reusable hooks that encapsulate common functionality
 * and state management patterns used throughout the application.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Word, PracticeWord, DailyStats, STORAGE_KEYS } from '@/types';

/**
 * Hook for managing localStorage with automatic JSON serialization
 */
export function useLocalStorage<T>(
    key: string,
    defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    const [value, setValue] = useState<T>(() => {
        if (typeof window === 'undefined') return defaultValue;

        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (error) {
            console.warn(`Failed to parse localStorage key "${key}":`, error);
            return defaultValue;
        }
    });

    const setStoredValue = useCallback((newValue: T | ((prev: T) => T)) => {
        setValue(prev => {
            const valueToStore = typeof newValue === 'function'
                ? (newValue as (prev: T) => T)(prev)
                : newValue;

            try {
                localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch (error) {
                console.warn(`Failed to save to localStorage key "${key}":`, error);
            }

            return valueToStore;
        });
    }, [key]);

    return [value, setStoredValue];
}

/**
 * Hook for managing daily statistics
 */
export function useDailyStats() {
    const [dailyStats, setDailyStats] = useLocalStorage<DailyStats>(
        STORAGE_KEYS.DAILY_STATS,
        {}
    );

    const getToday = useCallback(() => {
        return new Date().toISOString().split('T')[0];
    }, []);

    const getYesterday = useCallback(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }, []);

    const incrementTodayCount = useCallback(() => {
        const today = getToday();
        setDailyStats(prev => ({
            ...prev,
            [today]: (prev[today] || 0) + 1,
        }));
    }, [getToday, setDailyStats]);

    const getTodayCount = useCallback(() => {
        return dailyStats[getToday()] || 0;
    }, [dailyStats, getToday]);

    const getYesterdayCount = useCallback(() => {
        return dailyStats[getYesterday()] || 0;
    }, [dailyStats, getYesterday]);

    const getDaysDiff = useCallback(() => {
        return getTodayCount() - getYesterdayCount();
    }, [getTodayCount, getYesterdayCount]);

    const getLast14DaysHistogram = useCallback(() => {
        const last14Days = Array.from({ length: 14 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            return dailyStats[dateStr] || 0;
        }).reverse();

        const min = Math.min(...last14Days);
        const max = Math.max(...last14Days);
        const range = max - min || 1;

        return last14Days
            .map((count) => {
                const normalized = (count - min) / range;

                if (normalized >= 0.8) return '█';
                if (normalized >= 0.6) return '▇';
                if (normalized >= 0.4) return '▆';
                if (normalized >= 0.2) return '▅';
                if (normalized > 0) return '▃';
                return '▁';
            })
            .join('');
    }, [dailyStats]);

    return {
        dailyStats,
        incrementTodayCount,
        getTodayCount,
        getYesterdayCount,
        getDaysDiff,
        getLast14DaysHistogram,
    };
}

/**
 * Hook for managing XP and practice words
 */
export function useVocabularyProgress() {
    const [vocabularyXP, setVocabularyXP] = useLocalStorage(
        STORAGE_KEYS.VOCABULARY_XP,
        0
    );

    const [practiceWords, setPracticeWords] = useLocalStorage<PracticeWord[]>(
        STORAGE_KEYS.PRACTICE_WORDS,
        []
    );

    const addXP = useCallback((xp: number) => {
        setVocabularyXP(prev => prev + xp);
    }, [setVocabularyXP]);

    const addToPractice = useCallback((word: Word | PracticeWord) => {
        if ('correctCount' in word) {
            // If it's already a practice word, reset its correctCount to 0
            setPracticeWords(prev => prev.map(pWord =>
                pWord.rank === word.rank && pWord.isEnglishToPortuguese === word.isEnglishToPortuguese
                    ? { ...pWord, correctCount: 0 }
                    : pWord
            ));
            return;
        }

        // Add both directions to practice, ensuring no duplicates
        setPracticeWords(prev => {
            const existing = prev.filter(pWord => pWord.rank === word.rank);
            const ptToEn = existing.find(pWord => !pWord.isEnglishToPortuguese);
            const enToPt = existing.find(pWord => pWord.isEnglishToPortuguese);

            const newWords: PracticeWord[] = [];

            // Add Portuguese to English if not exists
            if (!ptToEn) {
                newWords.push({ ...word, correctCount: 0, isEnglishToPortuguese: false });
            }

            // Add English to Portuguese if not exists
            if (!enToPt) {
                newWords.push({ ...word, correctCount: 0, isEnglishToPortuguese: true });
            }

            return [...prev, ...newWords];
        });
    }, [setPracticeWords]);

    const incrementCorrectCount = useCallback((word: Word | PracticeWord) => {
        if (!('correctCount' in word)) return;

        setPracticeWords(prev => prev
            .map(pWord => {
                if (pWord.rank === word.rank && pWord.isEnglishToPortuguese === word.isEnglishToPortuguese) {
                    return { ...pWord, correctCount: pWord.correctCount + 1 };
                }
                return pWord;
            })
            .filter(pWord => pWord.correctCount < 3)
        );
    }, [setPracticeWords]);

    return {
        vocabularyXP,
        practiceWords,
        addXP,
        addToPractice,
        incrementCorrectCount,
    };
}

/**
 * Hook for managing authentication
 */
export function useAuth() {
    const [authKey, setAuthKey] = useLocalStorage<string | null>(
        STORAGE_KEYS.AUTH,
        null
    );

    // Check for auth key in URL hash on mount
    useEffect(() => {
        const hash = window.location.hash;
        const match = hash.match(/^#auth_(.+)$/);

        if (match) {
            const key = match[1];
            setAuthKey(key);
            // Clear the hash from the URL
            window.location.hash = '';
        }
    }, [setAuthKey]);

    const isAuthenticated = Boolean(authKey);

    return {
        authKey,
        isAuthenticated,
        setAuthKey,
    };
}

/**
 * Hook for managing speech synthesis
 */
export function useSpeechSynthesis() {
    const speakPortuguese = useCallback((text: string) => {
        if (!text || !window.speechSynthesis) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-PT';
        speechSynthesis.speak(utterance);
    }, []);

    const speakEnglish = useCallback((text: string) => {
        if (!text || !window.speechSynthesis) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
    }, []);

    const speak = useCallback((text: string, language: 'pt' | 'en') => {
        if (language === 'pt') {
            speakPortuguese(text);
        } else {
            speakEnglish(text);
        }
    }, [speakPortuguese, speakEnglish]);

    return {
        speak,
        speakPortuguese,
        speakEnglish,
    };
}

/**
 * Hook for managing timer functionality with requestAnimationFrame
 */
export function useTimer(onComplete?: () => void) {
    const [timer, setTimer] = useState<number | null>(null);
    const timerRef = useRef<number | null>(null);

    const startTimer = useCallback((duration: number) => {
        setTimer(duration);
    }, []);

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            cancelAnimationFrame(timerRef.current);
            timerRef.current = null;
        }
        setTimer(null);
    }, []);

    useEffect(() => {
        if (timer === null) return;

        if (timer <= 0) {
            onComplete?.();
            clearTimer();
            return;
        }

        const start = performance.now();

        const updateTimer = (timestamp: number) => {
            const elapsed = timestamp - start;
            setTimer(prev => prev !== null ? Math.max(0, prev - elapsed) : null);

            if (timer > 0) {
                timerRef.current = requestAnimationFrame(updateTimer);
            }
        };

        timerRef.current = requestAnimationFrame(updateTimer);

        return () => {
            if (timerRef.current !== null) {
                cancelAnimationFrame(timerRef.current);
            }
        };
    }, [timer, onComplete, clearTimer]);

    return {
        timer,
        startTimer,
        clearTimer,
        isActive: timer !== null,
    };
}
