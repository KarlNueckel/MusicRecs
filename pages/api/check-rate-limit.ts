import { NextApiRequest, NextApiResponse } from 'next';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test with a simple search to check rate limit status
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    });

    if (!tokenResponse.ok) {
      return res.status(400).json({ 
        error: 'Token request failed',
        status: tokenResponse.status
      });
    }

    const tokenData = await tokenResponse.json();

    // Try a simple API call
    const apiResponse = await fetch('https://api.spotify.com/v1/search?q=test&type=track&limit=1', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (apiResponse.status === 429) {
      return res.status(429).json({ 
        error: 'Still rate limited',
        message: 'Please wait a few more minutes before trying again',
        retryAfter: apiResponse.headers.get('Retry-After') || 'unknown'
      });
    }

    if (!apiResponse.ok) {
      return res.status(400).json({ 
        error: 'API call failed',
        status: apiResponse.status
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Rate limit has reset! You can now connect to Spotify.',
      status: 'ready'
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
