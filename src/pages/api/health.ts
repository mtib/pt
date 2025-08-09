/**
 * Health check API route for monitoring and Docker health checks.
 * 
 * This endpoint provides a simple health status for the application,
 * useful for load balancers, monitoring systems, and container orchestration.
 * 
 * @author Portuguese Learning App
 * @version 1.0.0
 */

import { NextApiRequest, NextApiResponse } from 'next';

interface HealthResponse {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
}

/**
 * Health check endpoint
 * Returns basic application health information
 */
export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<HealthResponse>
): void {
    // Only allow GET requests
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
        return;
    }

    try {
        const healthResponse: HealthResponse = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '2.0.0',
            environment: process.env.NODE_ENV || 'development',
        };

        // Set cache headers to prevent caching of health checks
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.status(200).json(healthResponse);
    } catch (error) {
        console.error('Health check failed:', error);

        const unhealthyResponse: HealthResponse = {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '2.0.0',
            environment: process.env.NODE_ENV || 'development',
        };

        res.status(503).json(unhealthyResponse);
    }
}
