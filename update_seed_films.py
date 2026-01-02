#!/usr/bin/env python3
"""
Update seed-films.json with films from various sources.

This script fetches films from multiple curated sources and updates
the seed-films.json file with new entries while preserving existing ones.

Sources:
- Bechdel Test API (films passing Bechdel Test)
- Manual additions from lists (environmental, social justice, etc.)

Usage:
    python update_seed_films.py --add-bechdel --limit 100
    python update_seed_films.py --deduplicate
    python update_seed_films.py --stats
"""

import json
import argparse
from datetime import datetime
from typing import List, Dict, Set
import sys

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    print("⚠️  Warning: 'requests' module not found. Install with: pip install requests")
    print("   (Only needed for --add-bechdel option)\n")


def load_seed_films(filepath: str = 'seed-films.json') -> Dict:
    """Load existing seed films from JSON file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Warning: {filepath} not found. Creating new file.")
        return {
            "version": "2.0",
            "generated": datetime.now().strftime("%Y-%m-%d"),
            "source": "Curated multi-source seed dataset",
            "description": "Diverse collection of quality films from various ethical, artistic, and cultural perspectives",
            "films": []
        }


def save_seed_films(data: Dict, filepath: str = 'seed-films.json'):
    """Save seed films to JSON file."""
    data['generated'] = datetime.now().strftime("%Y-%m-%d")
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"✅ Saved {len(data['films'])} films to {filepath}")


def fetch_bechdel_films(limit: int = 100, min_rating: int = 3) -> List[Dict]:
    """
    Fetch films from Bechdel Test API.
    
    Args:
        limit: Maximum number of films to fetch (0 = all)
        min_rating: Minimum Bechdel rating (0-3, where 3 = pass)
    
    Returns:
        List of film dictionaries
    """
    if not HAS_REQUESTS:
        print("❌ Error: 'requests' module required for Bechdel API.")
        print("   Install with: pip install requests")
        return []
    
    print(f"📥 Fetching Bechdel Test films (min rating: {min_rating})...")
    url = 'https://bechdeltest.com/api/v1/getAllMovies'
    
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        all_films = response.json()
        
        # Filter by rating
        filtered = [f for f in all_films if f.get('rating', 0) >= min_rating]
        
        # Sort by year (newest first) and limit
        filtered.sort(key=lambda x: x.get('year', 0), reverse=True)
        
        if limit > 0:
            filtered = filtered[:limit]
        
        print(f"✅ Fetched {len(filtered)} Bechdel-passing films")
        
        # Convert to our format
        bechdel_films = []
        for film in filtered:
            bechdel_films.append({
                "qid": f"bechdel-{film['imdbid']}",
                "title": film['title'],
                "year": film['year'],
                "genres": ["bechdel-pass"],
                "imdbId": film['imdbid'],
                "source": "bechdel"
            })
        
        return bechdel_films
        
    except requests.RequestException as e:
        print(f"❌ Error fetching Bechdel films: {e}")
        return []


def get_existing_qids(data: Dict) -> Set[str]:
    """Get set of existing QIDs to avoid duplicates."""
    return {film['qid'] for film in data['films']}


def deduplicate_films(data: Dict) -> Dict:
    """Remove duplicate films based on QID."""
    seen_qids = set()
    unique_films = []
    duplicates = 0
    
    for film in data['films']:
        qid = film['qid']
        if qid not in seen_qids:
            seen_qids.add(qid)
            unique_films.append(film)
        else:
            duplicates += 1
    
    if duplicates > 0:
        print(f"🗑️  Removed {duplicates} duplicate films")
    else:
        print("✅ No duplicates found")
    
    data['films'] = unique_films
    return data


def add_manual_films(data: Dict, films: List[Dict]) -> Dict:
    """Add manually curated films to the dataset."""
    existing_qids = get_existing_qids(data)
    added = 0
    
    for film in films:
        if film['qid'] not in existing_qids:
            data['films'].append(film)
            added += 1
    
    if added > 0:
        print(f"➕ Added {added} manual films")
    else:
        print("ℹ️  No new manual films to add")
    
    return data


def show_stats(data: Dict):
    """Display statistics about the seed dataset."""
    films = data['films']
    total = len(films)
    
    # Count by source
    sources = {}
    for film in films:
        source = film.get('source', 'unknown')
        sources[source] = sources.get(source, 0) + 1
    
    # Count by decade
    decades = {}
    for film in films:
        year = film.get('year', 0)
        if year:
            decade = (year // 10) * 10
            decades[decade] = decades.get(decade, 0) + 1
    
    # Count films with various metadata
    with_runtime = sum(1 for f in films if f.get('runtime'))
    with_imdb = sum(1 for f in films if f.get('imdbId'))
    with_directors = sum(1 for f in films if f.get('directors'))
    
    print("\n📊 Seed Dataset Statistics")
    print("=" * 50)
    print(f"Total films: {total}")
    print(f"Version: {data.get('version', 'unknown')}")
    print(f"Last updated: {data.get('generated', 'unknown')}")
    print(f"\n📁 Films by source:")
    for source, count in sorted(sources.items(), key=lambda x: -x[1]):
        percentage = (count / total * 100) if total > 0 else 0
        print(f"  {source:20s}: {count:4d} ({percentage:5.1f}%)")
    
    print(f"\n📅 Films by decade:")
    for decade, count in sorted(decades.items()):
        print(f"  {decade}s: {count:4d}")
    
    print(f"\n📝 Metadata coverage:")
    print(f"  With runtime:   {with_runtime:4d} ({with_runtime/total*100:5.1f}%)")
    print(f"  With IMDb ID:   {with_imdb:4d} ({with_imdb/total*100:5.1f}%)")
    print(f"  With directors: {with_directors:4d} ({with_directors/total*100:5.1f}%)")
    print("=" * 50)


def main():
    parser = argparse.ArgumentParser(
        description='Update seed-films.json with films from various sources'
    )
    parser.add_argument(
        '--add-bechdel',
        action='store_true',
        help='Add films from Bechdel Test API'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=0,
        help='Limit number of Bechdel films to add (0 = all)'
    )
    parser.add_argument(
        '--min-rating',
        type=int,
        default=3,
        choices=[0, 1, 2, 3],
        help='Minimum Bechdel rating (0-3, default: 3 = pass)'
    )
    parser.add_argument(
        '--deduplicate',
        action='store_true',
        help='Remove duplicate films'
    )
    parser.add_argument(
        '--stats',
        action='store_true',
        help='Show statistics about the dataset'
    )
    parser.add_argument(
        '--file',
        default='seed-films.json',
        help='Path to seed films JSON file'
    )
    
    args = parser.parse_args()
    
    # If no action specified, show help
    if not any([args.add_bechdel, args.deduplicate, args.stats]):
        parser.print_help()
        sys.exit(0)
    
    # Load existing data
    data = load_seed_films(args.file)
    print(f"📖 Loaded {len(data['films'])} existing films")
    
    modified = False
    
    # Add Bechdel films
    if args.add_bechdel:
        bechdel_films = fetch_bechdel_films(args.limit, args.min_rating)
        if bechdel_films:
            existing_qids = get_existing_qids(data)
            new_films = [f for f in bechdel_films if f['qid'] not in existing_qids]
            data['films'].extend(new_films)
            print(f"➕ Added {len(new_films)} new Bechdel films ({len(bechdel_films) - len(new_films)} already existed)")
            modified = True
    
    # Deduplicate
    if args.deduplicate:
        original_count = len(data['films'])
        data = deduplicate_films(data)
        if len(data['films']) < original_count:
            modified = True
    
    # Save if modified
    if modified:
        save_seed_films(data, args.file)
    
    # Show stats
    if args.stats:
        show_stats(data)


if __name__ == '__main__':
    main()
