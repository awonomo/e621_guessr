// Simple in-memory rate limiting (in production, use Redis)
const requestCounts = new Map();
// Rate limiting configuration
// Typical gameplay: ~60-70 requests per round, players may do 2-3 rounds in 15 minutes
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes default
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (process.env.NODE_ENV === 'production' ? '300' : '1000'));
// Export function to clear rate limits (for debugging)
export const clearRateLimits = () => {
    requestCounts.clear();
    console.log('Rate limits cleared');
};
export const rateLimitMiddleware = (req, res, next) => {
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
    }
    else {
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
//# sourceMappingURL=rateLimit.js.map