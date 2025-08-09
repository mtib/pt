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
import { formatTimer } from '@/utils/vocabulary';
import { useLearningContext } from '@/contexts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

/**
 * Main quiz interface component
 */
export const QuizInterface: React.FC = () => {
    const {
        vocabularyXP,
        currentWord,
        userInput,
        result,
        isEditable,
        remainingTime,
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
            if (currentWord.direction === 'en-to-pt') {
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
    bg-transparent border-b border-neutral-600 focus:outline-none text-neutral-100 font-bold text-base
    ${isActive ? 'focus:border-neutral-400' : 'cursor-not-allowed'}
  `;

    const getButtonClassName = (disabled: boolean = false) => `
    ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-blue-400 hover:underline cursor-pointer'}
    text-base text-sm py-0 px-0
  `;

    return (
        <div className="flex justify-center items-center flex-grow p-4">
            <Card className="w-full max-w-2xl font-mono">
                <CardContent className="p-6">
                    <pre className="overflow-x-auto">
                        <code>
                            {`{
  "xp": ${vocabularyXP},
  "word": {
    "portuguese": "`}

                            <Input
                                ref={portugueseInputRef}
                                name="portuguese"
                                type="text"
                                value={currentWord?.direction === 'en-to-pt' ? userInput : currentWord?.translation_pt || ''}
                                onChange={(e) => handleInputChange(e.target.value)}
                                className="bg-transparent border-0 border-b rounded-none"
                                disabled={!isEditable || currentWord?.direction !== 'en-to-pt'}
                                aria-label="Portuguese word input"
                                autoComplete="off"
                            />
                            {`",
    "english": "`}

                            <Input
                                ref={englishInputRef}
                                name="english"
                                type="text"
                                value={currentWord?.direction === 'en-to-pt' ? currentWord?.translation_en || '' : userInput}
                                onChange={(e) => handleInputChange(e.target.value)}
                                className="bg-transparent border-0 border-b rounded-none"
                                disabled={!isEditable || currentWord?.direction !== 'pt-to-en'}
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
                            <Button
                                onClick={handleShow}
                                variant="link"
                                title="Show answer (S)"
                                aria-label="Show answer"
                            >
                                &quot;Show&quot;
                            </Button>
                            {`,\n    `}
                            <Button
                                onClick={handleNext}
                                variant="link"
                                title="Next word (N)"
                                aria-label="Next word"
                            >
                                &quot;Next&quot;
                            </Button>
                            {`,\n    `}
                            <Button
                                onClick={handleSpeak}
                                disabled={!currentWord}
                                variant="link"
                                title="Speak word (Space)"
                                aria-label="Speak word"
                            >
                                &quot;Speak&quot;
                            </Button>
                            {`,\n    `}
                            <Button
                                onClick={handleExplain}
                                disabled={!currentWord || loadingExplanation || !isAuthenticated}
                                variant="link"
                                title={!isAuthenticated ? "Authentication required" : "Explain word (E)"}
                                aria-label="Explain word"
                            >
                                &quot;{loadingExplanation ? 'Loading...' : 'Explain'}&quot;
                            </Button>
                            {`
  ],
  "nextIn": "${remainingTime !== null ? formatTimer(remainingTime) : 'infinity'}"
}
`}
                        </code>
                    </pre>
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Shortcuts: <Kbd>N</Kbd> Next •
                        <Kbd>S</Kbd> Show •
                        <Kbd>Space</Kbd> Speak
                        {isAuthenticated && (
                            <> • <Kbd>E</Kbd> Explain</>
                        )}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
};
