import { useLearningContext } from "@/contexts";
import { cn } from "@/lib/utils";
import { CONFIG, SupportedLanguage } from "@/types";
import { Lightbulb } from "lucide-react";
import { PropsWithChildren } from "react";

export type PracticeIconProps = {
    language: SupportedLanguage;
};

const PracticeIcon = ({ language }: PropsWithChildren<PracticeIconProps>) => {
    const {
        practiceCorrectCount,
        direction
    } = useLearningContext();

    if (practiceCorrectCount == null) {
        return null;
    }
    if (direction?.to !== language) {
        return null;
    }
    return (
        <div className={cn('absolute -translate-x-[100%] h-full pr-3 hidden sm:flex items-center justify-center text-neutral-600 dark:text-neutral-400')}>
            <Lightbulb size={20} strokeWidth={1} />
            <span
                className='absolute bottom-1 right-2 text-xs'
            >{CONFIG.PRACTICE_MAX_CORRECT_COUNT - practiceCorrectCount}</span>
        </div>
    );
};

export default PracticeIcon;
