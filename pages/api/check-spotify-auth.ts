import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = req.cookies.spotify_access_token;
  const isAuthenticated = req.cookies.spotify_authenticated;

  console.log('Auth check - Cookies received:', {
    allCookies: Object.keys(req.cookies),
    hasAccessToken: !!accessToken,
    accessTokenLength: accessToken?.length,
    hasAuthenticatedFlag: !!isAuthenticated,
    authenticatedValue: isAuthenticated
  });

  if (!accessToken) {
    console.log('Auth check failed: No access token found');
    return res.status(401).json({ 
      authenticated: false, 
      error: 'No access token found' 
    });
  }

  if (isAuthenticated !== 'true') {
    console.log('Auth check failed: Not authenticated flag missing or wrong value');
    return res.status(401).json({ 
      authenticated: false, 
      error: 'Not authenticated' 
    });
  }

  // Don't verify the token with Spotify API to avoid rate limiting
  // Just trust that if we have the token and the authenticated flag, we're good
  return res.status(200).json({
    authenticated: true,
    userId: null,
    userDisplayName: null
  });
}
