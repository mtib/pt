/**
 * API route for explaining Portuguese words using OpenAI.
 * 
 * This endpoint accepts a Portuguese word and English reference,
 * then generates a comprehensive explanation including pronunciation,
 * examples, grammar information, and cultural context.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { ExplainRequest, Explanation, ApiErrorResponse } from '@/types';

// Input validation schema
const RequestSchema = z.object({
  word: z.string().min(1, 'Portuguese word is required').max(100, 'Word too long'),
  englishReference: z.string().min(1, 'English reference is required').max(100, 'Reference too long'),
});

// OpenAI response schema for structured output
const ExplanationSchema = z.object({
  example: z.string().describe('Example use case with English translation'),
  explanation: z.string().describe('Detailed explanation in English for language learners'),
  definition: z.string().describe('Simple definition in English'),
  grammar: z.string().describe('Grammatical information (declination, conjugation, etc.)'),
  facts: z.string().describe('Cultural, historical, or etymological information'),
  pronunciationIPA: z.string().describe('International Phonetic Alphabet pronunciation'),
  pronunciationEnglish: z.string().describe('English approximation of pronunciation'),
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Validates environment variables
 */
function validateEnvironment(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  
  if (!process.env.PRESHARED_KEY) {
    throw new Error('PRESHARED_KEY environment variable is required');
  }
}

/**
 * Validates the authentication key from the request
 */
function validateAuth(req: NextApiRequest): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    throw new Error('Authorization header is required');
  }
  
  const authKey = authHeader.split(' ')[1];
  
  if (!authKey) {
    throw new Error('Bearer token is required');
  }
  
  if (authKey !== process.env.PRESHARED_KEY) {
    throw new Error('Invalid authorization token');
  }
}

/**
 * Sends error response with proper HTTP status and message
 */
function sendErrorResponse(
  res: NextApiResponse<ApiErrorResponse>,
  status: number,
  message: string
): void {
  res.status(status).json({ error: message });
}

/**
 * Creates the prompt for OpenAI based on the word and reference
 */
function createPrompt(word: string, englishReference: string): string {
  return `Provide a detailed explanation for the Portuguese word "${word}" with the English reference "${englishReference}" for an English speaker beginning to learn European Portuguese. Include the following details in a structured format:

- Example use case with English translation
- Explanation (in English) - mention if the word is uncommon in European Portuguese, what the European Portuguese equivalent is, and any nuances in usage
- Definition (in English)
- Grammatical use (e.g., declination, conjugation, etc.)
- Pronunciation (IPA and English sounds, no need to explain the sounds)
- Other related interesting facts in English, maybe cultural or historical context as well as etymology

Respond in JSON format with keys: example, explanation, definition, grammar, facts, pronunciationIPA, pronunciationEnglish.

Respond in plain text without any additional formatting other than spaces and newlines.`;
}

/**
 * Generates explanation using OpenAI API
 */
async function generateExplanation(word: string, englishReference: string): Promise<Explanation> {
  try {
    const response = await openai.responses.parse({
      model: 'gpt-5-nano',
      reasoning: { effort: 'minimal' },
      input: [
        { 
          role: 'system', 
          content: 'You are a helpful assistant providing detailed explanations for Portuguese words to English speakers learning European Portuguese.' 
        },
        {
          role: 'user',
          content: createPrompt(word, englishReference),
        },
      ],
      text: {
        format: zodTextFormat(ExplanationSchema, 'explanation'),
      },
    });

    const explanation = response.output_parsed;
    
    if (!explanation) {
      throw new Error('OpenAI returned no explanation data');
    }

    return {
      ...explanation,
      word,
      englishReference,
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('rate_limit')) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (error.message.includes('insufficient_quota')) {
        throw new Error('API quota exceeded. Please contact support.');
      }
      if (error.message.includes('invalid_request')) {
        throw new Error('Invalid request to OpenAI API.');
      }
    }
    
    throw new Error('Failed to generate explanation. Please try again.');
  }
}

/**
 * Main API handler for Portuguese word explanations
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Explanation | ApiErrorResponse>
): Promise<void> {
  // Set CORS headers for security
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    sendErrorResponse(res, 405, 'Method not allowed. Only POST requests are supported.');
    return;
  }

  try {
    // Validate environment
    validateEnvironment();
    
    // Validate authentication
    validateAuth(req);
    
    // Validate request body
    const parseResult = RequestSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      sendErrorResponse(res, 400, `Validation error: ${errorMessage}`);
      return;
    }

    const { word, englishReference } = parseResult.data;

    // Generate explanation
    const explanation = await generateExplanation(word, englishReference);
    
    // Send successful response
    res.status(200).json(explanation);
    
  } catch (error) {
    console.error('API Handler Error:', error);
    
    if (error instanceof Error) {
      // Handle authentication errors
      if (error.message.includes('Authorization') || error.message.includes('Bearer') || error.message.includes('Invalid authorization')) {
        sendErrorResponse(res, 403, 'Forbidden: Invalid or missing authentication');
        return;
      }
      
      // Handle rate limiting
      if (error.message.includes('rate_limit') || error.message.includes('quota')) {
        sendErrorResponse(res, 429, error.message);
        return;
      }
      
      // Handle other known errors
      sendErrorResponse(res, 500, error.message);
      return;
    }
    
    // Handle unknown errors
    sendErrorResponse(res, 500, 'Internal server error. Please try again later.');
  }
}
