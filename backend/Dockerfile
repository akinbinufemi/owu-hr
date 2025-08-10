# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy Prisma schema first
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5001

# Start the application
CMD ["npm", "run", "start:prod"]