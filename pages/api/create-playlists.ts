import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tracks, query, userInterests } = req.body;
  const accessToken = req.cookies.spotify_access_token;
  const userId = req.cookies.spotify_user_id;

  if (!accessToken || !userId) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
    return res.status(400).json({ error: 'No tracks provided' });
  }

  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const searchQuery = query || 'music';
    const artists = userInterests ? ` - ${userInterests}` : '';

    // Create playlist names
    const playlist25Name = `🎵 ${searchQuery}${artists} - Top 25 (${timestamp})`;
    const playlist100Name = `🎵 ${searchQuery}${artists} - Top 100 (${timestamp})`;

    // Create the 25-track playlist
    const playlist25Response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: playlist25Name,
        description: `AI-generated playlist based on "${searchQuery}"${artists}. Created with Music Discovery.`,
        public: true,
      }),
    });

    if (!playlist25Response.ok) {
      throw new Error('Failed to create 25-track playlist');
    }

    const playlist25 = await playlist25Response.json();
    const tracks25 = tracks.slice(0, 25).map((track: any) => track.spotify_id);

    // Add tracks to 25-track playlist
    await fetch(`https://api.spotify.com/v1/playlists/${playlist25.id}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: tracks25.map((id: string) => `spotify:track:${id}`),
      }),
    });

    // Create the 100-track playlist
    const playlist100Response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: playlist100Name,
        description: `AI-generated playlist based on "${searchQuery}"${artists}. Created with Music Discovery.`,
        public: true,
      }),
    });

    if (!playlist100Response.ok) {
      throw new Error('Failed to create 100-track playlist');
    }

    const playlist100 = await playlist100Response.json();
    const tracks100 = tracks.slice(0, 100).map((track: any) => track.spotify_id);

    // Add tracks to 100-track playlist
    await fetch(`https://api.spotify.com/v1/playlists/${playlist100.id}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: tracks100.map((id: string) => `spotify:track:${id}`),
      }),
    });

    res.status(200).json({
      success: true,
      playlists: [
        {
          name: playlist25Name,
          id: playlist25.id,
          url: playlist25.external_urls.spotify,
          trackCount: tracks25.length,
        },
        {
          name: playlist100Name,
          id: playlist100.id,
          url: playlist100.external_urls.spotify,
          trackCount: tracks100.length,
        },
      ],
    });

  } catch (error) {
    console.error('Playlist creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create playlists',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
