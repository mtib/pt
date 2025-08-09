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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { QuizInterface, ExplanationPanel, ErrorBoundary } from '@/components';
import { LearningProvider, useLearningContext } from '@/contexts';
import { ModeToggle } from '@/components/mode-toggle';

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
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Loading</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Loading vocabulary...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state if vocabulary failed to load
  if (error && !isInitialized) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading App</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadNewWord}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground flex flex-col lg:flex-row w-full h-screen">
      <div className="absolute top-4 right-4 z-10">
        <ModeToggle />
      </div>
      {/* Main Quiz Interface */}
      <div className="flex-1 flex items-center justify-center">
        <QuizInterface />
      </div>

      {/* Explanation Panel */}
      <div className="lg:w-[400px] lg:border-l border-border lg:h-screen lg:overflow-y-auto p-4">
        <ExplanationPanel />
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="fixed top-4 left-4 right-4 lg:right-4 lg:left-auto lg:max-w-md z-50">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button
              onClick={dismissError}
              variant="link"
              className="mt-2 text-xs text-destructive-foreground hover:text-destructive-foreground/80"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
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
