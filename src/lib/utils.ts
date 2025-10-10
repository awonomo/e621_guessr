// Shared utility functions

import type { TagCategory, TagScoreEntry, RoundData } from './types';

export interface BestTagResult {
  tag: string;
  category: TagCategory;
  points: number;
}

/**
 * Find the best scoring tag from an array of rounds or tag entries
 */
export function findBestScoringTag(rounds: RoundData[]): BestTagResult | null {
  let bestTag = null;
  let bestPoints = 0;
  
  rounds.forEach(round => {
    if (round.correctGuesses) {
      Object.entries(round.correctGuesses).forEach(([category, tagEntries]) => {
        if (tagEntries) {
          tagEntries.forEach(tagEntry => {
            if (tagEntry.score > bestPoints) {
              bestPoints = tagEntry.score;
              bestTag = { 
                tag: tagEntry.tag, 
                category: category as TagCategory, 
                points: tagEntry.score 
              };
            }
          });
        }
      });
    }
  });
  
  return bestTag;
}

/**
 * Find the best scoring tag from a flat array of tag entries
 */
export function findBestScoringTagFromEntries(tagEntries: TagScoreEntry[]): BestTagResult | null {
  let bestTag = null;
  let bestPoints = 0;
  
  tagEntries.forEach(tagEntry => {
    if (tagEntry.score > bestPoints) {
      bestPoints = tagEntry.score;
      bestTag = { 
        tag: tagEntry.tag, 
        category: tagEntry.category, 
        points: tagEntry.score 
      };
    }
  });
  
  return bestTag;
}