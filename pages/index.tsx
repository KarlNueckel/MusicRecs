import React, { SyntheticEvent, useState } from 'react';
import CircleLoader from 'react-spinners/CircleLoader';
import Modal from 'react-modal';
import { Book, Track } from 'types';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    width: '90%',
    maxWidth: '600px',
    height: '85%',
    transform: 'translate(-50%, -50%)',
    borderRadius: '16px',
    border: 'none',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
  }
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [query, setQuery] = useState('');
  const [userInterests, setUserInterests] = useState('');
  const [favoriteSongs, setFavoriteSongs] = useState('');
  const [excludeFavoriteArtists, setExcludeFavoriteArtists] = useState(false);
  const [recommendedTracks, setRecommendedTracks] = useState<Track[]>([]);
  const [modalIsOpen, setIsOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | undefined>(undefined);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [isCreatingPlaylists, setIsCreatingPlaylists] = useState(false);
  const [spotifyConfigured, setSpotifyConfigured] = useState<boolean | null>(null);
  const [spotifyAuthenticated, setSpotifyAuthenticated] = useState<boolean>(false);

  // Debug logging
  React.useEffect(() => {
    console.log('Spotify Status:', { configured: spotifyConfigured, authenticated: spotifyAuthenticated });
  }, [spotifyConfigured, spotifyAuthenticated]);

  // Check for Spotify authentication success on page load
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('spotify_authenticated') === 'true') {
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
      // Set authenticated state
      setSpotifyAuthenticated(true);
      // Show success message
      alert('Successfully connected to Spotify! You can now create playlists.');
    }
  }, []);

  // Check if Spotify is configured
  React.useEffect(() => {
    const checkSpotifyConfig = async () => {
      try {
        // Use a different endpoint to check configuration
        const response = await fetch('/api/test-spotify-config');
        const data = await response.json();
        setSpotifyConfigured(data.configured);
      } catch (error) {
        console.error('Error checking Spotify config:', error);
        setSpotifyConfigured(false);
      }
    };
    
    checkSpotifyConfig();
  }, []);

  // Check if authenticated (only when configured)
  React.useEffect(() => {
    if (!spotifyConfigured) {
      setSpotifyAuthenticated(false);
      return;
    }

    const checkAuthentication = async () => {
      try {
        const response = await fetch('/api/create-playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tracks: [], query: 'test', userInterests: 'test' })
        });
        
        if (response.status === 401) {
          setSpotifyAuthenticated(false);
        } else {
          setSpotifyAuthenticated(true);
        }
      } catch (error) {
        setSpotifyAuthenticated(false);
      }
    };
    
    checkAuthentication();
  }, [spotifyConfigured]);

  const openModal = (track_name: string) => {
    const trackSelection = recommendedTracks.filter((track: Track) => {
      return track.name === track_name;
    });
    console.log(trackSelection);
    setSelectedTrack(trackSelection[0]);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const createPlaylists = async () => {
    setIsCreatingPlaylists(true);
    try {
      // First, check if we have Spotify tokens
      const response = await fetch('/api/create-playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tracks: recommendedTracks,
          query,
          userInterests,
        }),
      });

      if (response.status === 401) {
        // Not authenticated, redirect to Spotify auth
        window.location.href = '/api/spotify-auth';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'Spotify client ID not configured') {
          alert('Spotify integration is not configured. Please check the setup guide below the button.');
        } else {
          throw new Error(errorData.error || 'Failed to create playlists');
        }
        return;
      }

      const result = await response.json();
      setPlaylists(result.playlists);
      setPlaylistModalOpen(true);
    } catch (error) {
      console.error('Error creating playlists:', error);
      alert(`Failed to create playlists: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingPlaylists(false);
    }
  };

  const getRecommendations = async (e: SyntheticEvent) => {
    e.preventDefault();

    // Check Inputs
    if (query === '') {
      alert("Please let us know what kind of music you're looking for!");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          userInterests,
          favoriteSongs,
          excludeFavoriteArtists,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const recommendations = await response.json();
      
      // Check if the response has the expected structure
      if (!recommendations.data?.Get?.Track) {
        throw new Error('Invalid response format from server');
      }
      
      console.log(recommendations.data.Get.Track);
      setRecommendedTracks(recommendations.data.Get.Track);
      setLoadedOnce(true);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      alert(`Failed to get recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20"></div>
        <div className="relative z-10 container mx-auto px-6 py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-8">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Music Discovery
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Discover your next favorite songs with AI-powered recommendations
            </p>
          </div>
        </div>
      </header>

      {/* Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Track Details"
      >
        <div className="h-full flex flex-col text-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold">
              {selectedTrack?.name || 'Unknown Track'}
            </h3>
            <Button
              className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full w-10 h-10 p-0"
              onClick={closeModal}
            >
              ✕
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className='flex justify-center mb-8'>
              <div className="w-48 h-72">
                <img
                  src={selectedTrack?.album_image_url}
                  alt={"Album cover for " + selectedTrack?.name}
                  className="w-full h-full rounded-2xl shadow-2xl"
                />
              </div>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-sm text-gray-300 mb-1">Artists</p>
                <p className="font-semibold">{selectedTrack?.artists || 'Unknown'}</p>
              </div>
              
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-sm text-gray-300 mb-1">Album</p>
                <p className="font-semibold">{selectedTrack?.album || 'Unknown'}</p>
              </div>
              
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-sm text-gray-300 mb-1">Genres</p>
                <p className="font-semibold">{selectedTrack?.genres || 'Unknown'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-sm text-gray-300 mb-1">Popularity</p>
                  <p className="font-semibold">{selectedTrack?.popularity || 'N/A'}</p>
                </div>
                
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-sm text-gray-300 mb-1">Duration</p>
                  <p className="font-semibold">
                    {Math.round((selectedTrack?.duration_ms || 0) / 1000 / 60)}:{(Math.round((selectedTrack?.duration_ms || 0) / 1000) % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-sm text-gray-300 mb-1">Release Date</p>
                <p className="font-semibold">{selectedTrack?.release_date || 'Unknown'}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <Button
                asChild
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 rounded-xl flex items-center gap-3 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <a
                  target="_blank"
                  href={selectedTrack?.track_url || '#'}
                  rel="noopener noreferrer"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Listen on Spotify
                </a>
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Playlist Success Modal */}
      <Modal
        isOpen={playlistModalOpen}
        onRequestClose={() => setPlaylistModalOpen(false)}
        style={customStyles}
        contentLabel="Playlists Created"
      >
        <div className="h-full flex flex-col text-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold">
              🎉 Playlists Created Successfully!
            </h3>
            <Button
              className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full w-10 h-10 p-0"
              onClick={() => setPlaylistModalOpen(false)}
            >
              ✕
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6">
              {playlists.map((playlist, index) => (
                <div key={playlist.id} className="bg-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-xl font-semibold mb-2">{playlist.name}</h4>
                      <p className="text-gray-300">{playlist.trackCount} tracks</p>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </div>
                  </div>
                  
                  <Button
                    asChild
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3"
                  >
                    <a
                      target="_blank"
                      href={playlist.url}
                      rel="noopener noreferrer"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      Listen on Spotify
                    </a>
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-gray-300 mb-4">
                Your playlists have been created and are now available in your Spotify account!
              </p>
              <Button
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30 font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                onClick={() => setPlaylistModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {/* Search Form */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
            <form onSubmit={getRecommendations} className="space-y-6">
              <div>
                <label htmlFor="genre-input" className="block text-white font-semibold mb-3 text-lg">
                  What genre of music are you looking for?
                </label>
                <Input 
                  type="text"
                  id="genre-input"
                  placeholder="rock, jazz, electronic, ambient, hip-hop..."
                  className="w-full px-6 py-4 bg-white/20 border-white/30 text-white placeholder-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {process.env.NEXT_PUBLIC_COHERE_CONFIGURED && (
                <>
                  <div>
                    <label htmlFor="artists-input" className="block text-white font-semibold mb-3 text-lg">
                      Favorite Artists in this Genre
                    </label>
                    <Input 
                      type="text"
                      id="artists-input"
                      placeholder="e.g., The Beatles, Pink Floyd, Radiohead"
                      className="w-full px-6 py-4 bg-white/20 border-white/30 text-white placeholder-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                      value={userInterests}
                      onChange={(e) => setUserInterests(e.target.value)}
                    />
                  </div>

                  {userInterests && userInterests.trim() && (
                    <div className="flex items-center justify-between p-4 bg-white/10 rounded-xl">
                      <label className="text-white font-semibold">
                        Exclude Favorite Artists from Results
                      </label>
                      <div className="relative inline-block w-14 h-7">
                        <input
                          type="checkbox"
                          id="exclude-artists-toggle"
                          checked={excludeFavoriteArtists}
                          onChange={(e) => setExcludeFavoriteArtists(e.target.checked)}
                          className="sr-only"
                        />
                        <label
                          htmlFor="exclude-artists-toggle"
                          className={`block w-14 h-7 rounded-full transition-colors duration-200 cursor-pointer ${
                            excludeFavoriteArtists ? 'bg-purple-500' : 'bg-gray-400'
                          }`}
                        >
                          <span className={`block w-5 h-5 bg-white rounded-full transform transition-transform duration-200 ${
                            excludeFavoriteArtists ? 'translate-x-7' : 'translate-x-1'
                          }`}></span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="songs-input" className="block text-white font-semibold mb-3 text-lg">
                      Favorite Songs in this Genre
                    </label>
                    <Input 
                      type="text"
                      id="songs-input"
                      placeholder="e.g., Bohemian Rhapsody, Stairway to Heaven, Hotel California"
                      className="w-full px-6 py-4 bg-white/20 border-white/30 text-white placeholder-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                      value={favoriteSongs}
                      onChange={(e) => setFavoriteSongs(e.target.value)}
                    />
                  </div>
                </>
              )}

                             <div className="flex flex-col gap-4">
                 <div className="flex flex-col sm:flex-row gap-4">
                   <Button 
                     className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-8 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-200" 
                     disabled={isLoading} 
                     type="submit"
                   >
                     {isLoading ? (
                       <div className="flex items-center gap-2">
                         <CircleLoader color="#ffffff" size={20} />
                         Finding Music...
                       </div>
                     ) : (
                       <div className="flex items-center gap-2">
                         <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                           <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                         </svg>
                         Get Recommendations
                       </div>
                     )}
                   </Button>
                   
                   <Button 
                     type="button"
                     className="bg-white/20 hover:bg-white/30 text-white border border-white/30 font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-200" 
                     onClick={() => window.location.href = '/debug'}
                   >
                     Debug Page
                   </Button>
                 </div>
                 
                                   {spotifyConfigured === false ? (
                    <div className="w-full bg-gray-600/20 border border-gray-500/30 rounded-xl p-4 text-center">
                      <p className="text-gray-300 mb-2">🎵 Spotify Integration Not Configured</p>
                      <p className="text-sm text-gray-400">
                        Playlist creation requires Spotify API setup. Check the guide below.
                      </p>
                    </div>
                  ) : !spotifyAuthenticated ? (
                    <div className="w-full bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
                      <p className="text-blue-300 font-semibold mb-2">🔗 Connect to Spotify</p>
                      <p className="text-sm text-blue-200 mb-3">
                        You need to authorize this app to create playlists on your Spotify account.
                      </p>
                      <Button 
                        type="button"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3" 
                        onClick={() => window.location.href = '/api/spotify-auth'}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                        Connect to Spotify
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      type="button"
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 px-8 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3" 
                      onClick={() => {
                        if (recommendedTracks.length === 0) {
                          alert('Please generate recommendations first before creating playlists.');
                          return;
                        }
                        if (confirm(`Create 2 playlists on your Spotify account?\n\n• 25-track playlist: Top recommendations\n• 100-track playlist: Extended collection\n\nThis will add these songs to your Spotify account.`)) {
                          createPlaylists();
                        }
                      }}
                      disabled={!loadedOnce || recommendedTracks.length === 0 || isCreatingPlaylists}
                    >
                      {isCreatingPlaylists ? (
                        <div className="flex items-center gap-2">
                          <CircleLoader color="#ffffff" size={20} />
                          Creating Playlists...
                        </div>
                      ) : (
                        <>
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                          </svg>
                          Generate Playlists on Spotify
                        </>
                      )}
                    </Button>
                  )}
                  <div className="text-center mt-2">
                    {spotifyConfigured === false ? (
                      <div className="p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                        <p className="text-yellow-300 font-semibold mb-2">⚠️ Spotify Setup Required</p>
                        <p className="text-sm text-yellow-200 mb-3">
                          To create playlists, you need to configure Spotify API integration.
                        </p>
                        <details className="text-xs text-yellow-100">
                          <summary className="cursor-pointer hover:text-yellow-300 transition-colors font-semibold">
                            📋 Setup Instructions
                          </summary>
                          <div className="mt-3 p-3 bg-black/20 rounded-lg text-left">
                            <p className="mb-2 font-semibold">Follow these steps:</p>
                            <ol className="list-decimal list-inside space-y-2 text-xs">
                              <li>Go to <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:underline font-semibold">Spotify Developer Dashboard</a></li>
                              <li>Create a new app and get your <code className="bg-black/30 px-1 rounded">Client ID</code> and <code className="bg-black/30 px-1 rounded">Client Secret</code></li>
                              <li>In your app settings, add this <strong>Redirect URI</strong>:
                                <code className="block mt-1 bg-black/30 px-2 py-1 rounded text-xs">http://127.0.0.1:3000/api/spotify-callback</code>
                              </li>
                              <li>Create a <code className="bg-black/30 px-1 rounded">.env.local</code> file with your credentials:
                                <pre className="mt-1 p-2 bg-black/40 rounded text-xs overflow-x-auto">
{`SPOTIFY_CLIENT_ID=your_actual_client_id_here
SPOTIFY_CLIENT_SECRET=your_actual_client_secret_here`}
                                </pre>
                              </li>
                              <li>Restart your development server</li>
                            </ol>
                          </div>
                        </details>
                      </div>
                    ) : !spotifyAuthenticated ? (
                      <>
                        <p className="text-sm text-blue-300 mb-2">
                          Click "Connect to Spotify" to authorize playlist creation
                        </p>
                        <details className="text-xs text-blue-400">
                          <summary className="cursor-pointer hover:text-blue-300 transition-colors">
                            Need help with Spotify setup?
                          </summary>
                          <div className="mt-2 p-3 bg-white/10 rounded-lg text-left">
                            <p className="mb-2">To enable playlist creation, you need to:</p>
                            <ol className="list-decimal list-inside space-y-1 text-xs">
                              <li>Create a Spotify app at <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">developer.spotify.com</a></li>
                              <li>Add redirect URI: <code className="bg-black/20 px-1 rounded">http://127.0.0.1:3000/api/spotify-callback</code></li>
                              <li>Set environment variables: <code className="bg-black/20 px-1 rounded">SPOTIFY_CLIENT_ID</code> and <code className="bg-black/20 px-1 rounded">SPOTIFY_CLIENT_SECRET</code></li>
                            </ol>
                          </div>
                        </details>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-green-300 mb-2">
                          ✅ Connected to Spotify! You can now create playlists.
                        </p>
                        <details className="text-xs text-green-400">
                          <summary className="cursor-pointer hover:text-green-300 transition-colors">
                            How playlist creation works
                          </summary>
                          <div className="mt-2 p-3 bg-white/10 rounded-lg text-left">
                            <p className="mb-2">When you create playlists:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                              <li>2 playlists will be created on your Spotify account</li>
                              <li>25-track playlist: Top recommendations</li>
                              <li>100-track playlist: Extended collection</li>
                              <li>You'll get direct links to listen on Spotify</li>
                            </ul>
                          </div>
                        </details>
                      </>
                    )}
                  </div>
               </div>
            </form>
          </div>
        </div>

        {/* Results Section */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <CircleLoader color="#a855f7" size={80} />
              <p className="text-white text-xl mt-6">Discovering amazing music for you...</p>
            </div>
          </div>
        ) : (
          <>
            {loadedOnce && (
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold text-white mb-4">
                    Your Music Recommendations
                  </h2>
                  <p className="text-xl text-gray-300">
                    Discovered {recommendedTracks.length} tracks just for you
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {recommendedTracks.map((track: Track) => (
                    <div key={track.spotify_id} className="group">
                      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-semibold text-white line-clamp-2 flex-1 mr-2">
                            {track.name || 'Unknown Track'}
                          </h3>
                          {process.env.NEXT_PUBLIC_COHERE_CONFIGURED && track._additional?.generate?.error !== "connection to Cohere API failed with status: 429" && track._additional?.generate?.singleResult && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full w-8 h-8 p-0 text-sm shadow-lg">
                                  ✨
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 max-h-80 overflow-auto bg-white/95 backdrop-blur-lg border-white/30">
                                <div className="p-4">
                                  <p className="text-lg font-bold text-gray-800 mb-3">Why you'll love this track:</p>
                                  <p className="text-gray-700 leading-relaxed">{track._additional.generate.singleResult}</p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        
                        <div className="relative mb-4">
                          <img
                            src={track.album_image_url}
                            alt={`Album cover for ${track.name}`}
                            className="w-full aspect-square rounded-xl shadow-lg group-hover:shadow-2xl transition-all duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                        
                        <p className="text-gray-300 text-sm mb-4 line-clamp-1">
                          {track.artists}
                        </p>
                        
                        <Button 
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200" 
                          onClick={() => openModal(track.name)}
                        >
                          Learn More
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black/50 backdrop-blur-lg border-t border-white/10 mt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center">
            <div className="flex justify-center items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Music Discovery</h3>
            </div>
            
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              Discover your next favorite songs with AI-powered recommendations. 
              Built with cutting-edge technology to bring you the best music discovery experience.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
              <a 
                href="https://vercel.com/templates/next.js/weaviate-bookrecs" 
                className="text-purple-400 hover:text-purple-300 transition-colors duration-200 font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                Deploy on Vercel
              </a>
              <span className="text-gray-600">•</span>
              <a 
                href="https://github.com/KarlNueckel/MusicRecs" 
                className="text-purple-400 hover:text-purple-300 transition-colors duration-200 font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
              </a>
              <span className="text-gray-600">•</span>
              <a 
                href="https://weaviate.io/" 
                className="text-purple-400 hover:text-purple-300 transition-colors duration-200 font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                Powered by Weaviate
              </a>
            </div>
            
                         <div className="border-t border-white/10 pt-6">
               <p className="text-gray-500 mb-2">
                 Made with ❤️ by{' '}
                 <a 
                   href="https://x.com/KarlNueckel" 
                   target="_blank" 
                   className="text-purple-400 hover:text-purple-300 transition-colors duration-200 font-medium"
                   rel="noopener noreferrer"
                 >
                   @KarlNueckel
                 </a>
               </p>
               <p className="text-gray-600 text-sm">
                 Based off a fork of project BookRecs by{' '}
                 <a 
                   href="https://x.com/aj__chan" 
                   target="_blank" 
                   className="text-purple-400 hover:text-purple-300 transition-colors duration-200 font-medium"
                   rel="noopener noreferrer"
                 >
                   @aj__chan
                 </a>
                 {' '}and the{' '}
                 <a 
                   href="https://github.com/weaviate/BookRecs" 
                   target="_blank" 
                   className="text-purple-400 hover:text-purple-300 transition-colors duration-200 font-medium"
                   rel="noopener noreferrer"
                 >
                   Weaviate team
                 </a>
               </p>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
