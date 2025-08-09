/**
 * Main page component for the Portuguese learning application.
 * 
 * This is the primary interface where users practice Portuguese vocabulary
 * through an interactive quiz system with XP tracking, explanations,
 * and speech synthesis.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { QuizInterface, ExplanationPanel, ErrorBoundary } from '@/components';
import { LearningProvider, useLearningContext } from '@/contexts';

/**
 * Inner learning application component that uses the context
 */
function LearnPortugueseAppInner(): React.JSX.Element {
  const {
    isInitialized,
    error,
    loadNewWord,
    dismissError
  } = useLearningContext();

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Loading vocabulary...</p>
        </div>
      </div>
    );
  }

  // Show error state if vocabulary failed to load
  if (error && !isInitialized) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center">
        <div className="max-w-md p-6 bg-neutral-800 rounded-lg border border-neutral-700 text-center">
          <h2 className="text-xl font-bold text-red-400 mb-4">Error Loading App</h2>
          <p className="text-neutral-300 mb-4">{error}</p>
          <button
            onClick={loadNewWord}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 text-neutral-100 flex flex-col lg:flex-row w-full h-screen">
      {/* Main Quiz Interface */}
      <div className="flex-1 flex">
        <QuizInterface />
      </div>

      {/* Explanation Panel */}
      <div className="lg:min-w-[400px] lg:border-l border-neutral-700 font-mono lg:h-screen lg:overflow-hidden">
        <ExplanationPanel className="lg:border-t-0 border-t border-neutral-700 h-full" />
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed top-4 left-4 right-4 lg:right-4 lg:left-auto lg:max-w-md p-4 bg-red-900/90 border border-red-700 rounded-lg z-50">
          <p className="text-red-100 text-sm">{error}</p>
          <button
            onClick={dismissError}
            className="mt-2 text-xs text-red-300 hover:text-red-100 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Main learning application component
 */
function LearnPortugueseApp(): React.JSX.Element {
  return (
    <LearningProvider>
      <LearnPortugueseAppInner />
    </LearningProvider>
  );
}

/**
 * Main page component wrapped with error boundary
 */
export default function Home(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <LearnPortugueseApp />
    </ErrorBoundary>
  );
}
