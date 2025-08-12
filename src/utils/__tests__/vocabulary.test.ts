import { describe, test, expect } from '@jest/globals';
import { normalizeText, calculateXP, createSafeErrorMessage } from '../vocabulary';

describe('normalizeText', () => {
  test('removes basic apostrophes', () => {
    expect(normalizeText("don't")).toBe('dont');
    expect(normalizeText("can't")).toBe('cant');
  });

  test('removes various types of apostrophes and quotes', () => {
    // Standard apostrophe and single quotes
    expect(normalizeText("don't")).toBe('dont');
    expect(normalizeText("don't")).toBe('dont'); // left single quote
    expect(normalizeText("don't")).toBe('dont'); // right single quote

    // Low quotation marks
    expect(normalizeText("don‚t")).toBe('dont'); // single low-9 quotation mark
    expect(normalizeText("don‛t")).toBe('dont'); // single high-reversed-9 quotation mark

    // Double quotes
    expect(normalizeText('say "hello"')).toBe('sayhello'); // left and right double quotes
    expect(normalizeText('say „hello"')).toBe('sayhello'); // double low-9 quotation mark
    expect(normalizeText('say ‟hello"')).toBe('sayhello'); // double high-reversed-9 quotation mark

    // Grave and acute accents
    expect(normalizeText("don`t")).toBe('dont'); // grave accent
    expect(normalizeText("don´t")).toBe('dont'); // acute accent

    // Modifier letters
    expect(normalizeText("donʹt")).toBe('dont'); // modifier letter prime
    expect(normalizeText("donʺt")).toBe('dont'); // modifier letter double prime
    expect(normalizeText("donˈt")).toBe('dont'); // modifier letter vertical line (primary stress)
    expect(normalizeText("donˊt")).toBe('dont'); // modifier letter acute accent
    expect(normalizeText("donˋt")).toBe('dont'); // modifier letter grave accent

    // Real world examples
    expect(normalizeText("won’t")).toBe('wont');

    // Hyphen
    expect(normalizeText("twenty-one")).toBe('twentyone');
  });

  test('removes accents and diacritics', () => {
    expect(normalizeText("São Paulo")).toBe('saopaulo');
    expect(normalizeText("não fala")).toBe('naofala');
    expect(normalizeText("café")).toBe('cafe');
    expect(normalizeText("naïve")).toBe('naive');
  });

  test('removes spaces and converts to lowercase', () => {
    expect(normalizeText("Hello World")).toBe('helloworld');
    expect(normalizeText("  MULTIPLE   SPACES  ")).toBe('multiplespaces');
    expect(normalizeText("Mixed Case Text")).toBe('mixedcasetext');
  });

  test('handles complex combinations', () => {
    expect(normalizeText("São Paulo's café")).toBe('saopauloscafe');
    expect(normalizeText("Don't go to café")).toBe('dontgotocafe');
    expect(normalizeText('It\'s a "wonderful" day')).toBe('itsawonderfulday');
    expect(normalizeText("L'hôtel français")).toBe('lhotelfrancais');
  });

  test('handles empty and edge cases', () => {
    expect(normalizeText("")).toBe('');
    expect(normalizeText("   ")).toBe('');
    expect(normalizeText("'''")).toBe('');
    expect(normalizeText("---")).toBe('');
  });
});

describe('calculateXP', () => {
  test('returns maximum XP for fast responses', () => {
    expect(calculateXP(500)).toBe(10);
    expect(calculateXP(1000)).toBe(10);
  });

  test('returns minimum XP for slow responses', () => {
    expect(calculateXP(30000)).toBe(1);
    expect(calculateXP(40000)).toBe(1);
  });

  test('returns scaled XP for medium responses', () => {
    const midTime = (2000 + 30000) / 2; // 16000ms (actual mid between FAST_RESPONSE_TIME and SLOW_RESPONSE_TIME)
    const xp = calculateXP(midTime);
    expect(xp).toBeGreaterThan(1);
    expect(xp).toBeLessThan(10);
    expect(xp).toBe(6); // Based on actual calculation with CONFIG values
  });

  test('returns integer values', () => {
    expect(Number.isInteger(calculateXP(5000))).toBe(true);
    expect(Number.isInteger(calculateXP(15000))).toBe(true);
    expect(Number.isInteger(calculateXP(25000))).toBe(true);
  });
});

describe('createSafeErrorMessage', () => {
  test('handles fetch errors', () => {
    const error = new Error('fetch failed');
    expect(createSafeErrorMessage(error)).toBe('Network error. Please check your connection and try again.');
  });

  test('handles authentication errors', () => {
    const error401 = new Error('401 Unauthorized');
    const error403 = new Error('403 Forbidden');
    expect(createSafeErrorMessage(error401)).toBe('Authentication failed. Please check your authorization.');
    expect(createSafeErrorMessage(error403)).toBe('Authentication failed. Please check your authorization.');
  });

  test('handles rate limiting errors', () => {
    const error = new Error('429 Too Many Requests');
    expect(createSafeErrorMessage(error)).toBe('Too many requests. Please wait a moment and try again.');
  });

  test('handles server errors', () => {
    const error = new Error('500 Internal Server Error');
    expect(createSafeErrorMessage(error)).toBe('Server error. Please try again later.');
  });

  test('handles generic errors', () => {
    const error = new Error('Something unexpected happened');
    expect(createSafeErrorMessage(error)).toBe('An unexpected error occurred. Please try again.');
  });

  test('handles non-Error objects', () => {
    expect(createSafeErrorMessage('string error')).toBe('Something went wrong. Please try again.');
    expect(createSafeErrorMessage(null)).toBe('Something went wrong. Please try again.');
    expect(createSafeErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
  });
});
