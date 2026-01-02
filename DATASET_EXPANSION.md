# Dataset Expansion Guide

## Overview

The Show Suggester app comes with a curated seed dataset of 104 films. You can expand this using the `expand_dataset.py` script to include:

- **All Bechdel Test films** - All films that pass the Bechdel Test (currently ~1,500+)
- **Bechdel RSS feed** - Latest recommendations from Bechdel Test
- **Poster URLs** - Movie artwork from multiple sources
- **Deduplication** - Automatically removes duplicate films

## Requirements

```bash
pip install requests feedparser
```

## Usage

### Expand Dataset (Full)

Fetches all films from external sources and merges with seed dataset:

```bash
python3 expand_dataset.py
```

This creates `expanded-films.json` with all films combined.

### Show Statistics Only

View current dataset statistics without fetching:

```bash
python3 expand_dataset.py --stats
```

### Merge Existing Data Only

Organize and deduplicate without fetching new data:

```bash
python3 expand_dataset.py --merge-only
```

## Data Sources

### 1. Bechdel Test API
- **URL**: https://bechdeltest.com/api/v1/getAllMovies
- **Films**: All movies in database (filtered to passing films, rating=3)
- **Data included**: Title, year, IMDb ID, Bechdel rating
- **Missing**: Genres, directors, cast (unless matched with other sources)

### 2. Bechdel RSS Feed
- **URL**: https://bechdeltest.com/rss/
- **Films**: Latest 100 entries
- **Data included**: Title, year, IMDb ID
- **Purpose**: Keeps dataset updated with new entries

### 3. Movie Posters

The script attempts to fetch poster URLs from:

1. **IMDb** (most reliable)
   - Direct link to IMDb title page
   - Format: `https://www.imdb.com/title/{imdbId}/`

2. **TMDb** (requires API key)
   - Free tier available at https://www.themoviedb.org/settings/api
   - Higher quality images

3. **Wikidata** (when available)
   - Fallback source for some films

## Film Object Schema

After expansion, each film includes:

```json
{
  "qid": "bechdel-tt1234567",
  "title": "Film Title",
  "year": 2020,
  "imdbId": "tt1234567",
  "genres": ["drama", "thriller"],
  "directors": ["Director Name"],
  "directorQIDs": ["Q123"],
  "cast": ["Actor 1", "Actor 2"],
  "castQIDs": ["Q456", "Q789"],
  "runtime": 120,
  "source": "bechdel",
  "bechdel_rating": 3,
  "poster_url": "https://www.imdb.com/title/tt1234567/",
  "wikidataUrl": null,
  "description": "Optional description"
}
```

### Field Explanations

- `qid`: Unique identifier (source-imdbid format)
- `title`: Film title
- `year`: Release year
- `imdbId`: IMDb identifier (tt + numbers)
- `genres`: Array of genre strings
- `directors`: Array of director names
- `directorQIDs`: Wikidata Q-identifiers for matching
- `cast`: Array of actor names (limited to 10)
- `castQIDs`: Wikidata Q-identifiers for matching
- `runtime`: Duration in minutes
- `source`: Data source (bechdel, oscars, etc.)
- `bechdel_rating`: 0-3 (0=fails, 1=under 2 women, 2=don't talk, 3=passes)
- `poster_url`: URL to movie poster/artwork
- `wikidataUrl`: Link to Wikidata page
- `description`: Optional plot summary or notes

## Workflow

### Option 1: Replace seed-films.json

1. Run expansion:
   ```bash
   python3 expand_dataset.py
   ```

2. Backup original:
   ```bash
   cp seed-films.json seed-films.backup.json
   ```

3. Use expanded version:
   ```bash
   cp expanded-films.json seed-films.json
   ```

4. Refresh browser to load ~1500+ films

### Option 2: Keep Separate Files

Load multiple JSON files in the app. The app currently supports:

- `seed-films.json` (104 curated films)
- `bechdel-films.json` (Bechdel Test films)
- `imdb-films.json` (IMDB list films)

Edit `app.js` to load multiple files:

```javascript
async loadAllSeedFiles() {
    const seedFiles = [
        'seed-films.json',
        'bechdel-films.json',
        'imdb-films.json'
    ];
    // ... rest of function
}
```

## Deduplication

The script automatically:

1. Groups films by title + year
2. Keeps the highest-quality version
3. Removes duplicates
4. Logs removed count

Priority order (kept version):
1. Original seed films (oscars, environmental, social-justice, etc.)
2. Bechdel Test API films
3. Bechdel RSS films

## Tips

### Get Better Poster URLs

For highest quality, add your TMDb API key:

1. Get free API key: https://www.themoviedb.org/settings/api
2. Modify script to use TMDb API:

```python
TMDB_API_KEY = 'your_key_here'
# Then fetch from: https://api.themoviedb.org/3/search/movie?api_key=KEY&query=TITLE
```

### Match With Wikidata

To add genres, directors, cast:

1. Use IMDb ID to query Wikidata
2. Implement SPARQL queries like the original app
3. Merge results with expanded dataset

### Manual Curation

Edit `expanded-films.json` to:
- Remove films you don't want
- Add missing data (genres, directors)
- Improve poster URLs
- Add descriptions

## Troubleshooting

### "No module named requests"

```bash
pip install requests
```

### "Bechdel API returned empty"

The Bechdel API may have rate limits. Try again later or check:
https://bechdeltest.com/api/

### "Expanded films have no genres/directors"

The Bechdel API doesn't provide this data. You can:
1. Match with Wikidata using IMDb ID
2. Match with OMDB API (requires key)
3. Manually add missing data

### IMDb links are broken

IMDb may change their URL structure. Update:

```python
def get_imdb_poster_url(self, imdb_id):
    # Modify to use current IMDb URL format
```

## Performance Notes

- **1,500+ films** will load slower than 104 films
- Recommendation algorithm is O(n*m) where n=unrated films, m=liked films
- Consider implementing:
  - Pagination for film display
  - Lazy loading for recommendations
  - IndexedDB caching

## Future Enhancements

Potential data sources to add:

- Rotten Tomatoes API
- OMDB API (for detailed metadata)
- TVMaze API (for TV shows)
- Criterion Collection
- MUBI rankings
- Festival selections (Sundance, Berlin, Cannes)
- Awards (Golden Globes, BAFTA, Oscars)

## Support

For issues:
1. Check API status pages
2. Review script output for errors
3. Check browser console for app errors
4. Verify JSON format is valid
