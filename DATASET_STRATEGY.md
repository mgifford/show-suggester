# Dataset Strategy

## 🎯 Two-Tiered Approach

The Show Suggester now uses a **two-tiered dataset system** to balance recognizability with variety:

### **Core Dataset** (Default) - [`core-films.json`](core-films.json)
- **Size**: 1,500 films
- **Focus**: Recognizable, recent films people likely know and can watch
- **Year Range**: 2015-2025 (last 10 years)
- **Sources Included**:
  - All curated seed sources (Oscars, Popular, AFI Classics, etc.)
  - Recent Bechdel-passing films (2015+)
- **Use Case**: Default for most users. Provides recommendations from streaming-available, recognizable titles.

### **Extended Dataset** (Optional) - [`extended-films.json`](extended-films.json)
- **Size**: 6,109 films
- **Focus**: Full collection including older and niche films
- **Year Range**: 1899-2025
- **Sources Included**:
  - All core films
  - Full Bechdel Test dataset (6,090 films passing the Bechdel Test)
  - Historical classics
  - International cinema
- **Use Case**: Film enthusiasts who want deeper recommendations including older/obscure titles.

## 🔄 Switching Datasets

Users can toggle between datasets with the **"📚 Use Extended Dataset"** button in the app:

1. Click the button to switch
2. App reloads with new dataset
3. Preference saved in `localStorage`
4. Button text updates: "Use Core Dataset" ↔ "Use Extended Dataset"

## 📊 Dataset Creation

### Generate Both Datasets
```bash
# From expanded-films.json (6,109 films)
python3 expand_dataset.py --no-fetch

# Output:
# - core-films.json (1,500 films, 535KB)
# - extended-films.json (6,109 films, 2.1MB)
```

### Fetch Fresh Data
```bash
# Full expansion (takes 5-10 minutes)
python3 expand_dataset.py

# This will:
# 1. Load seed films (32 curated films)
# 2. Fetch Bechdel Test API (~10,000 films)
# 3. Fetch Bechdel RSS feed (~100 newest)
# 4. Deduplicate all sources
# 5. Create BOTH core and extended datasets
```

## 🎛️ Filtering Logic

### Core Dataset Criteria
Films are included in core if they meet **ANY** of these:

1. **From classic sources**: Oscars, AFI Classics, Popular
2. **Recent films**: Year ≥ 2015 (last 10 years)
3. **All seed sources**: Environmental, Social Justice, LGBTQ+, Documentary, etc.

If more than 1,500 films qualify, they're sorted by year (newest first) and trimmed to 1,500.

### Extended Dataset
- **No filtering** - includes all films from all sources
- Full Bechdel Test dataset back to 1899
- All curated seed films
- RSS feed recommendations

## 🗂️ File Structure

```
show-suggester/
├── seed-films.json           # Original 32 curated films (backup)
├── core-films.json           # 1,500 recognizable films (default)
├── extended-films.json       # 6,109 full collection (optional)
├── expand_dataset.py         # Script to create both datasets
├── app.js                    # Loads core or extended based on preference
└── index.html                # Toggle button to switch datasets
```

## 💡 Benefits

### Core Dataset (Default)
✅ **Recognizable**: Users know these films  
✅ **Streamable**: Recent = more likely on Netflix, Prime, etc.  
✅ **Fast Loading**: 535KB loads quickly  
✅ **Better Matches**: Smaller dataset = more relevant recommendations  

### Extended Dataset (Optional)
✅ **Comprehensive**: 6,109 films for deep dives  
✅ **Historical**: Includes classics back to silent era  
✅ **Niche Genres**: Covers obscure/international cinema  
✅ **Bechdel Completeness**: All 6,090 Bechdel-passing films  

## 🚀 Recommendations

### For Most Users
- Stick with **core dataset** (default)
- 1,500 films is plenty for recommendations
- Better chance of finding films on streaming platforms

### For Film Enthusiasts
- Switch to **extended dataset**
- Access full Bechdel Test collection
- Get recommendations from classic/obscure films
- Historical depth (1899-2025)

## 📈 Future Enhancements

1. **Smart Filtering**: Let users adjust year cutoff (e.g., last 20 years vs. last 10)
2. **Hybrid Mode**: Core for rating batches, extended for recommendations
3. **Streaming Integration**: Filter by actual streaming availability
4. **Custom Datasets**: Let users create their own filtering rules

---

**Last Updated**: January 2, 2026  
**Core Films**: 1,500  
**Extended Films**: 6,109  
**Default**: Core Dataset
