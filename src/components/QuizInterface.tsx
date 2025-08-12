/**
 * Quiz interface component for the Portuguese learning application.
 * 
 * This component renders the main quiz interface with:
 * - Language input fields (phraseInput) with practice icons
 * - Keyboard shortcuts component with underlined letters
 * - Progress history visualization 
 * - Course selection dropdown
 * 
 * Features keyboard shortcuts with authentication-conditional behavior:
 * - N: Next word (always)
 * - S: Show answer (non-authenticated only) 
 * - P: Speak word (always, changed from Space)
 * - E: Explain word (authenticated only)
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import React, { useEffect, useRef } from 'react';
import { useLearningContext } from '@/contexts';
import { COURSES, } from '@/types';
import { courseToValue, valueToCourse } from '@/lib/utils';
import PhraseInput from './ui/phraseInput';
import History from './ui/history';
import Shortcuts from './ui/shortcuts';

/**
 * Main quiz interface component
 */
export const QuizInterface: React.FC = () => {
    const {
        currentWord,
        direction,
        isEditable,
        isAuthenticated,
        course,
        handleNext,
        handleShow,
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
                    if (!isAuthenticated) { // Only handle Show when not authenticated (auth users use Explain)
                        e.preventDefault();
                        handleShow();
                    }
                    break;
                case 'p':
                case 'P':
                    if (e.ctrlKey || e.metaKey) break; // Allow Ctrl+P/Cmd+P (print)
                    e.preventDefault();
                    handleSpeak(); // Changed from Space to P for better UX
                    break;
                case 'e':
                case 'E':
                    if (e.ctrlKey || e.metaKey) break; // Allow Ctrl+E/Cmd+E
                    e.preventDefault();
                    handleExplain();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handleShow, handleSpeak, handleExplain, isAuthenticated]);

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
                    <Shortcuts />
                    <History />
                </div>
            </div>
        </div>
    );
};
