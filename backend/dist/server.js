// Load environment variables from .env file
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { postsRouter } from './routes/posts.js';
import dailyRouter from './routes/daily.js';
import scoringRouter from './routes/scoring.js';
import tagsRouter from './routes/tags.js';
import debugRouter from './routes/debug.js';
import adminRouter from './routes/admin.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import { schedulerService } from './services/SchedulerService.js';
const app = express();
const PORT = process.env.PORT || 3001;
// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));
// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Rate limiting
app.use(rateLimitMiddleware);
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});
// API routes
app.use('/api/posts', postsRouter);
app.use('/api/daily', dailyRouter);
app.use('/api/scoring', scoringRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/admin', adminRouter);
// Debug routes only in development
if (process.env.NODE_ENV !== 'production') {
    app.use('/api/debug', debugRouter);
}
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.originalUrl} not found`
    });
});
// Error handling
app.use(errorHandler);
// Start server
app.listen(PORT, () => {
    // Determine base URL for API endpoints (matches frontend baseUrl logic)
    const baseUrl = process.env.NODE_ENV === 'production'
        ? (process.env.BACKEND_URL || `http://localhost:${PORT}`)
        : `http://localhost:${PORT}`;
    console.log(`🐰 Server running on ${baseUrl}`);
    console.log(`🦊 Health check: ${baseUrl}/api/health`);
    console.log(`🐱 Posts API: ${baseUrl}/api/posts`);
    console.log(`🐷 Tags API: ${baseUrl}/api/tags`);
    console.log(`🐻 Scoring Parameters: ${baseUrl}/api/debug/scoring-curves`);
    console.log(`🐮Scoring Visualization Tool: ${baseUrl}/api/debug/visualization`);
    // Start the scheduler for automated tasks
    schedulerService.start();
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    schedulerService.stop();
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    schedulerService.stop();
    process.exit(0);
});
export default app;
//# sourceMappingURL=server.js.map