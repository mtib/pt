"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { DbPhrase } from '@/lib/database/config';
import { debounce } from 'lodash';
import AuthGuard from '@/components/AuthGuard';
import { Navbar } from '@/components/ui/navbar';

export default function RemovePage() {
    const { authToken } = useAuth();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Record<string, { fromPhrase: DbPhrase; toPhrase: DbPhrase; }[]>>({});
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
                    const data = await res.json();
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
                headers: { 'Authorization': `Bearer ${authToken}` },
            });

            if (res.ok) {
                // Update the state locally by removing both a->b and b->a pairs
                setSearchResults((prevResults) => {
                    const updatedResults = { ...prevResults };
                    for (const category in updatedResults) {
                        updatedResults[category] = updatedResults[category].filter(
                            ({ fromPhrase, toPhrase }) =>
                                !(
                                    (fromPhrase.id === phrase1Id && toPhrase.id === phrase2Id) ||
                                    (fromPhrase.id === phrase2Id && toPhrase.id === phrase1Id)
                                )
                        );

                        // Remove empty categories
                        if (updatedResults[category].length === 0) {
                            delete updatedResults[category];
                        }
                    }
                    return updatedResults;
                });

                toast({
                    title: "Success",
                    description: "Phrase pair deleted successfully.",
                });
            } else {
                const errorData = await res.json();
                toast({
                    title: "Error",
                    description: `Failed to delete phrase pair: ${errorData.message || 'Unknown error'}`,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error handling delete pair response:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        }
    };

    return (
        <AuthGuard>
            <div className="container mx-auto p-4">
                <Navbar />
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>Remove Phrase Pairs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Input
                                id="search"
                                placeholder="Search for a phrase..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-grow"
                            />
                        </div>
                        {isLoading && <p>Loading...</p>}
                        <div className="space-y-4">
                            {Object.entries(searchResults).map(([category, pairs]) => (
                                <div key={category} className="space-y-2">
                                    <h2 className="text-lg font-bold">{category || 'Uncategorized'}</h2>
                                    {(Array.isArray(pairs) ? pairs : []).map(({ fromPhrase, toPhrase }) => (
                                        <div key={`${fromPhrase.id}-${toPhrase.id}`} className="flex items-center justify-between p-2 border rounded">
                                            <span>{fromPhrase.phrase} ({fromPhrase.language}) ↔ {toPhrase.phrase} ({toPhrase.language})</span>
                                            <Button variant="destructive" size="sm" onClick={() => handleDeletePair(fromPhrase.id, toPhrase.id)}>
                                                Delete
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AuthGuard>
    );
}
