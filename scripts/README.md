# Version Management Scripts

## Quick Start

From the project root, run:

```bash
npm run patch   # Bug fixes and small changes
npm run minor   # New features (backward compatible)
npm run major   # Breaking changes
```

That's it! Everything else is automatic.

## What Happens Automatically

When you run `npm run patch` (or minor/major):

1. ✅ **Updates versions** in both `package.json` files (frontend & backend)
2. ✅ **Commits** the version bump with a standard message
3. ✅ **Creates a git tag** (e.g., `v1.0.1`)
4. ✅ **Pushes** to remote including tags

## Check Current Version

```bash
npm run version:check
```

Shows current versions for both frontend and backend.

## When to Use Each Type

- **patch** (`1.0.0` → `1.0.1`)
  - Bug fixes
  - Performance improvements
  - Documentation updates
  - Small UI tweaks

- **minor** (`1.0.0` → `1.1.0`)
  - New features
  - Backward-compatible changes
  - New game modes
  - UI improvements

- **major** (`1.0.0` → `2.0.0`)
  - Breaking changes
  - Database schema changes
  - API restructuring
  - Major redesigns

## Scripts

### version.sh

Main script that handles all versioning operations.

**Direct usage:**
```bash
./scripts/version.sh patch
./scripts/version.sh minor
./scripts/version.sh major
./scripts/version.sh        # Shows current versions
```

**Recommended usage:**
```bash
npm run patch   # Uses version.sh internally
npm run minor
npm run major
```

## Troubleshooting

### "You have uncommitted changes"

The script will warn you if you have uncommitted work. You can:
- Commit your changes first, then run the version bump
- Or continue anyway (the version bump will be a separate commit)

### Script permission denied

Make the script executable:
```bash
chmod +x scripts/version.sh
```

### Need to undo a version bump

Before pushing:
```bash
git reset --soft HEAD~1  # Undo commit, keep changes
git tag -d vX.Y.Z        # Delete the tag
```

After pushing:
```bash
# Don't do this! Version numbers should never go backwards.
# Instead, bump forward to the next version.
```
