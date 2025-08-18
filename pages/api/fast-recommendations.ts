import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface Track {
  spotify_id: string;
  name: string;
  artists: string;
  album: string;
  genres: string;
  popularity: number;
  duration_ms: number;
  release_date: string;
  preview_url: string;
  track_url: string;
  explicit: boolean;
  album_image_url: string;
}

// Load tracks from JSON file (load once, cache in memory)
let tracksDatabase: Track[] = [];
let isLoaded = false;

function loadTracksDatabase(): Track[] {
  if (isLoaded) {
    return tracksDatabase;
  }

  try {
    const jsonPath = path.join(process.cwd(), 'data-pipeline', 'tracks_database.json');
    console.log('Attempting to load database from:', jsonPath);
    
    // Check if file exists
    if (!fs.existsSync(jsonPath)) {
      console.error('Database file does not exist at:', jsonPath);
      return [];
    }
    
    const data = fs.readFileSync(jsonPath, 'utf8');
    console.log('File read successfully, size:', data.length, 'characters');
    
    tracksDatabase = JSON.parse(data);
    isLoaded = true;
    console.log(`Successfully loaded ${tracksDatabase.length} tracks from JSON database`);
    return tracksDatabase;
  } catch (error) {
    console.error('Error loading tracks database:', error);
    return [];
  }
}

function searchTracks(query: string, userInterests: string = '', favoriteSongs: string = '', excludeFavoriteArtists: boolean = false): Track[] {
  const tracks = loadTracksDatabase();
  console.log(`Search function called with ${tracks.length} tracks available`);
  
  if (tracks.length === 0) {
    console.log('No tracks available for search');
    return [];
  }

  // Combine search terms
  const searchTerms = [query.toLowerCase()];
  if (userInterests) {
    searchTerms.push(userInterests.toLowerCase());
  }
  
  console.log('Search terms:', searchTerms);

      // Score tracks based on search relevance
    const scoredTracks = tracks.map(track => {
      let score = 0;
      const trackName = (track.name || '').toLowerCase();
      const trackArtists = (track.artists || '').toLowerCase();
      const trackGenres = (track.genres || '').toLowerCase();
      const trackAlbum = (track.album || '').toLowerCase();

    // Check each search term
    for (const term of searchTerms) {
      // Exact matches get highest score
      if (trackName.includes(term)) score += 10;
      if (trackArtists.includes(term)) score += 8;
      if (trackGenres.includes(term)) score += 6;
      if (trackAlbum.includes(term)) score += 4;

      // Partial word matches
      const words = term.split(' ');
      for (const word of words) {
        if (word.length > 2) { // Only consider words longer than 2 characters
          if (trackName.includes(word)) score += 3;
          if (trackArtists.includes(word)) score += 2;
          if (trackGenres.includes(word)) score += 1;
        }
      }
    }

    // Boost popular tracks slightly
    score += track.popularity / 100;

    return { track, score };
  });

  // Filter out favorite songs if provided
  let filteredTracks = scoredTracks;
  if (favoriteSongs) {
    const favoriteSongNames = favoriteSongs.toLowerCase().split(/[,\s]+/).filter(name => name.trim());
    filteredTracks = scoredTracks.filter(({ track }) => {
      const trackName = (track.name || '').toLowerCase();
      return !favoriteSongNames.some(favoriteName => 
        trackName.includes(favoriteName) || favoriteName.includes(trackName)
      );
    });
  }

  // Filter out favorite artists if toggle is enabled
  if (excludeFavoriteArtists && userInterests) {
    const favoriteArtistNames = userInterests.toLowerCase().split(/[,\s]+/).filter(name => name.trim());
    filteredTracks = filteredTracks.filter(({ track }) => {
      const trackArtists = (track.artists || '').toLowerCase();
      return !favoriteArtistNames.some(artistName => 
        trackArtists.includes(artistName) || artistName.includes(trackArtists)
      );
    });
  }

  // Sort by score and return top results
  return filteredTracks
    .sort((a, b) => b.score - a.score)
    .slice(0, 100) // Return top 100 results
    .map(({ track }) => track);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, userInterests, favoriteSongs, excludeFavoriteArtists } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log('Fast search query:', { query, userInterests, favoriteSongs, excludeFavoriteArtists });

    // Search tracks
    const results = searchTracks(query, userInterests, favoriteSongs, excludeFavoriteArtists);

    console.log(`Found ${results.length} tracks for query: "${query}"`);

    // Return in the same format as the original API
    res.status(200).json({
      data: {
        Get: {
          Track: results
        }
      }
    });

  } catch (error) {
    console.error('Error in fast recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
