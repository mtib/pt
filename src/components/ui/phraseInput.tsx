import { SupportedLanguage, toFullLanguageName } from "@/types";
import PracticeIcon from "./practiceIcon";
import PracticeCompleteIcon from "./practiceCompleteIcon";
import { useLearningContext } from "@/contexts";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type PhraseInputProps = {
    ref: React.RefObject<HTMLInputElement | null>;
    language: SupportedLanguage;
};


const PhraseInput = ({ ref, language }: PhraseInputProps) => {
    const {
        result,
        direction,
        currentWord,
        userInput,
        isEditable,
        handleInputChange,
    } = useLearningContext();

    const inputClassName = useMemo(() => {
        const clases = ['bg-transparent border-b border-neutral-600 focus:outline-none font-bold'];
        if (isEditable && direction?.from !== language) {
            clases.push('focus:border-neutral-400');
        } else {
            clases.push('cursor-default');
        }
        if (result === 'correct' && direction?.to === language) {
            clases.push('text-green-600 dark:text-green-400');
        }
        return cn(...clases);
    }, [language, result, direction, isEditable]);

    return (
        <div className='flex flex-col relative'>
            <PracticeIcon language={language} />
            <PracticeCompleteIcon language={language} />
            <span className='text-neutral-400'>{toFullLanguageName(language)}</span>
            <input
                ref={ref}
                type="text"
                value={direction?.from === language ? currentWord?.sourcePhrase?.phrase || '' : userInput}
                onChange={(e) => handleInputChange(e.target.value)}
                className={inputClassName}
                disabled={!isEditable || direction?.from === language}
                aria-label={`${toFullLanguageName(language)} word input`}
                autoComplete="off"
            />
        </div>
    );
};

export default PhraseInput;
