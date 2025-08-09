/**
 * Quiz interface component for the Portuguese learning application.
 * 
 * This component renders the main quiz interface with a JSON-style layout,
 * input fields for Portuguese/English translations, and action buttons.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

import React, { useEffect, useRef } from 'react';
import { Word, PracticeWord, QuizResult } from '@/types';
import { formatTimer } from '@/utils/vocabulary';

interface QuizInterfaceProps {
    /** Current vocabulary XP */
    vocabularyXP: number;
    /** Current word being quizzed */
    currentWord: Word | PracticeWord | null;
    /** User's current input */
    userInput: string;
    /** Current quiz result state */
    result: QuizResult;
    /** Whether input fields are editable */
    isEditable: boolean;
    /** Timer value in milliseconds */
    timer: number | null;
    /** Daily statistics */
    dailyStats: {
        todayCount: number;
        diff: number;
        histogram: string;
        practiceListLength: number;
    };
    /** Loading state for explanations */
    loadingExplanation: boolean;
    /** Whether user is authenticated */
    isAuthenticated: boolean;
    /** Callbacks */
    onInputChange: (value: string) => void;
    onShow: () => void;
    onNext: () => void;
    onSpeak: () => void;
    onExplain: () => void;
}

/**
 * Main quiz interface component
 */
export const QuizInterface: React.FC<QuizInterfaceProps> = ({
    vocabularyXP,
    currentWord,
    userInput,
    result,
    isEditable,
    timer,
    dailyStats,
    loadingExplanation,
    isAuthenticated,
    onInputChange,
    onShow,
    onNext,
    onSpeak,
    onExplain,
}) => {
    const portugueseInputRef = useRef<HTMLInputElement>(null);
    const englishInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus the correct input field
    useEffect(() => {
        if (!currentWord || !isEditable) return;

        const timeoutId = setTimeout(() => {
            if (currentWord.isEnglishToPortuguese) {
                portugueseInputRef.current?.focus();
            } else {
                englishInputRef.current?.focus();
            }
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [currentWord, isEditable]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts if user is typing in input
            if (e.target instanceof HTMLInputElement) return;

            switch (e.key) {
                case 'n':
                case 'N':
                    if (e.ctrlKey || e.metaKey) break; // Allow Ctrl+N/Cmd+N
                    e.preventDefault();
                    onNext();
                    break;
                case 's':
                case 'S':
                    if (e.ctrlKey || e.metaKey) break; // Allow Ctrl+S/Cmd+S
                    e.preventDefault();
                    onShow();
                    break;
                case ' ': // Spacebar
                    e.preventDefault();
                    onSpeak();
                    break;
                case 'e':
                case 'E':
                    if (e.ctrlKey || e.metaKey) break; // Allow Ctrl+E/Cmd+E
                    if (isAuthenticated) {
                        e.preventDefault();
                        onExplain();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onNext, onShow, onSpeak, onExplain, isAuthenticated]);

    const getInputClassName = (isActive: boolean) => `
    bg-transparent border-b border-neutral-600 focus:outline-none text-neutral-100
    ${isActive ? 'focus:border-neutral-400' : 'cursor-not-allowed opacity-60'}
  `;

    const getButtonClassName = (disabled: boolean = false) => `
    ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-blue-400 hover:underline cursor-pointer'}
  `;

    return (
        <div className="flex justify-center items-center flex-grow">
            <div className="relative">
                <pre className="bg-neutral-800 p-4 rounded-lg shadow-lg text-sm w-full max-w-lg border border-neutral-700">
                    <code>
                        {`{
  "xp": ${vocabularyXP},
  "word": {
    "portuguese": "`}

                        <input
                            ref={portugueseInputRef}
                            name="portuguese"
                            type="text"
                            value={currentWord?.isEnglishToPortuguese ? userInput : currentWord?.targetWord || ''}
                            onChange={(e) => onInputChange(e.target.value)}
                            className={getInputClassName(isEditable && !!currentWord?.isEnglishToPortuguese)}
                            disabled={!isEditable || !currentWord?.isEnglishToPortuguese}
                            aria-label="Portuguese word input"
                            autoComplete="off"
                        />
                        {`",
    "english": "`}

                        <input
                            ref={englishInputRef}
                            name="english"
                            type="text"
                            value={currentWord?.isEnglishToPortuguese ? currentWord?.englishWord || '' : userInput}
                            onChange={(e) => onInputChange(e.target.value)}
                            className={getInputClassName(isEditable && !currentWord?.isEnglishToPortuguese)}
                            disabled={!isEditable || !!currentWord?.isEnglishToPortuguese}
                            aria-label="English word input"
                            autoComplete="off"
                        />
                        {`"
  },
  "result": "${result}",
  "dailyStats": {
    "today": ${dailyStats.todayCount},
    "diff": ${dailyStats.diff},
    "histogram": "${dailyStats.histogram}",
    "practiceListLength": ${dailyStats.practiceListLength}
  },
  "actions": [
    `}
                        <button
                            onClick={onShow}
                            className={getButtonClassName()}
                            title="Show answer (S)"
                            aria-label="Show answer"
                        >
                            &quot;Show&quot;
                        </button>
                        {`,\n    `}
                        <button
                            onClick={onNext}
                            className={getButtonClassName()}
                            title="Next word (N)"
                            aria-label="Next word"
                        >
                            &quot;Next&quot;
                        </button>
                        {`,\n    `}
                        <button
                            onClick={onSpeak}
                            disabled={!currentWord}
                            className={getButtonClassName(!currentWord)}
                            title="Speak word (Space)"
                            aria-label="Speak word"
                        >
                            &quot;Speak&quot;
                        </button>
                        {`,\n    `}
                        <button
                            onClick={onExplain}
                            disabled={!currentWord || loadingExplanation || !isAuthenticated}
                            className={getButtonClassName(!currentWord || loadingExplanation || !isAuthenticated)}
                            title={!isAuthenticated ? "Authentication required" : "Explain word (E)"}
                            aria-label="Explain word"
                        >
                            &quot;{loadingExplanation ? 'Loading...' : 'Explain'}&quot;
                        </button>
                        {`
  ]
}`}
                    </code>
                </pre>

                {timer !== null && (
                    <div
                        className="absolute bottom-2 right-2 text-neutral-400 text-xs"
                        aria-live="polite"
                    >
                        Next in {formatTimer(timer)}
                    </div>
                )}

                {/* Keyboard shortcuts help */}
                <div className="mt-2 text-xs text-neutral-500 text-center">
                    Shortcuts: <kbd className="px-1 py-0.5 bg-neutral-700 rounded">N</kbd> Next •
                    <kbd className="px-1 py-0.5 bg-neutral-700 rounded">S</kbd> Show •
                    <kbd className="px-1 py-0.5 bg-neutral-700 rounded">Space</kbd> Speak
                    {isAuthenticated && (
                        <> • <kbd className="px-1 py-0.5 bg-neutral-700 rounded">E</kbd> Explain</>
                    )}
                </div>
            </div>
        </div>
    );
};
