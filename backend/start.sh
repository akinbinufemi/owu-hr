#!/bin/sh

# Exit on any error
set -e

echo "Starting Owu Palace HRMS Backend..."

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting the server..."
exec npm start