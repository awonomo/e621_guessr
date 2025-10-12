# e621_guessr - Production Deployment Guide

## Environment Setup

### Backend (.env)
```bash
# Copy and customize the environment file
cp backend/.env.example backend/.env

# Required variables:
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/e621_guessr
ADMIN_KEY=your-secure-admin-key-here
FRONTEND_URL=https://your-frontend-domain.com

# Optional variables:
SCHEDULER_ENABLED=true
TAG_REFRESH_HOUR=6
TAG_REFRESH_MINUTE=21
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env)
```bash
# Copy and customize the environment file
cp .env.example .env

# Required for production:
VITE_BACKEND_URL=https://your-backend-domain.com
```

## Backend Deployment

### Railway Deployment
1. Connect your repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy the backend folder
4. Set up PostgreSQL database

### Manual Deployment
```bash
cd backend
npm install
npm run build
npm start
```

## Frontend Deployment

### Vercel Deployment
1. Connect repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables in Vercel dashboard

### Manual Deployment
```bash
npm install
npm run build
# Deploy contents of dist/ folder to your CDN/hosting service
```

## Database Setup

### Initial Database Setup
```bash
# Run the database schema
psql $DATABASE_URL -f backend/src/database/schema.sql

# Initialize with tag data (takes 10-30 minutes)
cd backend
npm run cli init
```

### Daily Tables Setup
```bash
# Create daily challenge tables
psql $DATABASE_URL -f backend/create_daily_tables.sql
```

## Features in Production

### Automated Tag Refresh
- Runs daily at 6:21 AM CST by default
- Configurable via `TAG_REFRESH_HOUR` and `TAG_REFRESH_MINUTE`
- Can be disabled with `SCHEDULER_ENABLED=false`
- Monitor via `/api/admin/scheduler/status`

### Admin Endpoints
- `/api/admin/scheduler/status` - Check scheduler status
- `/api/admin/scheduler/trigger-refresh` - Manual tag refresh
- `/api/admin/blacklist/*` - Manage daily challenge blacklist
- All require `x-admin-key` header

### Debug Routes
- Automatically disabled in production
- Available only when `NODE_ENV !== 'production'`

## Security Considerations

1. **Admin Key**: Use a strong, unique admin key
2. **Database**: Use connection pooling and SSL
3. **CORS**: Frontend URL is restricted in production
4. **Rate Limiting**: Enabled by default
5. **Input Validation**: All endpoints use Zod validation

## Monitoring

### Health Check
```bash
curl https://your-backend-domain.com/api/health
```

### Scheduler Status
```bash
curl -H "x-admin-key: your-key" https://your-backend-domain.com/api/admin/scheduler/status
```

### Logs
- Server startup and shutdown
- Scheduled task execution
- Error logging for debugging
- Minimal console output in production

## Troubleshooting

### Common Issues
1. **Database connection**: Check `DATABASE_URL` format
2. **CORS errors**: Verify `FRONTEND_URL` matches actual domain
3. **Admin access**: Ensure `ADMIN_KEY` is set and correct
4. **Tag refresh**: Check logs for scheduler execution

### Manual Tag Refresh
```bash
curl -X POST -H "x-admin-key: your-key" https://your-backend-domain.com/api/admin/scheduler/trigger-refresh
```