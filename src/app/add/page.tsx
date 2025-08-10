"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
// Replaced Radix Select with native select
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
    const [newCategory, setNewCategory] = useState('');
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
                    console.log("Fetched categories data:", data); // Debugging log
                    if (Array.isArray(data)) {
                        setCategories(data.map((c: { id: number; name: string; }) => ({ value: c.id.toString(), label: c.name })));
                    } else {
                        console.error("Unexpected data format:", data);
                    }
                } else {
                    console.error("Failed to fetch categories, status:", res.status);
                }
            } catch (error) {
                console.error("Failed to fetch categories", error);
            }
        }
        fetchCategories();
    }, [authToken]);

    const handleSubmitPhrase = async (e: React.FormEvent) => {
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
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    data: {
                        phrase1: portuguese,
                        phrase2: english,
                        language1: 'pt',
                        language2: 'en',
                        similarity: 1.0,
                        categoryId: category ? parseInt(category) : undefined
                    }
                })
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
                const error = await res.json();
                toast({
                    title: "Error",
                    description: error.message || "Failed to add phrase pair.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Failed to add phrase pair", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory || !authToken) {
            toast({
                title: "Error",
                description: "Category name is required.",
                variant: "destructive",
            });
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch('/api/vocabulary/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ name: newCategory })
            });
            if (res.ok) {
                const data = await res.json();
                setCategories((prev) => [...prev, { value: data.id.toString(), label: data.name }]);
                setNewCategory('');
                toast({
                    title: "Success",
                    description: "Category created successfully.",
                });
            } else {
                const error = await res.json();
                toast({
                    title: "Error",
                    description: error.message || "Failed to create category.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Failed to create category", error);
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
                        <form onSubmit={handleSubmitPhrase} className="space-y-4 flex flex-col">
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
                            <select
                                id="category"
                                className="w-full h-10 rounded-md border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <option value="">Select category...</option>
                                {categories.map((c) => (
                                    <option key={c.value} value={c.value}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Adding...' : 'Add Phrase Pair'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
                <Card className="max-w-2xl mx-auto mt-4">
                    <CardHeader>
                        <CardTitle>Create New Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateCategory} className="space-y-4 flex flex-col">
                            <Input
                                placeholder="Category Name"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                required
                            />
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Creating...' : 'Create Category'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthGuard>
    );
}
