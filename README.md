# 🎬 Show Suggester

A no-auth, client-side recommendation engine that helps you discover great films and TV shows based on your preferences. Built with vanilla JavaScript and powered by a curated local seed dataset of diverse, quality films.

**Currently includes:** 104 carefully curated films from 14 diverse sources: environmental documentaries, social justice films, Oscar winners, AFI classics, international cinema, LGBTQ+ films, diverse directors, recent releases, and more. Expandable to thousands via Python updater script.

## 🎯 Project Goals

- **Quality over Quantity**: Curated seed of ethically-conscious and critically-acclaimed films
- **Films AND TV Shows**: One interface for all visual entertainment
- **Privacy-First**: No tracking, no accounts, no data leaves your browser
- **Explainable**: Understand WHY shows are recommended based on visible criteria
- **Instant Loading**: No waiting for APIs - seed data loads immediately from static file

## 🚀 Quick Start

### Try It Now (Locally)
1. Clone this repository or download the files
2. Open `index.html` in a modern web browser (or use local server: `python3 -m http.server 8765`)
3. The app loads instantly with 104 curated seed films from `seed-films.json`
4. Start rating films!
5. Use Python script to expand dataset (see [SEED_UPDATER.md](SEED_UPDATER.md))

### Deploy to GitHub Pages
1. Fork or upload this repository to GitHub
2. Go to repository **Settings** → **Pages**
3. Under "Source", select **Deploy from a branch**
4. Select the `main` branch and `/ (root)` folder
5. Click **Save**
6. Your site will be live at `https://yourusername.github.in/show-suggester/`

## 📖 How to Use

1. **Initial Load**: The app loads instantly with 104 curated seed films from local JSON
2. **Set Filters**: Use dropdown menus to filter by year range (All Years, Last 20 Years, Last 2 Years) and runtime (All Lengths, Short <90min, Medium 90-150min, Long >150min)
3. **Rate Films**: A random batch of 15-20 films appears with large poster images. Rate each as 👍 Like, 😐 Neutral, or 👎 Dislike
4. **Add Notes**: Optionally explain why you liked/disliked each film
5. **Load Random Batch**: Click to load a new set of unrated films (won't repeat recently shown films)
6. **View My Ratings**: Click to see all films you've rated and manage them
7. **Get Recommendations**: Click "Show Recommendations" to see films similar to ones you liked
8. **Copy for LLM**: Click "📋 Copy for LLM" to copy your ratings as YAML and paste into ChatGPT/Claude for personalized suggestions
9. **Export/Import**: Save your ratings as YAML file to reload later or share

## 🎯 Features

### User Interface
- **Full-Width Responsive Layout**: Desktop mode has resizable sidebar (33.33% width, adjustable) + main content area
- **Mobile-Optimized**: Single-column layout with sidebar on top, simplified controls
- **Large Film Posters**: 400px poster images as primary visual element (300px on mobile)
- **Elegant Dropdown Filters**: Year range (All, Last 20, Last 2) and runtime (All, Short <90min, Medium 90-150min, Long >150min)
- **My Ratings View**: Collapsible section showing all rated films with ability to remove ratings
- **Recently Shown Tracking**: Random batches avoid showing the same films repeatedly

### Data & Privacy
- **Instant Loading**: 104 curated films load immediately from local `seed-films.json`
- **Diverse Curated Sources**: 
  - Recent releases (13.5%)
  - Oscar winners (9.6%)
  - Social justice films (9.6%)
  - International cinema (8.7%)
  - Environmental documentaries (7.7%)
  - Modern classics (7.7%)
  - AFI Top 100 (6.7%)
  - Diverse directors (6.7%)
  - Popular films (6.7%)
  - LGBTQ+ films (4.8%)
  - Documentary (4.8%)
  - Sci-Fi (4.8%)
  - Animation (4.8%)
  - Fantasy (3.8%)
- **Expandable Dataset**: Python script (`update_seed_films.py`) can add thousands more films from Bechdel Test API and other sources
- **100% Offline**: Works completely offline after initial page load
- **Privacy-First**: All ratings stored only in browser localStorage, nothing sent to servers
- **No Authentication**: Zero login, zero API keys, zero configuration

### Intelligence & Export
- **Smart Recommendations**: Content-based filtering using genres (high weight), directors (medium), cast overlap (medium), year proximity (low)
- **LLM Export**: One-click copy to clipboard in YAML format for ChatGPT/Claude analysis
- **YAML Import/Export**: Save and restore all ratings with human-readable format
- **Where to Watch**: Direct links to JustWatch (Canada/UK) and streaming search

## 🖼️ Adding Movie Posters

Film cards support poster images for better visual recognition. To enable posters:

1. **Get a free TMDb API key**: Visit [TMDb API Settings](https://www.themoviedb.org/settings/api)
   - Create a free account
   - Request a developer API key (no credit card required)
   - Copy your API key (starts with a long string of letters/numbers)

2. **Configure the environment**: Copy the example environment file and add your key:
   ```bash
   cp example.env .env
   ```
   Edit `.env` and set:
   ```bash
   TMDB_API_KEY=your_api_key_here
   ```

3. **Install python-dotenv** (if not already installed):
   ```bash
   pip install python-dotenv
   ```

4. **Fetch posters**: Run the dataset expansion script:
   ```bash
   python3 expand_dataset.py
   ```
   This will fetch poster URLs for all 6,000+ films and update both datasets.

5. **Refresh the app**: Reload the browser to see poster images on all film cards.

**Note**: Posters are optional—the app works perfectly without them. The `.env` file is git-ignored so your API key stays private. See [POSTERS.md](POSTERS.md) for detailed instructions and troubleshooting.

## 🏗️ Architecture Overview

### Current Data Flow

```
┌─────────────────┐
│   Page Load     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Load Local JSON                │
│  (seed-films.json)              │
│  104 curated films              │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Apply Filters                  │
│  - Year (dropdown)              │
│  - Runtime (dropdown)           │
│  allFilms → films (filtered)    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Random Batch Selection         │
│  15-20 unrated films            │
│  Avoid recentlyShownQIDs        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  User Rating                    │
│  - Like/Neutral/Dislike         │
│  - Optional notes               │
│  - Stored in localStorage       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Recommendation Engine          │
│  Content-Based Similarity:      │
│  - Genres (weight: 5.0)         │
│  - Directors (weight: 3.0)      │
│  - Cast overlap (weight: 2.0)   │
│  - Year proximity (weight: 1.0) │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Display Recommendations        │
│  + Large poster images          │
│  + JustWatch links (CA/UK)      │
│  + YAML export for LLMs         │
└─────────────────────────────────┘
```

### Dataset Expansion (Optional)

```
┌──────────────────────┐
│  Python Script       │
│  update_seed_films.py│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Fetch from Bechdel Test API     │
│  (requires: pip install requests)│
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Deduplicate & Add to JSON       │
│  seed-films.json updated         │
└──────────────────────────────────┘
```

## 📊 Data Objects & Schema

### Show Object (seed-films.json)

```javascript
{
  qid: "bechdel-tt6751668",     // Unique identifier (can be custom)
  title: "Parasite",
  year: 2019,
  genres: ["thriller", "drama"], // Optional but recommended
  directors: ["Bong Joon-ho"],  // Optional
  cast: ["Song Kang-ho"],       // Optional
  imdbId: "tt6751668",          // Optional
  runtime: 132,                  // Optional (minutes)
  source: "oscars"               // Required: data source tag
}
```

### Ratings Object (localStorage)

```javascript
{
  "bechdel-tt6751668": {
    rating: "like",                                    // Required
    note: "Brilliant social commentary",             // Optional
    timestamp: "2026-01-01T12:34:56Z"                // Auto-generated
  }
}
```

### YAML Export Format (for LLMs)

```yaml
=== LIKED FILMS ===
1. Parasite (2019)
   → Brilliant social commentary and cinematography

2. Moonlight (2016)
   → Beautiful, intimate storytelling

=== DISLIKED FILMS ===
1. Crash (2004)
   → Heavy-handed and predictable

=== REQUEST FOR AI ===
Based on the films I liked and disliked above, please suggest 5-10 similar films.
```

## 🐍 Python Updater Script

### Expanding the Dataset

Use `update_seed_films.py` to maintain and expand the seed dataset:

```bash
# Show current dataset statistics
python3 update_seed_films.py --stats

# Add films from Bechdel Test API (requires: pip install requests)
python3 update_seed_films.py --add-bechdel --limit 1000 --min-rating 3

# Remove duplicate films
python3 update_seed_films.py --deduplicate

# Combine operations
python3 update_seed_films.py --add-bechdel --limit 500 --deduplicate --stats
```

### Script Features
- **Stats**: Show comprehensive dataset statistics (sources, decades, metadata coverage)
- **Bechdel API**: Fetch films passing Bechdel Test
- **Deduplication**: Remove duplicate entries by QID
- **Graceful Degradation**: Works without `requests` module for stats/deduplication
- **JSON Management**: Updates timestamp and version on save

See [SEED_UPDATER.md](SEED_UPDATER.md) for complete documentation.

## Recommendation Algorithm

### Content-Based Similarity Score

```javascript
function calculateSimilarity(movie1, movie2) {
  let score = 0;
  
  // Genre overlap (40% weight)
  const genreOverlap = jaccardSimilarity(movie1.genres, movie2.genres);
  score += genreOverlap * 0.4;
  
  // Director match (25% weight)
  const directorMatch = arrayIntersection(movie1.directors, movie2.directors).length > 0 ? 1 : 0;
  score += directorMatch * 0.25;
  
  // Cast overlap (20% weight)
  const castOverlap = jaccardSimilarity(movie1.cast.slice(0, 5), movie2.cast.slice(0, 5));
  score += castOverlap * 0.2;
  
  // Year proximity (15% weight)
  const yearDiff = Math.abs(movie1.year - movie2.year);
  const yearSimilarity = Math.max(0, 1 - (yearDiff / 50)); // 50-year decay
  score += yearSimilarity * 0.15;
  
  return score;
}

// Jaccard similarity: |A ∩ B| / |A ∪ B|
function jaccardSimilarity(arr1, arr2) {
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}
```

### Recommendation Strategy

1. Filter movies user has liked (rating === "like")
2. For each unrated movie, calculate average similarity to all liked movies
3. Sort by similarity score descending
4. Return top N recommendations (e.g., 10)
5. Exclude movies user has already rated (like, dislike, or neutral)

## JustWatch Link Generation

```javascript
function generateJustWatchLinks(movie) {
  const searchQuery = encodeURIComponent(movie.title);
  
  return {
    justWatchCA: `https://www.justwatch.com/ca/search?q=${searchQuery}`,
    justWatchUK: `https://www.justwatch.com/uk/search?q=${searchQuery}`,
    
    // Optional provider searches (no availability claims)
    netflix: `https://www.netflix.com/search?q=${searchQuery}`,
    primevideo: `https://www.amazon.com/s?k=${searchQuery}&i=instant-video`,
    disneyplus: `https://www.disneyplus.com/search?q=${searchQuery}`
  };
}
```

## Technical Stack

- **HTML5** - Semantic markup
- **Vanilla JavaScript** (ES6+) - No frameworks to keep it lightweight
- **CSS3** - Responsive design with Grid/Flexbox
- **Fetch API** - For SPARQL and Wikipedia API calls
- **LocalStorage** - Persist state between page loads (optional enhancement)

## No Dependencies

- No npm packages
- No build step
- No backend server
- No API keys
- Static files only → deployable to GitHub Pages

## GitHub Pages Deployment

1. Create repository
2. Add `index.html`, `style.css`, `app.js` to root or `docs/` folder
3. Enable GitHub Pages in repository settings
4. Access at `https://[username].github.io/[repo-name]/`

## Constraints & Limitations

✅ **What Works:**
- Fully functional on page load (no auth needed)
- Accurate data from Wikidata (canonical source)
- Works even if Wikipedia changes HTML structure
- Export/import preserves all user data
- Explainable recommendations (content-based)

⚠️ **Known Limitations:**
- SPARQL query may be slow for initial load (~3-10 seconds)
- No streaming availability data (only search links)
- JustWatch links are searches, not direct title pages
- Recommendation quality depends on metadata completeness in Wikidata
- Wikipedia validation is optional and informational only

## Future Enhancements (Out of Scope for POC)

- Add caching layer (IndexedDB) for Wikidata results
- Expand to other award categories (BAFTA, Golden Globe)
- Collaborative filtering using aggregated export data
- Rotten Tomatoes/Metacritic score integration (if API-free method exists)
- Visual similarity using poster images from Wikidata

## 🔧 Technology Stack

- **HTML5** - Semantic structure
- **CSS3** - Responsive design with gradient background  
- **Vanilla JavaScript (ES6+)** - All logic, no frameworks
- **LocalStorage API** - Persistent ratings between sessions
- **Wikidata Query Service** - Free public SPARQL endpoint
- **No Build Tools** - Works directly, deploys to GitHub Pages immediately

## 📁 File Structure

```
show-suggester/
├── index.html            # Main UI (full-width responsive layout)
├── app.js                # Application logic (~1550 lines)
├── seed-films.json       # Curated dataset (104 films from 14 sources)
├── update_seed_films.py  # Python script to expand dataset
├── ARCHITECTURE.md       # Detailed technical documentation
├── AGENTS.md             # AI agent development guidelines
├── SEED_UPDATER.md       # Python script documentation
└── README.md             # This file
```

## 🔒 Privacy & Security

- ✅ **No Authentication** - Works without login
- ✅ **No API Keys** - All APIs are public and free
- ✅ **No Backend** - Entirely client-side JavaScript
- ✅ **No Scraping** - Only uses official APIs and search links
- ✅ **No Tracking** - Ratings stored only in browser localStorage
- ✅ **No Data Collection** - Nothing sent to external servers

## 🐛 Troubleshooting

**Films not loading?**
- Check that `seed-films.json` exists in the same directory as `index.html`
- Open browser console (F12) for error messages
- Try running with local server: `python3 -m http.server 8765`

**Filters not working?**
- Make sure you click "Load Random Batch" after changing filters
- Check that films matching your filter criteria exist in the dataset
- Status message shows how many films match current filters

**Recommendations seem off?**
- Rate at least 5-10 films as "like" for better accuracy
- Algorithm uses content-based filtering (genres, directors, cast, year)
- Try the LLM export for personalized AI-guided suggestions

**Python script errors?**
- For `--stats` and `--deduplicate`: no dependencies needed
- For `--add-bechdel`: requires `pip install requests`
- See [SEED_UPDATER.md](SEED_UPDATER.md) for detailed troubleshooting

## 📚 Learn More

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete technical documentation including data flow, schemas, and algorithm details
- **[AGENTS.md](AGENTS.md)** - Development guidelines for AI assistants and developers to maintain consistency
- **[SEED_UPDATER.md](SEED_UPDATER.md)** - Python script documentation for dataset management

## 🙏 Acknowledgments

- Film data from [Wikidata](https://www.wikidata.org/) (CC0 License)
- "Where to watch" discovery via [JustWatch](https://www.justwatch.com/)
- Inspired by explainable, privacy-respecting recommendation systems

---

**Last Updated:** January 1, 2026
