import { NextApiRequest, NextApiResponse } from 'next';
import { searchPhrases } from '@/lib/database/operations';
import { withApiAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const { q } = req.query;

        if (typeof q !== 'string') {
            return res.status(400).json({ message: 'Query "q" is required.' });
        }

        try {
            const phrases = await searchPhrases(q);
            res.status(200).json(phrases);
        } catch (error) {
            console.error('Error searching phrases:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

export default withApiAuth(handler);
