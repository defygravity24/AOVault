#!/bin/bash
# Build script for Render deployment
# Builds frontend, copies to backend/public, then installs backend deps

set -e

echo "=== Building AOVault for production ==="

# Install frontend deps and build
echo "--- Building frontend ---"
cd frontend
npm install
npx vite build
cd ..

# Copy built frontend to backend/public
echo "--- Copying frontend build to backend ---"
rm -rf backend/public
cp -r frontend/dist backend/public

# Install backend deps
echo "--- Installing backend dependencies ---"
cd backend
npm install

echo "=== Build complete ==="
