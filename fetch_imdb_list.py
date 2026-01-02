#!/usr/bin/env python3
"""
Fetch movies from IMDB list (Top 250, user lists, etc.)

IMDb actively blocks automated scraping, but we can use:
1. Selenium/Playwright for browser automation
2. IMDb data export (manual)
3. Third-party APIs

For now, this script provides a template and manual instructions.

IMDB List to fetch: https://www.imdb.com/list/ls025352086/
"""

import json
import requests
from datetime import datetime

class IMDbListFetcher:
    """
    Fetch movies from IMDB lists.
    
    Note: IMDb blocks automated access. This script provides manual import
    and API alternatives.
    """
    
    @staticmethod
    def manual_import_instructions():
        """Print instructions for manual import from IMDB"""
        instructions = """
╔══════════════════════════════════════════════════════════════╗
║           MANUAL IMDB LIST IMPORT INSTRUCTIONS               ║
╚══════════════════════════════════════════════════════════════╝

Since IMDb blocks automated scraping, follow these steps:

STEP 1: Get the movies (choose one method)
────────────────────────────────────────────

Method A: Use IMDb Export (Recommended)
  1. Go to: https://www.imdb.com/list/ls025352086/
  2. Click "⋯" (three dots) at top right
  3. Select "Export this list"
  4. Save as imdb-export.csv

Method B: Manual CSV Creation
  1. Open the IMDb list in browser
  2. Use browser's "Save as" to export HTML
  3. Or manually create CSV with columns:
     Title, Year, IMDB ID

Method C: Use Browser Extension
  1. Install "IMDB Export" extension
  2. Click export on the list page
  3. Save as CSV

STEP 2: Create IMDB JSON
────────────────────────

Run this script after getting the CSV:

    python3 fetch_imdb_list.py --import-csv imdb-export.csv

This creates: imdb-films.json

STEP 3: Merge with seed dataset
───────────────────────────────

Run:
    python3 expand_dataset.py

This will deduplicate and combine all sources.

STEP 4: Use in the app
──────────────────────

Replace or load new dataset:
    cp imdb-films.json seed-films.json
    # Or modify app.js to load multiple files

═══════════════════════════════════════════════════════════════

ALTERNATIVE: Use Rapid/API Services
───────────────────────────────────

Services like RapidAPI have IMDb wrappers:
1. Go to https://rapidapi.com/
2. Search "IMDB"
3. Choose "IMDB API" or similar
4. Get free tier API key
5. Use in script (see code below)

═══════════════════════════════════════════════════════════════
"""
        return instructions
    
    @staticmethod
    def create_from_csv(csv_file):
        """Convert IMDB export CSV to our JSON format"""
        print(f"[IMDB] Importing from CSV: {csv_file}")
        
        films = {}
        
        try:
            import csv
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # CSV columns typically: Const, Your Rating, Date Rated, Title, URL, Title Type, IMDb ID, Name, Genres, Num Votes, Release Date, Runtime (mins), Directors
                    
                    title = row.get('Title') or row.get('title') or ''
                    imdb_id = row.get('Const') or row.get('imdb_id') or ''
                    year = row.get('Release Date') or row.get('year') or ''
                    
                    # Extract year if in YYYY format
                    year_int = None
                    try:
                        year_int = int(year.split('-')[0]) if year else None
                    except:
                        pass
                    
                    if not title or not imdb_id:
                        continue
                    
                    # Normalize IMDb ID
                    if not imdb_id.startswith('tt'):
                        imdb_id = 'tt' + imdb_id
                    
                    qid = f"imdb-{imdb_id}"
                    
                    film = {
                        'qid': qid,
                        'title': title,
                        'year': year_int,
                        'imdbId': imdb_id,
                        'genres': row.get('Genres', '').split(',') if row.get('Genres') else [],
                        'directors': row.get('Directors', '').split(',') if row.get('Directors') else [],
                        'directorQIDs': [],
                        'cast': [],
                        'castQIDs': [],
                        'runtime': None,
                        'source': 'imdb-list',
                        'poster_url': f'https://www.imdb.com/title/{imdb_id}/',
                        'wikidataUrl': None
                    }
                    
                    # Parse runtime
                    if row.get('Runtime (mins)'):
                        try:
                            film['runtime'] = int(row.get('Runtime (mins)'))
                        except:
                            pass
                    
                    films[qid] = film
        
        except Exception as e:
            print(f"[ERROR] Failed to import CSV: {e}")
            return {}
        
        print(f"[IMDB] Imported {len(films)} films from CSV")
        return films
    
    @staticmethod
    def save_as_json(films, output_file='imdb-films.json'):
        """Save films as JSON"""
        output = {
            'version': '2.1',
            'generated': datetime.now().isoformat(),
            'source': 'IMDB list export',
            'description': 'Films from IMDB user list (ls025352086)',
            'total_films': len(films),
            'films': list(films.values())
        }
        
        with open(output_file, 'w') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        
        print(f"[SAVE] Saved {len(films)} films to {output_file}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Fetch movies from IMDB lists',
        epilog='IMDb blocks automated scraping. Use --help for manual import instructions.'
    )
    parser.add_argument('--help-manual', action='store_true',
                       help='Show manual import instructions')
    parser.add_argument('--import-csv', type=str,
                       help='Import from IMDB export CSV file')
    parser.add_argument('--output', type=str, default='imdb-films.json',
                       help='Output JSON file (default: imdb-films.json)')
    
    args = parser.parse_args()
    
    if args.help_manual:
        print(IMDbListFetcher.manual_import_instructions())
        return
    
    if args.import_csv:
        films = IMDbListFetcher.create_from_csv(args.import_csv)
        IMDbListFetcher.save_as_json(films, args.output)
        print(f"\n✅ Done! Created {args.output}")
        print("\nNext steps:")
        print("1. Review the JSON file")
        print("2. Run: python3 expand_dataset.py")
        print("3. This will merge with other sources and deduplicate")
        return
    
    # Default: show manual instructions
    print(IMDbListFetcher.manual_import_instructions())


if __name__ == '__main__':
    main()
