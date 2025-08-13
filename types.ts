export interface Book {
  isbn13?: string;
  isbn10?: string;
  title?: string;
  subtitle?: string;
  authors?: string;
  categories?: string;
  thumbnail?: string;
  description?: string;
  published_year?: string;
  average_rating?: string;
  num_pages?: string;
  ratings_count?: string;
  _additional?: AdditionalType;
}

export interface Track {
  spotify_id: string;
  name: string;
  artists: string;
  album: string;
  genres: string;
  popularity: number;
  duration_ms: number;
  release_date: string;
  preview_url?: string;
  track_url: string;
  explicit: boolean;
  album_image_url: string;
  _additional?: AdditionalType;
}

// Union type for both books and tracks
export type MediaItem = Book | Track;


export interface NearTextType {
  concepts: string[];
  certainty?: number;
  moveAwayFrom?: object;
}

export interface AdditionalType {
  generate: GenerateType
}

export interface GenerateType {
  error: string;
  singleResult: string;
}