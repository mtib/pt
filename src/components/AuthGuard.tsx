"use client";

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const AuthGuard: React.FC<{ children: React.ReactNode; }> = ({ children }) => {
    const { authToken, isLoading } = useAuth();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!authToken) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default AuthGuard;
