"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import AuthGuard from '@/components/AuthGuard';
import { Navbar } from '@/components/ui/navbar';
import { Phrase } from '@/types';
import { cn } from '@/lib/utils';

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
            <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
                <Navbar />
                <div className="container mx-auto p-4">
                    <div className="max-w-2xl mx-auto">
                        <div className={cn(
                            'bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700'
                        )}>
                            <div className="p-6 pb-4">
                                <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                                    Orphan Phrases
                                </h1>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                    These phrases do not have a translation in the other language
                                </p>
                            </div>
                            
                            <div className="px-6 pb-6">
                                {isLoading ? (
                                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                        Loading...
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            {orphans.map((phrase) => (
                                                <div key={phrase.id} className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900">
                                                    <span className="text-sm text-neutral-900 dark:text-neutral-100">
                                                        {phrase.phrase}
                                                        <span className='font-light ml-1 text-neutral-500 dark:text-neutral-400'>
                                                            {phrase.language}
                                                        </span>
                                                    </span>
                                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(phrase.id)}>
                                                        Delete
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        {orphans.length === 0 && (
                                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                                No orphan phrases found.
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}
