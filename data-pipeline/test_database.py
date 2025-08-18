import weaviate
import os
from dotenv import load_dotenv

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

def test_database():
    """Test what's in the database"""
    print("Connecting to Weaviate...")
    client = create_weaviate_client()
    
    try:
        # Check if Track collection exists
        try:
            track_collection = client.collections.get("Track")
            print(f"✅ Found Track collection")
        except Exception as e:
            print(f"❌ Track collection not found: {e}")
            return
        
        # Get total count
        try:
            count_result = client.collections.get("Track").aggregate.over_all(total_count=True)
            total_count = count_result.total
            print(f"📊 Total tracks in database: {total_count}")
        except Exception as e:
            print(f"⚠️ Could not get total count: {e}")
            total_count = "Unknown"
        
        # Test genre search for "pop"
        print("\n🔍 Testing genre search for 'pop'...")
        try:
            # Try BM25 search
            result = client.collections.get("Track").with_bm25("pop").with_limit(50).do()
            
            tracks = result.objects
            print(f"✅ Found {len(tracks)} tracks with 'pop' in BM25 search")
            
            if tracks:
                print("\nSample tracks found:")
                for i, track in enumerate(tracks[:5]):
                    print(f"  {i+1}. {track.properties.get('name', 'N/A')} by {track.properties.get('artists', 'N/A')}")
                    print(f"     Genres: {track.properties.get('genres', 'N/A')}")
                    print(f"     Album: {track.properties.get('album', 'N/A')}")
                    print()
            
        except Exception as e:
            print(f"❌ BM25 search failed: {e}")
        
        # Test exact genre match
        print("\n🔍 Testing exact genre match for 'pop'...")
        try:
            result = client.collections.get("Track").with_where({
                "path": ["genres"],
                "operator": "ContainsAny",
                "valueText": ["pop"]
            }).with_limit(50).do()
            
            tracks = result.objects
            print(f"✅ Found {len(tracks)} tracks with exact 'pop' genre match")
            
            if tracks:
                print("\nSample tracks with 'pop' genre:")
                for i, track in enumerate(tracks[:5]):
                    print(f"  {i+1}. {track.properties.get('name', 'N/A')} by {track.properties.get('artists', 'N/A')}")
                    print(f"     Genres: {track.properties.get('genres', 'N/A')}")
                    print()
            
        except Exception as e:
            print(f"❌ Exact genre search failed: {e}")
        
        # Get some random tracks to see what genres are available
        print("\n🔍 Getting random tracks to see available genres...")
        try:
            result = client.collections.get("Track").with_limit(20).do()
            
            tracks = result.objects
            print(f"✅ Found {len(tracks)} random tracks")
            
            # Collect unique genres
            all_genres = set()
            for track in tracks:
                genres = track.properties.get('genres', '')
                if genres:
                    # Split genres and add to set
                    genre_list = [g.strip() for g in genres.split(';') if g.strip()]
                    all_genres.update(genre_list)
            
            print(f"\n📋 Sample genres found in database:")
            for genre in sorted(list(all_genres))[:20]:  # Show first 20
                print(f"  - {genre}")
            
            if len(all_genres) > 20:
                print(f"  ... and {len(all_genres) - 20} more genres")
            
        except Exception as e:
            print(f"❌ Random tracks query failed: {e}")
        
    finally:
        client.close()

if __name__ == "__main__":
    test_database()
