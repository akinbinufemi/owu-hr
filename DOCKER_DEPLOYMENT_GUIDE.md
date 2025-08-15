# 🐳 OWU Palace HRMS - Docker Self-Hosted Deployment Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start (Development)](#quick-start-development)
3. [Production Deployment](#production-deployment)
4. [SSL/HTTPS Setup](#sslhttps-setup)
5. [Backup & Monitoring](#backup--monitoring)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance](#maintenance)

---

## 🔧 Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows with WSL2
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: Minimum 10GB free space
- **CPU**: 2+ cores recommended

### Required Software
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Domain Setup (Optional but Recommended)
- Domain name pointing to your server IP
- DNS A record: `hrms.yourdomain.com` → `YOUR_SERVER_IP`
- DNS A record: `api.yourdomain.com` → `YOUR_SERVER_IP`

---

## 🚀 Quick Start (Development)

### 1. Clone Repository
```bash
git clone https://github.com/akinbinufemi/owu-hr.git
cd owu-hr
```

### 2. Environment Setup
```bash
# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit backend environment
nano backend/.env
```

**Backend Environment Variables** (`backend/.env`):
```env
# Database
DATABASE_URL=postgresql://postgres:password123@postgres:5432/owu_palace_hrms?schema=public

# Security
JWT_SECRET=owu-palace-hrms-super-secret-jwt-key-2025-change-in-production
FILE_ENCRYPTION_KEY=your-super-secret-encryption-key-change-in-production
BCRYPT_ROUNDS=12

# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Frontend Environment Variables** (`frontend/.env`):
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 3. Start Development Environment
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 4. Initialize Database
```bash
# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Seed database with initial data
docker-compose exec backend npx prisma db seed
```

### 5. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Database**: localhost:5432

**Default Admin Credentials**:
- Email: `admin@owupalace.com`
- Password: `admin123`

---

## 🏭 Production Deployment

### 1. Production Docker Compose

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: owu-hrms-db-prod
    restart: unless-stopped
    environment:
      POSTGRES_DB: owu_palace_hrms
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "127.0.0.1:5432:5432"  # Only bind to localhost
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - owu-hrms-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: owu-hrms-backend-prod
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/owu_palace_hrms?schema=public
      JWT_SECRET: ${JWT_SECRET}
      FILE_ENCRYPTION_KEY: ${FILE_ENCRYPTION_KEY}
      PORT: 5000
      FRONTEND_URL: ${FRONTEND_URL}
      BCRYPT_ROUNDS: 12
      MAX_FILE_SIZE: 10485760
    ports:
      - "127.0.0.1:5000:5000"  # Only bind to localhost
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads
      - ./backups:/app/backups
      - ./logs:/app/logs
    networks:
      - owu-hrms-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend (Production Build)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
      args:
        REACT_APP_API_URL: ${REACT_APP_API_URL}
    container_name: owu-hrms-frontend-prod
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:80"  # Only bind to localhost
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - owu-hrms-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: owu-hrms-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - frontend
      - backend
    networks:
      - owu-hrms-network

volumes:
  postgres_data:

networks:
  owu-hrms-network:
    driver: bridge
```

### 2. Production Dockerfiles

**Backend Production Dockerfile** (`backend/Dockerfile.prod`):
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl curl

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create necessary directories
RUN mkdir -p uploads backups logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]
```

**Frontend Production Dockerfile** (`frontend/Dockerfile.prod`):
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build argument for API URL
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Copy built app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

**Frontend Nginx Config** (`frontend/nginx.conf`):
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. Production Environment Setup

Create `.env.prod`:
```env
# Database
DB_PASSWORD=your-super-secure-database-password-change-this

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production
FILE_ENCRYPTION_KEY=your-super-secure-encryption-key-change-this-in-production

# URLs
FRONTEND_URL=https://hrms.yourdomain.com
REACT_APP_API_URL=https://api.yourdomain.com/api
```

### 4. Nginx Reverse Proxy Configuration

Create `nginx/nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:5000;
    }

    upstream frontend {
        server frontend:80;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Main server block
    server {
        listen 80;
        server_name hrms.yourdomain.com api.yourdomain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server for frontend
    server {
        listen 443 ssl http2;
        server_name hrms.yourdomain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header Strict-Transport-Security "max-age=63072000" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;

        # Frontend proxy
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # HTTPS server for API
    server {
        listen 443 ssl http2;
        server_name api.yourdomain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header Strict-Transport-Security "max-age=63072000" always;
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;

        # API proxy with rate limiting
        location /api {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Increase timeout for file uploads
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Special rate limiting for login endpoint
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
            
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 5. Deploy Production Environment

```bash
# Create production directories
mkdir -p nginx/ssl logs/nginx uploads backups

# Set proper permissions
chmod 755 uploads backups logs

# Start production environment
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Initialize database
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
docker-compose -f docker-compose.prod.yml exec backend npx prisma db seed

# Check status
docker-compose -f docker-compose.prod.yml ps
```

---

## 🔒 SSL/HTTPS Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt update
sudo apt install certbot

# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx

# Generate certificates
sudo certbot certonly --standalone -d hrms.yourdomain.com -d api.yourdomain.com

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/hrms.yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/hrms.yourdomain.com/privkey.pem nginx/ssl/

# Set proper permissions
sudo chown $USER:$USER nginx/ssl/*
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem

# Restart nginx
docker-compose -f docker-compose.prod.yml start nginx
```

### Option 2: Self-Signed Certificates (Development)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/C=NG/ST=Lagos/L=Lagos/O=OWU Palace/CN=hrms.yourdomain.com"

# Set permissions
chmod 644 nginx/ssl/fullchain.pem
chmod 600 nginx/ssl/privkey.pem
```

### Auto-Renewal Setup (Let's Encrypt)

```bash
# Create renewal script
cat > /etc/cron.d/certbot-renew << EOF
0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook "docker-compose -f /path/to/your/project/docker-compose.prod.yml restart nginx"
EOF
```

---

## 📊 Backup & Monitoring

### 1. Database Backup Script

Create `scripts/backup.sh`:
```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/path/to/your/project/backups"
DB_CONTAINER="owu-hrms-db-prod"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="hrms_backup_${DATE}.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create database backup
docker exec $DB_CONTAINER pg_dump -U postgres owu_palace_hrms > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "hrms_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

### 2. Monitoring Script

Create `scripts/monitor.sh`:
```bash
#!/bin/bash

# Check if all containers are running
CONTAINERS=("owu-hrms-db-prod" "owu-hrms-backend-prod" "owu-hrms-frontend-prod" "owu-hrms-nginx")

for container in "${CONTAINERS[@]}"; do
    if ! docker ps | grep -q $container; then
        echo "ALERT: Container $container is not running!"
        # Send notification (email, Slack, etc.)
    fi
done

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "ALERT: Disk usage is ${DISK_USAGE}%"
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
if [ $MEMORY_USAGE -gt 80 ]; then
    echo "ALERT: Memory usage is ${MEMORY_USAGE}%"
fi
```

### 3. Setup Cron Jobs

```bash
# Make scripts executable
chmod +x scripts/backup.sh scripts/monitor.sh

# Add to crontab
crontab -e

# Add these lines:
# Daily backup at 2 AM
0 2 * * * /path/to/your/project/scripts/backup.sh

# Monitor every 5 minutes
*/5 * * * * /path/to/your/project/scripts/monitor.sh
```

### 4. Log Rotation

Create `logrotate.conf`:
```
/path/to/your/project/logs/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker kill -s USR1 owu-hrms-nginx
    endscript
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database container
docker-compose logs postgres

# Test database connection
docker-compose exec backend npx prisma db push

# Reset database (CAUTION: This will delete all data)
docker-compose exec backend npx prisma migrate reset
```

#### 2. File Upload Issues
```bash
# Check uploads directory permissions
ls -la uploads/

# Fix permissions
sudo chown -R 1001:1001 uploads/
chmod 755 uploads/
```

#### 3. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Test SSL configuration
docker-compose exec nginx nginx -t
```

#### 4. Memory Issues
```bash
# Check container resource usage
docker stats

# Increase memory limits in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

### Debugging Commands

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Execute commands in containers
docker-compose -f docker-compose.prod.yml exec backend bash
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d owu_palace_hrms

# Check container health
docker-compose -f docker-compose.prod.yml ps
docker inspect owu-hrms-backend-prod
```

---

## 🛠 Maintenance

### Regular Maintenance Tasks

#### 1. Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations if needed
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

#### 2. Clean Up Docker Resources
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Complete cleanup (CAUTION: This removes everything not in use)
docker system prune -a --volumes
```

#### 3. Database Maintenance
```bash
# Analyze database performance
docker-compose exec postgres psql -U postgres -d owu_palace_hrms -c "ANALYZE;"

# Vacuum database
docker-compose exec postgres psql -U postgres -d owu_palace_hrms -c "VACUUM ANALYZE;"

# Check database size
docker-compose exec postgres psql -U postgres -d owu_palace_hrms -c "SELECT pg_size_pretty(pg_database_size('owu_palace_hrms'));"
```

### Security Updates

#### 1. Update Base Images
```bash
# Update docker-compose.yml with latest image versions
# postgres:15-alpine -> postgres:16-alpine
# node:18-alpine -> node:20-alpine
# nginx:alpine -> nginx:1.25-alpine

# Rebuild with new base images
docker-compose -f docker-compose.prod.yml build --no-cache --pull
```

#### 2. Security Scanning
```bash
# Scan images for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image owu-hrms-backend-prod

# Scan for secrets in code
docker run --rm -v $(pwd):/app trufflesecurity/trufflehog filesystem /app
```

---

## 📈 Performance Optimization

### 1. Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_department ON "Staff"("departmentId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_status ON "Staff"("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_month ON "Payroll"("month", "year");
```

### 2. Nginx Optimization
```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 2048;

# Enable caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g 
                 inactive=60m use_temp_path=off;

location /api {
    proxy_cache my_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
}
```

### 3. Application Optimization
```bash
# Enable production optimizations in backend/.env
NODE_ENV=production
BCRYPT_ROUNDS=10  # Reduce from 12 for better performance
```

---

## 🚨 Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS with valid certificates
- [ ] Configure firewall (UFW/iptables)
- [ ] Set up fail2ban for brute force protection
- [ ] Regular security updates
- [ ] Database access restricted to localhost
- [ ] File upload restrictions in place
- [ ] Rate limiting configured
- [ ] Security headers configured
- [ ] Regular backups automated
- [ ] Monitoring and alerting set up

---

## 📞 Support

For issues or questions:
1. Check the [troubleshooting section](#troubleshooting)
2. Review container logs
3. Check GitHub issues
4. Contact system administrator

---

**Last Updated**: January 2025
**Version**: 1.0.0