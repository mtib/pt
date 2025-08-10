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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';

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
          <LoadingSpinner size="lg" color="neutral" text="Loading vocabulary..." />
        </div>
      </div>
    );
  }

  // Show error state if vocabulary failed to load
  if (error && !isInitialized) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-400">Error Loading App</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-neutral-300 mb-4">{error}</p>
            <Button onClick={loadNewWord}>Try Again</Button>
          </CardContent>
        </Card>
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
        <div className="fixed top-4 left-4 right-4 lg:right-4 lg:left-auto lg:max-w-md z-50">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-red-300">{error}</p>
              <Button
                onClick={dismissError}
                variant="link"
                className="mt-2 h-auto p-0 text-red-200"
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
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
