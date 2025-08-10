/**
 * Loading spinner component for the Portuguese learning application.
 * 
 * A reusable component that displays a loading spinner with customizable
 * size, color, and optional text message.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
    /** Size of the spinner */
    size?: 'sm' | 'md' | 'lg';
    /** Color theme of the spinner */
    color?: 'primary' | 'white' | 'neutral';
    /** Optional loading text */
    text?: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Loading spinner component with customizable appearance
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  text,
  className = '',
}) => {
  const sizeMap: Record<NonNullable<LoadingSpinnerProps['size']>, number> = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const colorClass: Record<NonNullable<LoadingSpinnerProps['color']>, string> = {
    primary: 'text-blue-500',
    white: 'text-white',
    neutral: 'text-neutral-400',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="flex flex-col items-center gap-2">
        <Loader2
          className={cn('animate-spin', colorClass[color])}
          size={sizeMap[size]}
          aria-label="Loading"
          role="status"
        />
        {text && (
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {text}
          </span>
        )}
      </div>
    </div>
  );
};
