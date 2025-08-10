/**
 * Utility functions for the Portuguese learning application.
 * 
 * This file contains utility functions for UI styling and other common operations.
 * Re-exports vocabulary-specific utilities from the utils directory.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

import { Phrase } from "@/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Re-export vocabulary utilities for easy access
export * from '@/utils/vocabulary';

/**
 * Combines class names using clsx and tailwind-merge for optimal CSS class handling.
 * This utility function is commonly used throughout the application for conditional styling.
 * 
 * @param inputs - Class values to combine
 * @returns Merged class string
 * 
 * @example
 * ```typescript
 * cn('text-blue-500', isActive && 'bg-blue-100', className)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function speakPortuguese(phrase: string) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = 'pt-PT';
    speechSynthesis.speak(utterance);
  }
}

export function speak(phrase: Phrase) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(phrase.phrase);
    utterance.lang = phrase.language === 'pt' ? 'pt-PT' :
      phrase.language === 'de' ? 'de-DE' : 'en-US';
    speechSynthesis.speak(utterance);
  }
}
