import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiting (in production, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = process.env.NODE_ENV === 'production' ? 100 : 500; // Higher limit for development

// Export function to clear rate limits (for debugging)
export const clearRateLimits = () => {
  requestCounts.clear();
  console.log('Rate limits cleared');
};

export const rateLimitMiddleware = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Clean up expired entries
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip);
    }
  }
  
  // Get or create rate limit data for this IP
  let rateLimitData = requestCounts.get(clientIp);
  
  if (!rateLimitData || now > rateLimitData.resetTime) {
    rateLimitData = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    };
  } else {
    rateLimitData.count++;
  }
  
  requestCounts.set(clientIp, rateLimitData);
  
  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': MAX_REQUESTS.toString(),
    'X-RateLimit-Remaining': Math.max(0, MAX_REQUESTS - rateLimitData.count).toString(),
    'X-RateLimit-Reset': new Date(rateLimitData.resetTime).toISOString()
  });
  
  // Check if rate limit exceeded
  if (rateLimitData.count > MAX_REQUESTS) {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: `Too many requests. Try again after ${new Date(rateLimitData.resetTime).toISOString()}`
    });
    return;
  }
  
  next();
};