# Changelog

All notable changes to e621_guessr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-12

### Added
- **Daily Challenge System**: Complete daily challenge implementation with unique posts per day
- **Database Persistence**: Player results stored with PostgreSQL backend
- **Automated Tag Refresh**: Daily tag database updates via scheduler service
- **Input Validation**: Comprehensive Zod validation across all API endpoints
- **Admin Interface**: Admin endpoints for monitoring and manual tag refresh
- **Production Configuration**: Environment-based configuration for deployment
- **Rate Limiting**: API protection against abuse
- **Health Monitoring**: Health check endpoints and scheduler status
- **Stats Persistence**: Local storage for user statistics between sessions
- **Animated UI**: Score glow effects and improved visual feedback

### Security
- **CORS Protection**: Environment-based origin restrictions
- **Input Sanitization**: All user inputs validated and sanitized
- **Admin Authentication**: Secure admin key system
- **Debug Route Protection**: Debug routes disabled in production

### Technical
- **TypeScript**: Full type safety across frontend and backend
- **Svelte 5**: Modern reactive UI framework
- **PostgreSQL**: Robust database with proper indexing
- **Express.js**: RESTful API with middleware pipeline
- **Vite**: Fast development build system
- **Environment Configuration**: Comprehensive .env setup

### Performance
- **Database Indexing**: Optimized queries for tag lookups
- **Caching**: Tag blacklist and scoring data caching
- **Efficient API**: Minimal data transfer and smart batching

## [Unreleased]

### Planned for v1.1.0
- User account system
- Global leaderboards
- Additional game modes
- Achievement system
- Settings panel

---

## Template for Future Releases

## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements