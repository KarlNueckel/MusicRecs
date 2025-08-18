const fs = require('fs');
const path = require('path');

// Test loading the JSON database
function testDatabase() {
  try {
    const jsonPath = path.join(__dirname, 'data-pipeline', 'tracks_database.json');
    console.log('Testing database at:', jsonPath);
    
    // Check if file exists
    if (!fs.existsSync(jsonPath)) {
      console.error('❌ Database file does not exist!');
      return;
    }
    
    // Read and parse the file
    const data = fs.readFileSync(jsonPath, 'utf8');
    console.log('✅ File read successfully, size:', data.length, 'characters');
    
    const tracks = JSON.parse(data);
    console.log('✅ JSON parsed successfully');
    console.log('📊 Total tracks:', tracks.length);
    
    if (tracks.length > 0) {
      console.log('🎵 Sample track:', {
        name: tracks[0].name,
        artists: tracks[0].artists,
        genres: tracks[0].genres,
        popularity: tracks[0].popularity
      });
      
      // Test search functionality
      const searchTerm = 'rock';
      const matchingTracks = tracks.filter(track => 
        (track.name || '').toLowerCase().includes(searchTerm) ||
        (track.artists || '').toLowerCase().includes(searchTerm) ||
        (track.genres || '').toLowerCase().includes(searchTerm)
      );
      
      console.log(`🔍 Found ${matchingTracks.length} tracks matching "${searchTerm}"`);
      
      if (matchingTracks.length > 0) {
        console.log('🎵 Sample match:', {
          name: matchingTracks[0].name,
          artists: matchingTracks[0].artists,
          genres: matchingTracks[0].genres
        });
      }
    }
    
    console.log('✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing database:', error);
  }
}

testDatabase();
