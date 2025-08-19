import os
import pandas as pd
import json
import random

def create_sample_database(sample_size=5000):
    """Create a sample database with a smaller number of high-quality tracks"""
    
    print(f"Creating sample database with {sample_size} tracks...")
    
    # Check if we have the full database to sample from
    full_db_path = os.path.join(os.path.dirname(__file__), 'tracks_database.json')
    optimized_csv_path = os.path.join(os.path.dirname(__file__), 'optimized_tracks.csv')
    
    if os.path.exists(full_db_path):
        print("Found existing full database, sampling from it...")
        with open(full_db_path, 'r', encoding='utf-8') as f:
            all_tracks = json.load(f)
        
        # Sample tracks, prioritizing higher popularity
        all_tracks.sort(key=lambda x: x.get('popularity', 0), reverse=True)
        sample_tracks = all_tracks[:sample_size]
        
    elif os.path.exists(optimized_csv_path):
        print("Found optimized CSV, sampling from it...")
        df = pd.read_csv(optimized_csv_path)
        df = df.sort_values('popularity', ascending=False)
        sample_df = df.head(sample_size)
        
        # Convert to list format
        sample_tracks = []
        for _, row in sample_df.iterrows():
            track_dict = {}
            for column, value in row.items():
                if pd.isna(value):
                    track_dict[column] = None
                else:
                    track_dict[column] = value
            sample_tracks.append(track_dict)
    
    else:
        print("No existing database found. Creating sample data...")
        sample_tracks = create_demo_tracks(sample_size)
    
    # Save sample database
    sample_db_path = os.path.join(os.path.dirname(__file__), 'tracks_database_sample.json')
    with open(sample_db_path, 'w', encoding='utf-8') as f:
        json.dump(sample_tracks, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Sample database created: {sample_db_path}")
    print(f"📊 Contains {len(sample_tracks)} tracks")
    
    # Show some statistics
    if sample_tracks:
        popularities = [t.get('popularity', 0) for t in sample_tracks if t.get('popularity') is not None]
        genres = []
        for track in sample_tracks:
            if track.get('genres'):
                genres.extend(track['genres'].split('; '))
        
        print(f"📈 Average popularity: {sum(popularities) / len(popularities):.1f}")
        print(f"🎵 Unique genres: {len(set(genres))}")
        print(f"🎤 Sample artists: {', '.join([t.get('artists', '').split('; ')[0] for t in sample_tracks[:5] if t.get('artists')])}")
    
    return sample_db_path

def create_demo_tracks(count=5000):
    """Create demo tracks for testing when no real data is available"""
    
    print("Creating demo tracks for testing...")
    
    # Sample data for demo
    demo_artists = [
        "The Beatles", "Queen", "Michael Jackson", "Madonna", "Elvis Presley",
        "Bob Dylan", "David Bowie", "Prince", "Stevie Wonder", "Aretha Franklin",
        "Led Zeppelin", "Pink Floyd", "The Rolling Stones", "Bob Marley", "John Lennon",
        "Paul McCartney", "George Harrison", "Ringo Starr", "Freddie Mercury", "Brian May"
    ]
    
    demo_genres = [
        "rock", "pop", "soul", "r&b", "jazz", "blues", "folk", "country", "reggae",
        "electronic", "hip hop", "classical", "indie", "alternative", "punk"
    ]
    
    demo_albums = [
        "Abbey Road", "Thriller", "The Wall", "Dark Side of the Moon", "Back in Black",
        "Hotel California", "Rumours", "Born to Run", "Pet Sounds", "Sgt. Pepper's",
        "Revolver", "Rubber Soul", "Let It Be", "A Night at the Opera", "News of the World"
    ]
    
    demo_tracks = []
    
    for i in range(count):
        artist = random.choice(demo_artists)
        genre = random.choice(demo_genres)
        album = random.choice(demo_albums)
        popularity = random.randint(30, 95)
        
        track = {
            "spotify_id": f"demo_track_{i:06d}",
            "name": f"Demo Track {i+1}",
            "artists": artist,
            "album": album,
            "genres": genre,
            "popularity": popularity,
            "duration_ms": random.randint(120000, 300000),
            "release_date": f"{random.randint(1960, 2023)}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}",
            "preview_url": None,
            "track_url": f"https://open.spotify.com/track/demo_track_{i:06d}",
            "explicit": random.choice([True, False]),
            "album_image_url": None,
            "isrc": f"DEMO{i:06d}"
        }
        
        demo_tracks.append(track)
    
    return demo_tracks

if __name__ == "__main__":
    # Create a sample database with 5000 tracks
    sample_db_path = create_sample_database(5000)
    print(f"\n🎉 Sample database ready at: {sample_db_path}")
    print("Users can now test the app immediately!")
