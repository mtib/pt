/**
 * Reusable toggle switch component with text labels.
 * 
 * Provides a sleek toggle switch with customizable labels and states.
 * Includes smooth animations and proper accessibility support.
 * 
 * @author Portuguese Learning App
 * @version 2.0.0
 */

import React from 'react';
import { cn } from '@/lib/utils';

export type ToggleProps = {
    checked: boolean;
    onToggle: () => void;
    label: string;
    description?: string;
    disabled?: boolean;
    className?: string;
};

const Toggle: React.FC<ToggleProps> = ({
    checked,
    onToggle,
    label,
    description,
    disabled = false,
    className,
}) => {
    return (
        <div className={cn('flex items-center justify-between', className)}>
            <div className="flex-1 pr-4">
                <label 
                    htmlFor={`toggle-${label}`}
                    className={cn(
                        'block text-sm font-medium cursor-pointer',
                        disabled ? 'text-gray-400 cursor-not-allowed' : 'text-neutral-900 dark:text-neutral-100'
                    )}
                >
                    {label}
                </label>
                {description && (
                    <p className={cn(
                        'text-xs mt-1',
                        disabled ? 'text-gray-400' : 'text-neutral-600 dark:text-neutral-400'
                    )}>
                        {description}
                    </p>
                )}
            </div>
            
            <button
                id={`toggle-${label}`}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-labelledby={`toggle-${label}`}
                disabled={disabled}
                onClick={onToggle}
                className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-800',
                    checked 
                        ? 'bg-blue-600' 
                        : 'bg-neutral-300 dark:bg-neutral-600',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                <span
                    className={cn(
                        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                        checked ? 'translate-x-4' : 'translate-x-0.5'
                    )}
                    style={{ marginTop: '2px' }}
                />
            </button>
        </div>
    );
};

export default Toggle;