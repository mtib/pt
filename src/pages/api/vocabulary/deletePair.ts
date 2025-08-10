import { NextApiRequest, NextApiResponse } from 'next';
import { deleteSimilaritiesForPhrase } from '@/lib/database/operations';
import { withApiAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'DELETE') {
        const { phrase1, phrase2 } = req.query;

        if (typeof phrase1 !== 'string' || typeof phrase2 !== 'string' || !/^\d+$/.test(phrase1) || !/^\d+$/.test(phrase2)) {
            return res.status(400).json({ message: 'Numeric phrase IDs are required for both phrase1 and phrase2.' });
        }

        try {
            const phrase1Id = parseInt(phrase1, 10);
            const phrase2Id = parseInt(phrase2, 10);

            // Delete the specific similarity relationship
            await deleteSimilaritiesForPhrase(phrase1Id, phrase2Id);

            res.status(200).json({ message: 'Ok' });
        } catch (error) {
            console.error(`Error deleting similarity between phrases ${phrase1} and ${phrase2}:`, error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    } else {
        res.setHeader('Allow', ['DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

export default withApiAuth(handler);
