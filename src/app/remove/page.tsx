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

export default function RemovePage() {
    const { authToken } = useAuth();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<DbPhrase[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const debouncedSearch = debounce(async (query: string) => {
            if (query.length < 2 || !authToken) {
                setSearchResults([]);
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
                    setSearchResults([]);
                }
            } catch (error) {
                console.error("Failed to search phrases", error);
                setSearchResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        debouncedSearch(searchQuery);
        return () => debouncedSearch.cancel();
    }, [searchQuery, authToken]);

    const handleDelete = async (phraseId: number) => {
        if (!authToken) return;
        try {
            const res = await fetch(`/api/vocabulary/delete?id=${phraseId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` },
            });

            if (res.ok) {
                toast({
                    title: "Success",
                    description: "Phrase deleted successfully.",
                });
                setSearchResults(prev => prev.filter(p => p.id !== phraseId));
            } else {
                const errorData = await res.json();
                toast({
                    title: "Error",
                    description: `Failed to delete phrase: ${errorData.message || 'Unknown error'}`,
                    variant: "destructive",
                });
            }
        } catch {
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
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>Remove Phrases</CardTitle>
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
                        <div className="space-y-2">
                            {searchResults.map((phrase) => (
                                <div key={phrase.id} className="flex items-center justify-between p-2 border rounded">
                                    <span>{phrase.phrase} ({phrase.language})</span>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(phrase.id)}>
                                        Delete
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AuthGuard>
    );
}
