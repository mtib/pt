"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { debounce } from 'lodash';
import AuthGuard from '@/components/AuthGuard';
import { Navbar } from '@/components/ui/navbar';
import { Phrase } from '@/types';
import { cn } from '@/lib/utils';

export default function RemovePage() {
    const { authToken } = useAuth();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Record<string, { fromPhrase: Phrase; toPhrase: Phrase; category: string | null; }[]>>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const debouncedSearch = debounce(async (query: string) => {
            if (query.length < 2 || !authToken) {
                setSearchResults({});
                return;
            }
            setIsLoading(true);
            try {
                const res = await fetch(`/api/vocabulary/search?q=${query}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                if (res.ok) {
                    const data = (await res.json()) as typeof searchResults;
                    // Filter the ones that exist in the other direction:
                    Object.keys(data).forEach(category => {
                        data[category] = data[category].filter(pair => {
                            return pair.fromPhrase.id < pair.toPhrase.id;
                        });
                    });
                    setSearchResults(data);
                } else {
                    setSearchResults({});
                }
            } catch (error) {
                console.error("Failed to search phrases", error);
                setSearchResults({});
            } finally {
                setIsLoading(false);
            }
        }, 300);

        debouncedSearch(searchQuery);
        return () => debouncedSearch.cancel();
    }, [searchQuery, authToken]);

    const handleDeletePair = async (phrase1Id: number, phrase2Id: number) => {
        if (!authToken) return;
        try {
            const res = await fetch(`/api/vocabulary/deletePair?phrase1=${phrase1Id}&phrase2=${phrase2Id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
            });
            if (res.ok) {
                toast({
                    title: "Success",
                    description: "Phrase pair deleted successfully.",
                });
                setSearchResults((prev) => {
                    const updated = { ...prev };
                    Object.keys(updated).forEach(category => {
                        updated[category] = updated[category].filter(pair =>
                            !(pair.fromPhrase.id === phrase1Id && pair.toPhrase.id === phrase2Id)
                            && !(pair.fromPhrase.id === phrase2Id && pair.toPhrase.id === phrase1Id)
                        );
                    });
                    return updated;
                });
            } else {
                toast({
                    title: "Error",
                    description: "Failed to delete phrase pair.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Failed to delete phrase pair", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        }
    };

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
                                    Remove Phrase Pairs
                                </h1>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                    Search and remove vocabulary pairs from the database
                                </p>
                            </div>

                            <div className="px-6 pb-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        Search Phrases
                                    </label>
                                    <input
                                        id="search"
                                        placeholder="Search for a phrase..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={cn(
                                            'w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-neutral-900',
                                            'border-neutral-300 dark:border-neutral-600',
                                            'text-neutral-900 dark:text-neutral-100',
                                            'placeholder-neutral-500 dark:placeholder-neutral-400',
                                            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                            'transition-colors'
                                        )}
                                    />
                                </div>

                                {isLoading && (
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                        Loading...
                                    </div>
                                )}

                                {Object.keys(searchResults).length > 0 && (
                                    <div className="space-y-4">
                                        {Object.entries(searchResults).map(([category, pairs]) => (
                                            <div key={category} className="space-y-2">
                                                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                                                    {category || 'Uncategorized'}
                                                </h2>
                                                <div className="space-y-2">
                                                    {(Array.isArray(pairs) ? pairs : []).map(({ fromPhrase, toPhrase }) => (
                                                        <div key={`${fromPhrase.id}-${toPhrase.id}`} className="flex flex-row items-center justify-between p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900">
                                                            <div className='flex flex-row justify-between flex-grow mr-4'>
                                                                <span className="text-sm text-neutral-900 dark:text-neutral-100">
                                                                    {fromPhrase.phrase}
                                                                    <span className='font-light ml-1 text-neutral-500 dark:text-neutral-400'>
                                                                        {fromPhrase.language}
                                                                    </span>
                                                                </span>
                                                                <span className="text-sm text-neutral-900 dark:text-neutral-100">
                                                                    {toPhrase.phrase}
                                                                    <span className='font-light ml-1 text-neutral-500 dark:text-neutral-400'>
                                                                        {toPhrase.language}
                                                                    </span>
                                                                </span>
                                                            </div>
                                                            <Button variant="destructive" size="sm" onClick={() => handleDeletePair(fromPhrase.id, toPhrase.id)}>
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
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
