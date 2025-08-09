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
import { useLearningContext } from '@/contexts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
            <Card className={className}>
                <CardHeader>
                    <CardTitle>Loading Explanation</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Please wait...</p>
                </CardContent>
            </Card>
        );
    }

    if (!explanation) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle>Explanation</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Click &quot;Explain&quot; to get detailed information about a word.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>{explanation.word}</CardTitle>
                <p className="text-muted-foreground">{explanation.englishReference}</p>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="pronunciation">
                        <AccordionTrigger>Pronunciation</AccordionTrigger>
                        <AccordionContent>
                            <p><span className="font-mono">{explanation.pronunciationIPA}</span> ({explanation.pronunciationEnglish})</p>
                        </AccordionContent>
                    </AccordionItem>
                    {explanation.example && (
                        <AccordionItem value="example">
                            <AccordionTrigger>Example</AccordionTrigger>
                            <AccordionContent>
                                <pre className="text-sm whitespace-pre-wrap">{explanation.example}</pre>
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {explanation.definition && (
                        <AccordionItem value="definition">
                            <AccordionTrigger>Definition</AccordionTrigger>
                            <AccordionContent>
                                <pre className="text-sm whitespace-pre-wrap">{explanation.definition}</pre>
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {explanation.explanation && (
                        <AccordionItem value="explanation">
                            <AccordionTrigger>Explanation</AccordionTrigger>
                            <AccordionContent>
                                <pre className="text-sm whitespace-pre-wrap">{explanation.explanation}</pre>
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {explanation.grammar && (
                        <AccordionItem value="grammar">
                            <AccordionTrigger>Grammar</AccordionTrigger>
                            <AccordionContent>
                                <pre className="text-sm whitespace-pre-wrap">{explanation.grammar}</pre>
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {explanation.facts && (
                        <AccordionItem value="facts">
                            <AccordionTrigger>Interesting Facts</AccordionTrigger>
                            <AccordionContent>
                                <pre className="text-sm whitespace-pre-wrap">{explanation.facts}</pre>
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {explanation.synonyms && (
                        <AccordionItem value="synonyms">
                            <AccordionTrigger>Synonyms & Similar Phrases</AccordionTrigger>
                            <AccordionContent>
                                <pre className="text-sm whitespace-pre-wrap">{explanation.synonyms}</pre>
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {explanation.alternatives && (
                        <AccordionItem value="alternatives">
                            <AccordionTrigger>Alternative Translations</AccordionTrigger>
                            <AccordionContent>
                                <pre className="text-sm whitespace-pre-wrap">{explanation.alternatives}</pre>
                            </AccordionContent>
                        </AccordionItem>
                    )}
                </Accordion>
            </CardContent>
        </Card>
    );
};
