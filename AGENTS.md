# AI Agent Development Guide

This document provides guidance for AI assistants and developers working on the Show Suggester project. It ensures consistency, maintains architectural principles, and preserves the core design decisions.

## Project Philosophy

### Core Principles
1. **Privacy-First**: No user data leaves the browser. No tracking, no analytics, no server calls except to public APIs.
2. **No-Auth by Design**: Zero authentication, zero API keys, zero configuration required.
3. **Multiple Data Sources**: Support curated lists from various sources (Wikidata, Bechdel Test, APIs, static JSON, etc.).
4. **Explainable Recommendations**: Content-based filtering with visible weights. Users should understand why shows are recommended.
5. **No Build Required to Run**: Vanilla JavaScript, HTML, CSS core. Must work by opening index.html directly. NPM/build tools OK for optional dev workflow.
6. **Offline-First**: Cache data in localStorage for offline functionality. App must work without network connection.
7. **Extensible**: Support films AND TV shows from any quality-curated source (awards, Bechdel Test, critic lists, streaming platforms, etc.).

### Non-Negotiables
- ❌ No npm/build tools REQUIRED to run (OK for optional build/dev tooling)
- ❌ No backend server or serverless functions
- ❌ No API keys or authentication
- ❌ No web scraping
- ❌ No tracking or external data collection
- ✅ Must work on GitHub Pages by opening index.html
- ✅ Must work offline after initial data load
- ✅ Must be auditable (readable source code)

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
- Mobile-first responsive design
- Use CSS Grid and Flexbox
- Maintain consistent color scheme (#667eea primary)
- Use CSS custom properties for theme values

### Common Tasks

#### Modifying the SPARQL Query

**Location:** `app.js` → `loadFilmsFromWikidata()` method

**Process:**
1. Test query at https://query.wikidata.org/
2. Check for performance (should complete in <30 seconds)
3. Verify LIMIT is reasonable (5000 max)
4. Update `processWikidataResults()` if new fields added
5. Update Film object schema in ARCHITECTURE.md

**Example - Adding runtime:**
```javascript
// In SPARQL query
OPTIONAL { ?film wdt:P2047 ?runtime . }  # Runtime in minutes

// In processWikidataResults()
runtime: binding.runtime?.value ? parseInt(binding.runtime.value) : null
```

**Example - Adding different award category:**
```javascript
// Create new SPARQL query function
async loadBAFTAFilms() {
  const sparqlQuery = `
  SELECT DISTINCT ?film ?filmLabel ...
  WHERE {
    { ?film wdt:P166 wd:Q271394 . }  # BAFTA Best Film
    UNION
    { ?film wdt:P1411 wd:Q271394 . } # Nominated for BAFTA
    ...
  }`;
  // Process similarly
}

// Add UI toggle to switch between award categories
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
- `index.html` for structure
- `<style>` tag in index.html for styling
- `app.js` for dynamic rendering

**Accessibility:**
- Maintain keyboard navigation
- Use semantic HTML
- Provide text alternatives for icons
- Test with screen readers if possible

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
1. Open index.html directly in browser → works
2. Test SPARQL query → completes successfully
3. Rate 5+ films → recommendations appear
4. Export JSON → valid format
5. Import JSON → ratings restore
6. Clear all ratings → resets cleanly
7. Check browser console → no errors

**Cross-browser:**
- Test in Chrome, Firefox, Safari
- Test on mobile (iOS/Android)

### Performance Guidelines

**SPARQL Query:**
- Keep LIMIT ≤ 5000 results
- Use OPTIONAL for non-critical fields
- Avoid expensive FILTER operations
- Target <30 second completion time

**JavaScript:**
- Batch DOM updates (use DocumentFragment)
- Cache DOM queries in variables
- Use event delegation for dynamic content
- Limit array iterations on large datasets

**LocalStorage:**
- Keep ratings object compact
- Don't store film data (reload from Wikidata)
- Film cache stored separately as `oscarFilmsCache`
- Implement error handling for quota exceeded
- Cache includes timestamp and version info

## Common Scenarios

### User Reports: "Recommendations are all action movies, but I liked dramas"

**Diagnosis:** Genre weight might be too high, or user hasn't rated enough dramas.

**Fix options:**
1. Adjust genre weight in `calculateSimilarity()`
2. Add UI message: "Rate more varied films for better recommendations"
3. Add genre diversity bonus in algorithm

### User Reports: "Page stuck on loading"

**Diagnosis:** SPARQL query timeout or network issue.

**Fix options:**
1. Add retry logic with exponential backoff
2. Add "Retry" button in loading state
3. Cache successful queries in IndexedDB (future enhancement)
4. Reduce LIMIT or add pagination

### User Reports: "Show X is missing"

**Diagnosis:** Show might not be in current data sources or missing required fields.

**Solution:**
1. Check if show exists in any enabled data sources
2. If in Wikidata but missing data → improve SPARQL query
3. If not in any source → add new data source or static JSON entry
4. Document in README as known limitation or add to requested features

### User Wants: "Add Emmy-winning TV shows"

**Analysis:** Natural extension - add Emmy awards as another data source.

**Implementation:**
1. Create SPARQL query for Emmy winners/nominees (similar to Oscar query)
2. Add Emmy source card to UI (🏆 Emmys)
3. Ensure Show schema includes "type" field to distinguish films from TV
4. Test performance with larger combined dataset
5. Update ARCHITECTURE.md with Emmy query details

### User Wants: "Add Bechdel Test films"

**Analysis:** Different data source (Bechdel Test API) but compatible with current architecture.

**Implementation:**
1. Create `loadBechdelFilms()` function to fetch from https://bechdeltest.com/api/v1/getAllMovies
2. Cross-reference IMDb IDs with Wikidata to enrich metadata (genres, directors, cast)
3. Store in `app.bechdelFilms` array with `source: 'bechdel'` field
4. Add to source selector UI (already implemented)
5. Update `updateFilmsFromSource()` to include Bechdel films
6. Test recommendation algorithm with new dataset
7. Update ARCHITECTURE.md with API details

**Key considerations:**
- Bechdel API returns IMDb IDs - need to map to Wikidata QIDs for consistency
- May have different metadata availability than Oscar films
- Should work offline after initial load (cache in localStorage like Oscar films)
- Recommendation algorithm should work identically across all sources

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

## API Dependencies

### Wikidata Query Service
- **Endpoint:** https://query.wikidata.org/sparql
- **Rate Limits:** Unofficial ~60 req/min
- **Reliability:** Generally high, occasional timeouts
- **Fallback:** None (this is the source of truth)
- **Documentation:** https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service

**If Wikidata changes:**
1. Monitor for SPARQL endpoint changes
2. Test queries after Wikidata updates
3. Adapt to property ID changes (rare but possible)

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
