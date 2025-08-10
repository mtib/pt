"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Combobox } from "@/components/ui/combobox";
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { Navbar } from '@/components/ui/navbar';

export default function AddPage() {
    const { authToken } = useAuth();
    const { toast } = useToast();
    const [portuguese, setPortuguese] = useState('');
    const [english, setEnglish] = useState('');
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState<{ value: string; label: string; }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function fetchCategories() {
            if (!authToken) return;
            try {
                const res = await fetch('/api/vocabulary/categories', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCategories(data.map((c: string) => ({ value: c, label: c })));
                }
            } catch (error) {
                console.error("Failed to fetch categories", error);
            }
        }
        fetchCategories();
    }, [authToken]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!portuguese || !english || !authToken) {
            toast({
                title: "Error",
                description: "Portuguese and English phrases are required.",
                variant: "destructive",
            });
            return;
        }
        setIsLoading(true);

        try {
            const res = await fetch('/api/vocabulary/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    data: {
                        phrase1: portuguese,
                        language1: 'pt',
                        phrase2: english,
                        language2: 'en',
                        similarity: 0.95, // High similarity for manual additions
                        category1: category || undefined,
                        category2: category || undefined,
                    }
                }),
            });

            if (res.ok) {
                toast({
                    title: "Success",
                    description: "Phrase pair added successfully.",
                });
                setPortuguese('');
                setEnglish('');
                setCategory('');
            } else {
                const errorData = await res.json();
                toast({
                    title: "Error",
                    description: `Failed to add phrase pair: ${errorData.message || 'Unknown error'}`,
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthGuard>
            <div className="container mx-auto p-4">
                <Navbar />
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>Add Phrase Pair</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                placeholder="Portuguese"
                                value={portuguese}
                                onChange={(e) => setPortuguese(e.target.value)}
                                required
                            />
                            <Input
                                placeholder="English"
                                value={english}
                                onChange={(e) => setEnglish(e.target.value)}
                                required
                            />
                            <Combobox
                                items={categories}
                                value={category}
                                onChange={setCategory}
                                placeholder="Select or create category..."
                            />
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Adding...' : 'Add Phrase Pair'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthGuard>
    );
}
