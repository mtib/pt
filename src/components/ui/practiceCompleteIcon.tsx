/**
 * Practice Complete Icon component.
 * 
 * Displays a green checkmark when a practice word is completed (cleared from practice list).
 * Shows temporarily when:
 * 1. User answers correctly for the final time (reaching target count)
 * 2. Word gets removed from practice list 
 * 3. Result state is 'correct' (text is green)
 * 4. This is the target language input field
 * 
 * Uses absolute positioning to appear to the right of the input container
 * without affecting layout. Includes safeguards against visual glitches
 * during state transitions.
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import { useLearningContext } from "@/contexts";
import { cn } from "@/lib/utils";
import { CONFIG, SupportedLanguage } from "@/types";
import { Check } from "lucide-react";
import { PropsWithChildren, useEffect, useRef } from "react";

export type PracticeCompleteIconProps = {
    language: SupportedLanguage;
};

const PracticeCompleteIcon = ({ language }: PropsWithChildren<PracticeCompleteIconProps>) => {
    const {
        practiceCorrectCount,
        direction,
        result,
        currentWord
    } = useLearningContext();

    const previousCorrectCountRef = useRef<number | null>(null);
    const previousWordIdRef = useRef<number | null>(null);

    // Track previous correct count and word ID to detect completion
    useEffect(() => {
        previousCorrectCountRef.current = practiceCorrectCount;
        previousWordIdRef.current = currentWord?.sourcePhrase.id || null;
    }, [currentWord?.sourcePhrase.id, practiceCorrectCount]); // Update when word changes, not when count changes

    // Only show when:
    // 1. The result is 'correct' (text is green)
    // 2. This is the target language input
    // 3. The word was just completed (was a practice word and now removed from practice list)
    if (result !== 'correct') {
        return null;
    }
    if (direction?.to !== language) {
        return null;
    }

    // Show if: previous count was target-1 AND current count is null (word was removed)
    // AND this is the same word (not a new word loading)
    const wasAboutToComplete = previousCorrectCountRef.current === CONFIG.PRACTICE_MAX_CORRECT_COUNT - 1;
    const nowCompleted = practiceCorrectCount === null;
    const isSameWord = previousWordIdRef.current === currentWord?.sourcePhrase.id;

    if (!wasAboutToComplete || !nowCompleted || !isSameWord) {
        return null;
    }

    return (
        <div className={cn('absolute right-0 translate-x-[100%] h-full pl-3 hidden sm:flex items-center justify-center text-green-600 dark:text-green-400')}>
            <Check size={20} strokeWidth={2} />
        </div>
    );
};

export default PracticeCompleteIcon;
