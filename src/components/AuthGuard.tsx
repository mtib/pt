"use client";

import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

interface AuthGuardProps {
    children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
    const { authToken, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (!authToken) {
        return <p className="p-4">Please authenticate to use this page.</p>;
    }

    return <>{children}</>;
}
