/**
 * Explanation panel component for displaying detailed word information.
 * 
 * This component shows comprehensive information about a Portuguese word,
 * including pronunciation, examples, grammar, and cultural context.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { useLearningContext } from '@/contexts';

interface ExplanationPanelProps {
    /** Additional CSS classes */
    className?: string;
}

/**
 * Panel component for displaying word explanations
 */
export const ExplanationPanel: React.FC<ExplanationPanelProps> = () => {
    const { explanation, loadingExplanation } = useLearningContext();

    const sections = useMemo(() => {
        if (!explanation) return [];
        return [
            { title: 'Example', content: explanation.example },
            { title: 'Definition', content: explanation.definition },
            { title: 'Explanation', content: explanation.explanation },
            { title: 'Grammar', content: explanation.grammar },
            { title: 'Interesting Facts', content: explanation.facts },
            { title: 'Synonyms & Similar Phrases', content: explanation.synonyms },
            { title: 'Alternative Translations', content: explanation.alternatives }
        ].filter(section => section.content);
    }, [explanation]);

    if (loadingExplanation) {
        return (
            <ExplanationPanelWrapper>
                <div className={`p-4 wide:flex wide:flex-col wide:h-full wide:items-center wide:justify-center text-neutral-500 dark:text-neutral-400`}>
                    <LoadingSpinner size="lg" text="Loading explanation..." />
                </div>
            </ExplanationPanelWrapper>
        );
    }

    if (!explanation) {
        return (
            <ExplanationPanelWrapper>
                <div className={`p-4 text-center wide:flex wide:flex-col wide:h-full wide:items-center wide:justify-center text-neutral-500 dark:text-neutral-400`}>
                    <div className="text-4xl text-neutral-600 mb-2">✨</div>
                    <p>
                        Click &quot;Explain&quot; to get detailed information about a word
                    </p>
                </div>
            </ExplanationPanelWrapper>
        );
    }

    return (
        <ExplanationPanelWrapper>
            <article>
                {/* Word Header */}
                <header className="mb-4 text-lg">
                    <div className="font-bold mb-1 flex flex-row">
                        <span className='font-bold'>
                            {explanation.foreignPhrase}
                        </span>
                        <span className="text-neutral-500 dark:text-neutral-400 font-light sm:text-lg block sm:inline border-l pl-4 ml-4">
                            {explanation.englishPhrase}
                        </span>
                    </div>

                    {/* Pronunciation */}
                    <div className="text-sm">
                        <span>{explanation.pronunciationIPA}</span>
                        {explanation.pronunciationEnglish && (
                            <span className="ml-2 text-neutral-500 dark:text-neutral-400 font-light">{explanation.pronunciationEnglish}</span>
                        )}
                    </div>
                </header>

                {/* Content Sections */}
                <div>
                    {sections.map((section, index) => (
                        <section key={index} className="mb-4 sm:mb-6">
                            <h2 className="sm:text-lg font-semibold mb-2">
                                {section.title}
                            </h2>
                            <div className="">
                                <span className="text-xs sm:text-sm whitespace-pre-wrap">
                                    {section.content}
                                </span>
                            </div>
                        </section>
                    ))}
                </div>
            </article>
        </ExplanationPanelWrapper>
    );
};

const ExplanationPanelWrapper = ({ children }: React.PropsWithChildren) => {
    return (
        <div className="flex-grow wide:flex-grow-0 p-4 pb-8 w-full h-full wide:w-[var(--side-panel-width)] dark:bg-neutral-800 bg-neutral-100 border-t wide:border-t-0 wide:border-l border-neutral-700 wide:overflow-y-scroll backdrop-blur-md">
            {children}
        </div>
    );
};
