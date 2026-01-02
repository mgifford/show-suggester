# 🎬 Show Suggester

A no-auth, client-side recommendation engine that helps you discover great films and TV shows based on your preferences. Built with vanilla JavaScript and powered by a curated seed dataset of diverse, quality films.

**Currently includes:** 100+ carefully curated films from environmental/social justice documentaries, Oscar winners, AFI classics, international cinema, LGBTQ+ films, diverse directors, and more. Plus ~8,000 Bechdel Test-passing films via API.

## 🎯 Project Goals

- **Quality over Quantity**: Curated seed of ethically-conscious and critically-acclaimed films
- **Films AND TV Shows**: One interface for all visual entertainment
- **Privacy-First**: No tracking, no accounts, no data leaves your browser
- **Explainable**: Understand WHY shows are recommended based on visible criteria
- **Instant Loading**: No waiting for APIs - seed data loads immediately from static file

## 🚀 Quick Start

### Try It Now (Locally)
1. Clone this repository or download the files
2. Open `index.html` in a modern web browser
3. The app loads instantly with curated seed films
4. Bechdel Test films load from API (~8,000 films)
5. Start rating films!

### Deploy to GitHub Pages
1. Fork or upload this repository to GitHub
2. Go to repository **Settings** → **Pages**
3. Under "Source", select **Deploy from a branch**
4. Select the `main` branch and `/ (root)` folder
5. Click **Save**
6. Your site will be live at `https://yourusername.github.in/show-suggester/`

## 📖 How to Use

1. **Initial Load**: The app loads instantly with 100+ curated seed films, then fetches Bechdel Test films from API
2. **Choose Source**: Select seed films, Bechdel Test films, or all combined
3. **Set Filters**: Filter by year range and film length
4. **Set Preferences**: Check boxes for genres you like and content to avoid
5. **Rate Films**: A random batch of 15-20 films appears. Rate each as 👍 Like, 😐 Neutral, or 👎 Dislike
6. **Add Notes**: Optionally explain why you liked/disliked each film
7. **Navigate Batches**: Use Previous/Next buttons to browse through batches
8. **View My Ratings**: Click to see all films you've rated and manage them
9. **Get Recommendations**: Click "Show Recommendations" to see films similar to ones you liked
10. **Copy for LLM**: Click "📋 Copy for LLM" to copy your ratings as YAML and paste into ChatGPT/Claude
11. **Download/Import**: Save your ratings as YAML file to reload later

## 🎯 Features

- **Instant Loading**: Curated seed dataset loads immediately from static JSON file
- **Diverse Sources**: 
  - Environmental/social justice documentaries (An Inconvenient Truth, 13th, Blackfish)
  - Oscar Best Picture winners (recent and classic)
  - AFI Top 100 classics (Citizen Kane, Casablanca, The Godfather)
  - International cinema (Roma, Parasite, Amélie, City of God)
  - LGBTQ+ films (Pride, Carol, Call Me by Your Name)
  - Films by diverse directors (Ava DuVernay, Barry Jenkins, Greta Gerwig)
  - ~8,000 Bechdel Test-passing films via API
- **Smart Filters**: 
  - **Year Range**: All, Last 20 Years, Last 2 Years
  - **Runtime**: All, Short (<90 min), Medium (90-150 min), Long (>150 min)
- **My Ratings View**: See all rated films with ability to remove ratings
- **Ethically-Curated**: Films with environmental and social justice themes
- **Smart Recommendations**: Content-based filtering using genres, directors, cast, runtime, and release years
- **Quick Preferences**: Checkbox selections for genres and content to avoid
- **User Ratings**: Rate films with optional explanatory notes
- **Batch Navigation**: Previous/Next buttons to browse through film batches
- **Film Posters**: Visual memory aids from Wikidata
- **Where to Watch**: Direct links to JustWatch (Canada/UK) and Netflix search
- **Copy for LLM**: One-click copy to clipboard in YAML format for AI analysis
- **Export/Import**: Save and restore all your data in YAML format
- **Offline Mode**: Works without internet after initial load
- **No Backend Required**: Runs entirely in the browser
- **Privacy-First**: All data stored locally in your browser only

## Architecture Overview

### Data Flow

```
┌─────────────────┐
│   Page Load     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Wikidata SPARQL Query          │
│  (Best Picture Winners/Nominees)│
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Normalize to Stable IDs        │
│  - QID (Wikidata)               │
│  - IMDb ID (if available)       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Random Selection (10-20)       │
│  Present for User Rating        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  User Interaction               │
│  - Like/Dislike/Neutral         │
│  - Add text notes               │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Recommendation Engine          │
│  Content-Based Similarity:      │
│  - Genres (high weight)         │
│  - Director (medium weight)     │
│  - Cast overlap (medium weight) │
│  - Year proximity (low weight)  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Display Recommendations        │
│  + JustWatch Links (CA/UK)      │
│  + Provider Search Links        │
└─────────────────────────────────┘
```

### Optional Validation Flow

```
┌──────────────────────┐
│  Sanity Check Only   │
│  Wikipedia API       │
│  (Best Picture page) │
└──────────────────────┘
         │
         ▼
   Compare count/
   coverage with
   Wikidata results
```

## Data Objects & Schema

### Core Movie Object

```javascript
{
  qid: "Q104123",              // Wikidata QID (stable identifier)
  title: "Parasite",
  year: 2019,
  genres: ["thriller", "drama", "dark comedy"],
  directors: ["Bong Joon-ho"],
  cast: ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong"],
  imdbId: "tt6751668",         // Optional
  isWinner: true,              // Winner vs nominee
  rating: null                 // null | "like" | "dislike" | "neutral"
  note: ""                     // User's free-text note
}
```

### User Ratings Object (In-Memory State)

```javascript
{
  movies: [ /* array of Movie objects */ ],
  ratings: {
    "Q104123": {
      rating: "like",
      note: "Brilliant social commentary and cinematography",
      timestamp: "2026-01-01T12:34:56Z"
    }
  },
  sessionStarted: "2026-01-01T12:00:00Z"
}
```

### JSON Export Schema

```json
{
  "version": "1.0",
  "exportedAt": "2026-01-01T12:34:56Z",
  "sourceInfo": {
    "dataSource": "Wikidata Query Service",
    "queryDate": "2026-01-01T12:00:00Z",
    "totalTitles": 543,
    "scope": "Academy Award for Best Picture (all years)"
  },
  "ratings": [
    {
      "qid": "Q104123",
      "title": "Parasite",
      "year": 2019,
      "rating": "like",
      "note": "Brilliant social commentary and cinematography",
      "ratedAt": "2026-01-01T12:15:00Z"
    }
  ]
}
```

### LLM Export Text Format

```
=== LIKED MOVIES ===
1. Parasite (2019)
   → Brilliant social commentary and cinematography

2. The Godfather (1972)
   → Perfect pacing, iconic performances

=== DISLIKED MOVIES ===
1. Crash (2004)
   → Heavy-handed and predictable

=== REQUEST FOR AI ===
Based on the movies I liked and disliked above, please suggest 5-10 similar films.
Constraints:
- Prefer critically acclaimed or award-winning titles
- Focus on [genres from liked films]
- Avoid [themes from disliked films]
```

## SPARQL Query Outline

### Primary Query: Get Oscar Best Picture Data

```sparql
SELECT DISTINCT ?film ?filmLabel ?year ?genreLabel ?directorLabel ?actorLabel ?imdbId ?isWinner
WHERE {
  # Films nominated for or winning Best Picture
  {
    ?film wdt:P166 wd:Q102427 .  # Winner of Academy Award for Best Picture
    BIND(true as ?isWinner)
  }
  UNION
  {
    ?film wdt:P1411 wd:Q102427 . # Nominated for Best Picture
    BIND(false as ?isWinner)
  }
  
  # Get metadata
  OPTIONAL { ?film wdt:P577 ?publicationDate . }  # Publication date
  OPTIONAL { ?film wdt:P136 ?genre . }            # Genre
  OPTIONAL { ?film wdt:P57 ?director . }          # Director
  OPTIONAL { ?film wdt:P161 ?actor . }            # Cast member
  OPTIONAL { ?film wdt:P345 ?imdbId . }           # IMDb ID
  
  # Extract year from date
  BIND(YEAR(?publicationDate) as ?year)
  
  # Get labels
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?year)
```

**Notes:**
- Returns multiple rows per film (one per genre, director, actor)
- Client-side post-processing required to aggregate into single movie objects
- Optional fields handled gracefully
- Language set to English for labels

### Validation Query (Wikipedia Fallback)

Use MediaWiki Action API to fetch:
```
https://en.wikipedia.org/w/api.php?
  action=parse&
  page=Academy_Award_for_Best_Picture&
  prop=wikitext&
  format=json&
  origin=*
```

Parse the wikitext to extract year ranges and compare total count with Wikidata results.

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
├── index.html       # Main UI and structure
├── app.js          # Application logic (ratings, recommendations, export)
├── ARCHITECTURE.md # Detailed technical documentation
└── README.md       # This file
```

## 🔒 Privacy & Security

- ✅ **No Authentication** - Works without login
- ✅ **No API Keys** - All APIs are public and free
- ✅ **No Backend** - Entirely client-side JavaScript
- ✅ **No Scraping** - Only uses official APIs and search links
- ✅ **No Tracking** - Ratings stored only in browser localStorage
- ✅ **No Data Collection** - Nothing sent to external servers

## 🐛 Troubleshooting

**Stuck on "Loading..."?**
- Check internet connection
- Refresh the page
- Check browser console for errors
- Wikidata Query Service may be temporarily unavailable

**Missing some Oscar films?**
- SPARQL query limits to 5000 results to prevent timeouts
- Very old nominations may have incomplete Wikidata records
- Films without release year are filtered out

**Recommendations seem off?**
- Rate more films (at least 5-10 "likes") for better accuracy
- Algorithm is simple content-based filtering
- Try the LLM export for human-guided suggestions

## 📚 Learn More

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete technical documentation including data flow, schemas, SPARQL queries, and algorithm details
- **[AGENTS.md](AGENTS.md)** - Development guidelines for AI assistants and developers to maintain consistency
- **[TESTING.md](TESTING.md)** - Comprehensive testing guide and checklists

## 🙏 Acknowledgments

- Film data from [Wikidata](https://www.wikidata.org/) (CC0 License)
- "Where to watch" discovery via [JustWatch](https://www.justwatch.com/)
- Inspired by explainable, privacy-respecting recommendation systems

---

**Last Updated:** January 1, 2026
