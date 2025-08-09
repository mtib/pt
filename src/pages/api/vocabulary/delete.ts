import { NextApiRequest, NextApiResponse } from 'next';
import { deletePhrase } from '@/lib/database/operations';
import { withApiAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'DELETE') {
        const { id } = req.query;

        if (typeof id !== 'string' || !/^\d+$/.test(id)) {
            return res.status(400).json({ message: 'A numeric phrase ID is required.' });
        }

        try {
            await deletePhrase(parseInt(id, 10));
            res.status(204).end();
        } catch (error) {
            console.error(`Error deleting phrase ${id}:`, error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    } else {
        res.setHeader('Allow', ['DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

export default withApiAuth(handler);
