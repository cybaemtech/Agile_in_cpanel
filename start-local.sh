#!/bin/bash
echo "🚀 Starting AgileTracker locally with cPanel MySQL database..."

# Copy local environment configuration
cp .env.local .env

echo "📋 Database Configuration:"
echo "   Host: 103.48.43.49 (cPanel MySQL server)"
echo "   Database: cybaemtech_Agile" 
echo "   User: cybaemtech_Agile"

# Create admin users in cPanel database (if needed)
echo "🔧 Setting up admin users in cPanel database..."
node run-local.js

# Start the application
echo "🎯 Starting development server on http://localhost:5000..."
npm run dev