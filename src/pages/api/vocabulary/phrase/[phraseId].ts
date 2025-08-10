import { NextApiRequest, NextApiResponse } from 'next';
import { deletePhrase, getAllSimilaritiesForPhrase, getPhraseById } from '@/lib/database/operations';
import { withApiAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { phraseId } = req.query;

    if (typeof phraseId !== 'string' || !/^\d+$/.test(phraseId)) {
        return res.status(400).json({ message: 'A numeric phrase ID is required.' });
    }
    const id = parseInt(phraseId, 10);

    if (req.method === 'DELETE') {
        try {
            // Delete the phrase by ID
            await deletePhrase(id);

            res.status(204).end();
        } catch (error) {
            console.error(`Error deleting phrase ${phraseId}:`, error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    } else if (req.method === 'GET') {
        const sourcePhrase = await getPhraseById(id);
        const relatedPhrases = await getAllSimilaritiesForPhrase(id);

        res.status(200).json({
            sourcePhrase,
            relatedPhrases
        });
        return;
    } else {
        res.setHeader('Allow', ['DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

export default withApiAuth(handler);
