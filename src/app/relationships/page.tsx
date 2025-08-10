"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AuthGuard from '@/components/AuthGuard';
import { linkBase, Navbar } from '@/components/ui/navbar';
import { Phrase, PhraseWithSimilarityAndMetadata, SupportedLanguage, toFullLanguageName } from '@/types';
import { Input } from '@/components/ui/input';
import _ from 'lodash';
import { normalizeText } from '@/utils/vocabulary';
import { cn } from '@/lib/utils';

export default function OrphanPage() {
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
            <div className="container mx-auto p-4">
                <Navbar />
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>Relationship explorer</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input
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
                        />
                        <div className="relative">
                            {isSelectorOpen && (
                                <div className='max-h-[400px] overflow-y-scroll absolute dark:bg-black bg-white rounded border border-neutral-300 dark:border-neutral-700'>
                                    {phraseOptions.map((phrase) => (
                                        <div
                                            key={phrase.id}
                                            onClick={(event) => {
                                                setSelectedPhrase(phrase);
                                                setSearchValue(phrase.phrase);
                                                setSelectorOpen(false);
                                                event.preventDefault();
                                            }}
                                            className='hover:dark:bg-neutral-700 hover:bg-neutral-200 cursor-pointer flex gap-6 flex-row justify-between border-t first:border-t-0 border-neutral-300 dark:border-neutral-700 pl-3 pr-6 py-1'>
                                            <span>
                                                {phrase.phrase}
                                            </span>
                                            <span className='font-light ml-1 text-neutral-500 dark:text-neutral-400'>
                                                {phrase.language}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {phraseData && (
                            <div className='mt-4'>
                                <div className='text-lg font-semibold mb-2'>Related Phrases</div>
                                {_(phraseData.relatedPhrases).groupBy(p => p.language).map((values, group) => (
                                    <div key={group}>
                                        <div className='text-md font-semibold mt-3 mb-1'>{toFullLanguageName(group as SupportedLanguage)}</div>
                                        {values.map((relatedPhrase) => (
                                            <div key={relatedPhrase.id} className='flex flex-row gap-2'>
                                                <span className={cn('cursor-pointer', linkBase)} onClick={() => { setSelectedPhrase(relatedPhrase); setSearchValue(relatedPhrase.phrase); setPhraseOptions([]); }}>{relatedPhrase.phrase}</span>
                                                {relatedPhrase.category && <span className='font-light text-neutral-500 dark:text-neutral-400'>{relatedPhrase.category}</span>}
                                            </div>))}
                                    </div>
                                )).value()}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthGuard>
    );
}
