import { NextApiRequest, NextApiResponse } from 'next';
import { getDatabase } from '@/lib/database/connection';
import { withApiAuth } from '@/lib/auth';

/**
 * API handler for managing categories.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
    const db = getDatabase();

    if (req.method === 'GET') {
        try {
            const categories = await db.allQuery('SELECT id, name FROM categories');
            console.log('Raw categories data:', categories); // Debugging log
            if (Array.isArray(categories)) {
                res.status(200).json(categories);
            } else {
                console.error('Unexpected data format:', categories);
                res.status(500).json({ error: 'Unexpected data format' });
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            res.status(500).json({ error: 'Failed to fetch categories' });
        }
    } else if (req.method === 'POST') {
        const { name } = req.body;

        if (!name || typeof name !== 'string') {
            res.status(400).json({ error: 'Invalid category name' });
            return;
        }

        try {
            await db.runQuery('INSERT INTO categories (name) VALUES (?)', [name]);
            const newCategory = await db.allQuery<{ id: number; }>('SELECT id FROM categories WHERE name = ?', [name]);
            res.status(201).json({ id: newCategory[0]!.id, name });
        } catch (error) {
            console.error('Failed to create category:', error);
            res.status(500).json({ error: 'Failed to create category' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

export default withApiAuth(handler);
