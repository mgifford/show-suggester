# Testing Guide

## Pre-Deployment Testing

### 1. Local Testing
Open `index.html` directly in your browser to test locally:

```bash
# From the project directory
open index.html  # macOS
# or
start index.html # Windows
# or
xdg-open index.html # Linux
```

### 2. Test with Local Server (Recommended)
For a more realistic test environment:

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if you have npx)
npx http-server -p 8000

# Then visit: http://localhost:8000
```

## Feature Checklist

### Initial Load
- [ ] Page loads without errors
- [ ] Loading spinner displays
- [ ] Wikidata query completes (check browser console)
- [ ] Statistics show total films loaded
- [ ] Status message updates to "Ready!"

### Rating System
- [ ] Click "Load New Batch to Rate" - shows 10-15 random films
- [ ] Each film displays:
  - [ ] Title and year
  - [ ] Director name
  - [ ] Genres list
  - [ ] Cast members (top 3)
  - [ ] Winner badge (🏆) if applicable
- [ ] Click 👍 Like button - card turns green
- [ ] Click 👎 Dislike button - card turns red
- [ ] Click 😐 Neutral button - card turns gray
- [ ] Type note in text field - saves with rating
- [ ] Rating persists (reload page and check localStorage)

### Recommendations
- [ ] After rating 5+ films with "Like", click "Show Recommendations"
- [ ] Recommendations section appears
- [ ] Shows unrated films only
- [ ] Each has a "Match %" score
- [ ] Higher scores appear first
- [ ] JustWatch links work (opens in new tab)

### Export/Import
- [ ] Click "Export Ratings (JSON)" - downloads `.json` file
- [ ] Open downloaded file - verify structure matches schema
- [ ] Click "Export for LLM" - downloads `.txt` file
- [ ] Open text file - readable format with liked/disliked sections
- [ ] Click "Import Ratings" - select previously exported JSON
- [ ] Ratings restore correctly
- [ ] Statistics update after import

### Where to Watch Links
- [ ] "JustWatch Canada" link opens JustWatch CA search
- [ ] "JustWatch UK" link opens JustWatch UK search
- [ ] "Netflix Search" link opens Netflix search
- [ ] All links include proper URL encoding for titles with spaces/special chars

### LocalStorage Persistence
1. Rate several films
2. Close browser tab completely
3. Reopen `index.html`
4. [ ] Previous ratings still visible
5. [ ] Statistics reflect previous session
6. [ ] Click "Clear All Ratings" - everything resets

## Browser Compatibility Testing

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Expected Behavior
- All modern browsers should work
- LocalStorage may not work in private/incognito mode (expected)
- CORS should not be an issue (Wikidata allows cross-origin requests)

## Known Expected Behaviors

### Slow Initial Load
- First load may take 5-15 seconds (Wikidata SPARQL query)
- This is normal - querying 500+ films with metadata
- Consider this acceptable for POC

### Missing Metadata
- Some older films may lack complete data
- Displays "Unknown" for missing fields
- This is expected - depends on Wikidata completeness

### Duplicate Films
- Rare edge case: some films may appear twice if Wikidata has duplicate entries
- Can be filtered in future enhancement

## Debugging

### Browser Console Checks

```javascript
// Check loaded films
console.log('Total films:', app.films.length);

// Check current ratings
console.log('Ratings:', app.ratings);

// Check localStorage
console.log('Stored:', localStorage.getItem('oscarRatings'));

// Clear localStorage manually
localStorage.removeItem('oscarRatings');
location.reload();
```

### Common Issues

**CORS errors:**
- Should not occur (Wikidata allows cross-origin)
- If occurs, use local server instead of file:// protocol

**localStorage quota exceeded:**
- Very unlikely (ratings are small)
- Clear old data: click "Clear All Ratings"

**Wikidata timeout:**
- Query service may be busy
- Wait and retry
- Check status: https://www.wikidata.org/

## Performance Benchmarks

Expected metrics on modern hardware:

- **Initial SPARQL query:** 3-15 seconds
- **Film data processing:** < 1 second
- **Recommendation calculation:** < 100ms
- **Export JSON:** < 50ms
- **Import JSON:** < 100ms
- **Page rendering:** < 100ms

If significantly slower, check:
- Internet connection speed
- Browser extensions (ad blockers can slow SPARQL)
- Available memory (500+ films in memory)

## Validation Against Wikipedia

Optional: manually cross-check film count

1. Visit: https://en.wikipedia.org/wiki/Academy_Award_for_Best_Picture
2. Count approximate number of nominees across all years
3. Compare to "Total Films" statistic in app
4. Should be within reasonable range (some years have 5-10 nominees)

Expected totals (as of 2026):
- ~95 years of Academy Awards
- ~8-10 nominees per year in recent decades
- ~5 nominees in earlier years
- **Approximate total: 500-700 films**

## Post-Deployment GitHub Pages Testing

After deploying to GitHub Pages:

1. Visit your live URL: `https://username.github.io/show-suggester/`
2. Run through entire feature checklist again
3. Verify HTTPS (secure connection)
4. Test on mobile devices
5. Check browser console for errors
6. Share with a friend for user testing

## User Acceptance Criteria

✅ **POC is successful if:**
- Loads Oscar film data from Wikidata (no Wikipedia dependency)
- Allows rating 10+ films with notes
- Generates reasonable recommendations based on ratings
- Exports data in both JSON and LLM-friendly text formats
- Imports previously exported JSON successfully
- Provides JustWatch discovery links (not claiming availability)
- Works without authentication, API keys, or backend
- Runs on GitHub Pages with no build step

---

**Happy Testing! 🎬**
