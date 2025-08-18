import { NextApiRequest, NextApiResponse } from 'next';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing Spotify credentials...');
    
    // Check if credentials are set
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      return res.status(400).json({ 
        error: 'Missing credentials',
        hasClientId: !!SPOTIFY_CLIENT_ID,
        hasClientSecret: !!SPOTIFY_CLIENT_SECRET
      });
    }

    // Test client credentials flow
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
      const errorText = await tokenResponse.text();
      console.error('Client credentials test failed:', tokenResponse.status, errorText);
      return res.status(400).json({ 
        error: 'Client credentials test failed',
        status: tokenResponse.status,
        details: errorText
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('Client credentials test successful');

    // Test a simple API call
    const apiResponse = await fetch('https://api.spotify.com/v1/search?q=test&type=track&limit=1', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('API test failed:', apiResponse.status, errorText);
      return res.status(400).json({ 
        error: 'API test failed',
        status: apiResponse.status,
        details: errorText
      });
    }

    const apiData = await apiResponse.json();
    console.log('API test successful');

    return res.status(200).json({
      success: true,
      message: 'Spotify credentials are working correctly',
      clientIdLength: SPOTIFY_CLIENT_ID.length,
      clientSecretLength: SPOTIFY_CLIENT_SECRET.length,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      apiTest: 'successful'
    });

  } catch (error) {
    console.error('Spotify credentials test error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
