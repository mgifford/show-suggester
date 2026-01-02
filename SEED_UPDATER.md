# Seed Film Dataset Updater

Python script to maintain and expand the `seed-films.json` dataset with films from various curated sources.

## Installation

Requires Python 3.6+ and the `requests` library:

```bash
pip install requests
```

## Usage

### Show statistics about current dataset

```bash
python update_seed_films.py --stats
```

Output includes:
- Total film count
- Films by source (oscars, bechdel, environmental, etc.)
- Films by decade
- Metadata coverage (runtime, IMDb IDs, directors)

### Add Bechdel Test films

Add 100 films that pass the Bechdel Test:

```bash
python update_seed_films.py --add-bechdel --limit 100
```

Add ALL Bechdel-passing films (~8,000):

```bash
python update_seed_films.py --add-bechdel
```

Add films with minimum rating of 2 (not full pass):

```bash
python update_seed_films.py --add-bechdel --min-rating 2 --limit 200
```

### Remove duplicates

```bash
python update_seed_films.py --deduplicate
```

### Combine operations

Add 500 Bechdel films, deduplicate, and show stats:

```bash
python update_seed_films.py --add-bechdel --limit 500 --deduplicate --stats
```

## Adding Manual Films

To add films from other sources (AFI Top 100, Criterion Collection, environmental docs, etc.), edit the script and add to the `add_manual_films()` function or create JSON files with film data.

### Manual film format

```json
{
  "qid": "unique-id",
  "title": "Film Title",
  "year": 2020,
  "genres": ["drama", "environmental"],
  "directors": ["Director Name"],
  "imdbId": "tt1234567",
  "runtime": 120,
  "source": "environmental"
}
```

## File Structure

- `seed-films.json` - Main seed dataset file
- `update_seed_films.py` - This updater script

## Bechdel Test Ratings

The Bechdel Test has 4 rating levels:
- **0**: Fewer than 2 named women
- **1**: 2+ named women who don't talk to each other
- **2**: 2+ named women who talk to each other about something other than a man
- **3**: **PASS** - Meets all criteria

By default, only films with rating 3 (pass) are added.

## Data Sources

### Currently Supported
- ✅ Bechdel Test API (https://bechdeltest.com/api/v1/getAllMovies)
- ✅ Manual curation (environmental, social justice, AFI classics, etc.)

### Future Additions
- 🔜 IMDb Top 250
- 🔜 Criterion Collection
- 🔜 Sundance winners
- 🔜 Cannes/Berlin/Venice winners
- 🔜 TIFF People's Choice winners

## Best Practices

1. **Start small**: Add 100-500 films at a time to review quality
2. **Deduplicate regularly**: Run `--deduplicate` after bulk additions
3. **Check stats**: Review distribution across sources and decades
4. **Backup first**: Copy `seed-films.json` before major updates
5. **Version control**: Commit changes to git after updates

## Examples

### Expand to 1,000 curated films

```bash
# Check current count
python update_seed_films.py --stats

# Add 500 Bechdel films
python update_seed_films.py --add-bechdel --limit 500 --deduplicate

# Verify
python update_seed_films.py --stats
```

### Monthly update routine

```bash
# Backup
cp seed-films.json seed-films.backup.json

# Add new Bechdel films (they update database regularly)
python update_seed_films.py --add-bechdel --limit 100 --deduplicate

# Review changes
python update_seed_films.py --stats

# Test in app
open index.html
```

## Troubleshooting

**"No module named 'requests'"**
```bash
pip install requests
```

**"Connection timeout"**
- Bechdel API may be slow with large requests
- Try smaller `--limit` values
- Check internet connection

**"Duplicate films"**
- Run `--deduplicate` to remove
- Script checks QIDs before adding, but duplicates can occur from manual edits

## Contributing

To add new data sources:

1. Create a `fetch_SOURCE_films()` function
2. Return list of films in standard format
3. Add command-line argument
4. Update this README

Example sources to add:
- Rotten Tomatoes Certified Fresh
- Metacritic high scores
- Oscar nominees (other categories)
- Emmy winners (TV shows)
- Documentary festival winners
