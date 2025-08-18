import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.query;

  if (action === 'set') {
    // Set a test cookie
    const testValue = Math.random().toString(36).substring(7);
    res.setHeader('Set-Cookie', `test_cookie=${testValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600; Secure=false`);
    
    return res.status(200).json({
      message: 'Test cookie set',
      value: testValue,
      cookieHeader: `test_cookie=${testValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600; Secure=false`
    });
  }

  if (action === 'read') {
    // Read all cookies
    return res.status(200).json({
      message: 'All cookies',
      cookies: req.cookies,
      cookieKeys: Object.keys(req.cookies),
      hasSpotifyState: !!req.cookies.spotify_state,
      spotifyState: req.cookies.spotify_state,
      hasTestCookie: !!req.cookies.test_cookie,
      testCookie: req.cookies.test_cookie
    });
  }

  if (action === 'clear') {
    // Clear test cookies
    res.setHeader('Set-Cookie', [
      'test_cookie=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      'spotify_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    ]);
    
    return res.status(200).json({
      message: 'Test cookies cleared'
    });
  }

  return res.status(200).json({
    message: 'Cookie test endpoint',
    usage: {
      'Set test cookie': '/api/test-cookies?action=set',
      'Read all cookies': '/api/test-cookies?action=read',
      'Clear test cookies': '/api/test-cookies?action=clear'
    }
  });
}
