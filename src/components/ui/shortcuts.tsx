/**
 * Shortcuts component for quiz interface actions.
 * 
 * Provides keyboard shortcut buttons with underlined shortcut letters:
 * - Next (N) - Always available
 * - Show (S) - Only for non-authenticated users 
 * - Speak (P) - Always available when currentWord exists
 * - Explain (E) - Only for authenticated users
 * - Add - Link without shortcut, authenticated users only
 * 
 * Features:
 * - Smart letter underlining based on shortcut key
 * - Conditional rendering based on authentication state
 * - Consistent styling with hover effects
 * - Proper disabled states
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import React from 'react';
import Link from 'next/link';
import { useLearningContext } from '@/contexts';

type ShortcutButtonProps = {
    onClick?: () => void;
    disabled?: boolean;
    title: string;
    shortcutKey: string;
    children: React.ReactNode;
    'aria-label': string;
};

/**
 * Generic shortcut button component.
 * 
 * Automatically finds and underlines the shortcut letter within the button text.
 * Handles disabled states and provides consistent styling.
 * 
 * @param shortcutKey - Single letter that should be underlined in the text
 */
const ShortcutButton: React.FC<ShortcutButtonProps> = ({
    onClick,
    disabled = false,
    title,
    shortcutKey,
    children,
    'aria-label': ariaLabel,
}) => {
    const getButtonClassName = (disabled: boolean = false) => `
        ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 dark:text-blue-400 hover:underline cursor-pointer'}
        py-0 px-0
    `;

    /**
     * Renders text with the shortcut letter underlined.
     * 
     * Finds the first occurrence of the shortcut key (case-insensitive)
     * and wraps it in an underline tag.
     * 
     * @param text - Button text content
     * @param key - Shortcut key to underline
     * @returns JSX with underlined shortcut letter
     */
    const renderTextWithShortcut = (text: React.ReactNode, key: string) => {
        if (typeof text !== 'string') return text;
        
        const lowerText = text.toLowerCase();
        const lowerKey = key.toLowerCase();
        const index = lowerText.indexOf(lowerKey);
        
        if (index === -1) return text;
        
        return (
            <>
                {text.slice(0, index)}
                <u>{text[index]}</u>
                {text.slice(index + 1)}
            </>
        );
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={getButtonClassName(disabled)}
            title={title}
            aria-label={ariaLabel}
        >
            {renderTextWithShortcut(children, shortcutKey)}
        </button>
    );
};


const Shortcuts: React.FC = () => {
    const {
        currentWord,
        loadingExplanation,
        isAuthenticated,
        handleShow,
        handleNext,
        handleSpeak,
        handleExplain,
    } = useLearningContext();

    return (
        <div className='flex flex-row justify-between gap-4'>
            <ShortcutButton
                onClick={handleNext}
                title="Next word (N)"
                shortcutKey="n"
                aria-label="Next word"
            >
                Next
            </ShortcutButton>
            
            {!isAuthenticated && (
                <ShortcutButton
                    onClick={handleShow}
                    title="Show answer (S)"
                    shortcutKey="s"
                    aria-label="Show answer"
                >
                    Show
                </ShortcutButton>
            )}
            
            <ShortcutButton
                onClick={handleSpeak}
                disabled={!currentWord}
                title="Speak word (P)"
                shortcutKey="p"
                aria-label="Speak word"
            >
                Speak
            </ShortcutButton>
            
            {isAuthenticated && (
                <ShortcutButton
                    onClick={handleExplain}
                    disabled={!currentWord || loadingExplanation || !isAuthenticated}
                    title={!isAuthenticated ? "Authentication required" : "Explain word (E)"}
                    shortcutKey="e"
                    aria-label="Explain word"
                >
                    Explain
                </ShortcutButton>
            )}
            
            {isAuthenticated && (
                <Link 
                    href="/add" 
                    className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer py-0 px-0"
                    title="Add words"
                >
                    Add
                </Link>
            )}
        </div>
    );
};

export default Shortcuts;