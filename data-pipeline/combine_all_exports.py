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

def get_all_export_files():
    """Get all CSV files from the exports directory"""
    exports_dir = os.path.join(os.path.dirname(__file__), 'exports')
    csv_files = glob.glob(os.path.join(exports_dir, 'tracks_*.csv'))
    
    if not csv_files:
        raise FileNotFoundError("No track CSV files found in exports directory")
    
    return sorted(csv_files)

def combine_csv_files():
    """Combine all CSV files and remove duplicates"""
    csv_files = get_all_export_files()
    
    print(f"Found {len(csv_files)} CSV files to combine:")
    for file in csv_files:
        print(f"  - {os.path.basename(file)}")
    
    # Read and combine all CSV files
    all_dataframes = []
    total_tracks_before_dedup = 0
    
    for i, csv_file in enumerate(csv_files, 1):
        print(f"\nProcessing file {i}/{len(csv_files)}: {os.path.basename(csv_file)}")
        
        try:
            df = pd.read_csv(csv_file)
            print(f"  - Found {len(df)} tracks")
            total_tracks_before_dedup += len(df)
            all_dataframes.append(df)
        except Exception as e:
            print(f"  - Error reading {csv_file}: {e}")
            continue
    
    if not all_dataframes:
        raise ValueError("No valid CSV files could be read")
    
    # Combine all dataframes
    print(f"\nCombining {len(all_dataframes)} dataframes...")
    combined_df = pd.concat(all_dataframes, ignore_index=True)
    print(f"Combined dataset has {len(combined_df)} tracks")
    
    # Remove duplicates based on spotify_id (most reliable identifier)
    print("Removing duplicates based on spotify_id...")
    initial_count = len(combined_df)
    combined_df = combined_df.drop_duplicates(subset=['spotify_id'], keep='first')
    final_count = len(combined_df)
    duplicates_removed = initial_count - final_count
    
    print(f"Removed {duplicates_removed} duplicate tracks")
    print(f"Final dataset has {final_count} unique tracks")
    
    # Also remove duplicates based on name + artists (in case spotify_id is missing)
    print("Removing additional duplicates based on name + artists...")
    initial_count = len(combined_df)
    combined_df = combined_df.drop_duplicates(subset=['name', 'artists'], keep='first')
    final_count = len(combined_df)
    additional_duplicates = initial_count - final_count
    
    print(f"Removed {additional_duplicates} additional duplicate tracks")
    print(f"Final dataset has {final_count} unique tracks")
    
    # Sort by popularity (descending) to prioritize popular tracks
    print("Sorting by popularity...")
    combined_df = combined_df.sort_values('popularity', ascending=False)
    
    # Reset index
    combined_df = combined_df.reset_index(drop=True)
    
    return combined_df

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

def populate_tracks_from_dataframe(client, df):
    """Populate the Track collection with data from a DataFrame"""
    try:
        print(f"Preparing to insert {len(df)} tracks...")
        
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
        total_batches = (len(tracks) + batch_size - 1) // batch_size
        
        print(f"Inserting {len(tracks)} tracks in {total_batches} batches...")
        
        for i in range(0, len(tracks), batch_size):
            batch = tracks[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            
            with track_collection.batch.dynamic() as batch_client:
                for track in batch:
                    batch_client.add_object(
                        properties=track
                    )
            
            print(f"Inserted batch {batch_num}/{total_batches} (tracks {i+1} to {min(i+batch_size, len(tracks))})")
        
        print(f"Successfully populated {len(tracks)} tracks!")
        
        # Save the combined dataset to a new CSV file for future reference
        output_file = os.path.join(os.path.dirname(__file__), 'combined_tracks_dataset.csv')
        df.to_csv(output_file, index=False)
        print(f"Combined dataset saved to: {output_file}")
        
    except Exception as e:
        print(f"Error populating tracks: {e}")

def main():
    """Main function to combine all exports and populate database"""
    try:
        print("=== Combining All Export Files ===")
        
        # Combine all CSV files
        combined_df = combine_csv_files()
        
        # Show some statistics
        print(f"\n=== Dataset Statistics ===")
        print(f"Total unique tracks: {len(combined_df)}")
        print(f"Popularity range: {combined_df['popularity'].min()} - {combined_df['popularity'].max()}")
        print(f"Genres found: {combined_df['genres'].nunique()}")
        print(f"Artists found: {combined_df['artists'].nunique()}")
        
        # Show top genres
        print(f"\nTop 10 genres:")
        genre_counts = combined_df['genres'].value_counts().head(10)
        for genre, count in genre_counts.items():
            print(f"  {genre}: {count} tracks")
        
        # Ask for confirmation
        confirm = input(f"\nThis will replace all existing tracks with {len(combined_df)} unique tracks. Continue? (y/N): ").strip().lower()
        if confirm in ['y', 'yes']:
            print("\nConnecting to Weaviate...")
            client = create_weaviate_client()
            
            try:
                print("Populating database with combined dataset...")
                populate_tracks_from_dataframe(client, combined_df)
                print("\n=== SUCCESS ===")
                print(f"Your database now contains {len(combined_df)} unique tracks!")
                print("You can now restart your Next.js app to see the expanded dataset.")
            finally:
                client.close()
        else:
            print("Operation cancelled.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
