import weaviate
import os
from dotenv import load_dotenv
from collections import Counter

# Load environment variables
load_dotenv('../.env.local')

# Weaviate configuration
WEAVIATE_CLUSTER_URL = os.getenv('WEAVIATE_CLUSTER_URL')
WEAVIATE_API_KEY = os.getenv('WEAVIATE_API_KEY')

def create_weaviate_client():
    """Create and return a Weaviate client"""
    client = weaviate.connect_to_weaviate_cloud(
        cluster_url=WEAVIATE_CLUSTER_URL,
        auth_credentials=weaviate.auth.AuthApiKey(api_key=WEAVIATE_API_KEY)
    )
    return client

def check_genres():
    """Check what genres are in the database"""
    print("Connecting to Weaviate...")
    client = create_weaviate_client()
    
    try:
        track_collection = client.collections.get("Track")
        print("✅ Found Track collection")
        
        # Get a larger sample to see genre distribution
        print("\n🔍 Getting a larger sample to check genres...")
        
        all_genres = []
        pop_tracks = []
        total_tracks = 0
        
        # Get tracks in batches to see genre distribution
        for offset in range(0, 1000, 100):  # Check first 1000 tracks
            try:
                result = track_collection.query.fetch_objects(limit=100, offset=offset)
                objects = result.objects
                
                if not objects:
                    break
                
                total_tracks += len(objects)
                
                for obj in objects:
                    genres = obj.properties.get('genres', '').strip()
                    if genres:
                        # Split genres by semicolon
                        genre_list = [g.strip().lower() for g in genres.split(';') if g.strip()]
                        all_genres.extend(genre_list)
                        
                        # Check for pop-related genres
                        if any('pop' in g for g in genre_list):
                            pop_tracks.append({
                                'name': obj.properties.get('name', 'N/A'),
                                'artists': obj.properties.get('artists', 'N/A'),
                                'genres': genres
                            })
                
                print(f"Processed {total_tracks} tracks so far...")
                
            except Exception as e:
                print(f"Error at offset {offset}: {e}")
                break
        
        # Analyze genres
        genre_counter = Counter(all_genres)
        
        print(f"\n📊 Genre Analysis (from {total_tracks} tracks):")
        print(f"Total unique genres found: {len(genre_counter)}")
        
        print(f"\n🎵 Top 20 most common genres:")
        for genre, count in genre_counter.most_common(20):
            print(f"  {genre}: {count} tracks")
        
        print(f"\n🔍 Pop-related tracks found: {len(pop_tracks)}")
        if pop_tracks:
            print("\nSample pop tracks:")
            for i, track in enumerate(pop_tracks[:10]):
                print(f"  {i+1}. {track['name']} by {track['artists']}")
                print(f"     Genres: {track['genres']}")
                print()
        
        # Check for common pop variations
        pop_variations = ['pop', 'pop rock', 'indie pop', 'synthpop', 'electropop', 'dance pop']
        print(f"\n🔍 Checking for specific pop variations:")
        for pop_type in pop_variations:
            count = genre_counter.get(pop_type, 0)
            print(f"  {pop_type}: {count} tracks")
        
    finally:
        client.close()

if __name__ == "__main__":
    check_genres()

