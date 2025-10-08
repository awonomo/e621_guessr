# Scoring Algorithm Visualization Functions for Desmos

These functions allow you to visualize and refine your scoring algorithm parameters. Copy each function into Desmos to see the curves and adjust parameters.

## 1. Core Rarity Curve (Log-Normal Distribution)

**Purpose**: Shows how rarity score varies with post count for each category

### Rarity Curve Function
```
r(x, μ, σ) = e^{-((log_{10}(x) - μ)^2)/(2σ^2)}
```

**Variables**:
- `x` = post count (1 to 100,000)
- `μ` = sweet spot center (log10 scale)
- `σ` = curve width (higher = wider)

### Current Category Parameters
Plot these with different colors to compare categories:

```
# General (Category 0) - Blue
r_general(x) = e^{-((log_{10}(x) - 2.5)^2)/(2 * 0.8^2)}

# Artist (Category 1) - Red  
r_artist(x) = e^{-((log_{10}(x) - 1.8)^2)/(2 * 0.7^2)}

# Character (Category 4) - Green
r_character(x) = e^{-((log_{10}(x) - 2.0)^2)/(2 * 0.8^2)}

# Species (Category 5) - Purple
r_species(x) = e^{-((log_{10}(x) - 2.3)^2)/(2 * 0.7^2)}

# Lore (Category 8) - Orange
r_lore(x) = e^{-((log_{10}(x) - 1.2)^2)/(2 * 0.4^2)}
```

**Desmos Settings**:
- X-axis: 1 to 100,000 (log scale recommended)
- Y-axis: 0 to 1
- Use sliders for μ and σ to experiment

## 2. Final Score Calculation

**Purpose**: Shows the complete scoring function from post count to final points

### Complete Scoring Function
```
score(x, μ, σ, w, q) = max(100, round(100 + 900 * (log_{10}(r(x,μ,σ) * 9 + 1))^{0.7} * w * q))
```

**Where**:
- `r(x,μ,σ)` = rarity curve from above
- `w` = category weight
- `q` = quality multiplier (usually 1.0)
- `100` = minimum points
- `1000` = maximum points range

### Category-Specific Scoring Functions
```
# General Category (Weight: 1.2)
score_general(x) = max(100, round(100 + 900 * (log_{10}(r_general(x) * 9 + 1))^{0.7} * 1.2))

# Artist Category (Weight: 0.6)
score_artist(x) = max(100, round(100 + 900 * (log_{10}(r_artist(x) * 9 + 1))^{0.7} * 0.6))

# Character Category (Weight: 1.0)
score_character(x) = max(100, round(100 + 900 * (log_{10}(r_character(x) * 9 + 1))^{0.7} * 1.0))

# Species Category (Weight: 1.1)
score_species(x) = max(100, round(100 + 900 * (log_{10}(r_species(x) * 9 + 1))^{0.7} * 1.1))

# Lore Category (Weight: 1.5)
score_lore(x) = max(100, round(100 + 900 * (log_{10}(r_lore(x) * 9 + 1))^{0.7} * 1.5))
```

## 3. Interactive Parameter Testing

### Adjustable Sweet Spot Function
Create sliders in Desmos for these parameters:
```
# Adjustable rarity curve
r_test(x) = e^{-((log_{10}(x) - μ_test)^2)/(2 * σ_test^2)}

# Adjustable scoring function  
score_test(x) = max(100, round(100 + 900 * (log_{10}(r_test(x) * 9 + 1))^{0.7} * w_test))
```

**Recommended Slider Ranges**:
- `μ_test`: 0.5 to 4.0 (sweet spot center)
- `σ_test`: 0.2 to 1.5 (curve width)  
- `w_test`: 0.3 to 2.0 (category weight)

## 4. Score Distribution Analysis

### Post Count Distribution Approximation
If you want to see how scores distribute across real tags:
```
# Approximate e621 tag distribution (rough model)
tag_density(x) = 1000000 * x^{-2.1}
```

### Expected Score Frequency
```
expected_freq(x) = tag_density(x) * score_test(x)
```

## 5. Key Reference Points

**Post Count Sweet Spots** (where rarity = max):
- μ = 1.0 → ~10 posts
- μ = 1.5 → ~32 posts  
- μ = 2.0 → ~100 posts
- μ = 2.5 → ~316 posts
- μ = 3.0 → ~1,000 posts

**Score Ranges by Category** (approximate):
- General: 120-1200 points
- Artist: 60-720 points
- Character: 100-1000 points
- Species: 110-1100 points  
- Lore: 150-1500 points

## 6. Testing Specific Scenarios

### Common Tag Examples
```
# Very common tag (100k+ posts)
common_score = score_test(100000)

# Sweet spot tag (~300 posts)
sweet_score = score_test(300) 

# Rare tag (~10 posts)
rare_score = score_test(10)

# Ultra rare tag (1 post)
ultra_rare_score = score_test(1)
```

## Usage Tips for Desmos

1. **Set up sliders** for μ, σ, and w to experiment interactively
2. **Use log scale** on X-axis (1 to 100,000) for better visualization
3. **Plot multiple categories** simultaneously to compare curves
4. **Add vertical lines** at key post count values (10, 100, 1000, 10000)
5. **Use tables** to see exact scores at specific post counts

## Optimization Goals

When adjusting parameters, consider:
- **Sweet spots should reward interesting tags** (not too common, not too obscure)
- **Score distribution should feel rewarding** across all ranges
- **Category weights should reflect difficulty** of identifying tags
- **Minimum scores shouldn't feel punishing** for valid guesses

## Quick Copy-Paste for Desmos

```
# Basic rarity curve with sliders
r(x) = e^{-((log_{10}(x) - μ)^2)/(2 * σ^2)}

# Complete scoring function
s(x) = max(100, round(100 + 900 * (log_{10}(r(x) * 9 + 1))^{0.7} * w))

# Set sliders: μ ∈ [0.5, 4], σ ∈ [0.2, 1.5], w ∈ [0.3, 2]
```

This gives you full control to visualize and optimize your scoring algorithm!