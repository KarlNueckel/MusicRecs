import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
  const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  console.log('Spotify Config Test:', {
    hasClientId: !!spotifyClientId,
    hasClientSecret: !!spotifyClientSecret,
    clientIdLength: spotifyClientId?.length,
    clientSecretLength: spotifyClientSecret?.length,
    nodeEnv: process.env.NODE_ENV
  });

  res.status(200).json({
    configured: !!(spotifyClientId && spotifyClientSecret),
    hasClientId: !!spotifyClientId,
    hasClientSecret: !!spotifyClientSecret,
    clientIdLength: spotifyClientId?.length || 0,
    clientSecretLength: spotifyClientSecret?.length || 0,
    nodeEnv: process.env.NODE_ENV
  });
}
