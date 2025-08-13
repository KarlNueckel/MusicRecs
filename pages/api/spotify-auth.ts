import { NextApiRequest, NextApiResponse } from 'next';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
// Always use 127.0.0.1 for development since Spotify only accepts that
const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? 'https://your-domain.com/api/spotify-callback'
  : 'http://127.0.0.1:3000/api/spotify-callback';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Spotify Auth Debug:', {
    hasClientId: !!SPOTIFY_CLIENT_ID,
    clientIdLength: SPOTIFY_CLIENT_ID?.length,
    redirectUri: REDIRECT_URI,
    nodeEnv: process.env.NODE_ENV
  });

  if (!SPOTIFY_CLIENT_ID) {
    console.error('Spotify Client ID is missing');
    return res.status(500).json({ error: 'Spotify client ID not configured' });
  }

  const scope = [
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private',
    'user-read-email'
  ].join(' ');

  const state = Math.random().toString(36).substring(7);
  
  // Store state in session/cookie for verification
  res.setHeader('Set-Cookie', `spotify_state=${state}; Path=/; HttpOnly; SameSite=Lax`);

  const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: REDIRECT_URI,
    state,
  }).toString()}`;

  console.log('Redirecting to Spotify auth URL');
  res.redirect(authUrl);
}
