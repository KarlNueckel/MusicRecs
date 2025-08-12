import os, time, random
from dotenv import load_dotenv
import pandas as pd
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials
from spotipy.exceptions import SpotifyException

load_dotenv()
CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
assert CLIENT_ID and CLIENT_SECRET, "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env"

sp = Spotify(auth_manager=SpotifyClientCredentials(client_id=CLIENT_ID, client_secret=CLIENT_SECRET))

def call(fn, *args, **kwargs):
    while True:
        try:
            return fn(*args, **kwargs)
        except SpotifyException as e:
            if e.http_status == 429:
                wait = int(e.headers.get("Retry-After", "2"))
                time.sleep(wait + 1)
                continue
            raise

def chunks(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i+n]

# ------- Gather ~1000 tracks via SEARCH (no recs/genre-seeds) -------
target_count = 1000
track_map = {}  # id -> full track object

queries = [
    "year:2024-2025", "love", "night", "summer", "remix", "feat",
    "indie", "hip hop", "r&b", "k-pop", "latin", "afrobeats",
    "edm", "lofi", "ambient", "jazz", "classical", "metal",
    "piano", "guitar", "rock", "pop"
]
random.shuffle(queries)

for q in queries:
    for offset in range(0, 250, 50):  # up to 250 per query, 50/page
        res = call(sp.search, q=q, type="track", limit=50, offset=offset, market="US")
        items = res.get("tracks", {}).get("items", [])
        if not items: break
        for t in items:
            tid = t.get("id")
            if not tid or tid in track_map:
                continue
            track_map[tid] = t
            if len(track_map) >= target_count:
                break
        if len(track_map) >= target_count:
            break
    if len(track_map) >= target_count:
        break

print(f"Collected {len(track_map)} unique tracks.")

# ------- Fetch artist genres (still available) -------
artist_ids = []
for t in track_map.values():
    for a in t.get("artists", []):
        if a.get("id"):
            artist_ids.append(a["id"])
artist_ids = sorted(set(artist_ids))

artist_genres = {}
for batch in chunks(artist_ids, 50):
    data = call(sp.artists, batch)
    for a in data.get("artists", []):
        artist_genres[a["id"]] = a.get("genres", []) or []

# ------- Build CSV rows -------
rows = []
for tid, t in track_map.items():
    artists = [a["name"] for a in t.get("artists", [])]
    a_ids   = [a.get("id") for a in t.get("artists", []) if a.get("id")]
    genres  = sorted({g for aid in a_ids for g in artist_genres.get(aid, [])})
    album   = t.get("album", {}) or {}
    images  = album.get("images", []) or []
    img_url = images[0]["url"] if images else None

    rows.append({
        "spotify_id": tid,
        "name": t.get("name"),
        "artists": "; ".join(artists),
        "album": album.get("name"),
        "genres": "; ".join(genres),
        "popularity": t.get("popularity", 0),
        "duration_ms": t.get("duration_ms", 0),
        "release_date": album.get("release_date"),
        "preview_url": t.get("preview_url"),   # often null; field is deprecated
        "track_url": (t.get("external_urls") or {}).get("spotify"),
        "explicit": t.get("explicit", False),
        "album_image_url": img_url,
    })

df = pd.DataFrame(rows)
df.to_csv("tracks_1000.csv", index=False)
print("Wrote tracks_1000.csv")

