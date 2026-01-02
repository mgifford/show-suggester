# Contributing to Show Suggester

Thanks for your interest in contributing! 🎬 This project is licensed under **AGPL-3.0** (see [LICENSE](LICENSE) for details).

## What AGPL Means

Show Suggester uses the **GNU Affero General Public License v3.0**. Here's what that means for contributors and users:

✅ **You can:**
- Use the code for commercial projects
- Modify the code
- Redistribute the code
- Use it for SaaS/web services

⚠️ **You must:**
- Share your source code if you distribute it
- **If you use this as a web service**, you must provide users with access to the source code (or a way to get it)
- Use the same license (AGPL-3.0) for derivative works

**Example:** If you deploy Show Suggester on your own domain, AGPL requires you to either:
1. Keep it open source (GitHub, etc.)
2. Provide users a way to download/access the source code

This ensures the project stays open and improvements benefit everyone.

[Learn more about AGPL](https://www.gnu.org/licenses/agpl-3.0.html)

## Ways to Contribute

### 🎨 **Frontend (JavaScript/HTML/CSS)**
- Improve UI/UX (responsive design, accessibility, animations)
- Add new features (filters, search, sorting, favorites)
- Performance optimizations
- Browser compatibility fixes

### 🐍 **Backend (Python)**
- Expand dataset sources (IMDb, TMDB, Criterion, film festivals)
- Improve recommendation algorithm
- Add data analysis tools
- Optimize poster fetching

### 📊 **Data & Research**
- Curate themed film lists (genre, era, director, awards)
- Find and integrate new data sources
- Validate/improve existing dataset quality
- Create sample datasets for testing

### 📚 **Documentation**
- Write tutorials for using/extending the app
- Create setup guides for different platforms
- Document algorithm in detail
- Add code comments

### 🐛 **Testing & QA**
- Report bugs (test different browsers, devices, datasets)
- Suggest UI improvements
- Test with large datasets (10K+ films)
- Performance testing

### 📢 **Community**
- Share on social media/dev communities
- Write blog posts about the project
- Discuss ideas in issues
- Help other contributors

## Getting Started

### 1. **Fork & Clone**
```bash
git clone https://github.com/YOUR-USERNAME/show-suggester.git
cd show-suggester
```

### 2. **Set Up Local Environment**
```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install requests feedparser python-dotenv

# Start local server
python3 -m http.server 8765
# Visit: http://localhost:8765
```

### 3. **Set Up TMDb API (Optional, for posters)**
```bash
# Copy example config
cp example.env .env

# Get free API key: https://www.themoviedb.org/settings/api
# Edit .env and add your key
TMDB_API_KEY=your_key_here

# Test poster fetching
python3 expand_dataset.py
```

## Development Guidelines

### Code Style
- **JavaScript**: Vanilla JS, no frameworks required. Use ES6+ features.
- **Python**: Follow PEP 8. Use meaningful variable names.
- **Comments**: Explain *why*, not *what*. Code should be self-explanatory.

### Before You Code
1. Check [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system
2. Look at [GitHub Issues](../../issues) for areas needing help
3. Read [AGENTS.md](AGENTS.md) for project philosophy
4. Open an issue to discuss major changes

### Making Changes

**For small fixes (typos, bugs):**
```bash
git checkout -b fix/bug-description
# Make changes
git commit -m "Fix: brief description"
git push origin fix/bug-description
# Open Pull Request
```

**For new features:**
```bash
git checkout -b feature/feature-name
# Make changes
git commit -m "Add: brief description"
git push origin feature/feature-name
# Open Pull Request with description
```

### Testing Before Submitting

**JavaScript Changes:**
- Open `index.html` locally and test manually
- Check browser console for errors (F12)
- Test on different screen sizes
- Test with 0 ratings, 5 ratings, 20+ ratings

**Python Changes:**
```bash
python3 expand_dataset.py --stats
# Should complete without errors
```

**Data Changes:**
- Validate JSON syntax: `python3 -m json.tool core-films.json > /dev/null`
- Check for duplicates: `python3 expand_dataset.py --merge-only`

## Pull Request Process

1. **Create a descriptive title:**
   - ✅ `Add poster image support`
   - ✅ `Fix clipboard copy on iOS`
   - ❌ `Fix stuff`

2. **Write a clear description:**
   ```
   ## What does this do?
   Adds ability to filter recommendations by genre.

   ## How to test?
   1. Rate 5 films in different genres
   2. Check "Filter by Genre" dropdown
   3. Select a genre
   4. Recommendations should only show that genre

   ## Checklist
   - [x] Tested locally
   - [x] No console errors
   - [x] Updated relevant docs
   ```

3. **Keep commits clean:**
   - One feature per PR
   - Descriptive commit messages
   - No merge commits (`git pull --rebase`)

4. **Link related issues:**
   - `Closes #123` in PR description

## Project Structure

```
show-suggester/
├── index.html           # Main UI
├── app.js              # Core app logic (1800+ lines)
├── core-films.json     # Default dataset (1,500 films)
├── extended-films.json # Full dataset (6,000+ films)
├── expand_dataset.py   # Dataset expansion tool
├── ARCHITECTURE.md     # Technical deep dive
├── AGENTS.md          # Philosophy & design decisions
└── README.md          # User guide
```

## Architecture Quick Reference

**Key Concepts:**
- **Content-based filtering**: Recommends films based on genre, director, cast, year
- **Client-side only**: Everything runs in browser (localStorage for persistence)
- **Two datasets**: Core (recognizable) + Extended (comprehensive)
- **Rating tags**: Users label likes (idea-driven, emotional, visually-striking, etc.)

**Algorithm:**
1. User likes 5+ films
2. App calculates similarity: Genre(5.0) + Director(3.0) + Cast(2.0) + Year(1.0)
3. Shows top 20 unrated films with highest similarity scores
4. **Diverse profiles**: Uses best match + average (70/30 blend)

**See [ARCHITECTURE.md](ARCHITECTURE.md) for full technical details**

## Areas That Need Help 🆘

### High Priority
- [ ] **Mobile UI improvements** - Test on iPhone/Android, improve touch interaction
- [ ] **Film source expansion** - Add Criterion Collection, Sundance, other festivals
- [ ] **Search functionality** - Find films by title/director
- [ ] **Performance** - Optimize with 10K+ films

### Medium Priority
- [ ] **Advanced filtering** - Filter by decade, IMDb rating, runtime, etc.
- [ ] **Visualization** - Show rating distribution, recommendation confidence
- [ ] **Import/export** - Support more formats (CSV, spreadsheet)
- [ ] **Accessibility** - ARIA labels, keyboard navigation, screen reader support

### Low Priority (Nice-to-have)
- [ ] **Dark mode** - CSS theme switcher
- [ ] **Multi-language** - Internationalization
- [ ] **PWA** - Install as app
- [ ] **Sharing** - Generate shareable recommendation links

## Getting Help

- **Questions?** Open an [Issue](../../issues) with label `question`
- **Bug found?** Open an [Issue](../../issues) with label `bug`
- **Idea?** Open an [Issue](../../issues) with label `enhancement`
- **Discussion?** Start a [Discussion](../../discussions)

## Community Standards

We follow a simple code of conduct:
- **Be respectful** - Everyone has different experience levels
- **Be constructive** - Feedback should help, not hurt
- **Be inclusive** - Welcome diverse perspectives
- **Give credit** - Acknowledge collaborators' work

## Recognition

Contributors will be:
- Added to [CONTRIBUTORS.md](CONTRIBUTORS.md) file
- Credited in commit messages
- Featured in release notes

## Questions?

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for technical questions
- Check [README.md](README.md) for usage questions
- Open an [Issue](../../issues) if stuck
- Look at existing PRs for examples

---

**Thank you for contributing to Show Suggester!** 🎬✨

Whether you fix a typo, add a feature, or expand the dataset, your work helps make film discovery better for everyone.
