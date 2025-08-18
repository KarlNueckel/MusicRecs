import { NextApiRequest, NextApiResponse } from 'next';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? 'https://your-domain.com/api/spotify-callback'
  : 'http://127.0.0.1:3000/api/spotify-callback';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error } = req.query;

  if (error) {
    return res.redirect('/?error=spotify_auth_failed');
  }

  if (!code || !state) {
    return res.redirect('/?error=missing_params');
  }

  // Verify state parameter
  const storedState = req.cookies.spotify_state;
  if (state !== storedState) {
    return res.redirect('/?error=invalid_state');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      throw new Error(`Failed to get access token: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful, got access token');
    const { access_token, refresh_token } = tokenData;

    // Store tokens securely (skip user profile fetch to avoid rate limiting)
    res.setHeader('Set-Cookie', [
      `spotify_access_token=${access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
      `spotify_refresh_token=${refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
      `spotify_authenticated=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
    ]);

    // Redirect back to main page with success
    res.redirect('/?spotify_authenticated=true');

  } catch (error) {
    console.error('Spotify callback error:', error);
    res.redirect('/?error=token_exchange_failed');
  }
}
