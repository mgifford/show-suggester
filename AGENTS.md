# AI Agent Development Guide

This document provides guidance for AI assistants and developers working on the Show Suggester project. It ensures consistency, maintains architectural principles, and preserves the core design decisions.

## Project Philosophy

### Core Principles
1. **Privacy-First**: No user data leaves the browser. No tracking, no analytics, no external API calls during normal use.
2. **No-Auth by Design**: Zero authentication, zero API keys, zero configuration required.
3. **Local-First Data**: Curated seed dataset stored in local JSON files. Optional Python script to expand dataset offline.
4. **Explainable Recommendations**: Content-based filtering with visible weights. Users should understand why shows are recommended.
5. **No Build Required to Run**: Vanilla JavaScript, HTML, CSS core. Must work by opening index.html directly. NPM/build tools OK for optional dev workflow.
6. **Offline-First**: Works completely offline after initial page load. All data in local JSON files.
7. **Extensible**: Support films AND TV shows from any quality-curated source (awards, Bechdel Test, critic lists, streaming platforms, etc.).

### Non-Negotiables
- ❌ No npm/build tools REQUIRED to run (OK for optional build/dev tooling)
- ❌ No backend server or serverless functions
- ❌ No API keys or authentication
- ❌ No web scraping
- ❌ No tracking or external data collection
- ❌ No API calls during normal app usage (data from local JSON files only)
- ✅ Must work on GitHub Pages by opening index.html
- ✅ Must work completely offline (no internet required after page load)
- ✅ Must be auditable (readable source code)
- ✅ Python script OK for offline dataset expansion (optional tool)

## Architecture Reference

**Always consult [ARCHITECTURE.md](ARCHITECTURE.md) before making changes.**

Key sections:
- **Data Flow**: Understand the complete user journey
- **Core Objects**: Film and Rating object schemas
- **SPARQL Query**: How data is fetched from Wikidata
- **Recommendation Algorithm**: Weighted similarity calculation
- **Export Formats**: JSON and LLM text specifications

## Development Guidelines

### Adding New Features

**Before implementing:**
1. Does it require a backend? → ❌ Not allowed
2. Does it need an API key? → ❌ Not allowed
3. Does it violate privacy? → ❌ Not allowed
4. Does it require npm/webpack? → ❌ Not allowed

**Feature checklist:**
- [ ] Maintains vanilla JS core (frameworks OK if optional)
- [ ] Works client-side only (no backend required)
- [ ] Respects privacy (localStorage only)
- [ ] Documented in ARCHITECTURE.md if significant
- [ ] Tested locally by opening index.html (no build step required)
- [ ] Tested on GitHub Pages

### Code Style

**JavaScript:**
```javascript
// Use const/let, not var
const films = [];
let currentBatch = [];

// Use arrow functions for callbacks
films.filter(f => !ratings[f.qid])

// Use template literals
`${film.title} (${film.year})`

// Async/await for clarity
async loadFilmsFromWikidata() {
  const response = await fetch(url);
  const data = await response.json();
}

// Clear function names
calculateSimilarity() // good
calc() // bad
```

**HTML:**
- Use semantic HTML5 elements
- Add accessibility attributes (alt, aria-label)
- Keep inline styles minimal (use CSS classes)

**CSS:**
- Full-width responsive design
- Desktop: Flexbox sidebar (resizable, 33.33% width, min 300px, max 500px) + main content area
- Mobile: Stacked layout with sidebar on top, single-column film grid
- Use CSS Grid for film card layout: `grid-template-columns: repeat(auto-fill, minmax(350px, 1fr))`
- Use CSS Flexbox for sidebar/main layout
- Large poster images (400px desktop, 300px mobile)
- Maintain consistent color scheme (#667eea primary)
- Use CSS custom properties for theme values

### Common Tasks

#### Managing the Seed Dataset

**Location:** `update_seed_films.py` - Python script for dataset management

**Current dataset:**
- 104 curated films from 14 diverse sources
- Stored in `seed-films.json`
- Sources: recent, oscars, social-justice, international, environmental, modern, afi-classics, diverse-directors, popular, lgbtq, documentary, sci-fi, animation, fantasy

**Common operations:**

```bash
# View statistics
python3 update_seed_films.py --stats

# Add Bechdel Test films (requires: pip install requests)
python3 update_seed_films.py --add-bechdel --limit 1000 --min-rating 3

# Remove duplicates
python3 update_seed_films.py --deduplicate
```

**When expanding dataset:**
1. Test script with `--stats` first
2. Use `--deduplicate` after adding films from external sources
3. Keep QID format consistent (e.g., `bechdel-tt1234567`)
4. Update Film object schema in ARCHITECTURE.md if adding new fields
5. Consider creating separate JSON files for very large datasets (e.g., `bechdel-films.json`)

**Example - Adding new data source:**
```python
# In update_seed_films.py
def fetch_criterion_films(limit=100):
    """Fetch films from Criterion Collection."""
    # Implement API call or manual list
    return [
        {
            "qid": f"criterion-{spine_number}",
            "title": "Film Title",
            "year": 1950,
            "genres": ["classic"],
            "directors": ["Director Name"],
            "source": "criterion"
        }
    ]
```

#### Changing Recommendation Weights

**Location:** `app.js` → `calculateSimilarity()` method

**Current weights:**
- Genres: 5.0 (highest)
- Directors: 3.0 (high)
- Cast: 2.0 (medium)
- Year proximity: 1.0 (low)

**When changing:**
1. Normalize to meaningful scale (0-1 or 0-10)
2. Document reasoning in code comments
3. Update ARCHITECTURE.md algorithm section
4. Test with varied user preferences

#### Adding Export Formats

**Locations:** 
- `app.js` → `exportData()` or create new export method
- Update Export Schema in ARCHITECTURE.md

**Requirements:**
- Include version number in export
- Include timestamp
- Make format human-readable if possible
- Add import counterpart if applicable

#### Modifying UI

**Locations:**
- `index.html` for structure and embedded styles
- `app.js` for dynamic rendering

**Current UI patterns:**
- **Sidebar controls**: Use `<select>` dropdowns for filters (year, runtime)
- **Film cards**: Large poster images (400px height) with metadata below
- **Responsive layout**: Flexbox for sidebar/main, CSS Grid for film cards
- **Mobile breakpoint**: 768px - stacks sidebar on top, single-column grid

**Accessibility:**
- Maintain keyboard navigation
- Use semantic HTML (`<select>`, `<button>`, `<section>`)
- Provide text alternatives for icons
- Test with screen readers if possible
- Ensure color contrast meets WCAG AA standards

### Data Model Integrity

#### Show Object Schema (Films & TV Shows)
```javascript
{
  qid: string,           // Required: Wikidata ID or unique identifier
  title: string,         // Required: Show/film title
  year: number,          // Required: Release year
  type: string,          // Optional: 'film' | 'tv' | 'miniseries'
  genres: string[],      // Optional but recommended
  creators: string[],    // Optional: directors/creators
  creatorQIDs: string[], // Optional: for matching
  cast: string[],        // Optional: limited to 10
  castQIDs: string[],    // Optional: for matching
  imdbId: string,        // Optional
  runtime: number,       // Optional: runtime in minutes
  source: string,        // Required: 'oscars' | 'bechdel' | 'emmys' | etc.
  wikidataUrl: string,   // Optional: link to Wikidata
  image: string          // Optional: poster image URL
}
```

**Never:**
- Remove required fields (qid, title, year, source)
- Change QID/unique ID as the primary key
- Store sensitive user data in Show objects

#### Rating Object Schema
```javascript
{
  qid: string,       // Required: matches Film.qid
  rating: string,    // Required: "like" | "dislike" | "neutral"
  note: string       // Optional: user's note
}
```

**Timestamps are stored internally in localStorage for tracking purposes, but are NOT exported to YAML files as they provide no value for LLM analysis or user edits.**

### Testing Requirements

**Before committing:**
1. Open index.html directly in browser (or via local server) → works
2. Verify 104 films load from seed-films.json
3. Test filters (year dropdown, runtime dropdown) → apply correctly
4. Rate 5+ films → recommendations appear
5. Load random batch → doesn't repeat recently shown films
6. "My Ratings" view → shows all rated films (even if filtered out)
7. Export YAML → valid format
8. Import YAML → ratings restore
9. Check browser console → no errors
10. Test Python script: `python3 update_seed_films.py --stats` → shows correct data

**Cross-browser:**
- Test in Chrome, Firefox, Safari
- Test on mobile (iOS/Android)
- Verify responsive layout (sidebar resizable on desktop, stacked on mobile)

### Performance Guidelines

**JSON Loading:**
- Keep seed JSON files under 5MB for fast loading
- Consider splitting into multiple files if dataset grows (e.g., seed-films.json, bechdel-films.json)
- Use `fetch()` with proper error handling
- Cache parsed JSON in `allFilms` array

**JavaScript:**
- Batch DOM updates (use DocumentFragment)
- Cache DOM queries in variables
- Use event delegation for dynamic content
- Limit array iterations on large datasets
- Store unfiltered dataset in `allFilms`, filtered in `films`

**LocalStorage:**
- Keep ratings object compact (QID keys only)
- Don't store film data in localStorage (reload from JSON)
- Implement error handling for quota exceeded
- Save filter preferences for persistence

## Common Scenarios

### User Reports: "Recommendations are all action movies, but I liked dramas"

**Diagnosis:** Genre weight might be too high, or user hasn't rated enough dramas.

**Fix options:**
1. Adjust genre weight in `calculateSimilarity()`
2. Add UI message: "Rate more varied films for better recommendations"
3. Add genre diversity bonus in algorithm

### User Reports: "Page stuck on loading"

**Diagnosis:** JSON file not found or network issue.

**Fix options:**
1. Check that `seed-films.json` exists in same directory as `index.html`
2. Run with local server: `python3 -m http.server 8765` (CORS issues with file://)
3. Add retry logic with exponential backoff
4. Add "Retry" button in loading state
5. Show more specific error messages in console

### User Reports: "Show X is missing"

**Diagnosis:** Show not in current seed dataset.

**Solution:**
1. Check if show exists in seed-films.json
2. If not, add manually to JSON or use Python script to fetch from external source
3. For Bechdel Test films: `python3 update_seed_films.py --add-bechdel --limit N`
4. For manual additions: Edit seed-films.json directly (maintain schema)
5. Document in README as known limitation if unavailable from any source

### User Wants: "Add more films from Bechdel Test"

**Analysis:** Already implemented via Python script.

**Implementation:**
1. Ensure requests module installed: `pip install requests`
2. Run script: `python3 update_seed_films.py --add-bechdel --limit 1000 --min-rating 3`
3. Script fetches from https://bechdeltest.com/api/v1/getAllMovies
4. Filters by rating (0-3, where 3 = pass all tests)
5. Deduplicates by QID
6. Updates seed-films.json with new films
7. Refresh browser to load new dataset

**Key considerations:**
- Bechdel API may have limited metadata (IMDb ID, year, title only)
- Can expand to thousands of films, may want separate JSON file
- Algorithm works identically regardless of source

## Version Control

### Commit Messages
```
feat: Add decade filter to recommendations
fix: Handle missing IMDb IDs gracefully
docs: Update SPARQL query in ARCHITECTURE.md
style: Improve mobile responsive layout
refactor: Extract similarity calculation to separate function
```

### Branching Strategy
- `main` - Production (GitHub Pages deploys from here)
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### What to Track
- ✅ All source files (HTML, JS, CSS)
- ✅ Documentation (MD files)
- ❌ User export files (*.json, *.txt)
- ❌ OS files (.DS_Store)
- ❌ Editor configs (.vscode, .idea)

## Future Enhancements (Approved Scope)

### High Priority
- **Batch navigation improvements**: Let users skip batches without rating
- **Genre/decade filters**: Filter recommendations by criteria
- **Viewing history**: Track which films user has already seen

### Medium Priority
- **IndexedDB caching**: Cache Wikidata results for offline use
- **Progressive loading**: Load film data in chunks
- **Undo rating**: Allow users to change their mind

### Low Priority (Requires careful consideration)
- **Multiple award categories**: Oscars + BAFTAs + Golden Globes
- **Collaborative filtering**: Aggregate anonymous ratings (privacy concerns)
- **Poster images**: Display film posters from Wikidata

### Out of Scope
- Real-time streaming availability (requires paid APIs)
- User accounts (violates no-auth principle)
- Social sharing (privacy concerns)
- Server-side components (violates architecture)

## Data Dependencies

### Local JSON Files
- **Primary**: `seed-films.json` - Curated dataset (104 films)
- **Format**: JSON with version, timestamp, films array
- **Schema**: See Show Object Schema section
- **Extensible**: Can add more JSON files (bechdel-films.json, etc.)

**If JSON structure changes:**
1. Update loadAllSeedFiles() in app.js
2. Update Show Object Schema in ARCHITECTURE.md
3. Test backward compatibility with existing ratings
4. Update Python script if needed

### Python Script Dependencies (Optional)
- **requests**: Required only for `--add-bechdel` operation
- **Installation**: `pip install requests`
- **Fallback**: Script works without requests for `--stats` and `--deduplicate`

**Bechdel Test API** (via Python script only)
- **Endpoint:** https://bechdeltest.com/api/v1/getAllMovies
- **Rate Limits:** Unknown, use responsibly
- **Reliability:** Generally high
- **Fallback**: Script caches results locally
- **Documentation**: https://bechdeltest.com/api/v1/doc

### JustWatch (Search Links Only)
- **Type:** URL generation, no API calls
- **Pattern:** `https://www.justwatch.com/{country}/search?q={title}`
- **Reliability:** High (simple URL pattern)
- **Fallback:** None needed (just a link)

**If JustWatch changes URL structure:**
1. Update `createWatchLinks()` in app.js
2. Test links manually
3. Document change in README

## Security Considerations

### XSS Prevention
```javascript
// Always escape user input
escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;  // textContent auto-escapes
  return div.innerHTML;
}

// Use when rendering notes
`"${this.escapeHtml(rating.note)}"`
```

### localStorage Safety
```javascript
// Wrap in try/catch
try {
  localStorage.setItem('key', value);
} catch (error) {
  // Handle quota exceeded
  console.error('Storage error:', error);
}
```

### CORS Handling
- Wikidata SPARQL endpoint allows CORS
- No proxy needed
- If issues arise, verify `Accept` header is set correctly

## Deployment

### GitHub Pages Checklist
- [ ] All files in repository root or `/docs` folder
- [ ] No build step required
- [ ] index.html exists and is valid
- [ ] All paths are relative (no absolute URLs)
- [ ] Test HTTPS works (GitHub Pages uses HTTPS)
- [ ] Verify CORS still works over HTTPS

### Production Monitoring
- Check Wikidata status: https://www.wikidata.org/
- Monitor GitHub Pages status: https://www.githubstatus.com/
- Test app monthly to catch external API changes

## Getting Help

### Debugging Steps
1. Open browser DevTools (F12)
2. Check Console for errors
3. Check Network tab for failed requests
4. Check Application tab → LocalStorage for state
5. Try incognito mode (clears localStorage)

### Common Error Messages

**"Error loading data"**
- Check internet connection
- Verify Wikidata endpoint is accessible
- Check SPARQL query syntax

**"localStorage quota exceeded"**
- Clear old ratings
- Reduce number of notes
- Browser limitation (usually 5-10MB)

**"No recommendations available"**
- User hasn't rated any films as "like"
- All films have been rated
- Prompt user to rate more films

## Contact & Resources

- **Project Repository:** (Add GitHub URL here)
- **Live Demo:** (Add GitHub Pages URL here)
- **Issue Tracker:** GitHub Issues
- **Wikidata Help:** https://www.wikidata.org/wiki/Wikidata:Help
- **SPARQL Tutorial:** https://www.wikidata.org/wiki/Wikidata:SPARQL_tutorial

---

**Last Updated:** January 1, 2026

**Remember:** Always check [ARCHITECTURE.md](ARCHITECTURE.md) for technical specifications before making changes!
