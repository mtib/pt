/**
 * Explanation panel component for displaying detailed word information.
 * 
 * This component shows comprehensive information about a Portuguese word,
 * including pronunciation, examples, grammar, and cultural context.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { useLearningContext } from '@/contexts';

interface ExplanationPanelProps {
    /** Additional CSS classes */
    className?: string;
}

/**
 * Panel component for displaying word explanations
 */
export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({
    className = '',
}) => {
    const { explanation, loadingExplanation } = useLearningContext();
    if (loadingExplanation) {
        return (
            <div className={`bg-neutral-800 p-4 ${className}`}>
                <LoadingSpinner size="md" color="white" text="Loading explanation..." />
            </div>
        );
    }

    if (!explanation) {
        return (
            <div className={`bg-neutral-800 p-4 text-center ${className}`}>
                <div className="text-4xl text-neutral-600 mb-2">✨</div>
                <p className="text-neutral-400 text-sm">
                    Click &quot;Explain&quot; to get detailed information about a word
                </p>
            </div>
        );
    }

    return (
        <div className={`bg-neutral-800 text-neutral-100 p-3 sm:p-4 overflow-y-auto ${className}`}>
            <article>
                {/* Word Header */}
                <header className="mb-4 sm:mb-6">
                    <h1 className="text-lg sm:text-2xl font-bold mb-1">
                        {explanation.word}
                        <span className="text-neutral-400 font-normal text-sm sm:text-lg ml-2 block sm:inline">
                            ({explanation.englishReference})
                        </span>
                    </h1>

                    {/* Pronunciation */}
                    <div className="text-neutral-400 text-xs sm:text-sm">
                        <span className="font-mono">{explanation.pronunciationIPA}</span>
                        {explanation.pronunciationEnglish && (
                            <span className="ml-2 block sm:inline">({explanation.pronunciationEnglish})</span>
                        )}
                    </div>
                </header>

                {/* Content Sections */}
                <div className="space-y-4 sm:space-y-6">
                    {/* Example */}
                    {explanation.example && (
                        <section>
                            <h2 className="text-base sm:text-lg font-semibold mb-2 text-blue-400">
                                Example
                            </h2>
                            <div className="bg-neutral-900 p-2 sm:p-3 rounded border-l-4 border-blue-500">
                                <pre className="text-xs sm:text-sm whitespace-pre-wrap text-neutral-200">
                                    {explanation.example}
                                </pre>
                            </div>
                        </section>
                    )}

                    {/* Definition */}
                    {explanation.definition && (
                        <section>
                            <h2 className="text-base sm:text-lg font-semibold mb-2 text-green-400">
                                Definition
                            </h2>
                            <div className="bg-neutral-900 p-2 sm:p-3 rounded border-l-4 border-green-500">
                                <pre className="text-xs sm:text-sm whitespace-pre-wrap text-neutral-200">
                                    {explanation.definition}
                                </pre>
                            </div>
                        </section>
                    )}

                    {/* Explanation */}
                    {explanation.explanation && (
                        <section>
                            <h2 className="text-base sm:text-lg font-semibold mb-2 text-yellow-400">
                                Explanation
                            </h2>
                            <div className="bg-neutral-900 p-2 sm:p-3 rounded border-l-4 border-yellow-500">
                                <pre className="text-xs sm:text-sm whitespace-pre-wrap text-neutral-200">
                                    {explanation.explanation}
                                </pre>
                            </div>
                        </section>
                    )}

                    {/* Grammar */}
                    {explanation.grammar && (
                        <section>
                            <h2 className="text-base sm:text-lg font-semibold mb-2 text-purple-400">
                                Grammar
                            </h2>
                            <div className="bg-neutral-900 p-2 sm:p-3 rounded border-l-4 border-purple-500">
                                <pre className="text-xs sm:text-sm whitespace-pre-wrap text-neutral-200">
                                    {explanation.grammar}
                                </pre>
                            </div>
                        </section>
                    )}

                    {/* Facts */}
                    {explanation.facts && (
                        <section>
                            <h2 className="text-base sm:text-lg font-semibold mb-2 text-orange-400">
                                Interesting Facts
                            </h2>
                            <div className="bg-neutral-900 p-2 sm:p-3 rounded border-l-4 border-orange-500">
                                <pre className="text-xs sm:text-sm whitespace-pre-wrap text-neutral-200">
                                    {explanation.facts}
                                </pre>
                            </div>
                        </section>
                    )}

                    {/* Synonyms */}
                    {explanation.synonyms && (
                        <section>
                            <h2 className="text-base sm:text-lg font-semibold mb-2 text-cyan-400">
                                Synonyms & Similar Phrases
                            </h2>
                            <div className="bg-neutral-900 p-2 sm:p-3 rounded border-l-4 border-cyan-500">
                                <pre className="text-xs sm:text-sm whitespace-pre-wrap text-neutral-200">
                                    {explanation.synonyms}
                                </pre>
                            </div>
                        </section>
                    )}

                    {/* Alternatives */}
                    {explanation.alternatives && (
                        <section>
                            <h2 className="text-base sm:text-lg font-semibold mb-2 text-pink-400">
                                Alternative Translations
                            </h2>
                            <div className="bg-neutral-900 p-2 sm:p-3 rounded border-l-4 border-pink-500">
                                <pre className="text-xs sm:text-sm whitespace-pre-wrap text-neutral-200">
                                    {explanation.alternatives}
                                </pre>
                            </div>
                        </section>
                    )}
                </div>
            </article>
        </div>
    );
};
