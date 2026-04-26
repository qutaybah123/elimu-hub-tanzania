#!/bin/bash

# Elimu Hub Tanzania Deployment Script
echo "🚀 Starting deployment of Elimu Hub Tanzania..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create .env file from .env.example"
    exit 1
fi

# Load environment variables
source .env

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Build and deploy with Docker Compose
echo "🏗️ Building and starting containers..."
docker-compose -f docker-compose.yml down
docker-compose -f docker-compose.yml build --no-cache
docker-compose -f docker-compose.yml up -d

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.yml exec backend npm run migrate

# Check if services are running
echo "🔍 Checking service health..."
sleep 10

if curl -f http://localhost/health >/dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "⚠️ Frontend health check failed"
fi

if curl -f http://localhost:5000/health >/dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "⚠️ Backend health check failed"
fi

echo "📊 Checking database connection..."
docker-compose -f docker-compose.yml exec postgres pg_isready -U elimu_user

echo "✨ Deployment complete! Elimu Hub Tanzania is now running!"
echo "🌐 Frontend: http://localhost"
echo "🔌 Backend API: http://localhost:5000"
echo "📚 API Docs: http://localhost:5000/api-docs"