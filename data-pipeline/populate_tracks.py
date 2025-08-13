import weaviate
import pandas as pd
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

# Weaviate configuration
WEAVIATE_CLUSTER_URL = os.getenv('WEAVIATE_CLUSTER_URL')
WEAVIATE_API_KEY = os.getenv('WEAVIATE_API_KEY')

if not WEAVIATE_CLUSTER_URL or not WEAVIATE_API_KEY:
    print("Error: WEAVIATE_CLUSTER_URL and WEAVIATE_API_KEY must be set in environment variables")
    exit(1)

def create_weaviate_client():
    """Create and return a Weaviate client"""
    client = weaviate.connect_to_weaviate_cloud(
        cluster_url=WEAVIATE_CLUSTER_URL,
        auth_credentials=weaviate.auth.AuthApiKey(api_key=WEAVIATE_API_KEY)
    )
    return client

def create_track_collection(client):
    """Create the Track collection in Weaviate"""
    try:
        # Check if collection already exists
        collections = client.collections.list_all()
        if any(col.name == 'Track' for col in collections):
            print("Track collection already exists!")
            return
        
        # Define the Track class schema
        track_class = {
            "class": "Track",
            "description": "A music track with metadata",
            "properties": [
                {
                    "name": "spotify_id",
                    "dataType": ["string"],
                    "description": "Spotify track ID"
                },
                {
                    "name": "name",
                    "dataType": ["string"],
                    "description": "Track name"
                },
                {
                    "name": "artists",
                    "dataType": ["string"],
                    "description": "Track artists"
                },
                {
                    "name": "album",
                    "dataType": ["string"],
                    "description": "Album name"
                },
                {
                    "name": "genres",
                    "dataType": ["string"],
                    "description": "Track genres"
                },
                {
                    "name": "popularity",
                    "dataType": ["int"],
                    "description": "Track popularity score"
                },
                {
                    "name": "duration_ms",
                    "dataType": ["int"],
                    "description": "Track duration in milliseconds"
                },
                {
                    "name": "release_date",
                    "dataType": ["string"],
                    "description": "Release date"
                },
                {
                    "name": "preview_url",
                    "dataType": ["string"],
                    "description": "Preview URL"
                },
                {
                    "name": "track_url",
                    "dataType": ["string"],
                    "description": "Spotify track URL"
                },
                {
                    "name": "explicit",
                    "dataType": ["boolean"],
                    "description": "Whether track is explicit"
                },
                {
                    "name": "album_image_url",
                    "dataType": ["string"],
                    "description": "Album cover image URL"
                }
            ],
            "vectorizer": "text2vec-openai" if os.getenv('OPENAI_API_KEY') else "none"
        }
        
        # Create the collection using the new API
        client.collections.create(
            name="Track",
            description="A music track with metadata",
            properties=[
                weaviate.classes.config.Property(name="spotify_id", data_type=weaviate.classes.config.DataType.TEXT),
                weaviate.classes.config.Property(name="name", data_type=weaviate.classes.config.DataType.TEXT),
                weaviate.classes.config.Property(name="artists", data_type=weaviate.classes.config.DataType.TEXT),
                weaviate.classes.config.Property(name="album", data_type=weaviate.classes.config.DataType.TEXT),
                weaviate.classes.config.Property(name="genres", data_type=weaviate.classes.config.DataType.TEXT),
                weaviate.classes.config.Property(name="popularity", data_type=weaviate.classes.config.DataType.INT),
                weaviate.classes.config.Property(name="duration_ms", data_type=weaviate.classes.config.DataType.INT),
                weaviate.classes.config.Property(name="release_date", data_type=weaviate.classes.config.DataType.TEXT),
                weaviate.classes.config.Property(name="preview_url", data_type=weaviate.classes.config.DataType.TEXT),
                weaviate.classes.config.Property(name="track_url", data_type=weaviate.classes.config.DataType.TEXT),
                weaviate.classes.config.Property(name="explicit", data_type=weaviate.classes.config.DataType.BOOLEAN),
                weaviate.classes.config.Property(name="album_image_url", data_type=weaviate.classes.config.DataType.TEXT)
            ],
            vectorizer_config=weaviate.classes.config.Configure.Vectorizer.text2vec_openai() if os.getenv('OPENAI_API_KEY') else None
        )
        print("Track collection created successfully!")
        
    except Exception as e:
        print(f"Error creating Track collection: {e}")

def populate_tracks(client):
    """Populate the Track collection with data from CSV"""
    try:
        # Read the CSV file
        csv_path = os.path.join(os.path.dirname(__file__), 'tracks_1000.csv')
        df = pd.read_csv(csv_path)
        
        print(f"Found {len(df)} tracks in CSV file")
        
        # Get the Track collection
        track_collection = client.collections.get("Track")
        
        # Convert DataFrame to list of dictionaries
        tracks = []
        for _, row in df.iterrows():
            track = {
                "spotify_id": str(row['spotify_id']),
                "name": str(row['name']),
                "artists": str(row['artists']),
                "album": str(row['album']),
                "genres": str(row['genres']) if pd.notna(row['genres']) else "",
                "popularity": int(row['popularity']) if pd.notna(row['popularity']) else 0,
                "duration_ms": int(row['duration_ms']) if pd.notna(row['duration_ms']) else 0,
                "release_date": str(row['release_date']) if pd.notna(row['release_date']) else "",
                "preview_url": str(row['preview_url']) if pd.notna(row['preview_url']) else "",
                "track_url": str(row['track_url']),
                "explicit": bool(row['explicit']) if pd.notna(row['explicit']) else False,
                "album_image_url": str(row['album_image_url']) if pd.notna(row['album_image_url']) else ""
            }
            tracks.append(track)
        
        # Batch insert tracks
        batch_size = 100
        for i in range(0, len(tracks), batch_size):
            batch = tracks[i:i + batch_size]
            
            with track_collection.batch.dynamic() as batch_client:
                for track in batch:
                    batch_client.add_object(
                        properties=track
                    )
            
            print(f"Inserted tracks {i+1} to {min(i+batch_size, len(tracks))}")
        
        print(f"Successfully populated {len(tracks)} tracks!")
        
    except Exception as e:
        print(f"Error populating tracks: {e}")

def main():
    """Main function to create collection and populate with data"""
    print("Connecting to Weaviate...")
    client = create_weaviate_client()
    
    try:
        print("Creating Track collection...")
        create_track_collection(client)
        
        print("Populating tracks...")
        populate_tracks(client)
        
        print("Done!")
    finally:
        client.close()

if __name__ == "__main__":
    main()
