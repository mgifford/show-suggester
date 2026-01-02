# Adding Movie Poster Images

The Show Suggester supports displaying movie poster images to make films easier to recognize visually.

## Quick Start

Movie posters are fetched automatically if you provide a TMDb API key (free, no credit card required).

## Getting a TMDb API Key (Free)

1. **Create a TMDb account**: https://www.themoviedb.org/signup
2. **Go to API settings**: https://www.themoviedb.org/settings/api
3. **Request an API key**:
   - Click "Request an API Key"
   - Choose "Developer" (free tier)
   - Fill in the form (use personal project info)
4. **Copy your API key** (looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

**Free tier limits**: 1,000 requests per day (plenty for dataset expansion)

## Using the API Key

### Option 1: Set in Script (Recommended)

Edit `expand_dataset.py` and add your key:

```python
# TMDb API for poster images
TMDB_API_KEY = 'your_api_key_here'  # Replace with your actual key
```

### Option 2: Environment Variable

```bash
export TMDB_API_KEY='your_api_key_here'
python3 expand_dataset.py
```

Then update `expand_dataset.py`:
```python
import os
TMDB_API_KEY = os.getenv('TMDB_API_KEY')
```

## Fetching Posters

### For New Datasets

Run the expansion script with your API key configured:

```bash
python3 expand_dataset.py
```

This will:
- Fetch posters for all new films from TMDb
- Store poster URLs in `core-films.json` and `extended-films.json`
- Display images automatically in the web app

### For Existing Datasets

To add posters to films that don't have them:

```bash
python3 expand_dataset.py --add-posters
```

*(Note: This feature would need to be implemented if you want to update existing datasets)*

## How It Works

1. **TMDb Search**: For each film, queries TMDb API with title + year
2. **Best Match**: Takes the first search result (usually correct)
3. **Poster URL**: Stores the poster image URL in `poster_url` field
4. **Display**: Web app loads and displays the poster automatically

## Poster Format

Posters are served from TMDb's CDN:
- **URL pattern**: `https://image.tmdb.org/t/p/w500/[poster_path].jpg`
- **Size**: w500 (500px wide, good quality for cards)
- **Format**: Usually JPG

Example:
```json
{
  "title": "Everything Everywhere All at Once",
  "year": 2022,
  "imdbId": "tt6710474",
  "poster_url": "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb.jpg"
}
```

## Without API Key

If you don't configure a TMDb API key:
- Films will display **without posters**
- Title, year, and metadata still show
- App works normally, just no images

## Troubleshooting

### No posters appearing

1. **Check API key is set** in `expand_dataset.py`
2. **Verify API key is valid** - test at https://api.themoviedb.org/3/movie/550?api_key=YOUR_KEY
3. **Check console output** - script prints `[TMDB] Error fetching poster...` if there's an issue
4. **Rate limit reached** - free tier is 1,000 requests/day

### Wrong posters

TMDb search uses title + year to find films. If you get wrong posters:
- Check film title spelling in your dataset
- Check year is correct
- TMDb might not have that specific film

### Mixed results (some posters, some missing)

This is normal! Not every film is in TMDb's database. Older, obscure, or non-English films may not have posters available.

## Performance

**First time fetching 6,000+ posters**:
- Time: ~30-60 minutes (TMDb rate limits to ~40 requests/second)
- Progress: Script prints `[BECHDEL] Processing film X/Y...` to show progress

**Subsequent runs**:
- Posters are cached in JSON files
- No API calls needed unless adding new films

## Privacy & Terms

- **TMDb API**: Free for non-commercial personal projects
- **No tracking**: Poster URLs are public CDN links
- **Attribution**: TMDb requires attribution ("This product uses the TMDb API but is not endorsed or certified by TMDb")
- **Terms**: https://www.themoviedb.org/terms-of-use

## Alternative: Manual Poster URLs

If you don't want to use TMDb, you can manually add poster URLs:

```json
{
  "title": "The Shawshank Redemption",
  "year": 1994,
  "poster_url": "https://example.com/shawshank-poster.jpg"
}
```

Any valid image URL works!

---

**Last Updated**: January 2, 2026  
**Status**: TMDb integration ready, API key optional
