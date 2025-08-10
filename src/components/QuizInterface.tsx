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
import { useLearningContext } from '@/contexts';
import Link from 'next/link';

/**
 * Main quiz interface component
 */
export const QuizInterface: React.FC = () => {
    const {
        vocabularyXP,
        currentWord,
        direction,
        userInput,
        result,
        isEditable,
        dailyStats,
        loadingExplanation,
        isAuthenticated,
        handleInputChange,
        handleShow,
        handleNext,
        handleSpeak,
        handleExplain,
    } = useLearningContext();
    const portugueseInputRef = useRef<HTMLInputElement>(null);
    const englishInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus the correct input field
    useEffect(() => {
        if (!currentWord || !isEditable) return;

        const timeoutId = setTimeout(() => {
            if (direction?.from == 'en') {
                englishInputRef.current?.focus();
            } else if (direction?.from == 'pt') {
                portugueseInputRef.current?.focus();
            }
        }, 50);

        return () => clearTimeout(timeoutId);
    }, [currentWord, isEditable, direction?.from]);

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
                    handleNext();
                    break;
                case 's':
                case 'S':
                    if (e.ctrlKey || e.metaKey) break; // Allow Ctrl+S/Cmd+S
                    e.preventDefault();
                    handleShow();
                    break;
                case ' ': // Spacebar
                    e.preventDefault();
                    handleSpeak();
                    break;
                case 'e':
                case 'E':
                    if (e.ctrlKey || e.metaKey) break; // Allow Ctrl+E/Cmd+E
                    if (isAuthenticated) {
                        e.preventDefault();
                        handleExplain();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handleShow, handleSpeak, handleExplain, isAuthenticated]);

    const getInputClassName = (isActive: boolean) => `
    bg-transparent border-b border-neutral-600 focus:outline-none font-bold
    ${isActive ? 'focus:border-neutral-400' : 'cursor-default'}
  `;

    const getButtonClassName = (disabled: boolean = false) => `
    ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 dark:text-blue-400 hover:underline cursor-pointer'}
    py-0 px-0
  `;

    return (
        <div className="py-8 wide:py-0 wide:flex-grow flex flex-col justify-center items-center h-full">
            <pre className="wide:bg-neutral-100 dark:wide:bg-neutral-800 p-3 wide:rounded-lg wide:shadow-lg wide:border border-neutral-700 overflow-x-hidden">
                <code>
                    {`{
  "xp": ${vocabularyXP},
  "word": {
    "pt": "`}

                    <input
                        ref={portugueseInputRef}
                        name="portuguese"
                        type="text"
                        value={direction?.from === 'pt' ? currentWord?.sourcePhrase?.phrase || '' : userInput}
                        onChange={(e) => handleInputChange(e.target.value)}
                        className={getInputClassName(isEditable && direction?.from !== 'pt')}
                        disabled={!isEditable || direction?.from === 'pt'}
                        aria-label="Portuguese word input"
                        autoComplete="off"
                    />
                    {`",
    "en": "`}

                    <input
                        ref={englishInputRef}
                        name="english"
                        type="text"
                        value={direction?.from === 'en' ? currentWord?.sourcePhrase?.phrase || '' : userInput}
                        onChange={(e) => handleInputChange(e.target.value)}
                        className={getInputClassName(isEditable && direction?.from !== 'en')}
                        disabled={!isEditable || direction?.from === 'en'}
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
                        onClick={handleShow}
                        className={getButtonClassName()}
                        title="Show answer (S)"
                        aria-label="Show answer"
                    >
                        &quot;Show&quot;
                    </button>
                    {`,\n    `}
                    <button
                        onClick={handleNext}
                        className={getButtonClassName()}
                        title="Next word (N)"
                        aria-label="Next word"
                    >
                        &quot;Next&quot;
                    </button>
                    {`,\n    `}
                    <button
                        onClick={handleSpeak}
                        disabled={!currentWord}
                        className={getButtonClassName(!currentWord)}
                        title="Speak word (Space)"
                        aria-label="Speak word"
                    >
                        &quot;Speak&quot;
                    </button>
                    {`,\n    `}
                    <button
                        onClick={handleExplain}
                        disabled={!currentWord || loadingExplanation || !isAuthenticated}
                        className={getButtonClassName(!currentWord || loadingExplanation || !isAuthenticated)}
                        title={!isAuthenticated ? "Authentication required" : "Explain word (E)"}
                        aria-label="Explain word"
                    >
                        &quot;{loadingExplanation ? 'Loading...' : 'Explain'}&quot;
                    </button>
                    {`,\n    `}
                    <Link href="/add" className={getButtonClassName(!currentWord || !isAuthenticated)}>
                        &quot;Add&quot;
                    </Link>
                    {`
  ],
}
`}
                </code>
            </pre>

            {/* Keyboard shortcuts help - Hidden on mobile, shown on larger screens */}
            <div className="mt-2 text-xs dark:text-neutral-300 wide:block hidden">
                Shortcuts: <kbd className="px-1 py-0.5 bg-neutral-700 text-white rounded">N</kbd> Next •
                <kbd className="px-1 py-0.5 bg-neutral-700 text-white rounded">S</kbd> Show •
                <kbd className="px-1 py-0.5 bg-neutral-700 text-white rounded">Space</kbd> Speak
                {isAuthenticated && (
                    <> • <kbd className="px-1 py-0.5 bg-neutral-700 text-white rounded">E</kbd> Explain</>
                )}
            </div>
        </div>
    );
};
