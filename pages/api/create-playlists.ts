import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// Simple error logging function
const logError = (error: string) => {
  try {
    const logPath = path.join(process.cwd(), 'error-log.txt');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${error}\n`;
    fs.appendFileSync(logPath, logEntry);
    console.error('Error logged to file:', error);
  } catch (logError) {
    console.error('Failed to write to error log:', logError);
  }
};

// Simple console-only error logging (safer)
const logErrorSafe = (error: string) => {
  console.error('ERROR:', error);
  try {
    logError(error);
  } catch (e) {
    console.error('Failed to log error to file:', e);
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tracks, query, userInterests } = req.body;
  const accessToken = req.cookies.spotify_access_token;

  if (!accessToken) {
    console.error('ERROR: Not authenticated with Spotify');
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  // Get user ID from cookie or fetch it from Spotify API
  let userId = req.cookies.spotify_user_id;
  
  console.log('Playlist creation - User ID check:', {
    hasUserIdFromCookie: !!userId,
    userIdFromCookie: userId
  });
  
  if (!userId) {
    console.log('No user ID in cookie, trying to fetch from Spotify API...');
    
    // Try with exponential backoff to handle rate limiting
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        const userResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        console.log(`User profile response status (attempt ${retries + 1}):`, userResponse.status);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          userId = userData.id;
          
          console.log('Got user ID from Spotify:', userId);
          
          // Store the user ID in a cookie for future use
          res.setHeader('Set-Cookie', `spotify_user_id=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`);
          break;
        } else if (userResponse.status === 429) {
          retries++;
          if (retries < maxRetries) {
            const delay = Math.min(retries * 2000, 10000);
            console.log(`Rate limited, retrying in ${delay}ms... (attempt ${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
                 } else {
           const errorText = await userResponse.text();
           console.error(`ERROR: Failed to get user profile: ${userResponse.status} ${errorText}`);
           return res.status(401).json({ error: 'Failed to get user profile from Spotify' });
         }
             } catch (error) {
         console.error(`ERROR: Error fetching user profile: ${error}`);
         retries++;
         if (retries >= maxRetries) {
           return res.status(401).json({ error: 'Failed to get user profile from Spotify after multiple attempts' });
         }
         await new Promise(resolve => setTimeout(resolve, 2000));
       }
    }
    
    if (!userId) {
      console.error('ERROR: Could not get user ID from Spotify after multiple attempts');
      return res.status(401).json({ error: 'Could not get user ID from Spotify after multiple attempts' });
    }
  }

  if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
    console.error('ERROR: No tracks provided');
    return res.status(400).json({ error: 'No tracks provided' });
  }

  console.log('Playlist creation - Track data:', {
    trackCount: tracks.length,
    firstTrack: tracks[0],
    sampleTrackIds: tracks.slice(0, 3).map((t: any) => t.spotify_id)
  });

  try {
    console.log('Starting playlist creation...');
    const timestamp = new Date().toISOString().split('T')[0];
    const searchQuery = query || 'music';
    const artists = userInterests ? ` - ${userInterests}` : '';

    // Create playlist names
    const playlist25Name = `🎵 ${searchQuery}${artists} - Top 25 (${timestamp})`;
    const playlist100Name = `🎵 ${searchQuery}${artists} - Top 100 (${timestamp})`;

    console.log('Creating playlists with names:', { playlist25Name, playlist100Name });

    // Create the 25-track playlist
    console.log('Creating 25-track playlist...');
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

    console.log('25-track playlist response status:', playlist25Response.status);
    
    if (!playlist25Response.ok) {
      const errorText = await playlist25Response.text();
      console.error(`ERROR: Failed to create 25-track playlist: ${playlist25Response.status} ${errorText}`);
      throw new Error(`Failed to create 25-track playlist: ${playlist25Response.status} ${errorText}`);
    }

    const playlist25 = await playlist25Response.json();
    console.log('25-track playlist created successfully:', playlist25.id);
    const tracks25 = tracks.slice(0, 25).map((track: any) => track.spotify_id);

    // Add tracks to 25-track playlist
    console.log('Adding tracks to 25-track playlist...');
    console.log('Tracks to add:', tracks25.slice(0, 5), '... (showing first 5)');
    
    const addTracks25Response = await fetch(`https://api.spotify.com/v1/playlists/${playlist25.id}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: tracks25.map((id: string) => `spotify:track:${id}`),
      }),
    });

    console.log('Add tracks to 25-track playlist response status:', addTracks25Response.status);
    
    if (!addTracks25Response.ok) {
      const errorText = await addTracks25Response.text();
      console.error(`ERROR: Failed to add tracks to 25-track playlist: ${addTracks25Response.status} ${errorText}`);
      throw new Error(`Failed to add tracks to 25-track playlist: ${addTracks25Response.status} ${errorText}`);
    }
    
    console.log('Successfully added tracks to 25-track playlist');

    // Create the 100-track playlist
    console.log('Creating 100-track playlist...');
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

    console.log('100-track playlist response status:', playlist100Response.status);
    
    if (!playlist100Response.ok) {
      const errorText = await playlist100Response.text();
      console.error(`ERROR: Failed to create 100-track playlist: ${playlist100Response.status} ${errorText}`);
      throw new Error(`Failed to create 100-track playlist: ${playlist100Response.status} ${errorText}`);
    }

    const playlist100 = await playlist100Response.json();
    console.log('100-track playlist created successfully:', playlist100.id);
    const tracks100 = tracks.slice(0, 100).map((track: any) => track.spotify_id);

    // Add tracks to 100-track playlist
    console.log('Adding tracks to 100-track playlist...');
    console.log('Tracks to add:', tracks100.slice(0, 5), '... (showing first 5)');
    
    const addTracks100Response = await fetch(`https://api.spotify.com/v1/playlists/${playlist100.id}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: tracks100.map((id: string) => `spotify:track:${id}`),
      }),
    });

    console.log('Add tracks to 100-track playlist response status:', addTracks100Response.status);
    
    if (!addTracks100Response.ok) {
      const errorText = await addTracks100Response.text();
      console.error(`ERROR: Failed to add tracks to 100-track playlist: ${addTracks100Response.status} ${errorText}`);
      throw new Error(`Failed to add tracks to 100-track playlist: ${addTracks100Response.status} ${errorText}`);
    }
    
    console.log('Successfully added tracks to 100-track playlist');

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
    console.error(`ERROR: Playlist creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ 
      error: 'Failed to create playlists',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
