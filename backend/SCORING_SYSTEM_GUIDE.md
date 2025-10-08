# Scoring System Architecture Guide

## � **Important: Single Config File**
**All scoring configuration is now in `src/config/database.ts`** - this includes sweet spots, category weights, manual multipliers, and point limits. There is no separate `.js` file.

## 📋 How the Three Files Work Together

### 1. **database.ts** - Configuration Source ⚙️
```typescript
export const config = {
  scoring: {
    maxPoints: 10000,
    sweetSpot: {
      0: { mu: 2.5, sigma: 0.8 }, // General
      // ... other categories
    },
    categoryWeights: {
      0: 1.2, // General
      // ... other weights
    },
    manualMultipliers: {
      'anthro': 1.2,
      'gynomorph': 1.5,
      // ... other multipliers
    }
  }
}
```
**Role**: This is your **configuration file** - it stores all the scoring parameters.

### 2. **ScoringService.ts** - The Calculator 🧮
```typescript
import { config } from '../config/database.ts';

// Uses config values directly:
const sweetSpot = config.scoring.sweetSpot[category];
const mu = sweetSpot?.mu || 2.5;
const categoryWeight = config.scoring.categoryWeights[tag.category] || 1.0;
const manualMultiplier = config.scoring.manualMultipliers[tag.name] || 1.0;
const maxPoints = config.scoring.maxPoints;
```
**Role**: This **imports the config** and uses those values to calculate scores in real-time.

### 3. **scoring.ts** - The API Endpoint 🌐
```typescript
import ScoringService from '../services/ScoringService.js';

router.post('/score', async (req, res) => {
  const result = await ScoringService.scoreTag(guess);
  res.json(result);
});
```
**Role**: This is the **HTTP endpoint** that your frontend calls to get scores.

## 🔄 When Do Changes Take Effect?

### ✅ **Immediate Effect** (No database refresh needed):
If you change parameters in **database.ts**:
- `sweetSpot` values (mu, sigma)
- `categoryWeights` 
- `maxPoints`
- `minPoints`
- **`manualMultipliers`** - Tag-specific score adjustments

**These take effect immediately** when you restart your backend server! The scoring algorithm reads these values fresh from the config file every time it calculates a score.

### 🗄️ **Database-Dependent** (Database refresh needed):
If you want to change the **actual tag data**:
- Tag names
- Post counts  
- Tag categories
- Quality values

These require a database refresh because they're stored in your PostgreSQL database, not in the config file.

## 🎯 Manual Score Multipliers System ✨

### What Are Manual Multipliers?
The new **`manualMultipliers`** system lets you fine-tune individual tag scores without touching the database. Instead of hard-coded overrides, you can apply percentage boosts or penalties to specific tags.

### How It Works:
```javascript
// In database.ts
manualMultipliers: {
  'anthro': 1.2,        // 20% score boost
  'hi_res': 0.5,        // 50% score penalty  
  'detailed_background': 1.3, // 30% boost
  'solo': 0.8           // 20% penalty
}
```

### Multiplier Guidelines:
- **1.0** = No change (default for unlisted tags)
- **> 1.0** = Score boost (e.g., 1.2 = +20%)
- **< 1.0** = Score penalty (e.g., 0.8 = -20%)
- **0.5** = Half score (for overly easy tags)
- **1.5** = 50% bonus (for skill-requiring tags)

### When to Use Multipliers:
✅ **Boost scores for:**
- Tags requiring skill/knowledge (`plantigrade`, `digitigrade`)
- Undervalued tags (`these_arent_my_glasses`)

❌ **Reduce scores for:**
- Overly common/easy tags (`hi_res`, `digital_media_(artwork)`)
- Tags visible without skill (`simple_background`)

### Testing Your Multipliers:
```bash
# Test a tag with multiplier
npm run cli -- tags search anthro     # Should show boosted score

# Test a tag without multiplier  
npm run cli -- tags search dragon     # Should show normal score

# Test a penalized tag
npm run cli -- tags search hi_res     # Should show reduced score
```

### Live Example Results:
Based on current config:
- `anthro` (1.2x): **148 points** (boosted from ~123)
- `gynomorph` (1.5x): **725 points** (boosted from ~483)  
- `hi_res` (0.5x): **100 points** (reduced from ~200)
- `dragon` (no multiplier): **121 points** (normal scoring)

## 🚀 Testing Your Changes

### Quick Test Workflow:
1. **Edit values in database.ts**
2. **Restart your backend server**:
   ```bash
   npm run dev
   ```
3. **Test immediately** with your CLI:
   ```bash
   npm run cli -- tags search "some_tag"
   ```

### Example Test:
Let's say you want to make Lore tags even more rewarding. Change in `database.ts`:
```javascript
sweetSpot: {
  8: { mu: 1.0, sigma: 0.3 }  // Changed from mu: 1.2, sigma: 0.4
},
categoryWeights: {
  8: 2.0  // Changed from 1.5
}
```

Restart server, then test:
```bash
npm run cli -- tags score "backstory"
```

## 🔍 What Each Parameter Controls:

### From database.ts (Immediate Effect):
- **`mu`**: Where the scoring peak occurs (log10 of post count)
  - Example: mu=2.0 means peak at ~100 posts, mu=3.0 means peak at ~1000 posts
- **`sigma`**: How wide the scoring peak is (smaller = narrower)
  - Example: sigma=0.5 = very focused, sigma=1.0 = wide tolerance
- **`categoryWeights`**: Final score multiplier for each category
  - Example: weight=1.5 means 50% bonus, weight=0.6 means 40% penalty
- **`maxPoints`**: Maximum possible score
- **`minPoints`**: Minimum score for any correct guess
- **`manualMultipliers`** ✨ **NEW!**: Tag-specific score adjustments
  - Example: `'anthro': 1.2` gives 20% bonus, `'hi_res': 0.5` gives 50% penalty
  - Applied AFTER base scoring calculation
  - Perfect for fine-tuning without changing category curves

### From Database (Requires Refresh):
- **`post_count`**: How many posts have this tag
- **`category`**: Which category (0-8) the tag belongs to
- **`quality`**: Quality multiplier (rarely used)

## 📊 Scoring Algorithm Flow

```
User Guess → ScoringService → Database Lookup → Score Calculation
                            ↗                  ↘
                    config.scoring.*      rarityCurve(post_count, category)
                                                     ↓
                                    categoryWeight × manualMultiplier × finalScore
```

### Step-by-Step:
1. **Input**: User guesses a tag name
2. **Lookup**: Find tag in database (name, category, post_count)
3. **Rarity Calculation**: Use `mu` and `sigma` to calculate rarity score based on post_count
4. **Score Transformation**: Convert rarity (0-1) to points using logarithmic scaling
5. **Apply Weights**: Multiply by categoryWeight for category difficulty
6. **Apply Manual Multiplier**: Check `manualMultipliers` for tag-specific adjustments ✨ **NEW!**
7. **Return**: Send final score back to frontend

## 🎯 Integration with Desmos Experimentation

### Workflow for Parameter Tuning:
1. **Use Desmos** to visualize and find ideal parameters with the functions provided
2. **Update database.ts** with new mu, sigma, and weight values
3. **Restart backend server** (no database refresh needed)
4. **Test with real tags** immediately using CLI or API calls
5. **Iterate** until curves feel right

### Testing Commands:
```bash
# Test a specific tag
npm run cli -- tags search "anthro"

# Search for tags to test
npm run cli -- tags search "dragon"

# Test multiple scenarios
npm run cli -- tags search "common_tag"     # Should be low score
npm run cli -- tags search "rare_tag"       # Should be high score
npm run cli -- tags search "sweet_spot_tag" # Should be maximum score
```

## 🔧 Configuration Categories

### Current Category Mapping:
```
0: General    - Hardest to identify (weight: 1.2)
1: Artist     - Often visible signatures (weight: 0.6)
2: Contributor- Quality contributors (weight: 0.8)
3: Copyright  - Franchises/series (weight: 0.9)
4: Character  - Baseline difficulty (weight: 1.0)
5: Species    - Slightly harder than character (weight: 1.1)
6: Invalid    - Deprecated tags (weight: 0.3)
7: Meta       - Technical tags (weight: 0.7)
8: Lore       - Abstract concepts, hardest (weight: 1.5)
```

### Sweet Spot Examples:
```
Category 0 (General):   mu=2.5 → peak at ~316 posts
Category 4 (Character): mu=2.0 → peak at ~100 posts
Category 8 (Lore):     mu=1.2 → peak at ~16 posts
```

## 🚨 Important Notes

### Server Restart Required:
- Any changes to `database.ts` require restarting the backend server
- The config is imported at startup, not dynamically reloaded

### Database vs Config:
- **Config changes**: Affect scoring algorithm parameters (immediate)
- **Database changes**: Affect which tags exist and their post counts (requires refresh)

### Testing Best Practices:
1. Test edge cases (very rare, very common tags)
2. Test each category to ensure balanced scoring
3. Verify that "interesting" tags get rewarding scores
4. Check that common tags aren't over-penalized

## 🎮 Game Balance Considerations

### Good Scoring Should:
- Reward knowledge of moderately rare but not impossible tags
- Feel fair across all categories
- Encourage exploration of different tag types
- Provide clear progression for learning players

### Red Flags:
- One category consistently dominates scoring
- Very flat scoring curves (no reward for better guesses)
- Extreme score differences for similar post counts
- Sweet spots that don't align with subjectively "interesting" tags

Happy tuning! 🎯