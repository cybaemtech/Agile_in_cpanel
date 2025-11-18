#!/bin/bash
echo "🚀 Starting PHP-only AgileTracker server..."
echo "📦 Building React frontend..."
npm run build

echo "🐘 Starting PHP server on port 5000..."
echo "📊 Using cPanel MySQL database"
echo "🔗 API endpoints available at /api/*"
echo "🌐 Frontend available at http://localhost:5000"

# Start PHP built-in server
php -S 0.0.0.0:5000 -t . php-server.php