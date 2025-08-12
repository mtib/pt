"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { linkBase, Navbar } from '@/components/ui/navbar';
import { Phrase, PhraseWithSimilarityAndMetadata, SupportedLanguage, toFullLanguageName } from '@/types';
import _ from 'lodash';
import { normalizeText } from '@/utils/vocabulary';
import { cn } from '@/lib/utils';

export default function RelationshipsPage() {
    const { authToken } = useAuth();
    const [searchValue, setSearchValue] = useState('');
    const [phraseOptions, setPhraseOptions] = useState<{ id: number, phrase: string; language: SupportedLanguage; }[]>([]);
    const [selectedPhrase, setSelectedPhrase] = useState<Phrase | null>(null);
    const [phraseData, setPhraseData] = useState<{
        sourcePhrase: Phrase,
        relatedPhrases: PhraseWithSimilarityAndMetadata[];
    } | null>(null);

    const [isSelectorOpen, setSelectorOpen] = useState(false);

    useEffect(() => {
        setSelectorOpen(!!phraseOptions);
    }, [phraseOptions]);

    useEffect(() => {
        async function fetchMatchingWords() {
            if (!authToken) {
                return;
            };
            if (!searchValue) {
                setPhraseOptions([]);
                return;
            }
            if (searchValue == selectedPhrase?.phrase) {
                return;
            }
            try {
                const res = await fetch(`/api/vocabulary/search?q=${searchValue}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setPhraseOptions(
                        _(Object.values(data) as { fromPhrase: Phrase, toPhrase: Phrase; }[])
                            .flatten()
                            .map(pair => ({ id: pair.fromPhrase.id, phrase: pair.fromPhrase.phrase, language: pair.fromPhrase.language }))
                            .uniqBy('id')
                            .filter(word => normalizeText(word.phrase).includes(normalizeText(searchValue)))
                            .value()
                    );
                }
            } catch (error) {
                console.error("Failed to fetch matching phrases", error);
                setPhraseOptions([]);
            }
        }
        fetchMatchingWords();
    }, [authToken, searchValue, selectedPhrase]);

    useEffect(() => {
        if (!selectedPhrase) {
            return;
        }
        setPhraseData(null);
        (async () => {
            const res = await fetch(`/api/vocabulary/phrase/${selectedPhrase.id}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPhraseData(data);
            }
        })();
    }, [selectedPhrase, authToken]);


    return (
        <AuthGuard>
            <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
                <Navbar />
                <div className="container mx-auto p-4">
                    <div className="max-w-2xl mx-auto">
                        <div className={cn(
                            'bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700'
                        )}>
                            <div className="p-6 pb-4">
                                <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                                    Relationship Explorer
                                </h1>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                    Explore connections between phrases and their translations
                                </p>
                            </div>

                            <div className="px-6 pb-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        Search Phrase
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            onChange={(e) => setSearchValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                // On return take top most option
                                                if (e.code === 'Enter' && phraseOptions.length > 0) {
                                                    setSelectedPhrase(phraseOptions[0]);
                                                    setSearchValue(phraseOptions[0].phrase);
                                                    setSelectorOpen(false);
                                                }
                                            }}
                                            value={searchValue}
                                            placeholder="Type to search for a phrase..."
                                            className={cn(
                                                'w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-neutral-900',
                                                'border-neutral-300 dark:border-neutral-600',
                                                'text-neutral-900 dark:text-neutral-100',
                                                'placeholder-neutral-500 dark:placeholder-neutral-400',
                                                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                                'transition-colors'
                                            )}
                                        />
                                        {isSelectorOpen && (
                                            <div className={cn(
                                                'absolute z-10 w-full mt-1 max-h-[400px] overflow-y-auto',
                                                'bg-white dark:bg-neutral-900 rounded-md border border-neutral-300 dark:border-neutral-600',
                                                'shadow-lg',
                                                phraseOptions.length === 0 && 'hidden'
                                            )}>
                                                {phraseOptions.map((phrase) => (
                                                    <div
                                                        key={phrase.id}
                                                        onClick={(event) => {
                                                            setSelectedPhrase(phrase);
                                                            setSearchValue(phrase.phrase);
                                                            setSelectorOpen(false);
                                                            event.preventDefault();
                                                        }}
                                                        className={cn(
                                                            'cursor-pointer flex justify-between items-center px-3 py-2',
                                                            'border-t first:border-t-0 border-neutral-200 dark:border-neutral-700',
                                                            'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                                                            'text-neutral-900 dark:text-neutral-100'
                                                        )}
                                                    >
                                                        <span>{phrase.phrase}</span>
                                                        <span className='text-xs font-light text-neutral-500 dark:text-neutral-400'>
                                                            {phrase.language}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {phraseData && (
                                    <div className="space-y-4">
                                        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                                            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                                                Related Phrases
                                            </h2>
                                            <div className="space-y-3">
                                                {_(phraseData.relatedPhrases).groupBy(p => p.language).map((values, group) => (
                                                    <div key={group} className="space-y-2">
                                                        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                                            {toFullLanguageName(group as SupportedLanguage)}
                                                        </h3>
                                                        <div className="space-y-1">
                                                            {values.map((relatedPhrase) => (
                                                                <div key={relatedPhrase.id} className="flex items-center gap-2 p-2 rounded-md bg-neutral-50 dark:bg-neutral-900">
                                                                    <span
                                                                        className={cn('cursor-pointer text-blue-600 dark:text-blue-400 hover:underline', linkBase)}
                                                                        onClick={() => {
                                                                            setSelectedPhrase(relatedPhrase);
                                                                            setSearchValue(relatedPhrase.phrase);
                                                                            setPhraseOptions([]);
                                                                        }}
                                                                    >
                                                                        {relatedPhrase.phrase}
                                                                    </span>
                                                                    {relatedPhrase.category && (
                                                                        <span className='text-xs px-2 py-1 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'>
                                                                            {relatedPhrase.category}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )).value()}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}
