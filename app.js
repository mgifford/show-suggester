// Oscar Best Picture Recommender
// Data-driven film recommendation system using Wikidata

const app = {
    films: [],
    allFilms: [], // Unfiltered source of truth
    ratings: {},
    currentBatch: [],
    batchNumber: 0,
    batchHistory: [],
    currentBatchIndex: -1,
    isOffline: false,
    recentlyShownQIDs: new Set(), // Track recently shown films
    yearFilter: 'all', // 'all', 'last20', 'last2' - default to 'all' to show all available films
    minYear: new Date().getFullYear() - 20,
    maxYear: new Date().getFullYear(),
    runtimeFilter: 'all', // 'all', 'short', 'medium', 'long'
    preferences: {
        description: '',
        preferredGenres: [],
        avoidContent: []
    },
    
    async init() {
        console.log('[INIT] Starting application initialization...');
        this.updateStatus('Loading data...');
        await this.loadRatings();
        console.log('[INIT] Loaded ratings:', Object.keys(this.ratings).length);
        this.loadPreferences();
        this.loadFilters();
        console.log('[INIT] Loaded filters - Year:', this.yearFilter, 'Runtime:', this.runtimeFilter);
        
        // Load all local JSON seed files
        await this.loadAllSeedFiles();
        console.log('[INIT] Total films loaded:', this.films.length);
        
        this.updateStats();
        this.loadNewBatch();
        this.hideLoading();
        document.getElementById('filter-section').classList.remove('hidden');
        document.getElementById('my-ratings-section').classList.remove('hidden');
        document.getElementById('controls').classList.remove('hidden');
        this.showMyRatings();
        this.updateStatus(`Ready! ${this.films.length} films loaded from diverse sources. Rate some films to get personalized recommendations.`);
        
        // Set up online/offline listeners
        window.addEventListener('online', () => this.setOfflineMode(false));
        window.addEventListener('offline', () => this.setOfflineMode(true));
    },

    async retryLoad() {
        document.getElementById('retry-load-btn').style.display = 'none';
        document.getElementById('loading-message').textContent = 'Retrying connection to Wikidata...';
        
        try {
            await this.loadFilmsFromWikidata();
            this.updateStats();
            this.loadNewBatch();
            this.hideLoading();
            document.getElementById('filter-section').classList.remove('hidden');
            document.getElementById('my-ratings-section').classList.remove('hidden');
            document.getElementById('preferences-section').classList.remove('hidden');
            this.showMyRatings();
            this.updateStatus('Successfully loaded! Rate some films to get recommendations.');
            
            // Set up listeners if not already set
            window.addEventListener('online', () => this.setOfflineMode(false));
            window.addEventListener('offline', () => this.setOfflineMode(true));
        } catch (error) {
            document.getElementById('loading-message').textContent = 'Failed to load data.';
            document.getElementById('retry-load-btn').style.display = 'block';
            this.updateStatus('Still unable to load. Please check your internet connection.');
        }
    },

    async loadBechdelFilms() {
        console.log('[BECHDEL] Fetching from Bechdel Test API...');
        const response = await fetch('https://bechdeltest.com/api/v1/getAllMovies');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[BECHDEL] Received', data.length, 'films from API');
        
        // Filter to only films that pass the Bechdel Test (rating 3)
        // Rating 0: <2 women, 1: don't talk to each other, 2: only about men, 3: pass
        const passingFilms = data.filter(film => film.rating === '3');
        console.log('[BECHDEL] Films passing test:', passingFilms.length);
        
        this.bechdelFilms = passingFilms.map(film => ({
            qid: `bechdel_${film.imdbid}`, // Use IMDb ID as unique identifier
            title: film.title,
            year: parseInt(film.year),
            imdbId: film.imdbid,
            source: 'bechdel',
            genres: [], // Not provided by API
            creators: [], // Not provided by API
            creatorQIDs: [],
            cast: [],
            castQIDs: [],
            runtime: null, // Not provided by API
            wikidataUrl: null,
            image: null
        })).filter(film => film.title && film.year && film.year > 1900); // Filter out invalid years
        
        console.log('[BECHDEL] Processed', this.bechdelFilms.length, 'Bechdel-passing films');
        
        // Cache Bechdel films
        try {
            localStorage.setItem('bechdelFilmsCache', JSON.stringify({
                films: this.bechdelFilms,
                timestamp: new Date().toISOString(),
                version: '1.0'
            }));
            console.log('[BECHDEL] Films cached successfully');
        } catch (error) {
            console.warn('[BECHDEL] Failed to cache films:', error);
        }
    },

    async loadFallbackData() {
        console.log('[FALLBACK] Fetching oscar-films-fallback.json...');
        const response = await fetch('oscar-films-fallback.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('[FALLBACK] Received data:', data);
        this.oscarFilms = data.films.map(film => ({
            ...film,
            source: 'oscars'
        }));
        console.log('[FALLBACK] Processed oscarFilms:', this.oscarFilms.length, 'films');
        this.updateFilmsFromSource();
        console.log('[FALLBACK] After updateFilmsFromSource, this.films:', this.films.length);
        console.log(`[FALLBACK] Loaded ${this.oscarFilms.length} films from fallback dataset`);
    },

    async loadAllSeedFiles() {
        // List of JSON seed files to load
        const seedFiles = [
            'seed-films.json',
            // Future: 'bechdel-films.json', 'environmental-films.json', etc.
        ];
        
        console.log('[SEED] Loading seed files:', seedFiles);
        const allFilms = [];
        
        for (const filename of seedFiles) {
            try {
                console.log(`[SEED] Loading ${filename}...`);
                document.getElementById('loading-message').textContent = `Loading ${filename}...`;
                
                const response = await fetch(filename);
                if (!response.ok) {
                    console.warn(`[SEED] Could not load ${filename}: ${response.status}`);
                    continue;
                }
                
                const data = await response.json();
                const films = data.films || [];
                console.log(`[SEED] Loaded ${films.length} films from ${filename}`);
                
                // Process films to ensure consistent format
                const processed = films.map(film => ({
                    qid: film.qid || `seed-${film.imdbId}`,
                    title: film.title,
                    year: film.year,
                    genres: film.genres || [],
                    directors: film.directors || [],
                    directorQIDs: film.directorQIDs || [],
                    cast: film.cast || [],
                    castQIDs: film.castQIDs || [],
                    imdbId: film.imdbId,
                    runtime: film.runtime,
                    source: film.source || 'seed',
                    wikidataUrl: film.wikidataUrl,
                    image: film.image
                }));
                
                allFilms.push(...processed);
            } catch (error) {
                console.error(`[SEED] Error loading ${filename}:`, error);
            }
        }
        
        this.allFilms = allFilms;
        this.films = [...allFilms]; // Copy for filtering
        console.log('[SEED] Total films loaded:', this.allFilms.length);
        
        // Apply filters
        this.applyFilters();
        console.log('[SEED] After filters:', this.films.length);
    },

    async loadFilmsFromWikidata() {
        const sparqlQuery = `
SELECT DISTINCT ?film ?filmLabel ?year ?genreLabel ?directorLabel ?directorQID ?actorLabel ?actorQID ?imdbId ?winner ?image ?runtime
WHERE {
  # Films nominated for or winning Best Picture
  {
    ?film wdt:P1411 wd:Q103360 .  # Nominated for Academy Award for Best Picture
    BIND(false AS ?winner)
  }
  UNION
  {
    ?film wdt:P166 wd:Q103360 .   # Won Academy Award for Best Picture
    BIND(true AS ?winner)
  }
  
  # Get publication date/year
  OPTIONAL { 
    ?film wdt:P577 ?pubDate . 
    BIND(YEAR(?pubDate) AS ?year) 
  }
  
  # Get runtime in minutes
  OPTIONAL { ?film wdt:P2047 ?runtime . }
  
  # Get genres
  OPTIONAL { ?film wdt:P136 ?genre . }
  
  # Get directors
  OPTIONAL { 
    ?film wdt:P57 ?director .
    BIND(?director AS ?directorQID)
  }
  
  # Get cast members (top billed)
  OPTIONAL { 
    ?film p:P161 ?castStatement .
    ?castStatement ps:P161 ?actor .
    BIND(?actor AS ?actorQID)
  }
  
  # Get IMDb ID
  OPTIONAL { ?film wdt:P345 ?imdbId . }
  
  # Get poster/image
  OPTIONAL { ?film wdt:P18 ?image . }
  
  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "en". 
    ?film rdfs:label ?filmLabel .
    ?genre rdfs:label ?genreLabel .
    ?director rdfs:label ?directorLabel .
    ?actor rdfs:label ?actorLabel .
  }
}
LIMIT 5000
        `;

        const endpoint = 'https://query.wikidata.org/sparql';
        const url = `${endpoint}?query=${encodeURIComponent(sparqlQuery)}`;

        try {
            // Fetch with timeout (60 seconds for large query)
            const response = await this.fetchWithTimeout(url, {
                headers: {
                    'Accept': 'application/sparql-results+json'
                }
            }, 60000);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.processWikidataResults(data.results.bindings);
        } catch (error) {
            console.error('Error fetching from Wikidata:', error);
            if (error.name === 'AbortError') {
                this.updateStatus('Request timed out. Using cached data if available.');
            } else {
                this.updateStatus('Error loading data. Using cached data if available.');
            }
            throw error;
        }
    },

    async fetchWithTimeout(url, options = {}, timeout = 30000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    },

    processWikidataResults(bindings) {
        // Group results by film QID
        const filmMap = new Map();

        bindings.forEach(binding => {
            const qid = this.extractQID(binding.film.value);
            
            if (!filmMap.has(qid)) {
                filmMap.set(qid, {
                    qid: qid,
                    title: binding.filmLabel?.value || 'Unknown Title',
                    year: binding.year?.value ? parseInt(binding.year.value) : null,
                    runtime: binding.runtime?.value ? parseInt(binding.runtime.value) : null,
                    genres: new Set(),
                    directors: new Set(),
                    directorQIDs: new Set(),
                    cast: new Set(),
                    castQIDs: new Set(),
                    imdbId: binding.imdbId?.value || null,
                    winner: binding.winner?.value === 'true',
                    wikidataUrl: binding.film.value,
                    image: null
                });
            }

            const film = filmMap.get(qid);
            
            // Update runtime if not set yet and available
            if (!film.runtime && binding.runtime?.value) {
                film.runtime = parseInt(binding.runtime.value);
            }

            if (binding.genreLabel?.value) {
                film.genres.add(binding.genreLabel.value.toLowerCase());
            }

            if (binding.directorLabel?.value) {
                film.directors.add(binding.directorLabel.value);
            }

            if (binding.directorQID?.value) {
                film.directorQIDs.add(this.extractQID(binding.directorQID.value));
            }

            if (binding.actorLabel?.value) {
                film.cast.add(binding.actorLabel.value);
            }

            if (binding.actorQID?.value) {
                film.castQIDs.add(this.extractQID(binding.actorQID.value));
            }

            if (binding.image?.value) {
                film.image = binding.image.value;
            }
        });

        // Convert sets to arrays and clean up
        this.oscarFilms = Array.from(filmMap.values()).map(film => ({
            ...film,
            genres: Array.from(film.genres),
            directors: Array.from(film.directors),
            directorQIDs: Array.from(film.directorQIDs),
            cast: Array.from(film.cast).slice(0, 10),
            castQIDs: Array.from(film.castQIDs).slice(0, 10),
            source: 'oscars'
        })).filter(film => film.title && film.year);

        // Set main films array based on current source
        this.updateFilmsFromSource();

        console.log(`Loaded ${this.oscarFilms.length} Oscar-nominated films`);
        console.log('[WIKIDATA] Sample films:', this.oscarFilms.slice(0, 5).map(f => `${f.title} (${f.year})`));
        console.log('[WIKIDATA] Year range:', 
            Math.min(...this.oscarFilms.map(f => f.year)), 
            '-', 
            Math.max(...this.oscarFilms.map(f => f.year))
        );
        
        // Cache the films
        this.cacheFilms(this.films);
    },

    extractQID(url) {
        return url.split('/').pop();
    },

    loadNewBatch() {
        console.log('[BATCH] loadNewBatch called, this.films.length:', this.films?.length || 0);
        
        // Get unrated films
        const unrated = this.films.filter(f => !this.ratings[f.qid]);
        console.log('[BATCH] Unrated films:', unrated.length, 'out of', this.films.length, 'total');
        console.log('[BATCH] Current ratings count:', Object.keys(this.ratings).length);
        
        if (unrated.length === 0) {
            console.warn('[BATCH] No unrated films available!');
            this.updateStatus('You\'ve rated all available films! Click "Show Recommendations" to see suggestions.');
            document.getElementById('rating-section').classList.add('hidden');
            return;
        }

        // Filter out recently shown films (keep last 50 shown)
        let candidates = unrated.filter(f => !this.recentlyShownQIDs.has(f.qid));
        console.log('[BATCH] Candidates after filtering recently shown:', candidates.length);
        
        // If we've filtered out too many, reset the recently shown set
        if (candidates.length < 20 && unrated.length >= 20) {
            console.log('[BATCH] Resetting recently shown films to get fresh batch');
            this.recentlyShownQIDs.clear();
            candidates = unrated;
        }
        
        // If still not enough candidates, use all unrated
        if (candidates.length === 0) {
            console.log('[BATCH] No candidates, using all unrated');
            candidates = unrated;
        }

        // Increment batch number
        this.batchNumber++;
        console.log('[BATCH] Batch number:', this.batchNumber);

        // Randomly select 15-20 films
        const batchSize = Math.min(Math.floor(Math.random() * 6) + 15, candidates.length);
        console.log('[BATCH] Target batch size:', batchSize);
        this.currentBatch = this.shuffleArray(candidates).slice(0, batchSize);
        console.log('[BATCH] Current batch size:', this.currentBatch.length);
        console.log('[BATCH] Sample films:', this.currentBatch.slice(0, 3).map(f => `${f.title} (${f.year})`));
        
        // Add to recently shown set
        this.currentBatch.forEach(film => this.recentlyShownQIDs.add(film.qid));
        
        // Keep recently shown set from growing too large (max 100 films)
        if (this.recentlyShownQIDs.size > 100) {
            const qidsArray = Array.from(this.recentlyShownQIDs);
            this.recentlyShownQIDs = new Set(qidsArray.slice(-50)); // Keep last 50
        }
        
        // Add to history (remove any future batches if we're not at the end)
        if (this.currentBatchIndex < this.batchHistory.length - 1) {
            this.batchHistory = this.batchHistory.slice(0, this.currentBatchIndex + 1);
        }
        this.batchHistory.push([...this.currentBatch]);
        this.currentBatchIndex = this.batchHistory.length - 1;
        
        this.renderRatingSection();
        this.updateNavigationButtons();
        document.getElementById('rating-section').classList.remove('hidden');
        document.getElementById('recommendations-section').classList.add('hidden');
        
        // Update status with batch info
        const ratedCount = Object.keys(this.ratings).length;
        this.updateStatus(`Batch #${this.batchNumber} • ${this.currentBatch.length} films • ${ratedCount} rated so far • ${unrated.length - this.currentBatch.length} remaining`);
    },

    renderRatingSection() {
        const grid = document.getElementById('rating-grid');
        grid.innerHTML = '';

        this.currentBatch.forEach(film => {
            const card = this.createFilmCard(film, true);
            grid.appendChild(card);
        });
    },

    createFilmCard(film, showRatingButtons = false, score = null) {
        const card = document.createElement('div');
        card.className = 'film-card';
        
        const rating = this.ratings[film.qid];
        if (rating) {
            card.classList.add(`rated-${rating.rating}`);
        }

        let html = '';
        
        // Add poster image only if available
        if (film.image) {
            html += `<div class="film-poster"><img src="${film.image}" alt="${this.escapeHtml(film.title)} poster" loading="lazy" onerror="this.parentElement.remove()"></div>`;
        }
        
        html += `
            <div class="film-title">
                ${this.escapeHtml(film.title)}
                ${film.winner ? '<span class="winner-badge">🏆 Winner</span>' : ''}
            </div>
            <div class="film-meta">
                ${film.year || 'Year unknown'}
                ${film.directors.length > 0 ? ` • Dir: ${this.escapeHtml(film.directors[0])}` : ''}
            </div>
        `;

        if (score !== null) {
            html += `<div class="score">Match: ${(score * 100).toFixed(0)}%</div>`;
        }

        html += '<div class="film-details">';
        
        if (film.genres.length > 0) {
            html += `<div><span class="label">Genres:</span> ${film.genres.map(g => this.escapeHtml(g)).join(', ')}</div>`;
        }

        if (film.cast.length > 0) {
            html += `<div><span class="label">Cast:</span> ${film.cast.slice(0, 3).map(a => this.escapeHtml(a)).join(', ')}</div>`;
        }

        if (film.imdbId) {
            html += `<div><span class="label">IMDb:</span> <a href="https://www.imdb.com/title/${film.imdbId}/" target="_blank">${film.imdbId}</a></div>`;
        }

        html += '</div>';

        // Where to watch links
        html += this.createWatchLinks(film);

        if (showRatingButtons) {
            html += `
                <div class="rating-buttons">
                    <button class="like" onclick="app.rateFilm('${film.qid}', 'like')">👍 Like</button>
                    <button class="neutral" onclick="app.rateFilm('${film.qid}', 'neutral')">😐 Neutral</button>
                    <button class="dislike" onclick="app.rateFilm('${film.qid}', 'dislike')">👎 Dislike</button>
                </div>
                <input type="text" class="note-input" id="note-${film.qid}" placeholder="Add a note (optional)..." value="${rating?.note || ''}">
            `;
        }

        if (rating) {
            const ratingLabels = { like: '👍 Liked', neutral: '😐 Neutral', dislike: '👎 Disliked' };
            html += `<div class="current-rating ${rating.rating}">${ratingLabels[rating.rating]}</div>`;
            if (rating.note) {
                html += `<div style="margin-top: 10px; font-style: italic; color: #666;">"${this.escapeHtml(rating.note)}"</div>`;
            }
        }

        card.innerHTML = html;
        return card;
    },

    createWatchLinks(film) {
        const searchTitle = encodeURIComponent(film.title);
        return `
            <div class="links">
                <strong>Where to watch:</strong><br>
                <a href="https://www.justwatch.com/ca/search?q=${searchTitle}" target="_blank">🇨🇦 JustWatch Canada</a>
                <a href="https://www.justwatch.com/uk/search?q=${searchTitle}" target="_blank">🇬🇧 JustWatch UK</a>
                <a href="https://www.netflix.com/search?q=${searchTitle}" target="_blank">Netflix Search</a>
            </div>
        `;
    },

    rateFilm(qid, rating) {
        const noteInput = document.getElementById(`note-${qid}`);
        const note = noteInput ? noteInput.value.trim() : '';
        
        this.ratings[qid] = {
            qid: qid,
            rating: rating,
            note: note,
            timestamp: new Date().toISOString()
        };

        this.saveRatings();
        this.updateStats();
        this.showMyRatings();
        
        // Re-render the card to show the rating
        this.renderRatingSection();
    },

    showRecommendations() {
        const recommendations = this.generateRecommendations();
        
        if (recommendations.length === 0) {
            alert('Please rate some films as "Like" first to get recommendations!\n\nTip: Rate at least 5-10 films you enjoyed to get better matches.');
            return;
        }

        const grid = document.getElementById('recommendations-grid');
        grid.innerHTML = '';

        recommendations.forEach(({ film, score }) => {
            const card = this.createFilmCard(film, false, score);
            grid.appendChild(card);
        });

        document.getElementById('recommendations-section').classList.remove('hidden');
        
        // Update status
        const likedCount = Object.values(this.ratings).filter(r => r.rating === 'like').length;
        this.updateStatus(`Showing ${recommendations.length} recommendations based on ${likedCount} films you liked`);
        
        // Scroll to recommendations
        document.getElementById('recommendations-section').scrollIntoView({ behavior: 'smooth' });
    },

    generateRecommendations() {
        // Get liked films
        const likedFilms = this.films.filter(f => 
            this.ratings[f.qid]?.rating === 'like'
        );

        if (likedFilms.length === 0) {
            return [];
        }

        // Get unrated films
        const unratedFilms = this.films.filter(f => !this.ratings[f.qid]);

        // Calculate similarity scores
        const scoredFilms = unratedFilms.map(film => ({
            film: film,
            score: this.calculateSimilarity(film, likedFilms)
        }));

        // Sort by score and return top 20
        return scoredFilms
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);
    },

    calculateSimilarity(film, likedFilms) {
        let totalScore = 0;

        likedFilms.forEach(liked => {
            let score = 0;

            // Genre overlap (weight: 5.0)
            const genreOverlap = this.jaccardSimilarity(
                new Set(film.genres),
                new Set(liked.genres)
            );
            score += genreOverlap * 5.0;

            // Director match (weight: 3.0)
            const directorMatch = film.directorQIDs.some(d => 
                liked.directorQIDs.includes(d)
            ) ? 1.0 : 0.0;
            score += directorMatch * 3.0;

            // Cast overlap (weight: 2.0)
            const castOverlap = this.jaccardSimilarity(
                new Set(film.castQIDs),
                new Set(liked.castQIDs)
            );
            score += castOverlap * 2.0;

            // Decade proximity (weight: 1.0)
            if (film.year && liked.year) {
                const yearDiff = Math.abs(film.year - liked.year);
                const decadeProximity = Math.max(0, 1 - (yearDiff / 100));
                score += decadeProximity * 1.0;
            }

            totalScore += score;
        });

        // Average across all liked films
        return totalScore / likedFilms.length;
    },

    jaccardSimilarity(setA, setB) {
        if (setA.size === 0 && setB.size === 0) return 0;
        
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        
        return intersection.size / union.size;
    },

    exportData() {
        const exportData = this.buildExportData();
        const yaml = this.convertToYAML(exportData);
        this.downloadText(yaml, `oscar-ratings-${this.getDateString()}.yaml`);
    },

    buildExportData() {
        // Build the complete export data structure
        const likedFilms = [];
        const dislikedFilms = [];
        const neutralFilms = [];
        
        Object.values(this.ratings).forEach(rating => {
            const film = this.films.find(f => f.qid === rating.qid);
            if (!film) return;
            
            const filmData = {
                qid: rating.qid,
                title: film.title,
                year: film.year,
                rating: rating.rating,
                note: rating.note || ''
            };
            
            if (rating.rating === 'like') likedFilms.push(filmData);
            else if (rating.rating === 'dislike') dislikedFilms.push(filmData);
            else neutralFilms.push(filmData);
        });
        
        // Build task instruction
        let taskInstruction = 'As a movie connoisseur, analyze the ratings provided below and suggest films I might enjoy. ';
        
        if (this.preferences.description) {
            taskInstruction += `Consider that: ${this.preferences.description}. `;
        }
        
        if (this.preferences.preferredGenres && this.preferences.preferredGenres.length > 0) {
            taskInstruction += `I prefer these genres: ${this.preferences.preferredGenres.join(', ')}. `;
        }
        
        if (this.preferences.avoidContent && this.preferences.avoidContent.length > 0) {
            taskInstruction += `Please avoid suggesting films with: ${this.preferences.avoidContent.join(', ')}. `;
        }
        
        taskInstruction += 'Focus on critically acclaimed, award-winning titles.';
        
        return {
            task: taskInstruction,
            version: '1.0',
            exportDate: new Date().toISOString(),
            sourceInfo: {
                dataSource: 'Wikidata SPARQL',
                scope: 'Academy Award for Best Picture (all years)',
                totalFilms: this.films.length
            },
            preferences: {
                description: this.preferences.description || '',
                preferredGenres: this.preferences.preferredGenres || [],
                avoidContent: this.preferences.avoidContent || []
            },
            ratings: [...likedFilms, ...dislikedFilms, ...neutralFilms]
        };
    },

    async copyForLLM() {
        const exportData = this.buildExportData();
        const yaml = this.convertToYAML(exportData);
        
        try {
            await navigator.clipboard.writeText(yaml);
            this.updateStatus('✅ Copied to clipboard! Paste into ChatGPT, Claude, or any LLM.');
            
            // Show temporary success message
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            btn.style.background = '#10b981';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            // Fallback: download as file
            this.downloadText(yaml, `oscar-llm-prompt-${this.getDateString()}.yaml`);
            this.updateStatus('Could not copy to clipboard. File downloaded instead.');
        }
    },

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let data;
                const content = e.target.result;
                
                // Try to parse as YAML first, then JSON
                if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
                    data = this.parseYAML(content);
                } else {
                    data = JSON.parse(content);
                }
                
                if (!data.ratings || !Array.isArray(data.ratings)) {
                    alert('Invalid import file format');
                    return;
                }

                // Import ratings
                data.ratings.forEach(rating => {
                    this.ratings[rating.qid] = {
                        qid: rating.qid,
                        rating: rating.rating,
                        note: rating.note || '',
                        timestamp: rating.timestamp || new Date().toISOString()
                    };
                });
                
                // Import preferences if available
                if (data.preferences) {
                    this.preferences = {
                        description: data.preferences.description || '',
                        preferredGenres: data.preferences.preferredGenres || [],
                        avoidContent: data.preferences.avoidContent || []
                    };
                    this.savePreferences();
                    this.updatePreferencesUI();
                }

                this.saveRatings();
                this.updateStats();
                
                // Check if this was exported for LLM (has task field)
                const source = data.task ? 'LLM export' : 'saved ratings';
                this.updateStatus(`Imported ${data.ratings.length} ratings from ${source}!`);
                
                // Clear file input
                event.target.value = '';
            } catch (error) {
                console.error('Import error:', error);
                alert('Error importing file. Please check the file format.');
            }
        };
        reader.readAsText(file);
    },

    clearAllRatings() {
        if (!confirm('Are you sure you want to clear all ratings? This cannot be undone.')) {
            return;
        }

        this.ratings = {};
        this.batchNumber = 0;
        this.saveRatings();
        this.updateStats();
        this.loadNewBatch();
        this.updateStatus('All ratings cleared. Starting fresh!');
    },

    saveRatings() {
        try {
            localStorage.setItem('oscarRatings', JSON.stringify(this.ratings));
        } catch (error) {
            console.error('Error saving ratings:', error);
        }
    },

    loadRatings() {
        try {
            const saved = localStorage.getItem('oscarRatings');
            if (saved) {
                this.ratings = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading ratings:', error);
            this.ratings = {};
        }
    },

    updateStats() {
        const totalRatings = Object.keys(this.ratings).length;
        const liked = Object.values(this.ratings).filter(r => r.rating === 'like').length;
        const disliked = Object.values(this.ratings).filter(r => r.rating === 'dislike').length;
        const neutral = Object.values(this.ratings).filter(r => r.rating === 'neutral').length;

        const statsHtml = `
            <div class="stat-box">
                <div class="stat-number">${this.films.length}</div>
                <div class="stat-label">Total Films</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">${totalRatings}</div>
                <div class="stat-label">Rated</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">${liked}</div>
                <div class="stat-label">Liked</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">${disliked}</div>
                <div class="stat-label">Disliked</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">${neutral}</div>
                <div class="stat-label">Neutral</div>
            </div>
        `;

        document.getElementById('stats').innerHTML = statsHtml;
        document.getElementById('stats').classList.remove('hidden');
    },

    updateStatus(message) {
        document.getElementById('status').textContent = message;
    },

    hideLoading() {
        document.getElementById('loading').classList.remove('active');
        document.getElementById('controls').classList.remove('hidden');
    },

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadBlob(blob, filename);
    },

    downloadText(text, filename) {
        const blob = new Blob([text], { type: 'text/plain' });
        this.downloadBlob(blob, filename);
    },

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    previousBatch() {
        if (this.currentBatchIndex > 0) {
            this.currentBatchIndex--;
            this.currentBatch = [...this.batchHistory[this.currentBatchIndex]];
            this.renderRatingSection();
            this.updateNavigationButtons();
            const ratedCount = Object.keys(this.ratings).length;
            this.updateStatus(`Viewing previous batch (${this.currentBatchIndex + 1}/${this.batchHistory.length}) • ${ratedCount} rated`);
        }
    },

    nextBatch() {
        if (this.currentBatchIndex < this.batchHistory.length - 1) {
            this.currentBatchIndex++;
            this.currentBatch = [...this.batchHistory[this.currentBatchIndex]];
            this.renderRatingSection();
            this.updateNavigationButtons();
            const ratedCount = Object.keys(this.ratings).length;
            this.updateStatus(`Viewing next batch (${this.currentBatchIndex + 1}/${this.batchHistory.length}) • ${ratedCount} rated`);
        } else {
            // At the end, load a new batch
            this.loadNewBatch();
        }
    },

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-batch-btn');
        const nextBtn = document.getElementById('next-batch-btn');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentBatchIndex <= 0;
        }
        
        if (nextBtn) {
            // Next button is always enabled (loads new batch if at end)
            nextBtn.disabled = false;
            nextBtn.textContent = this.currentBatchIndex < this.batchHistory.length - 1 
                ? 'Next Batch ➡️' 
                : 'Load New Batch ➡️';
        }
    },

    cacheFilms(films) {
        try {
            const cacheData = {
                films: films,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            localStorage.setItem('oscarFilmsCache', JSON.stringify(cacheData));
            console.log('Films cached successfully');
        } catch (error) {
            console.error('Error caching films:', error);
            // If quota exceeded, try to clear old cache and retry
            if (error.name === 'QuotaExceededError') {
                localStorage.removeItem('oscarFilmsCache');
                try {
                    localStorage.setItem('oscarFilmsCache', JSON.stringify(cacheData));
                } catch (retryError) {
                    console.error('Cannot cache films - storage quota exceeded');
                }
            }
        }
    },

    loadBechdelCache() {
        try {
            const cached = localStorage.getItem('bechdelFilmsCache');
            if (cached) {
                const data = JSON.parse(cached);
                console.log(`Loaded ${data.films.length} Bechdel films from cache (${data.timestamp})`);
                return data.films;
            }
        } catch (error) {
            console.error('Error loading Bechdel cache:', error);
        }
        return null;
    },

    loadCachedFilms() {
        try {
            const cached = localStorage.getItem('oscarFilmsCache');
            if (cached) {
                const cacheData = JSON.parse(cached);
                console.log(`Loaded ${cacheData.films.length} films from cache (${cacheData.timestamp})`);
                return cacheData.films;
            }
        } catch (error) {
            console.error('Error loading cached films:', error);
        }
        return null;
    },

    setOfflineMode(offline) {
        this.isOffline = offline;
        const banner = document.getElementById('offline-banner');
        if (banner) {
            if (offline) {
                banner.classList.remove('hidden');
            } else {
                banner.classList.add('hidden');
                this.updateStatus('Online - Connected to Wikidata');
            }
        }
    },

    async retryConnection() {
        this.updateStatus('Attempting to reconnect...');
        try {
            await this.loadFilmsFromWikidata();
            this.setOfflineMode(false);
            this.updateStats();
            this.updateStatus('Reconnected! Data refreshed from Wikidata.');
        } catch (error) {
            this.updateStatus('Still offline. Using cached data.');
            console.error('Reconnection failed:', error);
        }
    },

    async reloadFullDataset() {
        // Legacy method - now just refreshes Bechdel
        await this.refreshBechdel();
    },

    async refreshBechdel() {
        console.log('[REFRESH] User requested Bechdel refresh');
        this.updateStatus('Refreshing Bechdel Test films...');
        
        try {
            await this.loadBechdelFilms();
            this.updateFilmsFromSource();
            this.updateStats();
            this.updateSourceCounts();
            this.loadNewBatch();
            this.updateStatus(`Successfully loaded ${this.bechdelFilms.length} Bechdel-passing films!`);
        } catch (error) {
            console.error('[REFRESH] Failed to refresh Bechdel films:', error);
            this.updateStatus(`Failed to refresh: ${error.message}`);
        }
    },

    async refreshSeedFiles() {
        console.log('[REFRESH] Reloading all seed files...');
        this.updateStatus('Refreshing film database...');
        
        try {
            await this.loadAllSeedFiles();
            this.updateStats();
            this.loadNewBatch();
            this.updateStatus(`Successfully loaded ${this.films.length} films!`);
        } catch (error) {
            console.error('[REFRESH] Failed to refresh seed files:', error);
            this.updateStatus(`Failed to refresh: ${error.message}`);
        }
    },

    changeSource(source) {
        this.currentSource = source;
        this.updateFilmsFromSource();
        this.updateSourceCounts();
        
        // Update active state
        document.querySelectorAll('.source-card').forEach(card => card.classList.remove('active'));
        document.getElementById(`source-${source}`).classList.add('active');
        
        // Reset batch history and load new batch
        this.batchHistory = [];
        this.currentBatchIndex = -1;
        this.recentlyShownQIDs.clear();
        this.loadNewBatch();
        
        const sourceNames = {
            'oscars': 'Oscar Best Picture',
            'bechdel': 'Bechdel Test Films',
            'all': 'All Films'
        };
        this.updateStatus(`Switched to ${sourceNames[source]} (${this.films.length} films)`);
    },

    loadFilters() {
        try {
            const savedYearFilter = localStorage.getItem('oscarYearFilter');
            const savedRuntimeFilter = localStorage.getItem('oscarRuntimeFilter');
            
            if (savedYearFilter) {
                this.yearFilter = savedYearFilter;
            }
            if (savedRuntimeFilter) {
                this.runtimeFilter = savedRuntimeFilter;
            }
            
            // Update dropdown UI after page loads
            setTimeout(() => {
                const yearSelect = document.getElementById('year-filter');
                const runtimeSelect = document.getElementById('runtime-filter');
                if (yearSelect) yearSelect.value = this.yearFilter;
                if (runtimeSelect) runtimeSelect.value = this.runtimeFilter;
            }, 100);
        } catch (error) {
            console.error('Error loading filters:', error);
        }
    },

    saveFilters() {
        try {
            localStorage.setItem('oscarYearFilter', this.yearFilter);
            localStorage.setItem('oscarRuntimeFilter', this.runtimeFilter);
        } catch (error) {
            console.error('Error saving filters:', error);
        }
    },

    applyFilters() {
        console.log('[FILTERS] Starting applyFilters, this.allFilms.length:', this.allFilms?.length || 0);
        if (!this.allFilms || this.allFilms.length === 0) {
            console.warn('[FILTERS] No films to filter!');
            this.films = [];
            return;
        }
        
        console.log('[FILTERS] Year filter:', this.yearFilter, 'Runtime filter:', this.runtimeFilter);
        let filteredFilms = [...this.allFilms]; // Start with a copy of all films
        console.log('[FILTERS] Initial films:', filteredFilms.length);
        
        // Apply year filter
        const currentYear = new Date().getFullYear();
        switch(this.yearFilter) {
            case 'last20':
                filteredFilms = filteredFilms.filter(f => f.year && f.year >= currentYear - 20);
                console.log('[FILTERS] After last20 year filter:', filteredFilms.length);
                break;
            case 'last2':
                filteredFilms = filteredFilms.filter(f => f.year && f.year >= currentYear - 2);
                console.log('[FILTERS] After last2 year filter:', filteredFilms.length);
                break;
            case 'all':
            default:
                console.log('[FILTERS] No year filtering applied');
                // No year filtering
                break;
        }
        
        // Apply runtime filter
        switch(this.runtimeFilter) {
            case 'short':
                filteredFilms = filteredFilms.filter(f => f.runtime && f.runtime < 90);
                console.log('[FILTERS] After short runtime filter:', filteredFilms.length);
                break;
            case 'medium':
                filteredFilms = filteredFilms.filter(f => f.runtime && f.runtime >= 90 && f.runtime <= 150);
                console.log('[FILTERS] After medium runtime filter:', filteredFilms.length);
                break;
            case 'long':
                filteredFilms = filteredFilms.filter(f => f.runtime && f.runtime > 150);
                console.log('[FILTERS] After long runtime filter:', filteredFilms.length);
                break;
            case 'all':
            default:
                console.log('[FILTERS] No runtime filtering applied');
                // No runtime filtering
                break;
        }
        
        this.films = filteredFilms;
        console.log('[FILTERS] Final films count:', this.films.length);
    },

    setYearFilter(filter) {
        console.log('[FILTER] Setting year filter to:', filter);
        this.yearFilter = filter;
        
        // Update dropdown selection
        const yearSelect = document.getElementById('year-filter');
        if (yearSelect) {
            yearSelect.value = filter;
        }
        
        this.saveFilters();
        this.applyFilters();
        this.loadNewBatch();
        this.updateStatus(`Filtered to ${filter === 'all' ? 'all years' : filter}. ${this.films.length} films available.`);
    },

    setRuntimeFilter(filter) {
        console.log('[FILTER] Setting runtime filter to:', filter);
        this.runtimeFilter = filter;
        
        // Update dropdown selection
        const runtimeSelect = document.getElementById('runtime-filter');
        if (runtimeSelect) {
            runtimeSelect.value = filter;
        }
        
        this.saveFilters();
        this.applyFilters();
        this.loadNewBatch();
        
        const filterNames = {
            'all': 'all lengths',
            'short': 'short films (<90 min)',
            'medium': 'medium films (90-150 min)',
            'long': 'long films (>150 min)'
        };
        this.updateStatus(`Filtered to ${filterNames[filter]}. ${this.films.length} films available.`);
    },

    updateFiltersFromSource() {
        // Re-apply filters from source
        this.updateFilmsFromSource();
    },

    updateFilterUI() {
        // Update year filter buttons
        document.querySelectorAll('.year-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeYearBtn = document.querySelector(`.year-filter-btn[data-filter="${this.yearFilter}"]`);
        if (activeYearBtn) {
            activeYearBtn.classList.add('active');
        }
        
        // Update runtime filter buttons
        document.querySelectorAll('.runtime-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeRuntimeBtn = document.querySelector(`.runtime-filter-btn[data-filter="${this.runtimeFilter}"]`);
        if (activeRuntimeBtn) {
            activeRuntimeBtn.classList.add('active');
        }
    },

    async loadBechdelFilms() {
        // TODO: Implement Bechdel Test API integration
        // API: https://bechdeltest.com/api/v1/getAllMovies
        // This will be implemented in a future update
        // For now, bechdelFilms remains empty array
        console.log('Bechdel Test integration coming soon!');
    },

    savePreferences() {
        const description = document.getElementById('user-preferences')?.value || '';
        
        // Get checked genres
        const genreCheckboxes = document.querySelectorAll('.genre-check:checked');
        const genres = Array.from(genreCheckboxes).map(cb => cb.value);
        
        // Get checked avoid items
        const avoidCheckboxes = document.querySelectorAll('.avoid-check:checked');
        const avoid = Array.from(avoidCheckboxes).map(cb => cb.value);
        
        this.preferences = {
            description: description.trim(),
            preferredGenres: genres,
            avoidContent: avoid
        };
        
        try {
            localStorage.setItem('oscarPreferences', JSON.stringify(this.preferences));
            this.updateStatus('Preferences saved!');
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    },

    loadPreferences() {
        try {
            const saved = localStorage.getItem('oscarPreferences');
            if (saved) {
                this.preferences = JSON.parse(saved);
                this.updatePreferencesUI();
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    },

    updatePreferencesUI() {
        const descField = document.getElementById('user-preferences');
        
        if (descField) descField.value = this.preferences.description || '';
        
        // Uncheck all first
        document.querySelectorAll('.genre-check').forEach(cb => cb.checked = false);
        document.querySelectorAll('.avoid-check').forEach(cb => cb.checked = false);
        
        // Check the saved preferences
        if (this.preferences.preferredGenres) {
            this.preferences.preferredGenres.forEach(genre => {
                const checkbox = document.querySelector(`.genre-check[value="${genre}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
        
        if (this.preferences.avoidContent) {
            this.preferences.avoidContent.forEach(avoid => {
                const checkbox = document.querySelector(`.avoid-check[value="${avoid}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
    },

    clearPreferences() {
        if (!confirm('Clear all preferences?')) return;
        
        this.preferences = {
            description: '',
            preferredGenres: [],
            avoidContent: []
        };
        
        this.updatePreferencesUI();
        localStorage.removeItem('oscarPreferences');
        this.updateStatus('Preferences cleared.');
    },

    togglePreferences() {
        const content = document.getElementById('preferences-content');
        const toggle = document.getElementById('preferences-toggle');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '▲';
            toggle.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            toggle.textContent = '▼';
            toggle.style.transform = 'rotate(0deg)';
        }
    },

    showMyRatings() {
        const ratingsSection = document.getElementById('my-ratings-section');
        const ratingsList = document.getElementById('my-ratings-list');
        const ratingsCount = document.getElementById('my-ratings-count');
        const toggleBtn = document.getElementById('toggle-my-ratings-btn');
        
        if (!ratingsSection) return;
        
        const ratedFilms = Object.entries(this.ratings).map(([qid, rating]) => {
            const film = this.allFilms.find(f => f.qid === qid);
            return { qid, rating, film };
        }).filter(item => item.film);
        
        ratingsCount.textContent = ratedFilms.length;
        
        if (ratedFilms.length === 0) {
            ratingsList.innerHTML = '<p style="color: #666; padding: 20px; text-align: center;">No ratings yet. Start rating films to see them here!</p>';
            return;
        }
        
        ratingsList.innerHTML = '';
        ratedFilms.forEach(({ qid, rating, film }) => {
            const item = document.createElement('div');
            item.className = 'rating-item';
            
            const ratingEmoji = rating.rating === 'like' ? '👍' : rating.rating === 'dislike' ? '👎' : '😐';
            const ratingClass = rating.rating;
            
            item.innerHTML = `
                <div class="rating-item-content">
                    <div class="rating-item-icon ${ratingClass}">${ratingEmoji}</div>
                    <div class="rating-item-details">
                        <div class="rating-item-title">${this.escapeHtml(film.title)}</div>
                        <div class="rating-item-meta">${film.year || 'Unknown year'}</div>
                    </div>
                    <button class="remove-rating-btn" onclick="app.removeRating('${qid}')" title="Remove rating">×</button>
                </div>
            `;
            
            ratingsList.appendChild(item);
        });
    },

    removeRating(qid) {
        if (confirm('Remove this rating?')) {
            delete this.ratings[qid];
            this.saveRatings();
            this.showMyRatings();
            this.updateStats();
            this.updateStatus('Rating removed.');
        }
    },

    convertToYAML(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        let yaml = '';
        
        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined) {
                yaml += `${spaces}${key}: null\n`;
            } else if (Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                if (value.length === 0) {
                    yaml += `${spaces}  []\n`;
                } else if (typeof value[0] === 'object' && value[0] !== null) {
                    value.forEach((item, i) => {
                        yaml += `${spaces}  -\n`;
                        yaml += this.convertToYAML(item, indent + 2).split('\n')
                            .filter(line => line)
                            .map(line => `${spaces}  ${line}\n`)
                            .join('');
                    });
                } else {
                    value.forEach(item => {
                        const strValue = typeof item === 'string' && (item.includes(':') || item.includes('#')) 
                            ? `"${item.replace(/"/g, '\\"')}"` 
                            : item;
                        yaml += `${spaces}  - ${strValue}\n`;
                    });
                }
            } else if (typeof value === 'object') {
                yaml += `${spaces}${key}:\n`;
                yaml += this.convertToYAML(value, indent + 1);
            } else if (typeof value === 'string') {
                // Escape strings that contain special YAML characters
                const needsQuotes = value.includes(':') || value.includes('#') || value.includes('\n') || value.match(/^[\d\s]+$/);
                const escaped = value.replace(/"/g, '\\"');
                yaml += `${spaces}${key}: ${needsQuotes ? `"${escaped}"` : value}\n`;
            } else {
                yaml += `${spaces}${key}: ${value}\n`;
            }
        }
        
        return yaml;
    },

    parseYAML(yamlString) {
        // Simple YAML parser for our specific use case
        const lines = yamlString.split('\n');
        const result = {};
        const stack = [{ obj: result, indent: -1 }];
        let currentKey = null;
        let currentArray = null;
        let inArrayItem = false;
        
        for (let line of lines) {
            if (!line.trim() || line.trim().startsWith('#')) continue;
            
            const indent = line.search(/\S/);
            const trimmed = line.trim();
            
            // Pop stack if we've dedented
            while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
                stack.pop();
                currentArray = null;
            }
            
            const current = stack[stack.length - 1].obj;
            
            if (trimmed.startsWith('- ')) {
                // Array item
                const value = trimmed.substring(2).trim();
                if (value) {
                    if (currentArray) {
                        // Simple value or object start
                        if (value.includes(':')) {
                            const [k, v] = value.split(':').map(s => s.trim());
                            const newObj = {};
                            newObj[k] = this.parseYAMLValue(v);
                            currentArray.push(newObj);
                            stack.push({ obj: newObj, indent });
                        } else {
                            currentArray.push(this.parseYAMLValue(value));
                        }
                    }
                } else {
                    // Object array item
                    if (currentArray) {
                        const newObj = {};
                        currentArray.push(newObj);
                        stack.push({ obj: newObj, indent });
                    }
                }
            } else if (trimmed.includes(':')) {
                const colonIndex = trimmed.indexOf(':');
                const key = trimmed.substring(0, colonIndex).trim();
                const value = trimmed.substring(colonIndex + 1).trim();
                
                if (!value || value === '[]') {
                    // Array or object
                    current[key] = value === '[]' ? [] : {};
                    currentArray = value === '[]' ? [] : null;
                    if (Array.isArray(current[key])) {
                        currentArray = current[key];
                    } else {
                        stack.push({ obj: current[key], indent });
                    }
                    currentKey = key;
                } else {
                    // Simple key-value
                    current[key] = this.parseYAMLValue(value);
                }
            }
        }
        
        return result;
    },

    parseYAMLValue(value) {
        if (value === 'null' || value === '~') return null;
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value.startsWith('"') && value.endsWith('"')) {
            return value.slice(1, -1).replace(/\\"/g, '"');
        }
        if (!isNaN(value) && value.trim() !== '') return Number(value);
        return value;
    },

    getDateString() {
        return new Date().toISOString().split('T')[0];
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
