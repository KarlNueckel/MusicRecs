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
        # Get the Track collection
        track_collection = client.collections.get("Track")
        print("✅ Found Track collection")
        
        # Try to get some objects
        print("\n🔍 Getting some tracks from the database...")
        try:
            # Get a few objects to see what's there
            result = track_collection.query.fetch_objects(limit=10)
            objects = result.objects
            print(f"✅ Found {len(objects)} tracks in sample")
            
            if objects:
                print("\nSample tracks:")
                for i, obj in enumerate(objects[:5]):
                    props = obj.properties
                    print(f"  {i+1}. {props.get('name', 'N/A')} by {props.get('artists', 'N/A')}")
                    print(f"     Genres: {props.get('genres', 'N/A')}")
                    print(f"     Album: {props.get('album', 'N/A')}")
                    print()
            
            # Check for pop genre specifically
            print("\n🔍 Looking for tracks with 'pop' genre...")
            pop_tracks = []
            for obj in objects:
                genres = obj.properties.get('genres', '').lower()
                if 'pop' in genres:
                    pop_tracks.append(obj)
            
            print(f"Found {len(pop_tracks)} tracks with 'pop' in genres from sample")
            if pop_tracks:
                print("\nPop tracks found:")
                for i, obj in enumerate(pop_tracks[:3]):
                    props = obj.properties
                    print(f"  {i+1}. {props.get('name', 'N/A')} by {props.get('artists', 'N/A')}")
                    print(f"     Genres: {props.get('genres', 'N/A')}")
                    print()
            
        except Exception as e:
            print(f"❌ Error fetching objects: {e}")
        
    finally:
        client.close()

if __name__ == "__main__":
    test_database()
