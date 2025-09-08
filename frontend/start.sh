#!/bin/sh

if [ "$NODE_ENV" = "development" ]; then
  echo "🚀 Starting in development mode..."
  pnpm run dev
else
  echo "🏗️ Building for production..."
  pnpm run build
  echo "🚀 Starting production server..."
  pnpm run start
fi
