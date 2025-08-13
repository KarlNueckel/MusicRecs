import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const REDIRECT_URI = process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com/api/spotify-callback'
    : 'http://127.0.0.1:3000/api/spotify-callback';

  res.status(200).json({
    redirectUri: REDIRECT_URI,
    nodeEnv: process.env.NODE_ENV,
    message: 'Add this exact URL to your Spotify Dashboard Redirect URIs'
  });
}
