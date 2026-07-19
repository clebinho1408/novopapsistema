#!/bin/bash
set -e

echo "📦 Installing dependencies..."
npm install --prefer-offline

echo "🗃️ Pushing schema to development database..."
npm run db:push -- --force

echo "✅ Post-merge setup complete."
