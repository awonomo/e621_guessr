# Scoring Algorithm Analysis Guide

## Key Questions to Explore with the Graphs

### 1. Sweet Spot Analysis
**Question**: Are the sweet spots in the right places for each category?

**How to test**:
- Plot all category rarity curves together
- Look for peak positions (where curves are highest)
- Current peaks: General(~316 posts), Artist(~63 posts), Character(~100 posts), Species(~200 posts), Lore(~16 posts)

**What to look for**:
- Do peaks align with tags that should be "most rewarding" to guess?
- Are ultra-rare tags (1-10 posts) getting appropriate scores?
- Are very common tags (10k+ posts) not getting too punished?

### 2. Score Distribution Fairness
**Question**: Do different categories feel fairly weighted?

**Test scenarios**:
```
Tag examples by post count:
- 1 post: Ultra-rare OC character
- 10 posts: Rare artist/character  
- 100 posts: Sweet spot character
- 1,000 posts: Common species
- 10,000 posts: Very common general tag
- 100,000 posts: Universal tag like "solo"
```

**Compare scores** at these points across categories.

### 3. Category Weight Balance
**Question**: Do category weights reflect difficulty appropriately?

**Current weights**:
- General: 1.2x (hardest - no visual cues)
- Character: 1.0x (baseline)
- Species: 1.1x (slightly harder than character)
- Artist: 0.6x (easier - signatures visible)
- Lore: 1.5x (hardest - abstract concepts)

**Test**: Do the final score curves feel proportionally rewarding?

### 4. Logarithmic Transform Effectiveness
**Question**: Does the `(log₁₀(rarity * 9 + 1))^0.7` transform create good score distribution?

**What it does**:
- Prevents very low rarity scores from becoming 0 points
- Creates more interesting score spread in the lower ranges
- The `^0.7` exponent makes the curve less steep

**Test variations**:
- Try different exponents (0.5, 0.6, 0.8, 1.0)
- See how it affects score distribution

### 5. Minimum Score Impact
**Question**: Is the 100-point minimum appropriate?

**Current effect**: Even the most common tags get 100+ points
**Alternative**: Scale minimum by category weight?

## Specific Parameter Experiments

### Experiment 1: Tighten Lore Category
**Current**: μ=1.2, σ=0.4 (peak at ~16 posts)
**Try**: μ=1.0, σ=0.3 (peak at ~10 posts, narrower)
**Reasoning**: Lore tags are often very rare, reward the ultra-rare ones more

### Experiment 2: Adjust Artist Sweet Spot  
**Current**: μ=1.8, σ=0.7 (peak at ~63 posts)
**Try**: μ=2.0, σ=0.6 (peak at ~100 posts)
**Reasoning**: Popular artists might have more posts, still easier to identify

### Experiment 3: Widen General Category
**Current**: μ=2.5, σ=0.8 (peak at ~316 posts)
**Try**: μ=2.5, σ=1.0 (same peak, wider tolerance)
**Reasoning**: General tags vary widely, be more forgiving

### Experiment 4: Scale Category Weights
**Current range**: 0.3 to 1.5 (5x difference)
**Try**: Compress to 0.6 to 1.2 (2x difference) 
**Reasoning**: Reduce extreme score differences between categories

## Red Flags to Watch For

### 1. **Plateau Problems**
If score curves are too flat in ranges where many tags exist, players won't feel differences between good/great guesses.

### 2. **Cliff Effects** 
If scores drop too rapidly outside sweet spots, players might feel punished for "close" guesses.

### 3. **Category Imbalance**
If one category consistently scores much higher/lower, players might focus only on those tags.

### 4. **Sweet Spot Misalignment**
If peaks don't align with subjectively "interesting" tag rarities, the rewards won't feel intuitive.

## Sample Tag Analysis

Use these real tag examples to test your curves:

**General Tags**:
- "anthro" (~500k posts) - should score low but not punishing
- "digital_media" (~50k posts) - common but still some skill
- "detailed_background" (~5k posts) - good observation skill

**Character Tags**:
- "sonic_the_hedgehog" (~15k posts) - very popular character  
- "original_character" (~100k posts) - extremely common
- "rare_pokemon_character" (~50 posts) - niche but rewarding

**Species Tags**:
- "wolf" (~200k posts) - very common
- "dragon" (~300k posts) - extremely common  
- "exotic_species" (~500 posts) - good middle ground

**Artist Tags**:
- "conditional_dnp" (~50k posts) - very popular artists
- "amateur_artist" (~1k posts) - growing artist
- "commission_artist" (~100 posts) - specialized niche

## Tuning Philosophy

### Good Scoring Should:
1. **Reward knowledge** - knowing rare/interesting tags
2. **Encourage exploration** - discovering new tag categories  
3. **Feel fair** - similar effort = similar reward across categories
4. **Create progression** - clear improvement path for players
5. **Avoid exploitation** - can't game the system easily

### Balance Goals:
- **Rare but not impossible** tags should give the highest rewards
- **Common tags** should still feel worthwhile to guess
- **Category expertise** should be rewarded through weights
- **Score differences** should be noticeable but not extreme

Happy tuning! 🎯