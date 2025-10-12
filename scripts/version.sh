#!/bin/bash

# Version sync script for e621_guessr
# Usage: ./scripts/version.sh [patch|minor|major]

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 [patch|minor|major]"
    echo "Current versions:"
    echo "  Frontend: $(node -p "require('./package.json').version")"
    echo "  Backend:  $(cd backend && node -p "require('./package.json').version")"
    exit 1
fi

VERSION_TYPE=$1

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo "Error: Version type must be patch, minor, or major"
    exit 1
fi

echo "🔄 Updating versions..."

# Update frontend version
echo "📦 Updating frontend version..."
npm version $VERSION_TYPE --no-git-tag-version

# Get the new version
NEW_VERSION=$(node -p "require('./package.json').version")

# Update backend version to match
echo "📦 Updating backend version to $NEW_VERSION..."
cd backend
npm version $NEW_VERSION --no-git-tag-version --allow-same-version
cd ..

echo "✅ Both packages updated to v$NEW_VERSION"
echo ""
echo "Next steps:"
echo "1. Update CHANGELOG.md with release notes"
echo "2. Commit changes: git add . && git commit -m \"chore: bump version to v$NEW_VERSION\""
echo "3. Create tag: git tag v$NEW_VERSION"
echo "4. Push: git push && git push --tags"