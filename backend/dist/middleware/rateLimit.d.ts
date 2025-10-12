import { Request, Response, NextFunction } from 'express';
export declare const clearRateLimits: () => void;
export declare const rateLimitMiddleware: (req: Request, res: Response, next: NextFunction) => void;
