#!/usr/bin/env python3
"""
Expand the Show Suggester dataset by pulling from multiple sources:
- Bechdel Test API (all movies that pass the test)
- IMDB Top 250 list
- Bechdel Test RSS feed (new recommendations)
- Movie posters from various sources

Usage:
    python3 expand_dataset.py                    # Expand with default settings
    python3 expand_dataset.py --stats            # Show stats only
    python3 expand_dataset.py --merge-only       # Don't fetch, just organize existing data
"""

import json
import requests
import feedparser
import argparse
from datetime import datetime
from collections import defaultdict
from urllib.parse import urljoin
import sys
import os
from pathlib import Path
import time

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("[WARNING] python-dotenv not installed. Install with: pip install python-dotenv")
    print("[WARNING] Falling back to environment variables or hardcoded values")

# Configuration
BECHDEL_API = 'https://bechdeltest.com/api/v1/getAllMovies'
BECHDEL_RSS = 'https://bechdeltest.com/rss/'
IMDB_LIST_URL = 'https://www.imdb.com/list/ls025352086/'
SEED_FILE = 'seed-films.json'
CORE_OUTPUT_FILE = 'core-films.json'  # Recognizable films (default)
EXTENDED_OUTPUT_FILE = 'extended-films.json'  # Full dataset (optional)

# TMDb API for poster images (free tier: 1000 requests/day)
# Get your free API key at: https://www.themoviedb.org/settings/api
# Store in .env file as: TMDB_API_KEY=your_key_here
TMDB_API_KEY = os.getenv('TMDB_API_KEY')  # Loaded from .env file
TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie'
TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

# Filtering config for core dataset
CORE_MIN_YEAR = 1974  # Last 50 years
CORE_CLASSIC_SOURCES = ['oscars', 'afi-classics', 'popular']  # Always include these
CORE_MAX_FILMS = 1500  # Target size for core dataset

# Movie poster sources (in order of preference)
POSTER_SOURCES = {
    'imdb': 'https://www.imdb.com/title/{imdb_id}/',
    'tmdb': 'https://www.themoviedb.org/search?query={title}',
    'wikidata': 'https://www.wikidata.org/wiki/{wikidata_id}'
}

class DataExpander:
    def __init__(self):
        self.films = {}  # QID -> film data
        self.source_counts = defaultdict(int)
        self.duplicate_count = 0
        self.missing_posters = []
        
    def fetch_bechdel_films(self):
        """Fetch all films from Bechdel Test API"""
        print("[BECHDEL] Fetching films from Bechdel Test API...")
        sys.stdout.flush()
        try:
            print("[BECHDEL] Sending request to API (this may take 10-30 seconds)...")
            sys.stdout.flush()
            response = requests.get(BECHDEL_API, timeout=60)
            print("[BECHDEL] Got response, parsing JSON...")
            sys.stdout.flush()
            response.raise_for_status()
            films = response.json()
            
            print(f"[BECHDEL] Processing {len(films)} films from API...")
            sys.stdout.flush()
            
            added = 0
            skipped = 0
            for idx, film in enumerate(films):
                if idx % 100 == 0:
                    print(f"[BECHDEL] Processing film {idx}/{len(films)}...")
                    sys.stdout.flush()
                
                # Filter to only passing films (rating 3)
                if str(film.get('rating')) != '3':
                    skipped += 1
                    continue
                
                qid = f"bechdel-{film['imdbid']}"
                
                # Skip if already processed
                if qid in self.films:
                    self.duplicate_count += 1
                    continue
                
                # Build film record
                film_data = {
                    'qid': qid,
                    'title': film.get('title', 'Unknown'),
                    'year': int(film.get('year', 0)) if film.get('year') else None,
                    'imdbId': film.get('imdbid', ''),
                    'genres': [],  # Bechdel API doesn't provide genres
                    'directors': [],
                    'directorQIDs': [],
                    'cast': [],
                    'castQIDs': [],
                    'runtime': None,
                    'source': 'bechdel',
                    'bechdel_rating': int(film.get('rating', 0)),
                    'poster_url': self.get_poster_url(film.get('title'), film.get('year'), film.get('imdbid')),
                    'wikidataUrl': None
                }
                
                self.films[qid] = film_data
                self.source_counts['bechdel'] += 1
                added += 1
            
            print(f"[BECHDEL] Added {added} unique passing films (skipped {skipped} non-passing)")
            sys.stdout.flush()
            
        except Exception as e:
            print(f"[ERROR] Failed to fetch Bechdel films: {e}")
    
    def fetch_bechdel_rss(self):
        """Fetch new recommendations from Bechdel Test RSS"""
        print("[RSS] Fetching Bechdel Test RSS feed...")
        sys.stdout.flush()
        try:
            print("[RSS] Parsing feed (this may take 5-10 seconds)...")
            sys.stdout.flush()
            feed = feedparser.parse(BECHDEL_RSS)
            print(f"[RSS] Found {len(feed.entries)} feed entries")
            sys.stdout.flush()
            
            added = 0
            for idx, entry in enumerate(feed.entries[:100]):  # Limit to 100 most recent
                if idx % 10 == 0:
                    print(f"[RSS] Processing entry {idx}/100...")
                    sys.stdout.flush()
                
                # Extract IMDB ID from entry
                imdb_id = self.extract_imdb_id_from_entry(entry)
                if not imdb_id:
                    continue
                
                qid = f"bechdel-rss-{imdb_id}"
                if qid in self.films:
                    continue
                
                film_data = {
                    'qid': qid,
                    'title': entry.get('title', 'Unknown').split('(')[0].strip(),
                    'year': self.extract_year(entry.get('title', '')),
                    'imdbId': imdb_id,
                    'genres': [],
                    'directors': [],
                    'directorQIDs': [],
                    'cast': [],
                    'castQIDs': [],
                    'runtime': None,
                    'source': 'bechdel-rss',
                    'poster_url': self.get_poster_url(entry.get('title', '').split('(')[0].strip(), self.extract_year(entry.get('title', '')), imdb_id),
                    'wikidataUrl': None,
                    'description': entry.get('summary', '')[:200]
                }
                
                self.films[qid] = film_data
                self.source_counts['bechdel-rss'] += 1
                added += 1
            
            print(f"[RSS] Added {added} films from RSS")
            sys.stdout.flush()
            
        except Exception as e:
            print(f"[ERROR] Failed to fetch RSS: {e}")
    
    def fetch_imdb_top250(self):
        """
        Attempt to fetch IMDB Top 250 list.
        Note: IMDb has anti-scraping measures. This may not work reliably.
        """
        print("[IMDB] Fetching IMDB Top 250 list...")
        try:
            # Try direct API approach
            url = 'https://www.imdb.com/chart/top250/'
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
            }
            
            print("[IMDB] Note: IMDb scraping may be limited. Using fallback API if available.")
            
            # For now, we'll skip this as IMDb actively blocks scraping
            # Users can manually add films or use alternative sources
            print("[IMDB] Recommend using IMDb API or alternative data sources")
            print("[IMDB] Skipped (IMDb blocks automated access)")
            
        except Exception as e:
            print(f"[IMDB] Could not fetch top 250: {e}")
    
    def get_poster_url(self, title, year, imdb_id=None):
        """Get poster URL from TMDb API or fallback"""
        # If TMDb API key is configured, use it
        if TMDB_API_KEY:
            return self.get_tmdb_poster(title, year)
        
        # Fallback: Return IMDb link (not a direct image, but better than nothing)
        if imdb_id:
            return f"https://www.imdb.com/title/{imdb_id}/"
        
        return None
    
    def get_tmdb_poster(self, title, year):
        """Fetch poster URL from TMDb API with rate limiting"""
        # Rate limiting: 40 requests per second max (TMDb limit is 50)
        time.sleep(0.025)  # 25ms delay = ~40 requests/second
        
        try:
            params = {
                'api_key': TMDB_API_KEY,
                'query': title,
                'year': year
            }
            response = requests.get(TMDB_SEARCH_URL, params=params, timeout=10)
            
            # Check for auth errors
            if response.status_code == 401:
                print(f"[TMDB] 401 Unauthorized - Check your API key!")
                print(f"[TMDB] Make sure you're using the 'API Key (v3 auth)' not the 'API Read Access Token'")
                print(f"[TMDB] Get it from: https://www.themoviedb.org/settings/api")
                return None
            
            response.raise_for_status()
            data = response.json()
            
            if data.get('results') and len(data['results']) > 0:
                poster_path = data['results'][0].get('poster_path')
                if poster_path:
                    return f"{TMDB_IMAGE_BASE}{poster_path}"
        except requests.exceptions.RequestException as e:
            print(f"[TMDB] Request error for '{title}': {e}")
        except Exception as e:
            print(f"[TMDB] Unexpected error for '{title}': {e}")
        
        return None
    
    def extract_imdb_id_from_entry(self, entry):
        """Extract IMDb ID from RSS entry"""
        # Try to find in link
        if 'link' in entry and 'imdb.com' in entry['link']:
            parts = entry['link'].split('/title/')
            if len(parts) > 1:
                return parts[1].split('/')[0]
        
        # Try to find in summary
        if 'summary' in entry:
            import re
            match = re.search(r'(tt\d+)', entry['summary'])
            if match:
                return match.group(1)
        
        return None
    
    def extract_year(self, title_str):
        """Extract year from title string like 'Title (2020)'"""
        import re
        match = re.search(r'\((\d{4})\)', title_str)
        if match:
            return int(match.group(1))
        return None
    
    def load_seed_films(self):
        """Load existing seed films"""
        print(f"[SEED] Loading existing seed films from {SEED_FILE}...")
        try:
            with open(SEED_FILE, 'r') as f:
                data = json.load(f)
                for film in data.get('films', []):
                    qid = film.get('qid')
                    if qid:
                        self.films[qid] = film
                        self.source_counts[film.get('source', 'unknown')] += 1
            
            print(f"[SEED] Loaded {len(self.films)} films from seed file")
        except FileNotFoundError:
            print(f"[SEED] Seed file not found, starting fresh")
    
    def deduplicate(self):
        """Remove duplicate films"""
        print("[DEDUP] Deduplicating films...")
        sys.stdout.flush()
        
        # Group by title + year to find duplicates
        by_title = defaultdict(list)
        for qid, film in self.films.items():
            key = (film.get('title', ''), film.get('year'))
            by_title[key].append(qid)
        
        print(f"[DEDUP] Found {len(self.films)} total films, {len(by_title)} unique by title+year")
        sys.stdout.flush()
        
        # Keep highest quality version (prefer seed > bechdel > rss)
        source_priority = {'seed': 0, 'oscars': 0, 'environmental': 0, 'social-justice': 0, 
                          'afi-classics': 0, 'international': 0, 'modern': 0, 'popular': 0,
                          'recent': 0, 'lgbtq': 0, 'documentary': 0, 'sci-fi': 0, 
                          'animation': 0, 'fantasy': 0, 'diverse-directors': 0,
                          'bechdel': 1, 'bechdel-rss': 2}
        
        removed = 0
        for key, qids in by_title.items():
            if len(qids) <= 1:
                continue
            
            # Sort by source priority and keep the best one
            sorted_qids = sorted(qids, key=lambda q: source_priority.get(self.films[q]['source'], 999))
            
            # Remove duplicates
            for qid in sorted_qids[1:]:
                del self.films[qid]
                removed += 1
        
        print(f"[DEDUP] Removed {removed} duplicate films")
        sys.stdout.flush()
    
    def filter_core_dataset(self):
        """Filter films for core dataset (recognizable, recent, classics)"""
        print(f"[FILTER] Creating core dataset from {len(self.films)} total films...")
        sys.stdout.flush()
        
        core_films = []
        current_year = datetime.now().year
        
        for qid, film in self.films.items():
            year = film.get('year')
            source = film.get('source', '')
            
            # Always include films from classic sources
            if source in CORE_CLASSIC_SOURCES:
                core_films.append(film)
                continue
            
            # Include recent films (last 50 years)
            if year and year >= CORE_MIN_YEAR:
                core_films.append(film)
                continue
            
            # Include seed films
            if source in ['environmental', 'social-justice', 'international', 'modern',
                         'recent', 'lgbtq', 'documentary', 'sci-fi', 'animation', 
                         'fantasy', 'diverse-directors']:
                core_films.append(film)
        
        # If we have too many, prioritize by recency
        if len(core_films) > CORE_MAX_FILMS:
            print(f"[FILTER] Trimming from {len(core_films)} to {CORE_MAX_FILMS} films...")
            sys.stdout.flush()
            # Sort by year (newest first), then take the limit
            core_films.sort(key=lambda f: f.get('year', 0), reverse=True)
            core_films = core_films[:CORE_MAX_FILMS]
        
        print(f"[FILTER] Core dataset: {len(core_films)} recognizable films")
        sys.stdout.flush()
        return core_films
    
    def save_datasets(self):
        """Save both core and extended datasets"""
        # Save extended dataset (all films)
        print(f"[SAVE] Saving extended dataset ({len(self.films)} films)...")
        sys.stdout.flush()
        
        extended_list = sorted(self.films.values(), 
                              key=lambda f: (f.get('source', 'z'), f.get('title', '')))
        
        extended_data = {
            'version': '2.1',
            'generated': datetime.now().isoformat(),
            'source': 'Extended multi-source dataset',
            'description': 'All films from Bechdel Test, IMDB lists, RSS, and curated sources',
            'sources_included': dict(self.source_counts),
            'total_films': len(self.films),
            'films': extended_list
        }
        
        with open(EXTENDED_OUTPUT_FILE, 'w') as f:
            json.dump(extended_data, f, indent=2, ensure_ascii=False)
        
        print(f"[SAVE] Saved extended dataset to {EXTENDED_OUTPUT_FILE}")
        sys.stdout.flush()
        
        # Save core dataset (filtered)
        core_films = self.filter_core_dataset()
        
        core_sources = defaultdict(int)
        for film in core_films:
            core_sources[film.get('source', 'unknown')] += 1
        
        core_data = {
            'version': '2.1',
            'generated': datetime.now().isoformat(),
            'source': 'Core recognizable films',
            'description': 'Recent films (1974+) and major classics - default dataset',
            'sources_included': dict(core_sources),
            'total_films': len(core_films),
            'films': sorted(core_films, key=lambda f: (f.get('source', 'z'), f.get('title', '')))
        }
        
        with open(CORE_OUTPUT_FILE, 'w') as f:
            json.dump(core_data, f, indent=2, ensure_ascii=False)
        
        print(f"[SAVE] Saved core dataset to {CORE_OUTPUT_FILE}")
        print(f"\n📊 SUMMARY:")
        print(f"  Core dataset: {len(core_films)} films (recognizable, recent + classics)")
        print(f"  Extended dataset: {len(self.films)} films (full collection)")
        print(f"  Sources in core: {dict(core_sources)}")
        sys.stdout.flush()
    
    def show_stats(self):
        """Show statistics"""
        print("\n" + "="*60)
        print("DATASET STATISTICS")
        print("="*60)
        print(f"Total films: {len(self.films)}")
        print(f"Duplicates removed: {self.duplicate_count}")
        print(f"\nFilms by source:")
        for source, count in sorted(self.source_counts.items()):
            print(f"  {source}: {count}")
        
        # Films without posters
        without_poster = sum(1 for f in self.films.values() if not f.get('poster_url'))
        print(f"\nFilms without poster URLs: {without_poster}")
        
        # Films by year
        years = defaultdict(int)
        for film in self.films.values():
            if film.get('year'):
                years[film['year']] += 1
        
        if years:
            min_year = min(years.keys())
            max_year = max(years.keys())
            print(f"Year range: {min_year} - {max_year}")
        
        print("="*60 + "\n")
    
    def run(self, fetch_only=False, merge_only=False):
        """Run the expansion process"""
        print("\n🎬 Show Suggester - Dataset Expander")
        print("="*60)
        
        # Load seed films first
        self.load_seed_films()
        
        # Fetch external sources (unless merge_only)
        if not merge_only:
            self.fetch_bechdel_films()
            self.fetch_bechdel_rss()
            self.fetch_imdb_top250()
        
        # Process and save
        self.deduplicate()
        self.save_datasets()  # Changed to save both core and extended
        self.show_stats()
        
        print("\n✅ Done! Two datasets created:")
        print(f"   📁 {CORE_OUTPUT_FILE} - Default (recognizable films)")
        print(f"   📁 {EXTENDED_OUTPUT_FILE} - Full collection (all sources)")
        print("\n💡 To use this data:")
        print("   1. Use core-films.json as your default seed-films.json")
        print("   2. Keep extended-films.json for advanced users")
        print("   3. Refresh the web app to load new films")


def main():
    parser = argparse.ArgumentParser(
        description='Expand Show Suggester dataset from multiple sources'
    )
    parser.add_argument('--stats', action='store_true', 
                       help='Show statistics only')
    parser.add_argument('--merge-only', action='store_true',
                       help='Only organize existing data, don\'t fetch new data')
    parser.add_argument('--no-fetch', action='store_true',
                       help='Skip API fetching, just organize existing data')
    
    args = parser.parse_args()
    
    expander = DataExpander()
    
    if args.stats or args.merge_only or args.no_fetch:
        # Just load and show stats
        expander.load_seed_films()
        if args.stats:
            expander.show_stats()
        if args.merge_only or args.no_fetch:
            expander.deduplicate()
            expander.save_datasets()  # Changed to save both datasets
            expander.show_stats()
    else:
        # Full run
        expander.run(merge_only=args.merge_only)


if __name__ == '__main__':
    main()
