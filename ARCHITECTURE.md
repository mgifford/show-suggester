# Show Suggester - Architecture

## Overview
Client-side JavaScript application that loads curated film and TV show data from multiple sources (Wikidata, Bechdel Test, static JSON), allows user ratings, and generates content-based recommendations.

**Current sources:** Oscar Best Picture (active), Bechdel Test (planned), Emmy Awards (planned)

**For development guidelines and consistency standards, see [AGENTS.md](AGENTS.md).**

## Data Flow

```
[Page Load] 
    ↓
[Check LocalStorage Cache] → Cache exists? → Use cached data + refresh in background
    ↓ (no cache)
[Load Fallback JSON] → Instant load (~20 recent winners)
    ↓
[Background: Full Data Load] → Wikidata SPARQL or API fetch (optional)
    ↓
[Parse & Normalize] → Create Show objects with QID, metadata, poster images
    ↓
[Cache to LocalStorage] → Store for offline use
    ↓
[Apply Filters] → Year range (last 20 years default), runtime, source
    ↓
[Random Selection] → Pick 15-20 shows as initial candidates
    ↓
[User Rates Shows] → Like/Dislike/Neutral + notes
    ↓
[Batch Navigation] → Previous/Next/Random batch with history tracking
    ↓
[Recommendation Engine] → Calculate similarity scores
    ↓
[Display Recommendations] → Show unrated items ranked by score
    ↓
[Export/Import] → Save/restore ratings as JSON

[Offline Detection] → Show banner, use cached data only
```

## Core Objects

### Film Object
```javascript
{
  qid: "Q104123",           // Wikidata ID (stable identifier)
  title: "The Godfather",
  year: 1972,
  genres: ["crime", "drama"],
  director: "Francis Ford Coppola",
  directorQID: "Q56094",
  cast: ["Marlon Brando", "Al Pacino", "James Caan"],
  castQIDs: ["Q34012", "Q36949", "Q79572"],
  imdbId: "tt0068646",      // If available
  nominationYear: 1973,
  winner: true,             // true if winner, false if nominee
  image: "https://commons.wikimedia.org/...",  // Wikidata poster image (P18)
  metadata: {
    wikidataUrl: "https://www.wikidata.org/wiki/Q104123"
  }
}
```

### Rating Object
```javascript
{
  qid: "Q104123",
  rating: "like",           // "like" | "dislike" | "neutral"
  note: "Brilliant cinematography and acting"
  // Note: timestamp stored internally for tracking, not exported to YAML
}
```

### Export Schema
```yaml
task: "As a movie connoisseur, analyze the ratings provided below and suggest films I might enjoy. I prefer these genres: drama, thriller. Please avoid suggesting films with: horror, violence. Focus on critically acclaimed, award-winning titles."
version: "1.0"
exportDate: "2026-01-01T12:34:56Z"
sourceInfo:
  dataSource: "Wikidata SPARQL"
  scope: "Academy Award for Best Picture (all years)"
  totalFilms: 567
preferences:
  description: "I prefer character-driven dramas with strong performances"
  preferredGenres:
    - drama
    - thriller
    - documentary
  avoidContent:
    - horror
    - excessive violence
ratings:
  - qid: "Q104123"
    title: "The Godfather"
    year: 1972
    rating: "like"
    note: "Brilliant cinematography"
  - qid: "Q180098"
    title: "Crash"
    year: 2004
    rating: "dislike"
    note: "Too heavy-handed"
```

**Note:** The same YAML format is used for both:
1. **Saving/Loading** - Full data preservation with all fields
2. **LLM Prompts** - `task` field provides context for AI analysis

### Unified YAML Format

The application uses a single YAML format for both data persistence and LLM interaction:

**Key Fields:**
- `task` - LLM instruction built from user preferences and ratings
- `version` - Export format version
- `exportDate` - ISO 8601 timestamp
- `sourceInfo` - Metadata about data source
- `preferences` - User's viewing preferences
- `ratings` - All rated films (liked, disliked, neutral)

**Benefits:**
1. **Single Format** - No need to maintain separate export types
2. **Portable** - Same file works for backup and LLM prompts
3. **Human-Readable** - YAML is easier to read/edit than JSON
4. **Structured** - LLMs understand YAML structure well
5. **Editable** - Users can manually edit preferences or ratings

**Workflow:**
1. User rates films and sets preferences
2. Click "Copy for LLM" → Copies YAML to clipboard
3. Paste into ChatGPT/Claude/etc
4. LLM reads `task` field for instructions, analyzes `ratings`
5. Same YAML can be saved via "Download YAML" for later import

## SPARQL Query Outline

### Primary Query to Wikidata
```sparql
SELECT DISTINCT ?film ?filmLabel ?year ?genreLabel ?directorLabel ?actorLabel ?imdbId ?isWinner
WHERE {
  # Get films nominated for or winning Best Picture
  ?film (wdt:P166|wdt:P1411) ?award .
  ?award (wdt:P279*) wd:Q103360 .  # Academy Award for Best Picture
  
  # Optional: distinguish winners from nominees
  OPTIONAL {
    ?film wdt:P166 ?wonAward .
    ?wonAward (wdt:P279*) wd:Q103360 .
    BIND(true AS ?isWinner)
  }
  
  # Get publication date/year
  OPTIONAL { ?film wdt:P577 ?pubDate . BIND(YEAR(?pubDate) AS ?year) }
  
  # Get genres
  OPTIONAL { ?film wdt:P136 ?genre . }
  
  # Get directors
  OPTIONAL { ?film wdt:P57 ?director . }
  
  # Get cast members (limit to main cast via ranking if possible)
  OPTIONAL { 
    ?film p:P161 ?castStatement .
    ?castStatement ps:P161 ?actor .
    # Could filter by statement rank here
  }
  
  # Get IMDb ID
  OPTIONAL { ?film wdt:P345 ?imdbId . }
  
  # Get poster/image
  OPTIONAL { ?film wdt:P18 ?image . }
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
```

### Notes on Query
- Use `SELECT DISTINCT` to avoid duplicates from multiple genres/actors
- Results will need aggregation in JavaScript (group by film QID)
- May need pagination or LIMIT if result set is very large
- Could add FILTER for specific time ranges if needed

## Multi-Source Architecture

### Supported Film Sources

**Oscar Best Picture (Primary)**
- Source: Wikidata SPARQL endpoint
- Query: Films with P166 (winner) or P1411 (nominee) for Q102427 (Academy Award Best Picture)
- Status: Active
- Count: ~500 films (1927-present)

**Bechdel Test Films (Planned)**
- Source: Bechdel Test API (https://bechdeltest.com/api/v1/getAllMovies)
- Criteria: Films that pass the Bechdel Test (two named women talk about something other than a man)
- Status: Coming soon
- Integration approach:
  - Fetch from Bechdel API
  - Cross-reference IMDb IDs with Wikidata for metadata enrichment (genres, directors, cast)
  - Store in `bechdelFilms` array with `source: 'bechdel'` field
  - Allow user to filter recommendations by source

**All Films (Combined)**
- Merges all available sources
- Maintains source attribution via `source` field
- Deduplicates by QID if film appears in multiple sources

### Source Selection

Users can switch between sources via the UI:
```javascript
app.changeSource('oscars')   // Oscar nominees only
app.changeSource('bechdel')  // Bechdel-passing films only
app.changeSource('all')      // Combined dataset
```

Each source change:
1. Updates `app.films` array from appropriate source
2. Resets batch history to avoid confusion
3. Clears recently-shown tracking
4. Loads new batch from selected source
5. Updates UI with film counts

### Adding New Sources

To add a new film source (e.g., BAFTA, Golden Globes):

1. **Create loading function:**
```javascript
async loadBAFTAFilms() {
    // Query Wikidata for BAFTA winners/nominees (Q271394)
    // Store in this.baftaFilms with source: 'bafta'
}
```

2. **Update source selector UI** in index.html:
```html
<div class="source-card" id="source-bafta" onclick="app.changeSource('bafta')">
    <div style="font-size: 2em;">🎭</div>
    <div style="font-weight: bold;">BAFTA Best Film</div>
    <div style="font-size: 0.85em;">British Academy Awards</div>
    <div id="bafta-count">Loading...</div>
</div>
```

3. **Update `updateFilmsFromSource()`** method:
```javascript
case 'bafta':
    this.films = [...this.baftaFilms];
    break;
```

4. **Update `changeSource()`** to handle new source name

5. **Call loading function** in `init()`

6. **Update cache keys** in localStorage (e.g., `baftaFilmsCache`)

## Recommendation Algorithm

### Similarity Score Calculation
For each unrated film compared to rated films:

```javascript
similarityScore = 
  (genreOverlap * 5.0) +        // Highest weight
  (directorMatch * 3.0) +        // High weight
  (castOverlap * 2.0) +          // Medium weight  
  (decadeProximity * 1.0)        // Low weight

// Only consider films rated "like" for positive recommendations
// Films with higher scores to liked films = better recommendations
```

### Components
- **Genre Overlap**: Jaccard similarity of genre sets (0-1)
- **Director Match**: 1 if same director, 0 otherwise
- **Cast Overlap**: Number of shared cast members / union of cast
- **Decade Proximity**: 1 - (abs(yearDiff) / 100), capped at 0

### Filtering
- Exclude already-rated films from recommendations
- Sort by similarity score descending
- Show top 10 recommendations

## JustWatch Links

Generate search URLs (no API calls):
```javascript
// Canada
https://www.justwatch.com/ca/search?q={encodeURIComponent(title)}

// UK
https://www.justwatch.com/uk/search?q={encodeURIComponent(title)}
```

Optional provider links (as searches):
- Netflix: `https://www.netflix.com/search?q={title}`
- Amazon: `https://www.amazon.com/s?k={title}`

## User Preferences

Users can set viewing preferences that are included in exports and LLM prompts:

### Preference Fields
- **Description**: Free-text description of what they're looking for in films
- **Preferred Genres**: Comma-separated list of genres they enjoy
- **Avoid Content**: Content types or themes to avoid

### Storage
- Saved in `localStorage` as `oscarPreferences`
- Included in YAML exports for portability
- Automatically loaded on import
- Used in LLM export to provide better context

### Use Cases
1. **LLM Recommendations**: Provide rich context beyond just ratings
2. **Sharing Preferences**: Export and share with others or across devices
3. **Future Filtering**: Could be used to pre-filter recommendations
4. **Profile Persistence**: Maintain viewing preferences over time

## Technology Stack

- **HTML5** - Structure
- **Vanilla JavaScript** - All logic (no frameworks to keep it simple)
- **CSS3** - Styling
- **Wikidata Query Service** - https://query.wikidata.org/sparql
- **No build tools** - Direct to GitHub Pages

## Validation Strategy

- Display total film count after loading
- Compare count to known Oscar history (~10 nominees per year since 1940s)
- If count seems off, manually check against Wikipedia Best Picture page
- Log any films missing key metadata (year, director, etc.)

## State Management

### Persistence
- **Ratings**: Stored in `localStorage` as `oscarRatings` for persistence between sessions
- **Preferences**: Stored in `localStorage` as `oscarPreferences`
- **Film Cache**: Stored in `localStorage` as `oscarFilmsCache` for offline functionality
- **Export**: Creates downloadable YAML file (human-readable and LLM-friendly)
- **Copy for LLM**: Copies YAML to clipboard for pasting into AI tools
- **Import**: Reads YAML or JSON and merges/overwrites localStorage

### Batch Navigation
- **Batch History**: Array of previous batches for navigation
- **Current Index**: Tracks position in batch history
- **Previous Button**: Navigate to previously viewed batches
- **Next Button**: Navigate forward or load new random batch
- **Random Button**: Always generates a new random batch

### Offline Mode
- **Cache First**: Always tries to load from cache on page load
- **Background Refresh**: Attempts to update from Wikidata in background
- **Offline Detection**: Browser online/offline events trigger offline banner
- **Manual Retry**: Red "Reconnect" button attempts to refresh from Wikidata
- **Graceful Degradation**: App fully functional with cached data only

## Offline Mode

### Cache Strategy
1. **On First Load**: Query Wikidata and cache results in localStorage
2. **On Subsequent Loads**: Load from cache immediately, refresh in background
3. **On Network Failure**: Fall back to cached data, show offline banner
4. **Cache Invalidation**: Manual reconnect or successful background refresh

### Cache Storage
```javascript
{
  films: [...],              // Array of Film objects
  timestamp: "2026-01-01T12:00:00Z",
  version: "1.0"
}
```

### User Experience
- **Offline Banner**: Red banner at top with warning icon and "Reconnect" button
- **Seamless Transition**: App works identically in offline mode
- **No Data Loss**: Ratings and recommendations still functional
- **Visual Feedback**: Clear indication of offline status

## Error Handling

- Handle SPARQL query failures gracefully
- Show loading state during data fetch
- Validate import JSON structure
- Handle missing metadata fields (use "Unknown" placeholders)
