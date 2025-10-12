# Versioning Strategy

## Semantic Versioning (SemVer)

We follow semantic versioning: `MAJOR.MINOR.PATCH`

### Version Components

- **MAJOR** (1.x.x): Breaking changes, incompatible API changes
- **MINOR** (x.1.x): New features, backward-compatible additions
- **PATCH** (x.x.1): Bug fixes, backward-compatible fixes

## Version History

### v1.0.0 - Initial Production Release
- Complete daily challenge system with database persistence
- Comprehensive input validation with Zod
- Automated tag database refresh system
- Production-ready deployment configuration
- Admin endpoints for monitoring and management

## Future Version Planning

### v1.1.0 (Next Minor Release)
- **Potential Features:**
  - User accounts and persistent statistics
  - Leaderboards and social features
  - Additional game modes (time attack, endless)
  - Achievement system
  - Settings panel implementation

### v1.0.x (Patch Releases)
- **Bug fixes**
- **Performance improvements**
- **Security updates**
- **Minor UI/UX improvements**

### v2.0.0 (Future Major Release)
- **Breaking Changes:**
  - Major UI redesign
  - Database schema changes
  - API restructuring
  - New authentication system

## Release Process

### Development
1. All development happens on feature branches
2. Version remains at current release (e.g., 1.0.0)
3. Features merged to `main` branch

### Pre-Release
1. **Update version**: `./scripts/version.sh patch|minor|major`
2. **Update CHANGELOG.md** with new features/fixes
3. **Test deployment** on staging environment
4. **Commit version bump**: `git commit -m "chore: bump version to vX.Y.Z"`

### Release
1. **Create and push tag**: `git tag vX.Y.Z && git push --tags`
2. **Deploy to production**
3. **Create GitHub release** with changelog notes
4. **Update documentation** if needed

## Version Sync

Both frontend and backend should maintain the same version number:
- `/package.json` (frontend)
- `/backend/package.json` (backend)

## Tools

### Recommended: Use Our Custom Script
```bash
# Updates both frontend and backend versions
./scripts/version.sh patch|minor|major

# Example: bump patch version
./scripts/version.sh patch
```

### Manual Version Updates (Not Recommended)
```bash
# Frontend only (manual sync required)
npm version patch|minor|major --no-git-tag-version

# Backend only (manual sync required)
cd backend
npm version patch|minor|major --no-git-tag-version
```

### Check Current Version
```bash
# Frontend
npm run check-version || echo $(node -p "require('./package.json').version")

# Backend
cd backend && echo $(node -p "require('./package.json').version")

# Via API (when deployed)
curl https://your-backend-url/api/health
```

## Deployment Tags

- **Production**: `v1.0.0`, `v1.1.0`, etc.
- **Release Candidates**: `v1.1.0-rc.1`, `v1.1.0-rc.2`
- **Beta**: `v1.1.0-beta.1`, `v1.1.0-beta.2`
- **Alpha**: `v1.1.0-alpha.1` (internal testing only)