import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { postsRouter } from './routes/posts.js';
import dailyRouter from './routes/daily.js';
import { statsRouter } from './routes/stats.js';
import scoringRouter from './routes/scoring.js';
import tagsRouter from './routes/tags.js';
import debugRouter from './routes/debug.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
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
app.use('/api/stats', statsRouter);
app.use('/api/scoring', scoringRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/debug', debugRouter);

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
  console.log(`🐰 Server running on http://localhost:${PORT}`);
  console.log(`🦊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🐱 Posts API: http://localhost:${PORT}/api/posts`);
  console.log(`🐷 Tags API: http://localhost:${PORT}/api/tags`);
  console.log(`🐻 Scoring Parameters: http://localhost:${PORT}/api/debug/scoring-curves`);
  console.log(`🐮Scoring Visualization Tool: http://localhost:${PORT}/api/debug/visualization`);
});

export default app;