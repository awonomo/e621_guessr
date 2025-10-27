/**
 *  tag score multipliers with progressive scaling and contextual systems
 */

export interface TagMultipliers {
  [tagName: string]: number;
}

/**
 * Contextual system for organizing tag multipliers
 */
export interface Subcontext {
  multiplier: number;
  tags: string[];
}

export interface PatternSubcontext {
  multiplier: number;
  patterns: string[]; // Regex patterns to match tags
  category?: number;  // Optional: only match tags in this category
}

export interface Context {
  name: string;
  description?: string;
  multiplier?: number; // Default multiplier for tags not in subcontexts
  subcontexts?: {
    [subcontextName: string]: Subcontext;
  };
  patternSubcontexts?: {
    [subcontextName: string]: PatternSubcontext;
  };
}

export interface Contexts {
  [contextName: string]: Context;
}

/**
 * Progressive scaling configuration for multipliers
 * 
 * Controls how much the multiplier effect varies based on base score:
 * - minEffect: Multiplier effect for lowest scores (0.0 = no effect, 1.0 = full effect)
 * - maxEffect: Multiplier effect for highest scores (0.0 = no effect, 1.0 = full effect)
 * - enabled: Whether to use progressive scaling at all
 * 
 * Examples:
 * - minEffect: 0.2, maxEffect: 1.0 = Strong progression (current default)
 * - minEffect: 0.4, maxEffect: 0.8 = Mild progression
 * - minEffect: 1.0, maxEffect: 1.0 = No progression (linear scaling)
 */
export interface ProgressiveScalingConfig {
  enabled: boolean;
  minEffect: number;  // Effect strength for low base scores (0.0 - 1.0)
  maxEffect: number;  // Effect strength for high base scores (0.0 - 1.0)
}

export const progressiveScalingConfig: ProgressiveScalingConfig = {
  enabled: true,
  minEffect: 0.2,    // Low scores get 20% of multiplier effect
  maxEffect: 1.0,    // High scores get 100% of multiplier effect
};

/**
 * Contextual contexts for organizing tag multipliers
 * 
 * Tags can belong to multiple contexts, and their effects will be combined additively:
 * finalMultiplier = 1.0 + (context1Effect - 1.0) + (context2Effect - 1.0) + ...
 * 
 * This allows for compositional effects while preventing extreme values.
 */
export const contexts: Contexts = {
  "color": {
    name: "Color Tags",
    description: "Tags related to colors across various features and objects (General category only)",
    patternSubcontexts: {
      "color_detection": {
        multiplier: 0.5,
        category: 0, // Only apply to General category tags
        patterns: [
          "(red|blue|green|yellow|orange|purple|pink|brown|black|white|grey|gray|tan|beige|cream|gold|silver|bronze|crimson|scarlet|maroon|navy|teal|cyan|aqua|lime|olive|magenta|violet|indigo|turquoise|amber|coral|salmon|peach|lavender|mint|emerald|ruby|sapphire|topaz|pearl|ivory|ebony|charcoal|slate|ash|copper|brass|platinum|rose|cherry|wine|burgundy|mahogany|chestnut|blonde|auburn|sandy|dusty|pale|light|dark|bright|deep|vivid|muted|pastel|neon|metallic|iridescent|rainbow|multicolored|multi_colored|two_tone|tri_color|spotted|striped|albino)"
        ]
      }
    }
  }
};export const manualTagMultipliers: TagMultipliers = {
  // Body structure tags - these are often less guessable/interesting
  'plantigrade': 1.4,
  'digitigrade': 1.3,
  'unguligrade': 1.6,
  'intersex': 1.5,
  'andromorph': 1.5,
  'gynomorph': 3.7,
  
  // Uncommon body features
  'proboscis': 3.0,
  
  // Very common general tags
  'looking_at_viewer': 0.6,
  'simple_background': 0.5,
  'white_background': 0.5,

  // overpowered tags
  'cum_on_own_breasts': 0.5,
  'cum_in_own_mouth': 0.7,
  'cum_on_own_face': 0.7,
  'vaginal_fisting': 0.5,
  'huge_flare': 0.5,
  'leg_fur': 0.5,
  
  // Art style tags that are common but not very interesting to guess
  'digital_media_(artwork)': 0.7,
  'shaded': 0.8,

  // tags that need boosting
  'backsack': 6.0,
  'simultaneous_orgasms': 4.0,
  'spontaneous_ejaculation': 2.5,
  'ridiculous_fit': 2.0,
  'furry-specific_piercing': 3.0,

  // funny tags
  'furry_logic': 0.8,
  'what': 3.0,
  'why': 0.8,
  'condom_transformation': 1.7,
  'living_vehicle': 4.0,
};

/**
 * Get the multiplier for a specific tag name using contextual categories and manual overrides
 */
export function getTagMultiplier(tagName: string): number {
  // Check manual multipliers first (these override contextual categories)
  const manualMultiplier = manualTagMultipliers[tagName];
  if (manualMultiplier !== undefined) {
    return manualMultiplier;
  }

  // Calculate multiplier from contextual categories
  return getContextualMultiplier(tagName);
}

/**
 * Calculate the contextual multiplier for a tag based on context membership
 * Tags can belong to multiple contexts, effects are combined additively
 */
export function getContextualMultiplier(tagName: string, category?: number): number {
  let totalEffect = 0; // Sum of all (multiplier - 1.0) effects
  let foundInAnyContext = false;

  for (const [contextKey, context] of Object.entries(contexts)) {
    // Check manual subcontexts
    if (context.subcontexts) {
      for (const [subcontextKey, subcontext] of Object.entries(context.subcontexts)) {
        if (subcontext.tags.includes(tagName)) {
          totalEffect += (subcontext.multiplier - 1.0);
          foundInAnyContext = true;
        }
      }
    }
    
    // Check pattern-based subcontexts
    if (context.patternSubcontexts) {
      for (const [patternKey, patternSubcontext] of Object.entries(context.patternSubcontexts)) {
        // If category filtering is specified, check it
        if (patternSubcontext.category !== undefined && category !== undefined) {
          if (patternSubcontext.category !== category) {
            continue; // Skip this pattern if category doesn't match
          }
        }
        
        // Check if any pattern matches the tag
        for (const pattern of patternSubcontext.patterns) {
          const regex = new RegExp(pattern, 'i'); // Case insensitive
          if (regex.test(tagName)) {
            totalEffect += (patternSubcontext.multiplier - 1.0);
            foundInAnyContext = true;
            break; // Don't double-count multiple patterns from same subcontext
          }
        }
      }
    }
    
    // If tag wasn't found in subcontexts but context has a default multiplier
    if (!foundInAnyContext && context.multiplier !== undefined) {
      // Note: This is a simple approach - you might want more sophisticated logic here
      // For now, we only apply default if tag isn't found in ANY subcontext of ANY context
    }
  }

  // Base multiplier of 1.0 plus all additive effects
  return foundInAnyContext ? 1.0 + totalEffect : 1.0;
}

/**
 * Get all contexts that a specific tag belongs to
 */
export function getTagContexts(tagName: string, category?: number): Array<{context: string, subcontext: string, multiplier: number}> {
  const memberships = [];
  
  for (const [contextKey, context] of Object.entries(contexts)) {
    // Check manual subcontexts
    if (context.subcontexts) {
      for (const [subcontextKey, subcontext] of Object.entries(context.subcontexts)) {
        if (subcontext.tags.includes(tagName)) {
          memberships.push({
            context: contextKey,
            subcontext: subcontextKey,
            multiplier: subcontext.multiplier
          });
        }
      }
    }
    
    // Check pattern-based subcontexts
    if (context.patternSubcontexts) {
      for (const [patternKey, patternSubcontext] of Object.entries(context.patternSubcontexts)) {
        // If category filtering is specified, check it
        if (patternSubcontext.category !== undefined && category !== undefined) {
          if (patternSubcontext.category !== category) {
            continue; // Skip this pattern if category doesn't match
          }
        }
        
        // Check if any pattern matches the tag
        for (const pattern of patternSubcontext.patterns) {
          const regex = new RegExp(pattern, 'i'); // Case insensitive
          if (regex.test(tagName)) {
            memberships.push({
              context: contextKey,
              subcontext: patternKey,
              multiplier: patternSubcontext.multiplier
            });
            break; // Don't double-count multiple patterns from same subcontext
          }
        }
      }
    }
  }
  
  return memberships;
}

/**
 * Get all configured tag multipliers
 */
export function getAllTagMultipliers(): TagMultipliers {
  return { ...manualTagMultipliers };
}

/**
 * Get the progressive scaling configuration
 */
export function getProgressiveScalingConfig(): ProgressiveScalingConfig {
  return { ...progressiveScalingConfig };
}

/**
 * Get all contexts
 */
export function getAllContexts(): Contexts {
  return { ...contexts };
}

/**
 * Debug function to show how a tag's multiplier is calculated
 */
export function getTagMultiplierBreakdown(tagName: string, category?: number): {
  finalMultiplier: number;
  source: 'manual' | 'contextual' | 'default';
  manualOverride?: number;
  contextualEffects?: Array<{context: string, subcontext: string, effect: number}>;
  calculation?: string;
} {
  // Check manual override first
  const manualMultiplier = manualTagMultipliers[tagName];
  if (manualMultiplier !== undefined) {
    return {
      finalMultiplier: manualMultiplier,
      source: 'manual',
      manualOverride: manualMultiplier
    };
  }

  // Calculate contextual effects
  const contextualEffects = [];
  let totalEffect = 0;

  for (const [contextKey, context] of Object.entries(contexts)) {
    // Check manual subcontexts
    if (context.subcontexts) {
      for (const [subcontextKey, subcontext] of Object.entries(context.subcontexts)) {
        if (subcontext.tags.includes(tagName)) {
          const effect = subcontext.multiplier - 1.0;
          totalEffect += effect;
          contextualEffects.push({
            context: contextKey,
            subcontext: subcontextKey,
            effect: effect
          });
        }
      }
    }
    
    // Check pattern-based subcontexts
    if (context.patternSubcontexts) {
      for (const [patternKey, patternSubcontext] of Object.entries(context.patternSubcontexts)) {
        // If category filtering is specified, check it
        if (patternSubcontext.category !== undefined && category !== undefined) {
          if (patternSubcontext.category !== category) {
            continue; // Skip this pattern if category doesn't match
          }
        }
        
        // Check if any pattern matches the tag
        for (const pattern of patternSubcontext.patterns) {
          const regex = new RegExp(pattern, 'i'); // Case insensitive
          if (regex.test(tagName)) {
            const effect = patternSubcontext.multiplier - 1.0;
            totalEffect += effect;
            contextualEffects.push({
              context: contextKey,
              subcontext: `${patternKey} (pattern)`,
              effect: effect
            });
            break; // Don't double-count multiple patterns from same subcontext
          }
        }
      }
    }
  }

  if (contextualEffects.length > 0) {
    const finalMultiplier = 1.0 + totalEffect;
    return {
      finalMultiplier,
      source: 'contextual',
      contextualEffects,
      calculation: `1.0 + (${contextualEffects.map(e => e.effect).join(' + ')}) = ${finalMultiplier}`
    };
  }

  // Default
  return {
    finalMultiplier: 1.0,
    source: 'default'
  };
}