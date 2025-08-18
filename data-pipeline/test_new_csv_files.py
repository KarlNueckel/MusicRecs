import pandas as pd
import os
from pathlib import Path

def test_csv_file(csv_path):
    """Test if a CSV file is compatible with the current implementation"""
    print(f"\n=== Testing {os.path.basename(csv_path)} ===")
    
    try:
        # Read the CSV file
        df = pd.read_csv(csv_path)
        
        print(f"✅ Successfully read CSV with {len(df)} rows and {len(df.columns)} columns")
        print(f"Columns: {list(df.columns)}")
        
        # Check for required columns (based on populate_tracks.py)
        required_columns = [
            'spotify_id', 'name', 'artists', 'album', 'genres', 
            'popularity', 'duration_ms', 'release_date', 'preview_url', 
            'track_url', 'explicit', 'album_image_url'
        ]
        
        missing_columns = [col for col in required_columns if col not in df.columns]
        extra_columns = [col for col in df.columns if col not in required_columns]
        
        if missing_columns:
            print(f"❌ Missing required columns: {missing_columns}")
            return False
        else:
            print(f"✅ All required columns present")
        
        if extra_columns:
            print(f"⚠️  Extra columns found: {extra_columns}")
        
        # Test data conversion (similar to populate_tracks.py)
        print("\nTesting data conversion...")
        sample_row = df.iloc[0]
        
        try:
            test_track = {
                "spotify_id": str(sample_row['spotify_id']),
                "name": str(sample_row['name']),
                "artists": str(sample_row['artists']),
                "album": str(sample_row['album']),
                "genres": str(sample_row['genres']) if pd.notna(sample_row['genres']) else "",
                "popularity": int(sample_row['popularity']) if pd.notna(sample_row['popularity']) else 0,
                "duration_ms": int(sample_row['duration_ms']) if pd.notna(sample_row['duration_ms']) else 0,
                "release_date": str(sample_row['release_date']) if pd.notna(sample_row['release_date']) else "",
                "preview_url": str(sample_row['preview_url']) if pd.notna(sample_row['preview_url']) else "",
                "track_url": str(sample_row['track_url']),
                "explicit": bool(sample_row['explicit']) if pd.notna(sample_row['explicit']) else False,
                "album_image_url": str(sample_row['album_image_url']) if pd.notna(sample_row['album_image_url']) else ""
            }
            print("✅ Data conversion successful")
            print(f"Sample track: {test_track['name']} by {test_track['artists']}")
            return True
            
        except Exception as e:
            print(f"❌ Data conversion failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Failed to read CSV: {e}")
        return False

def main():
    """Test all CSV files in the exports folder"""
    exports_dir = Path("data-pipeline/exports")
    
    if not exports_dir.exists():
        print("❌ Exports directory not found")
        return
    
    csv_files = list(exports_dir.glob("*.csv"))
    
    if not csv_files:
        print("❌ No CSV files found in exports directory")
        return
    
    print(f"Found {len(csv_files)} CSV files to test")
    
    # Test current implementation file first
    current_file = Path("data-pipeline/tracks_1000.csv")
    if current_file.exists():
        print("\n=== Testing current implementation file ===")
        test_csv_file(current_file)
    
    # Test all export files
    successful_files = []
    for csv_file in csv_files:
        if test_csv_file(csv_file):
            successful_files.append(csv_file)
    
    print(f"\n=== Summary ===")
    print(f"Successfully tested: {len(successful_files)}/{len(csv_files)} files")
    
    if successful_files:
        print("\n✅ Compatible files:")
        for file in successful_files:
            print(f"  - {file.name}")
    
    # Show total track count
    total_tracks = 0
    for file in successful_files:
        try:
            df = pd.read_csv(file)
            total_tracks += len(df)
        except:
            pass
    
    print(f"\n📊 Total tracks available: {total_tracks:,}")

if __name__ == "__main__":
    main()

