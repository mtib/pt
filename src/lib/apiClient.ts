/**
 * API client for the Portuguese learning application.
 * 
 * This module provides functions for communicating with the backend API,
 * including caching, error handling, and proper TypeScript typing.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

import { Explanation, ExplainRequest, ApiErrorResponse, STORAGE_KEYS } from '@/types';
import { createSafeErrorMessage } from '@/utils/vocabulary';

/**
 * Custom error class for API-related errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Cache manager for explanation data
 */
class ExplanationCache {
  private static readonly CACHE_KEY = STORAGE_KEYS.EXPLANATIONS;
  private static readonly MAX_CACHE_SIZE = 1000; // Prevent unlimited cache growth
  private static readonly CACHE_EXPIRY_DAYS = 7; // Cache explanations for a week

  /**
   * Retrieves all cached explanations
   */
  private static getAllCached(): Record<string, { data: Explanation; timestamp: number }> {
    if (typeof window === 'undefined') return {};
    
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.warn('Failed to parse explanation cache:', error);
      return {};
    }
  }

  /**
   * Saves all cached explanations
   */
  private static saveAllCached(cache: Record<string, { data: Explanation; timestamp: number }>): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to save explanation cache:', error);
    }
  }

  /**
   * Checks if a cached entry is still valid
   */
  private static isValidEntry(entry: { data: Explanation; timestamp: number }): boolean {
    const now = Date.now();
    const expiryTime = this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // Convert to ms
    return now - entry.timestamp < expiryTime;
  }

  /**
   * Cleans up expired entries from the cache
   */
  private static cleanupExpiredEntries(cache: Record<string, { data: Explanation; timestamp: number }>): Record<string, { data: Explanation; timestamp: number }> {
    const cleaned: Record<string, { data: Explanation; timestamp: number }> = {};
    
    Object.entries(cache).forEach(([key, value]) => {
      if (this.isValidEntry(value)) {
        cleaned[key] = value;
      }
    });

    return cleaned;
  }

  /**
   * Limits cache size by removing oldest entries
   */
  private static limitCacheSize(cache: Record<string, { data: Explanation; timestamp: number }>): Record<string, { data: Explanation; timestamp: number }> {
    const entries = Object.entries(cache);
    
    if (entries.length <= this.MAX_CACHE_SIZE) {
      return cache;
    }

    // Sort by timestamp (oldest first) and keep only the most recent entries
    const sortedEntries = entries
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .slice(-this.MAX_CACHE_SIZE);

    return Object.fromEntries(sortedEntries);
  }

  /**
   * Gets a cached explanation if it exists and is valid
   */
  static get(word: string): Explanation | null {
    const cache = this.getAllCached();
    const entry = cache[word];
    
    if (!entry || !this.isValidEntry(entry)) {
      return null;
    }
    
    return entry.data;
  }

  /**
   * Saves an explanation to the cache
   */
  static set(word: string, explanation: Explanation): void {
    let cache = this.getAllCached();
    
    // Add new entry
    cache[word] = {
      data: explanation,
      timestamp: Date.now(),
    };

    // Clean up expired entries
    cache = this.cleanupExpiredEntries(cache);
    
    // Limit cache size
    cache = this.limitCacheSize(cache);
    
    this.saveAllCached(cache);
  }

  /**
   * Clears all cached explanations
   */
  static clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.CACHE_KEY);
    }
  }
}

/**
 * Fetches detailed explanation for a Portuguese word
 * 
 * @param word - Portuguese word to explain
 * @param englishReference - English reference for context
 * @param authKey - Authentication key for API access
 * @returns Promise resolving to explanation data
 * 
 * @example
 * ```typescript
 * try {
 *   const explanation = await fetchExplanation('casa', 'house', 'auth-key');
 *   console.log(explanation.definition);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error('API Error:', error.message);
 *   }
 * }
 * ```
 */
export async function fetchExplanation(
  word: string,
  englishReference: string,
  authKey: string
): Promise<Explanation> {
  // Validate inputs
  if (!word?.trim()) {
    throw new ApiError('Portuguese word is required');
  }
  
  if (!englishReference?.trim()) {
    throw new ApiError('English reference is required');
  }
  
  if (!authKey?.trim()) {
    throw new ApiError('Authentication key is required');
  }

  // Check cache first
  const cached = ExplanationCache.get(word);
  if (cached) {
    return cached;
  }

  const requestBody: ExplainRequest = {
    word: word.trim(),
    englishReference: englishReference.trim(),
  };

  let response: Response;
  
  try {
    response = await fetch('/api/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authKey}`,
      },
      body: JSON.stringify(requestBody),
      // Add timeout using AbortController
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        throw new ApiError('Request timed out. Please try again.');
      }
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new ApiError('Network error. Please check your connection.');
      }
    }
    throw new ApiError(createSafeErrorMessage(error));
  }

  // Handle HTTP errors
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    
    try {
      const errorData: ApiErrorResponse = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If we can't parse the error response, use the status-based message
      switch (response.status) {
        case 400:
          errorMessage = 'Invalid request. Please check your input.';
          break;
        case 401:
        case 403:
          errorMessage = 'Authentication failed. Please check your authorization key.';
          break;
        case 429:
          errorMessage = 'Too many requests. Please wait a moment and try again.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = 'An unexpected error occurred. Please try again.';
      }
    }
    
    throw new ApiError(errorMessage, response.status, response);
  }

  // Parse response
  let explanation: Explanation;
  
  try {
    explanation = await response.json();
    
    // Validate response structure
    if (!explanation || typeof explanation !== 'object') {
      throw new ApiError('Invalid response format from server');
    }
    
    // Ensure required fields are present
    const requiredFields = ['example', 'explanation', 'definition', 'grammar', 'facts', 'pronunciationIPA', 'pronunciationEnglish'];
    const missingFields = requiredFields.filter(field => !explanation[field as keyof Explanation]);
    
    if (missingFields.length > 0) {
      console.warn('Response missing fields:', missingFields);
    }
    
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to parse server response');
  }

  // Add word and reference to the explanation object
  explanation.word = word.trim();
  explanation.englishReference = englishReference.trim();

  // Cache the successful response
  ExplanationCache.set(word, explanation);

  return explanation;
}

/**
 * Clears all cached explanations
 * Useful for debugging or when user wants to refresh cached data
 */
export function clearExplanationCache(): void {
  ExplanationCache.clear();
}

/**
 * Gets the current cache size (number of cached explanations)
 */
export function getCacheSize(): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.EXPLANATIONS);
    if (!cached) return 0;
    
    const data = JSON.parse(cached);
    return Object.keys(data).length;
  } catch {
    return 0;
  }
}
