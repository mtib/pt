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
import { COURSES, } from '@/types';
import { courseToValue, valueToCourse } from '@/lib/utils';
import PhraseInput from './ui/phraseInput';
import History from './ui/history';

/**
 * Main quiz interface component
 */
export const QuizInterface: React.FC = () => {
    const {
        currentWord,
        direction,
        isEditable,
        loadingExplanation,
        isAuthenticated,
        course,
        handleShow,
        handleNext,
        handleSpeak,
        handleExplain,
        setCourse,
    } = useLearningContext();
    const foreignInputRef = useRef<HTMLInputElement>(null);
    const nativeInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus the correct input field
    useEffect(() => {
        if (!currentWord || !isEditable) return;

        const timeoutId = setTimeout(() => {
            if (direction?.from == 'en') {
                foreignInputRef.current?.focus();
            } else {
                nativeInputRef.current?.focus();
            }
        }, 100);

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

    const getButtonClassName = (disabled: boolean = false) => `
    ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 dark:text-blue-400 hover:underline cursor-pointer'}
    py-0 px-0
  `;

    return (
        <div className='wide:flex-grow'>
            <div className='pt-3'>
                <div className="inline m-3 p-1 dark:bg-neutral-800 dark:text-neutral-400 bg-neutral-200 text-neutral-700 rounded">
                    <select name="course" id="course-select" value={courseToValue(course)} onChange={(e) => setCourse(valueToCourse(e.target.value))}>
                        {
                            COURSES.map(courseToValue).map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))
                        }
                    </select>
                </div>
            </div>
            <div className="py-8 wide:py-0 flex flex-col justify-center items-center h-full relative">
                <div className="p-3 border-neutral-700 flex flex-col gap-8">
                    <PhraseInput language={course.native} ref={nativeInputRef} />
                    <PhraseInput language={course.foreign} ref={foreignInputRef} />
                    <div className='flex flex-row justify-between gap-4'>
                        <div className='flex flex-row gap-1 items-end'>
                            <button
                                onClick={handleNext}
                                className={getButtonClassName()}
                                title="Next word (N)"
                                aria-label="Next word"
                            >
                                Next
                            </button>
                            <kbd className="inline px-1 py-0.5 bg-neutral-700 text-white rounded text-xs">N</kbd>
                        </div>
                        <div className='flex flex-row gap-1 items-end'>
                            <button
                                onClick={handleShow}
                                className={getButtonClassName()}
                                title="Show answer (S)"
                                aria-label="Show answer"
                            >
                                Show
                            </button>
                            <kbd className="inline px-1 py-0.5 bg-neutral-700 text-white rounded text-xs">S</kbd>
                        </div>
                        <div className='flex flex-row gap-1 items-end'>
                            <button
                                onClick={handleSpeak}
                                disabled={!currentWord}
                                className={getButtonClassName(!currentWord)}
                                title="Speak word (Space)"
                                aria-label="Speak word"
                            >
                                Speak
                            </button>
                            <kbd className="inline px-1 py-0.5 bg-neutral-700 text-white rounded text-xs">␣</kbd>
                        </div>
                        {isAuthenticated && (
                            <div className='flex flex-row gap-1 items-end'>
                                <button
                                    onClick={handleExplain}
                                    disabled={!currentWord || loadingExplanation || !isAuthenticated}
                                    className={getButtonClassName(!currentWord || loadingExplanation || !isAuthenticated)}
                                    title={!isAuthenticated ? "Authentication required" : "Explain word (E)"}
                                    aria-label="Explain word"
                                >
                                    Explain
                                </button>
                                <kbd className="inline px-1 py-0.5 bg-neutral-700 text-white rounded text-xs">E</kbd>
                            </div>
                        )}
                        {isAuthenticated && <Link href="/add" className={getButtonClassName(!currentWord || !isAuthenticated)}>
                            Add
                        </Link>}
                    </div>
                    <History />
                </div>
            </div>
        </div>
    );
};
