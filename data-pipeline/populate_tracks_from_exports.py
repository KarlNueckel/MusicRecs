import os
import pandas as pd
import weaviate
from dotenv import load_dotenv

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

def list_available_datasets():
    """List all available CSV files in the exports directory"""
    exports_dir = os.path.join(os.path.dirname(__file__), 'exports')
    csv_files = []
    
    if os.path.exists(exports_dir):
        for file in os.listdir(exports_dir):
            if file.endswith('.csv'):
                file_path = os.path.join(exports_dir, file)
                file_size = os.path.getsize(file_path) / (1024 * 1024)  # Size in MB
                csv_files.append({
                    'filename': file,
                    'path': file_path,
                    'size_mb': round(file_size, 2)
                })
    
    return csv_files

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
        
        # Clear existing data (optional - comment out if you want to append)
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
    """Main function to list available datasets and populate with selected data"""
    print("Available datasets:")
    datasets = list_available_datasets()
    
    if not datasets:
        print("No CSV files found in exports directory!")
        return
    
    for i, dataset in enumerate(datasets, 1):
        print(f"{i}. {dataset['filename']} ({dataset['size_mb']} MB)")
    
    print("\nEnter the number of the dataset you want to use:")
    try:
        choice = int(input().strip())
        if 1 <= choice <= len(datasets):
            selected_dataset = datasets[choice - 1]
            print(f"\nSelected: {selected_dataset['filename']}")
            
            # Ask for confirmation
            confirm = input("This will replace all existing tracks. Continue? (y/N): ").strip().lower()
            if confirm in ['y', 'yes']:
                print("Connecting to Weaviate...")
                client = create_weaviate_client()
                
                try:
                    print("Populating tracks...")
                    populate_tracks_from_file(client, selected_dataset['path'])
                    print("Done!")
                finally:
                    client.close()
            else:
                print("Operation cancelled.")
        else:
            print("Invalid choice!")
    except ValueError:
        print("Please enter a valid number!")
    except KeyboardInterrupt:
        print("\nOperation cancelled.")

if __name__ == "__main__":
    main()
