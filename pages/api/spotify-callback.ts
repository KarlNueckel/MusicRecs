import { NextApiRequest, NextApiResponse } from 'next';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
// Always use 127.0.0.1 for development since Spotify only accepts that
const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? 'https://your-domain.com/api/spotify-callback'
  : 'http://127.0.0.1:3000/api/spotify-callback';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== SPOTIFY CALLBACK DEBUG ===');
  console.log('Query params:', req.query);
  console.log('URL:', req.url);
  console.log('Host header:', req.headers.host);
  console.log('Full URL:', `${req.headers.host}${req.url}`);
  console.log('Has code:', !!req.query.code);
  console.log('Has state:', !!req.query.state);
  console.log('Code length:', req.query.code?.toString().length);
  console.log('State length:', req.query.state?.toString().length);
  console.log('All headers:', Object.keys(req.headers));
  console.log('==============================');

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
      throw new Error('Failed to get access token');
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token } = tokenData;

    // Get user profile
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user profile');
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    // Store tokens securely (in production, use a proper session management)
    res.setHeader('Set-Cookie', [
      `spotify_access_token=${access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
      `spotify_refresh_token=${refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
      `spotify_user_id=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
    ]);

    // Redirect back to main page with success
    res.redirect('/?spotify_authenticated=true');

  } catch (error) {
    console.error('Spotify callback error:', error);
    res.redirect('/?error=token_exchange_failed');
  }
}
