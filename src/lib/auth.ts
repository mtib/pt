import { NextApiRequest, NextApiResponse } from 'next';

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void;

export function withApiAuth(handler: ApiHandler): ApiHandler {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        const authHeader = req.headers.authorization;
        const presharedKey = process.env.PRESHARED_KEY;

        if (!presharedKey) {
            console.error('PRESHARED_KEY is not set on the server.');
            return res.status(500).json({ message: 'Internal Server Error: Auth not configured.' });
        }

        if (!authHeader || authHeader !== `Bearer ${presharedKey}`) {
            return res.status(403).json({ message: 'Forbidden: Invalid or missing authentication token' });
        }

        return handler(req, res);
    };
}
