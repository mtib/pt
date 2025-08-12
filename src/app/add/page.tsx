"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { Navbar } from '@/components/ui/navbar';
import { CourseLanguages, COURSES, toFullLanguageName } from '@/types';
import { courseToValue, valueToCourse } from '@/lib/utils';
import { useLocalStorage } from '@/hooks';
import { cn } from '@/lib/utils';

export default function AddPage() {
    const { authToken } = useAuth();
    const { toast } = useToast();
    const [foreignPhrase, setForeignPhrase] = useState('');
    const [nativePhrase, setNativePhrase] = useState('');
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState<{ value: string; label: string; }[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [course, setCourse] = useLocalStorage<CourseLanguages>("edit-course", COURSES[0]);

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
        if (!foreignPhrase || !nativePhrase || !authToken) {
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
                        phrase1: foreignPhrase,
                        phrase2: nativePhrase,
                        language1: course.foreign,
                        language2: course.native,
                        similarity: 0.95,
                        categoryId: category ? parseInt(category) : undefined
                    }
                })
            });
            if (res.ok) {
                toast({
                    title: "Success",
                    description: "Phrase pair added successfully.",
                });
                setForeignPhrase('');
                setNativePhrase('');
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
            <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
                <Navbar />
                <div className="container mx-auto p-4">
                    <div className="max-w-2xl mx-auto space-y-6">
                        {/* Add Phrase Pair Section */}
                        <div className={cn(
                            'bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700'
                        )}>
                            <div className="p-6 pb-4">
                                <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                                    Add Phrase Pair
                                </h1>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                    Add new vocabulary pairs to the database
                                </p>
                            </div>
                            
                            <div className="px-6 pb-6">
                                <form onSubmit={handleSubmitPhrase} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                            Course
                                        </label>
                                        <select 
                                            name="course" 
                                            id="course-select" 
                                            value={courseToValue(course)} 
                                            onChange={(e) => setCourse(valueToCourse(e.target.value))}
                                            className={cn(
                                                'w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-neutral-900',
                                                'border-neutral-300 dark:border-neutral-600',
                                                'text-neutral-900 dark:text-neutral-100',
                                                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                                'transition-colors'
                                            )}
                                        >
                                            {
                                                COURSES.map((c) => (
                                                    <option key={courseToValue(c)} value={courseToValue(c)}>
                                                        {`${toFullLanguageName(c.native)} - ${toFullLanguageName(c.foreign)}`}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                            {toFullLanguageName(course.native)}
                                        </label>
                                        <input
                                            placeholder={`Enter ${toFullLanguageName(course.native)} phrase`}
                                            value={nativePhrase}
                                            onChange={(e) => setNativePhrase(e.target.value)}
                                            required
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

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                            {toFullLanguageName(course.foreign)}
                                        </label>
                                        <input
                                            placeholder={`Enter ${toFullLanguageName(course.foreign)} phrase`}
                                            value={foreignPhrase}
                                            onChange={(e) => setForeignPhrase(e.target.value)}
                                            required
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

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                            Category (Optional)
                                        </label>
                                        <select
                                            id="category"
                                            className={cn(
                                                'w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-neutral-900',
                                                'border-neutral-300 dark:border-neutral-600',
                                                'text-neutral-900 dark:text-neutral-100',
                                                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                                'transition-colors'
                                            )}
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
                                    </div>

                                    <Button type="submit" disabled={isLoading} className="w-full">
                                        {isLoading ? 'Adding...' : 'Add Phrase Pair'}
                                    </Button>
                                </form>
                            </div>
                        </div>

                        {/* Create New Category Section */}
                        <div className={cn(
                            'bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700'
                        )}>
                            <div className="p-6 pb-4">
                                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                                    Create New Category
                                </h2>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                    Create categories to organize your vocabulary pairs
                                </p>
                            </div>
                            
                            <div className="px-6 pb-6">
                                <form onSubmit={handleCreateCategory} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                            Category Name
                                        </label>
                                        <input
                                            placeholder="Enter category name"
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            required
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
                                    
                                    <Button type="submit" disabled={isLoading} className="w-full">
                                        {isLoading ? 'Creating...' : 'Create Category'}
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}
