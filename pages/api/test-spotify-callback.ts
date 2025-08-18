import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simulate setting Spotify cookies like the callback would
  const testAccessToken = 'test_access_token_' + Math.random().toString(36).substring(7);
  const testRefreshToken = 'test_refresh_token_' + Math.random().toString(36).substring(7);
  
  const cookies = [
    `spotify_access_token=${testAccessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
    `spotify_refresh_token=${testRefreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
    `spotify_authenticated=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
  ];
  
  res.setHeader('Set-Cookie', cookies);
  
  console.log('Test callback - Setting cookies:', {
    accessTokenLength: testAccessToken.length,
    refreshTokenLength: testRefreshToken.length,
    cookies: cookies
  });

  return res.status(200).json({
    success: true,
    message: 'Test Spotify cookies set successfully',
    accessTokenLength: testAccessToken.length,
    redirectUrl: '/?spotify_authenticated=true'
  });
}
