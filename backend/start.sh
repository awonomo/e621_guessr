#!/bin/bash
# E6 Tag Challenge - Quick Startup Script

echo "🚀 Starting E6 Tag Challenge Backend..."

# Check PostgreSQL
if ! brew services list | grep -q "postgresql.*started"; then
    echo "📦 Starting PostgreSQL..."
    brew services start postgresql@15
    sleep 2
fi

# Check database
echo "🗃️  Checking database..."
npm run cli -- db status

echo ""
echo "✅ System ready! Starting backend..."
echo "🌐 Server will be available at: http://localhost:3001"
echo "🎯 Test scoring: npm run cli -- tags search 'tagname'"
echo "⚙️  Tune scoring: Edit src/config/database.ts"
echo ""

# Start development server
npm run dev