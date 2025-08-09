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
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const colorClasses = {
    primary: 'border-blue-500 border-t-transparent',
    white: 'border-white border-t-transparent',
    neutral: 'border-neutral-400 border-t-transparent',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <div
          className={`
            ${sizeClasses[size]} 
            ${colorClasses[color]}
            border-2 rounded-full animate-spin
          `}
          role="status"
          aria-label="Loading"
        />
        {text && (
          <span className="text-sm text-neutral-400" aria-live="polite">
            {text}
          </span>
        )}
      </div>
    </div>
  );
};
