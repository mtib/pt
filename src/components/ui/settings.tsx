/**
 * Settings panel component for application configuration.
 * 
 * Provides a sleek, minimal settings interface with:
 * - Theme toggle (Dark/Light mode)
 * - Authentication token input
 * - Modal-style overlay with backdrop
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Toggle from './toggle';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

export type SettingsProps = {
    isOpen: boolean;
    onClose: () => void;
};

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
    const { resolvedTheme, toggleTheme } = useTheme();
    const { authToken, setAuthToken } = useAuth();
    const [localAuthToken, setLocalAuthToken] = useState(authToken || '');

    const isDarkMode = resolvedTheme === 'dark';

    // Update local state when auth token changes
    useEffect(() => {
        setLocalAuthToken(authToken || '');
    }, [authToken]);

    // Handle auth token input changes
    const handleAuthTokenChange = (value: string) => {
        setLocalAuthToken(value);
        setAuthToken(value.trim() || null);
    };

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={onClose}
                aria-hidden="true"
            />
            
            {/* Settings Panel */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className={cn(
                    'relative w-full max-w-md bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700',
                    'animate-in fade-in-0 zoom-in-95 duration-200'
                )}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 pb-4">
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                            Settings
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                            aria-label="Close settings"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    
                    {/* Content */}
                    <div className="px-6 pb-6 space-y-6">
                        {/* Theme Toggle */}
                        <Toggle
                            checked={isDarkMode}
                            onToggle={toggleTheme}
                            label="Dark Mode"
                            description="Use dark theme for better visibility in low light"
                        />
                        
                        {/* Divider */}
                        <div className="border-t border-neutral-200 dark:border-neutral-700" />
                        
                        {/* Auth Token Input */}
                        <div className="space-y-2">
                            <label 
                                htmlFor="auth-token" 
                                className="block text-sm font-medium text-neutral-900 dark:text-neutral-100"
                            >
                                Authentication Token
                            </label>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                Enter your token to access AI explanations and advanced features
                            </p>
                            <input
                                id="auth-token"
                                type="password"
                                value={localAuthToken}
                                onChange={(e) => handleAuthTokenChange(e.target.value)}
                                placeholder="Enter your authentication token"
                                className={cn(
                                    'w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-neutral-900',
                                    'border-neutral-300 dark:border-neutral-600',
                                    'text-neutral-900 dark:text-neutral-100',
                                    'placeholder-neutral-500 dark:placeholder-neutral-400',
                                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                    'transition-colors'
                                )}
                            />
                            {authToken && (
                                <p className="text-xs text-green-600 dark:text-green-400">
                                    ✓ Authentication token configured
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Settings;