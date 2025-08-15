#!/bin/bash

# OWU Palace HRMS - Database Backup Script
# This script creates automated backups of the PostgreSQL database

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
DB_CONTAINER="owu-hrms-db-prod"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="hrms_backup_${DATE}.sql"
LOG_FILE="$PROJECT_DIR/logs/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if running as root (not recommended)
if [[ $EUID -eq 0 ]]; then
    log "${YELLOW}WARNING: Running as root. Consider using a non-root user.${NC}"
fi

# Create necessary directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log "${GREEN}Starting database backup...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    error_exit "Docker is not running or not accessible"
fi

# Check if database container exists and is running
if ! docker ps | grep -q "$DB_CONTAINER"; then
    error_exit "Database container '$DB_CONTAINER' is not running"
fi

# Create database backup
log "Creating backup: $BACKUP_FILE"
if docker exec "$DB_CONTAINER" pg_dump -U postgres owu_palace_hrms > "$BACKUP_DIR/$BACKUP_FILE"; then
    log "${GREEN}Database dump completed successfully${NC}"
else
    error_exit "Failed to create database dump"
fi

# Check if backup file was created and has content
if [[ ! -s "$BACKUP_DIR/$BACKUP_FILE" ]]; then
    error_exit "Backup file is empty or was not created"
fi

# Compress backup
log "Compressing backup file..."
if gzip "$BACKUP_DIR/$BACKUP_FILE"; then
    log "${GREEN}Backup compressed successfully${NC}"
    BACKUP_FILE="${BACKUP_FILE}.gz"
else
    error_exit "Failed to compress backup file"
fi

# Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
log "Backup size: $BACKUP_SIZE"

# Keep only last 7 days of backups
log "Cleaning up old backups (keeping last 7 days)..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "hrms_backup_*.sql.gz" -mtime +7 -delete -print | wc -l)
if [[ $DELETED_COUNT -gt 0 ]]; then
    log "Deleted $DELETED_COUNT old backup files"
else
    log "No old backup files to delete"
fi

# Verify backup integrity
log "Verifying backup integrity..."
if gzip -t "$BACKUP_DIR/$BACKUP_FILE"; then
    log "${GREEN}Backup integrity verified${NC}"
else
    error_exit "Backup file is corrupted"
fi

# Create backup manifest
MANIFEST_FILE="$BACKUP_DIR/backup_manifest.txt"
{
    echo "OWU Palace HRMS Backup Manifest"
    echo "================================"
    echo "Backup Date: $(date)"
    echo "Backup File: $BACKUP_FILE"
    echo "Backup Size: $BACKUP_SIZE"
    echo "Database: owu_palace_hrms"
    echo "Container: $DB_CONTAINER"
    echo ""
    echo "Recent Backups:"
    ls -lah "$BACKUP_DIR"/hrms_backup_*.sql.gz | tail -10
} > "$MANIFEST_FILE"

log "${GREEN}Backup completed successfully: $BACKUP_FILE${NC}"
log "Backup manifest updated: $MANIFEST_FILE"

# Optional: Send notification (uncomment and configure as needed)
# send_notification() {
#     # Example: Send email notification
#     # echo "Backup completed: $BACKUP_FILE ($BACKUP_SIZE)" | mail -s "HRMS Backup Success" admin@yourdomain.com
#     
#     # Example: Send Slack notification
#     # curl -X POST -H 'Content-type: application/json' \
#     #   --data "{\"text\":\"✅ HRMS Backup completed: $BACKUP_FILE ($BACKUP_SIZE)\"}" \
#     #   YOUR_SLACK_WEBHOOK_URL
#     
#     log "Notification sent"
# }
# send_notification

exit 0