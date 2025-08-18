import os
import pandas as pd
import weaviate
from dotenv import load_dotenv
import glob

load_dotenv()

def create_weaviate_client():
    """Create and return a Weaviate client"""
    weaviate_url = os.getenv('WEAVIATE_CLUSTER_URL')
    weaviate_api_key = os.getenv('WEAVIATE_API_KEY')
    
    if not weaviate_url or not weaviate_api_key:
        raise ValueError("WEAVIATE_CLUSTER_URL and WEAVIATE_API_KEY must be set in environment variables")
    
    # Remove https:// if present
    weaviate_url = weaviate_url.replace("https://", "")
    
    return weaviate.Client(
        url=f"https://{weaviate_url}",
        auth_client_secret=weaviate.Auth.api_key(weaviate_api_key),
        additional_headers={
            "X-OpenAI-Api-Key": os.getenv('OPENAI_API_KEY') if os.getenv('OPENAI_API_KEY') else "",
            "X-Cohere-Api-Key": os.getenv('COHERE_API_KEY') if os.getenv('COHERE_API_KEY') else ""
        }
    )

def get_latest_export_file():
    """Get the most recent CSV file from the exports directory"""
    exports_dir = os.path.join(os.path.dirname(__file__), 'exports')
    csv_files = glob.glob(os.path.join(exports_dir, 'tracks_*.csv'))
    
    if not csv_files:
        raise FileNotFoundError("No track CSV files found in exports directory")
    
    # Sort by modification time (newest first)
    latest_file = max(csv_files, key=os.path.getmtime)
    return latest_file

def create_track_collection(client):
    """Create the Track collection if it doesn't exist"""
    try:
        # Check if collection already exists
        collections = client.collections.list_all()
        if any(col.name == "Track" for col in collections):
            print("Track collection already exists!")
            return
        
        print("Creating Track collection...")
        
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

def populate_tracks_from_file(client, csv_path):
    """Populate the Track collection with data from a specific CSV file"""
    try:
        print(f"Reading CSV file: {csv_path}")
        df = pd.read_csv(csv_path)
        
        print(f"Found {len(df)} tracks in CSV file")
        
        # Check if Track collection exists, if not create it
        collections = client.collections.list_all()
        if not any(col.name == "Track" for col in collections):
            print("Track collection doesn't exist. Creating it...")
            create_track_collection(client)
        
        # Get the Track collection
        track_collection = client.collections.get("Track")
        
        # Clear existing data
        print("Clearing existing tracks...")
        track_collection.delete_many()
        
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
    """Main function to use the latest export file"""
    try:
        # Get the latest export file
        latest_file = get_latest_export_file()
        print(f"Using latest export file: {os.path.basename(latest_file)}")
        
        # Connect to Weaviate
        print("Connecting to Weaviate...")
        client = create_weaviate_client()
        
        try:
            # Populate with the latest data
            populate_tracks_from_file(client, latest_file)
            print("Done!")
        finally:
            client.close()
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
