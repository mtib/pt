"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import AuthGuard from '@/components/AuthGuard';
import { Navbar } from '@/components/ui/navbar';
import { Phrase } from '@/types';

export default function OrphanPage() {
    const { authToken } = useAuth();
    const { toast } = useToast();
    const [orphans, setOrphans] = useState<Phrase[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchOrphans() {
            if (!authToken) {
                setIsLoading(false);
                return;
            };
            try {
                const res = await fetch('/api/vocabulary/orphans', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setOrphans(data);
                }
            } catch (error) {
                console.error("Failed to fetch orphan phrases", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchOrphans();
    }, [authToken]);

    const handleDelete = async (phraseId: number) => {
        if (!authToken) return;
        try {
            const res = await fetch(`/api/vocabulary/phrase/${phraseId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` },
            });

            if (res.ok) {
                toast({
                    title: "Success",
                    description: "Phrase deleted successfully.",
                });
                setOrphans(prev => prev.filter(p => p.id !== phraseId));
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
                <Navbar />
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>Orphan Phrases</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p>Loading...</p>
                        ) : (
                            <>
                                <p className="mb-4">These phrases do not have a translation in the other language.</p>
                                <div className="space-y-2">
                                    {orphans.map((phrase) => (
                                        <div key={phrase.id} className="flex items-center justify-between p-2 border rounded border-neutral-200 dark:border-neutral-800">
                                            <span>{phrase.phrase} ({phrase.language})</span>
                                            <Button variant="destructive" size="sm" onClick={() => handleDelete(phrase.id)}>
                                                Delete
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                {orphans.length === 0 && <p>No orphan phrases found.</p>}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthGuard>
    );
}
