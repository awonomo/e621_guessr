#!/bin/bash

# Version sync script for e621_guessr
# Usage: ./scripts/version.sh [patch|minor|major]
#
# This script automatically:
# 1. Updates both frontend and backend versions
# 2. Commits the changes
# 3. Creates a git tag
# 4. Pushes everything to remote
#
# Just run: npm run patch (or minor/major)

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ $# -eq 0 ]; then
    echo -e "${BLUE}📋 Current versions:${NC}"
    echo "  Frontend: $(node -p "require('./package.json').version")"
    echo "  Backend:  $(cd backend && node -p "require('./package.json').version")"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  npm run patch  - Bug fixes and small changes (1.0.0 → 1.0.1)"
    echo "  npm run minor  - New features, backward compatible (1.0.0 → 1.1.0)"
    echo "  npm run major  - Breaking changes (1.0.0 → 2.0.0)"
    exit 0
fi

VERSION_TYPE=$1

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${YELLOW}Error: Version type must be patch, minor, or major${NC}"
    exit 1
fi

echo -e "${BLUE}� Starting version bump process...${NC}"
echo ""

# Check if git working directory is clean
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes.${NC}"
    echo "The version bump will be committed separately."
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Update frontend version
echo -e "${BLUE}📦 Updating frontend version...${NC}"
npm version $VERSION_TYPE --no-git-tag-version

# Get the new version
NEW_VERSION=$(node -p "require('./package.json').version")

# Update backend version to match
echo -e "${BLUE}📦 Updating backend version to $NEW_VERSION...${NC}"
cd backend
npm version $NEW_VERSION --no-git-tag-version --allow-same-version
cd ..

echo ""
echo -e "${GREEN}✅ Both packages updated to v$NEW_VERSION${NC}"
echo ""

# Commit the version bump
echo -e "${BLUE}📝 Committing version bump...${NC}"
git add package.json backend/package.json package-lock.json backend/package-lock.json 2>/dev/null || git add package.json backend/package.json
git commit -m "chore: bump version to v$NEW_VERSION"

# Create git tag
echo -e "${BLUE}🏷️  Creating git tag v$NEW_VERSION...${NC}"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# Push changes and tags
echo -e "${BLUE}⬆️  Pushing to remote...${NC}"
git push && git push --tags

echo ""
echo -e "${GREEN}🎉 Version v$NEW_VERSION released successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  • Update CHANGELOG.md if needed"
echo "  • Deploy to production"
echo "  • Create GitHub release with notes (optional)"