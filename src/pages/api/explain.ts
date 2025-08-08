import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const ExplanationSchema = z.object({
    example: z.string(),
    explanation: z.string(),
    definition: z.string(),
    grammar: z.string(),
    facts: z.string(),
    pronunciationIPA: z.string(),
    pronunciationEnglish: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authKey = req.headers.authorization?.split(' ')[1];
    if (!authKey || authKey !== process.env.PRESHARED_KEY) {
        return res.status(403).json({ error: 'Forbidden: Invalid or missing auth key' });
    }

    const { word, englishReference } = req.body;
    if (!word || !englishReference) {
        return res.status(400).json({ error: 'Word and English reference are required' });
    }

    try {
        const response = await openai.responses.parse({
            model: 'gpt-5-nano',
            reasoning: { effort: 'minimal' },
            input: [
                { role: 'system', content: 'You are a helpful assistant providing detailed explanations for Portuguese words.' },
                {
                    role: 'user',
                    content: `Provide a detailed explanation for the Portuguese word "${word}" with the English reference "${englishReference}" for an english speaker beginning to learn european portuguese. Include the following details in a structured format:
                    - Example use case with english translation
                    - Explanation (in english) mention if the word is uncommon in european portuguese, what the european portuguese equivalent is, and any nuances in usage
                    - Definition (in english)
                    - Grammatical use (e.g., declination, conjugation, etc.)
                    - Pronunciation (IPA and English sounds, no need to explain the sounds)
                    - Other related interesting facts in english, maybe cultural or historical context as well as etymology.

                    Respond in JSON format with keys: example, explanation, definition, grammar, facts, pronunciationIPA, pronunciationEnglish.
                    
                    Respond in plain text without any additional formatting other than spaces and newlines.`,
                },
            ],
            text: {
                format: zodTextFormat(ExplanationSchema, 'explanation'),
            },
        });

        const explanation = response.output_parsed;
        res.status(200).json(explanation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch explanation' });
    }
}
