import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Common validation schemas
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const playerNameSchema = z.string()
  .min(1, 'Player name is required')
  .max(255, 'Player name must be less than 255 characters')
  .trim();

export const tagNameSchema = z.string()
  .min(1, 'Tag name is required')
  .max(255, 'Tag name must be less than 255 characters')
  .trim()
  .toLowerCase();

export const scoreSchema = z.number()
  .int('Score must be an integer')
  .min(0, 'Score must be non-negative');

// Tag score entry schema
const tagScoreEntrySchema = z.object({
  tag: tagNameSchema,
  actualTag: tagNameSchema.optional(),
  score: scoreSchema,
  category: z.enum(['general', 'artist', 'copyright', 'character', 'species', 'meta', 'lore', 'invalid']),
  wasFromAlias: z.boolean().optional(),
  timestamp: z.number().int().min(0)
});

export const roundsSchema = z.array(z.object({
  score: scoreSchema,
  totalGuesses: z.number().int().min(0),
  incorrectGuesses: z.number().int().min(0),
  correctGuesses: z.record(z.array(tagScoreEntrySchema)),
  startedAt: z.string(),
  endedAt: z.string(),
  pauseCount: z.number().int().min(0).optional()
}));

// Daily challenge schemas
export const dailyParamsSchema = z.object({
  date: dateSchema
});

export const dailySubmissionSchema = z.object({
  player_name: playerNameSchema,
  score: scoreSchema,
  rounds: roundsSchema
});

export const dailyStatusSchema = z.object({
  player_name: playerNameSchema
});

// Scoring schemas
export const scoringGuessSchema = z.object({
  guess: tagNameSchema
});

export const bulkScoringSchema = z.object({
  guesses: z.array(tagNameSchema)
    .min(1, 'At least one guess is required')
    .max(2000, 'Maximum 2000 guesses allowed')
});

// Admin schemas
export const adminTagSchema = z.object({
  tag: tagNameSchema
});

export const bulkAdminSchema = z.object({
  action: z.enum(['add', 'remove'], { message: 'Action must be "add" or "remove"' }),
  tags: z.array(tagNameSchema)
    .min(1, 'At least one tag is required')
    .max(50, 'Maximum 50 tags allowed per bulk operation')
});

// Tag search schemas
export const tagSearchParamsSchema = z.object({
  query: z.string()
    .min(2, 'Search query must be at least 2 characters')
    .max(100, 'Search query must be less than 100 characters')
    .trim()
});

export const tagSearchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query must be less than 100 characters')
    .trim()
});

// Validation middleware factory
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  property: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req[property]);
      req[property] = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Invalid input data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      next(error);
    }
  };
}

// Utility to sanitize and validate route parameters
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return validate(schema, 'params');
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return validate(schema, 'query');
}

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return validate(schema, 'body');
}