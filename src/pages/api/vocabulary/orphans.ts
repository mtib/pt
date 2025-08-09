import { NextApiRequest, NextApiResponse } from 'next';
import { getOrphanPhrases } from '@/lib/database/operations';
import { withApiAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const phrases = await getOrphanPhrases();
            res.status(200).json(phrases);
        } catch (error) {
            console.error('Error fetching orphan phrases:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

export default withApiAuth(handler);
