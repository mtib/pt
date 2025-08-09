"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
    authToken: string | null;
    setAuthToken: (token: string | null) => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode; }) {
    const [authToken, setAuthTokenState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const keyFromHash = window.location.hash.match(/#auth_([a-zA-Z0-9_-]+)/);
            if (keyFromHash) {
                const key = keyFromHash[1];
                localStorage.setItem('auth', key);
                setAuthTokenState(key);
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            } else {
                const storedToken = localStorage.getItem('auth');
                if (storedToken) {
                    setAuthTokenState(storedToken);
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const setAuthToken = (token: string | null) => {
        if (token) {
            localStorage.setItem('auth', token);
        } else {
            localStorage.removeItem('auth');
        }
        setAuthTokenState(token);
    };

    return (
        <AuthContext.Provider value={{ authToken, setAuthToken, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
