import os
import pandas as pd
import glob
import json

def get_all_export_files():
    """Get all CSV files from the exports directory"""
    exports_dir = os.path.join(os.path.dirname(__file__), 'exports')
    csv_files = glob.glob(os.path.join(exports_dir, 'tracks_*.csv'))
    
    if not csv_files:
        raise FileNotFoundError("No track CSV files found in exports directory")
    
    return sorted(csv_files)

def create_optimized_dataset():
    """Create an optimized dataset with the best tracks"""
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
    
    # Remove duplicates
    print("Removing duplicates...")
    initial_count = len(combined_df)
    combined_df = combined_df.drop_duplicates(subset=['spotify_id'], keep='first')
    combined_df = combined_df.drop_duplicates(subset=['name', 'artists'], keep='first')
    final_count = len(combined_df)
    print(f"Removed {initial_count - final_count} duplicates")
    
    # Filter for quality tracks (popularity > 20 and has genres)
    print("Filtering for quality tracks...")
    quality_df = combined_df[
        (combined_df['popularity'] > 20) & 
        (combined_df['genres'].notna()) & 
        (combined_df['genres'] != '')
    ].copy()
    
    print(f"Quality filter: {len(quality_df)} tracks (popularity > 20, has genres)")
    
    # Sort by popularity
    quality_df = quality_df.sort_values('popularity', ascending=False)
    
    # Use all quality tracks (no limit)
    final_df = quality_df.copy()
    
    print(f"Final dataset: {len(final_df)} tracks")
    
    # Save optimized CSV
    output_file = os.path.join(os.path.dirname(__file__), 'optimized_tracks.csv')
    final_df.to_csv(output_file, index=False)
    print(f"Saved optimized dataset to: {output_file}")
    
    # Also create a JSON file for even faster access
    json_file = os.path.join(os.path.dirname(__file__), 'tracks_database.json')
    
    # Convert to list and handle NaN values
    tracks_list = []
    for _, row in final_df.iterrows():
        track_dict = {}
        for column, value in row.items():
            if pd.isna(value):
                track_dict[column] = None
            elif isinstance(value, (int, float)) and pd.isna(value):
                track_dict[column] = None
            else:
                track_dict[column] = value
        tracks_list.append(track_dict)
    
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(tracks_list, f, ensure_ascii=False, indent=2)
    
    print(f"Saved JSON database to: {json_file}")
    
    # Show statistics
    print(f"\n=== Final Dataset Statistics ===")
    print(f"Total tracks: {len(final_df)}")
    print(f"Popularity range: {final_df['popularity'].min()} - {final_df['popularity'].max()}")
    print(f"Genres: {final_df['genres'].nunique()}")
    print(f"Artists: {final_df['artists'].nunique()}")
    
    print(f"\nTop 10 genres:")
    genre_counts = final_df['genres'].value_counts().head(10)
    for genre, count in genre_counts.items():
        print(f"  {genre}: {count} tracks")
    
    return final_df

def main():
    """Create optimized dataset"""
    try:
        print("=== Creating Optimized Track Dataset ===")
        final_df = create_optimized_dataset()
        
        print(f"\n=== SUCCESS ===")
        print(f"Created optimized dataset with {len(final_df)} high-quality tracks!")
        print("Files created:")
        print("  - optimized_tracks.csv (for CSV access)")
        print("  - tracks_database.json (for fast JSON access)")
        print("\nYou can now use these files directly in your app for much faster performance!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
