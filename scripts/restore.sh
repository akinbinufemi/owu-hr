#!/bin/bash

# OWU Palace HRMS - Database Restore Script
# This script restores the PostgreSQL database from a backup file

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
DB_CONTAINER="owu-hrms-db-prod"
LOG_FILE="$PROJECT_DIR/logs/restore.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

# Usage function
usage() {
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Examples:"
    echo "  $0 hrms_backup_20250114_120000.sql.gz"
    echo "  $0 /path/to/backup.sql"
    echo ""
    echo "Available backups:"
    if [[ -d "$BACKUP_DIR" ]]; then
        ls -lah "$BACKUP_DIR"/hrms_backup_*.sql.gz 2>/dev/null | tail -10 || echo "  No backup files found"
    else
        echo "  Backup directory not found: $BACKUP_DIR"
    fi
    exit 1
}

# Check arguments
if [[ $# -ne 1 ]]; then
    usage
fi

BACKUP_FILE="$1"

# Create necessary directories
mkdir -p "$(dirname "$LOG_FILE")"

log "${BLUE}Starting database restore...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    error_exit "Docker is not running or not accessible"
fi

# Check if database container exists and is running
if ! docker ps | grep -q "$DB_CONTAINER"; then
    error_exit "Database container '$DB_CONTAINER' is not running"
fi

# Determine backup file path
if [[ "$BACKUP_FILE" == /* ]]; then
    # Absolute path
    BACKUP_PATH="$BACKUP_FILE"
else
    # Relative path, assume it's in backup directory
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"
fi

# Check if backup file exists
if [[ ! -f "$BACKUP_PATH" ]]; then
    error_exit "Backup file not found: $BACKUP_PATH"
fi

log "Using backup file: $BACKUP_PATH"

# Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
log "Backup file size: $BACKUP_SIZE"

# Confirm restore operation
echo ""
echo "${YELLOW}⚠️  WARNING: This will COMPLETELY REPLACE the current database!${NC}"
echo "   Current database will be PERMANENTLY DELETED!"
echo "   Backup file: $BACKUP_PATH"
echo "   Backup size: $BACKUP_SIZE"
echo ""
read -p "Are you sure you want to continue? (type 'YES' to confirm): " CONFIRM

if [[ "$CONFIRM" != "YES" ]]; then
    log "Restore operation cancelled by user"
    exit 0
fi

# Create a backup of current database before restore
log "${YELLOW}Creating safety backup of current database...${NC}"
SAFETY_BACKUP="$BACKUP_DIR/safety_backup_$(date +%Y%m%d_%H%M%S).sql"
if docker exec "$DB_CONTAINER" pg_dump -U postgres owu_palace_hrms > "$SAFETY_BACKUP"; then
    gzip "$SAFETY_BACKUP"
    log "${GREEN}Safety backup created: ${SAFETY_BACKUP}.gz${NC}"
else
    warning "Failed to create safety backup, but continuing with restore..."
fi

# Stop backend container to prevent connections during restore
log "Stopping backend container..."
docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" stop backend

# Wait a moment for connections to close
sleep 5

# Determine if backup is compressed
if [[ "$BACKUP_PATH" == *.gz ]]; then
    log "Decompressing and restoring from compressed backup..."
    if gunzip -c "$BACKUP_PATH" | docker exec -i "$DB_CONTAINER" psql -U postgres -d owu_palace_hrms; then
        log "${GREEN}Database restored successfully from compressed backup${NC}"
    else
        error_exit "Failed to restore database from compressed backup"
    fi
else
    log "Restoring from uncompressed backup..."
    if docker exec -i "$DB_CONTAINER" psql -U postgres -d owu_palace_hrms < "$BACKUP_PATH"; then
        log "${GREEN}Database restored successfully from backup${NC}"
    else
        error_exit "Failed to restore database from backup"
    fi
fi

# Restart backend container
log "Restarting backend container..."
docker-compose -f "$PROJECT_DIR/docker-compose.prod.yml" start backend

# Wait for backend to be ready
log "Waiting for backend to be ready..."
sleep 10

# Verify restore
log "Verifying database restore..."
if docker exec "$DB_CONTAINER" psql -U postgres -d owu_palace_hrms -c "SELECT COUNT(*) FROM \"Admin\";" > /dev/null 2>&1; then
    ADMIN_COUNT=$(docker exec "$DB_CONTAINER" psql -U postgres -d owu_palace_hrms -t -c "SELECT COUNT(*) FROM \"Admin\";" | xargs)
    STAFF_COUNT=$(docker exec "$DB_CONTAINER" psql -U postgres -d owu_palace_hrms -t -c "SELECT COUNT(*) FROM \"Staff\";" | xargs)
    log "${GREEN}Database verification successful:${NC}"
    log "  - Admin records: $ADMIN_COUNT"
    log "  - Staff records: $STAFF_COUNT"
else
    error_exit "Database verification failed"
fi

# Check backend health
log "Checking backend health..."
sleep 5
if docker exec owu-hrms-backend-prod curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    log "${GREEN}Backend API is responding after restore${NC}"
else
    warning "Backend API is not responding yet, may need more time to start"
fi

log "${GREEN}Database restore completed successfully!${NC}"
log "Backup file used: $BACKUP_PATH"
log "Safety backup created: ${SAFETY_BACKUP}.gz"

echo ""
echo "${GREEN}✅ Restore completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Test the application to ensure everything is working"
echo "2. Check logs for any errors: docker-compose -f docker-compose.prod.yml logs"
echo "3. The safety backup is available at: ${SAFETY_BACKUP}.gz"

exit 0