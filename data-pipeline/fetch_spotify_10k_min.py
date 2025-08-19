import os, sys, time, csv, json, random, string, datetime, pathlib
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials
from spotipy.exceptions import SpotifyException

# ------------ Config ------------
TARGET = int(os.getenv("TARGET_TRACKS", "10000"))
ROOT = pathlib.Path(__file__).parent.resolve()
OUTPUT_DIR = (ROOT / "exports").resolve()
SEEN_FILE  = (ROOT / "seen_track_ids.jsonl").resolve()
GENRE_CACHE = (ROOT / "artist_genres_cache.json").resolve()

MARKETS = ["US","GB","CA","AU","DE","FR","BR","JP","SE","MX","NL","IT","ES","PL","KR"]
YEAR_BUCKETS = [(1960,1979),(1980,1989),(1990,1999),(2000,2009),(2010,2016),(2017,2020),(2021,2022),(2023,2025)]
SEARCH_THEMES = [
  "love","night","summer","remix","feat","indie","hip hop","r&b","k-pop","latin","afrobeats",
  "edm","lofi","ambient","jazz","classical","metal","piano","guitar","rock","pop","acoustic",
  "melancholy","happy","upbeat","rain","study","sleep","workout","party","wedding","throwback"
]
# ----------------------------------

def new_client() -> Spotify:
    load_dotenv()
    cid, secret = os.getenv("SPOTIFY_CLIENT_ID"), os.getenv("SPOTIFY_CLIENT_SECRET")
    assert cid and secret, "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env"
    return Spotify(auth_manager=SpotifyClientCredentials(client_id=cid, client_secret=secret), requests_timeout=30)

class API:
    def __init__(self):
        self.sp = new_client()
    def call(self, fn, *args, **kwargs):
        for attempt in range(8):
            try:
                return fn(*args, **kwargs)
            except SpotifyException as e:
                status = getattr(e, "http_status", None)
                if status == 401:
                    time.sleep(1); self.sp = new_client(); continue
                if status == 429:
                    wait = int(e.headers.get("Retry-After", "2")); time.sleep(wait + 1); continue
                if status and 500 <= status < 600:
                    time.sleep(1.5 * (attempt + 1)); continue
                raise
            except Exception:
                time.sleep(1.2 * (attempt + 1))
        raise RuntimeError("Spotify API retries exhausted")

api = API()

def rand_ngram():
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for _ in range(random.choice([2,3])))

def build_queries(run_seed: int) -> List[str]:
    random.seed(run_seed)
    qs = []
    themes = SEARCH_THEMES[:]; random.shuffle(themes)
    buckets = random.sample(YEAR_BUCKETS, k=3)
    for theme in themes[:24]:
        y0,y1 = random.choice(buckets); qs.append(f'{theme} year:{y0}-{y1}')
    for _ in range(24):
        y0,y1 = random.choice(YEAR_BUCKETS); qs.append(f'{rand_ngram()} year:{y0}-{y1}')
    return qs

def search_block(q: str, market: Optional[str], limit_total=300, page_size=50) -> List[Dict[str, Any]]:
    grabbed, offset = [], 0
    while len(grabbed) < limit_total:
        res = api.call(api.sp.search, q=q, type="track", limit=page_size, offset=offset, market=market)
        items = res.get("tracks", {}).get("items", [])
        if not items: break
        grabbed.extend(items)
        offset += len(items)
        if len(items) < page_size: break
    return grabbed

def load_seen() -> set:
    seen = set()
    if SEEN_FILE.exists():
        with SEEN_FILE.open("r", encoding="utf-8") as f:
            for line in f:
                s = line.strip()
                if s: seen.add(s)
    return seen

def append_seen(ids: set):
    if not ids: return
    with SEEN_FILE.open("a", encoding="utf-8") as f:
        for tid in ids: f.write(tid + "\n")

def load_genre_cache() -> dict:
    if GENRE_CACHE.exists():
        return json.loads(GENRE_CACHE.read_text(encoding="utf-8"))
    return {}

def fetch_artist_genres(artist_ids: List[str], cache: dict):
    todo = [a for a in artist_ids if a and a not in cache]
    for i in range(0, len(todo), 50):
        data = api.call(api.sp.artists, todo[i:i+50])
        for a in data.get("artists", []):
            cache[a["id"]] = a.get("genres", []) or []
    GENRE_CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")

def normalize_row(t: dict, genre_cache: dict) -> dict:
    album = t.get("album") or {}
    artists = t.get("artists") or []
    a_names = [a["name"] for a in artists]
    a_ids   = [a.get("id") for a in artists if a.get("id")]
    genres = sorted({g for aid in a_ids for g in genre_cache.get(aid, [])})
    images = album.get("images", []) or []
    img = images[0]["url"] if images else None
    return {
        "spotify_id": t.get("id"),
        "name": t.get("name"),
        "artists": "; ".join(a_names),
        "album": album.get("name"),
        "genres": "; ".join(genres),
        "popularity": t.get("popularity", 0),
        "duration_ms": t.get("duration_ms", 0),
        "release_date": album.get("release_date"),
        "preview_url": t.get("preview_url"),
        "track_url": (t.get("external_urls") or {}).get("spotify"),
        "explicit": t.get("explicit", False),
        "album_image_url": img,
        "isrc": (t.get("external_ids") or {}).get("isrc", "")
    }

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[using] OUTPUT_DIR={OUTPUT_DIR}")
    print(f"[using] SEEN_FILE={SEEN_FILE}")

    run_seed = int(time.time()); random.seed(run_seed)
    seen = load_seen()
    new_ids = set()
    rows = []

    queries = build_queries(run_seed)
    markets = random.sample(MARKETS, k=5)

    for m in markets:
        for q in queries:
            if len(rows) >= TARGET: break
            tracks = search_block(q, m, limit_total=300, page_size=50)
            random.shuffle(tracks)
            for t in tracks:
                tid = t.get("id")
                if not tid or tid in seen or tid in new_ids: continue
                new_ids.add(tid); rows.append(t)
                if len(rows) >= TARGET: break
        if len(rows) >= TARGET: break

    if not rows:
        print("[run] no tracks collected. Try re-running.")
        sys.exit(2)

    # enrich genres (batched)
    a_ids = []
    for t in rows:
        for a in t.get("artists", []):
            if a.get("id"): a_ids.append(a["id"])
    cache = load_genre_cache()
    fetch_artist_genres(sorted(set(a_ids)), cache)

    # write CSV
    norm = [normalize_row(t, cache) for t in rows]
    ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = OUTPUT_DIR / f"tracks_{len(norm)}_{ts}.csv"
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(norm[0].keys()))
        w.writeheader(); w.writerows(norm)

    append_seen(new_ids)
    print(f"[done] wrote {len(norm)} tracks -> {out}")
    print(f"[done] appended {len(new_ids)} new IDs to {SEEN_FILE}")

if __name__ == "__main__":
    main()
