# 🔄 OWU Palace HRMS Backup & Restore System

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Web Interface Guide](#web-interface-guide)
- [CLI Usage](#cli-usage)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Technical Details](#technical-details)

## 🌟 Overview

The OWU Palace HRMS Backup & Restore System provides comprehensive data protection and migration capabilities for your HR management system. It offers both web-based and command-line interfaces for creating, managing, and restoring database backups.

### Key Benefits
- **One-click operations** for backup creation and restoration
- **Complete data coverage** including all relationships and metadata
- **Transaction-safe restoration** with automatic rollback on failure
- **Compressed storage** using ZIP format for efficiency
- **Role-based security** with SUPER_ADMIN access control
- **Automated scheduling** support via CLI tools

## ✨ Features

### ✅ **Backup Creation**
- Complete database export with all 13 tables
- Relationship preservation across all data models
- Metadata generation with timestamps and statistics
- ZIP compression for storage efficiency
- Automatic file naming with unique identifiers

### ✅ **Restore Operations**
- Transaction-based restoration for data integrity
- Backup file validation and structure verification
- Complete data replacement with rollback safety
- Support for JSON and ZIP backup formats
- Automatic application refresh after restoration

### ✅ **Web Interface**
- Responsive design for desktop and mobile
- Real-time progress indicators
- Drag-and-drop file upload
- System status dashboard
- Backup file management

### ✅ **CLI Tools**
- Standalone backup creation
- Automated scheduling support
- Detailed logging and progress reporting
- Environment validation
- Error handling with exit codes

### ✅ **Security**
- SUPER_ADMIN role requirement
- File type and size validation
- Path traversal protection
- Audit logging for all operations
- Sensitive data masking

## 🚀 Quick Start

### Prerequisites
- SUPER_ADMIN role in the HRMS system
- Node.js and npm installed (for CLI usage)
- Sufficient disk space for backup files

### Creating Your First Backup

#### Via Web Interface
1. **Login** as a SUPER_ADMIN user
2. **Navigate** to "Backup & Restore" in the sidebar
3. **Click** "💾 Create Backup" button
4. **Wait** for the backup to complete
5. **Download** the backup file using the "📥 Download" button

#### Via CLI
```bash
# Navigate to backend directory
cd backend

# Create backup using npm script
npm run backup

# Or run directly with options
node scripts/backup-utility.js --verbose
```

### Restoring from Backup

#### Via Web Interface
1. **Click** "📤 Restore Backup" button
2. **Select** your backup file (.json or .zip)
3. **Read** the warning carefully
4. **Confirm** the restoration
5. **Wait** for completion and automatic page reload

⚠️ **Warning**: Restore operations completely replace all existing data and cannot be undone!

## 🖥️ Web Interface Guide

### Dashboard Overview
The backup management dashboard provides:

- **Status Cards**: Current database records, total backups, storage used
- **Recommendations**: System-generated suggestions for backup management
- **Backup List**: All available backup files with metadata
- **Action Buttons**: Create, restore, and system status options

### Creating Backups
1. **Access**: Navigate to `/backup` in your HRMS system
2. **Create**: Click the "💾 Create Backup" button
3. **Monitor**: Watch the progress indicator during creation
4. **Download**: Use the download button to save the backup file locally

### Restoring Backups
1. **Upload**: Click "📤 Restore Backup" and select your file
2. **Validate**: System automatically validates file format and structure
3. **Confirm**: Read warnings and confirm the operation
4. **Complete**: Wait for restoration and automatic page refresh

### System Status
Access detailed system information via the "📊 System Status" button:
- System operational status and version
- Database table statistics
- Backup storage information
- Automated recommendations

## 💻 CLI Usage

### Basic Commands

```bash
# Create backup with default settings
npm run backup

# Create backup with verbose output
node scripts/backup-utility.js --verbose

# Create backup with custom output directory
node scripts/backup-utility.js --output /custom/path

# Show help
node scripts/backup-utility.js --help
```

### Command Options

| Option | Description | Example |
|--------|-------------|---------|
| `-h, --help` | Show help message | `--help` |
| `-v, --verbose` | Enable detailed logging | `--verbose` |
| `-s, --silent` | Suppress output except errors | `--silent` |
| `-o, --output` | Custom output directory | `--output /backups` |

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/hrms

# Optional
NODE_ENV=production
```

### Exit Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 0 | Success | Backup completed successfully |
| 1 | General Error | Unexpected error occurred |
| 2 | Database Error | Database connection failed |
| 3 | File System Error | File operations failed |
| 4 | Validation Error | Invalid configuration |

### Automated Scheduling

#### Using Cron (Linux/macOS)
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/hrms/backend && npm run backup --silent

# Add weekly backup with cleanup
0 2 * * 0 cd /path/to/hrms/backend && npm run backup && find backups/ -name "*.zip" -mtime +30 -delete
```

#### Using Task Scheduler (Windows)
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (daily, weekly, etc.)
4. Set action: `node scripts/backup-utility.js`
5. Configure working directory to backend folder

## 📚 API Documentation

### Authentication
All endpoints require SUPER_ADMIN authentication:
```
Authorization: Bearer <jwt_token>
```

### Endpoints

#### Create Backup
```http
POST /api/backup/create
```

**Response:**
```json
{
  "success": true,
  "data": {
    "backupId": "uuid-here",
    "fileName": "backup_2024-01-15_abc123.zip",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "totalRecords": 1250,
    "size": 2048576,
    "downloadUrl": "/api/backup/download/backup_2024-01-15_abc123.zip",
    "tables": {
      "admins": 5,
      "staff": 100,
      "categories": 10
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### List Backups
```http
GET /api/backup/list
```

**Response:**
```json
{
  "success": true,
  "data": {
    "backups": [
      {
        "fileName": "backup_2024-01-15_abc123.zip",
        "size": 2048576,
        "formattedSize": "2 MB",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "formattedCreatedAt": "1/15/2024, 10:30:00 AM",
        "downloadUrl": "/api/backup/download/backup_2024-01-15_abc123.zip"
      }
    ],
    "total": 1,
    "currentDatabase": {
      "totalRecords": 1250,
      "tables": {
        "admins": 5,
        "staff": 100
      }
    }
  }
}
```

#### Download Backup
```http
GET /api/backup/download/:fileName
```

**Response:** Binary ZIP file with appropriate headers

#### Restore Backup
```http
POST /api/backup/restore
Content-Type: multipart/form-data

backupFile: <file>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "restoredRecords": 1250,
    "backupId": "original-backup-id",
    "originalTimestamp": "2024-01-15T10:30:00.000Z",
    "restoredAt": "2024-01-15T11:00:00.000Z",
    "restoredBy": "Admin Name"
  },
  "message": "Database restored successfully from backup"
}
```

#### Delete Backup
```http
DELETE /api/backup/:fileName
```

#### System Status
```http
GET /api/backup/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "system": {
      "status": "operational",
      "version": "1.0.0",
      "lastCheck": "2024-01-15T11:00:00.000Z"
    },
    "database": {
      "totalRecords": 1250,
      "tables": {
        "admins": 5,
        "staff": 100
      }
    },
    "backups": {
      "totalFiles": 5,
      "totalSize": 10485760,
      "formattedTotalSize": "10 MB",
      "newestBackup": "2024-01-15T10:30:00.000Z",
      "oldestBackup": "2024-01-10T10:30:00.000Z"
    },
    "recommendations": [
      "Create regular backups",
      "Clean up old backup files"
    ]
  }
}
```

## 🔒 Security

### Access Control
- **Role Requirement**: Only SUPER_ADMIN users can access backup features
- **Authentication**: JWT token validation for all API endpoints
- **Session Management**: Automatic token expiration and refresh

### File Security
- **Type Validation**: Only JSON and ZIP files accepted for restore
- **Size Limits**: 100MB maximum file size for uploads
- **Path Protection**: Prevention of directory traversal attacks
- **Virus Scanning**: Integration points for antivirus scanning

### Data Protection
- **Encryption**: Backup files can be encrypted at rest
- **Masking**: Sensitive database URLs masked in metadata
- **Audit Logging**: All operations logged with user and timestamp
- **Cleanup**: Automatic removal of temporary files

### Network Security
- **HTTPS**: Enforced for all file transfers
- **Rate Limiting**: Protection against abuse
- **CORS**: Proper cross-origin configuration
- **Input Sanitization**: All inputs validated and sanitized

## 🔧 Troubleshooting

### Common Issues

#### Backup Creation Fails
**Symptoms**: Error during backup creation, incomplete files
**Solutions**:
```bash
# Check disk space
df -h

# Verify database connection
npm run migrate

# Check permissions
ls -la backups/

# Run with verbose logging
node scripts/backup-utility.js --verbose
```

#### Restore Operation Fails
**Symptoms**: Restore process stops, data not updated
**Solutions**:
1. **Verify file format**: Ensure backup file is valid JSON or ZIP
2. **Check file size**: Must be under 100MB limit
3. **Database connectivity**: Ensure database is accessible
4. **Schema compatibility**: Backup must match current schema version

#### File Upload Issues
**Symptoms**: Cannot upload backup files
**Solutions**:
1. **File format**: Use only .json or .zip files
2. **File size**: Reduce file size or increase server limits
3. **Network**: Check internet connection stability
4. **Browser**: Try different browser or clear cache

#### Permission Denied
**Symptoms**: 403 Forbidden errors
**Solutions**:
1. **Role check**: Ensure user has SUPER_ADMIN role
2. **Token refresh**: Logout and login again
3. **Session**: Check if session has expired

### Error Codes Reference

| Code | Description | Solution |
|------|-------------|----------|
| `INSUFFICIENT_PERMISSIONS` | User lacks SUPER_ADMIN role | Login as SUPER_ADMIN |
| `BACKUP_CREATION_FAILED` | Database or file system error | Check logs and disk space |
| `INVALID_BACKUP_FILE` | Corrupted or wrong format | Use valid backup file |
| `RESTORE_FAILED` | Database transaction failed | Check database connectivity |
| `FILE_TOO_LARGE` | Upload exceeds size limit | Reduce file size |
| `INVALID_FILE_TYPE` | Wrong file format | Use .json or .zip files |

### Logging and Diagnostics

#### Backend Logs
```bash
# View application logs
tail -f logs/application.log

# View backup-specific logs
grep "backup" logs/application.log

# Check error logs
tail -f logs/error.log
```

#### Database Diagnostics
```sql
-- Check database connectivity
SELECT 1;

-- Verify table counts
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables;

-- Check disk usage
SELECT pg_size_pretty(pg_database_size('hrms_db'));
```

## 📋 Best Practices

### Backup Strategy
1. **Regular Schedule**: Create daily automated backups
2. **Multiple Locations**: Store backups in different locations
3. **Version Control**: Keep multiple backup versions (30-day retention)
4. **Testing**: Regularly test restore procedures in development
5. **Documentation**: Document backup and restore procedures

### File Management
1. **Naming Convention**: Use timestamp-based naming for clarity
2. **Storage Cleanup**: Implement automatic cleanup of old backups
3. **Size Monitoring**: Monitor backup file sizes and growth trends
4. **Access Control**: Restrict backup file access to authorized personnel

### Restore Planning
1. **Maintenance Windows**: Schedule restores during low usage periods
2. **User Notification**: Inform users in advance of maintenance
3. **Rollback Plan**: Always have a current backup before restoring
4. **Verification**: Verify data integrity after restore operations

### Security Best Practices
1. **Access Auditing**: Regularly review backup access logs
2. **File Encryption**: Consider encrypting backup files at rest
3. **Network Security**: Use VPN for remote backup operations
4. **Incident Response**: Have procedures for backup-related security incidents

### Performance Optimization
1. **Off-Peak Scheduling**: Run backups during low system usage
2. **Resource Monitoring**: Monitor CPU and memory during operations
3. **Network Bandwidth**: Consider bandwidth usage for large backups
4. **Storage Performance**: Use fast storage for backup operations

## 🔧 Technical Details

### System Requirements
- **Node.js**: Version 16 or higher
- **PostgreSQL**: Version 12 or higher
- **Disk Space**: Minimum 2x database size for backup operations
- **Memory**: 4GB RAM recommended for large datasets
- **Network**: Stable connection for file transfers

### File Formats

#### Backup Structure
```
backup_2024-01-15_abc123.zip
├── backup_2024-01-15_abc123.json    # Main backup data
├── metadata.json                     # Backup metadata
└── README.txt                        # Human-readable information
```

#### JSON Schema
```json
{
  "metadata": {
    "version": "1.0.0",
    "timestamp": "ISO 8601 string",
    "databaseUrl": "masked connection string",
    "totalRecords": "number",
    "backupId": "UUID",
    "createdBy": "string",
    "tables": {
      "tableName": "record count"
    }
  },
  "data": {
    "admins": [],
    "staff": [],
    "categories": [],
    // ... all table data
  }
}
```

### Database Tables Included
1. **admins** - Administrator accounts and permissions
2. **staff** - Employee records with relationships
3. **categories** - Position, department, and job type categories
4. **salaryStructures** - Salary configurations
5. **loans** - Loan records and repayments
6. **loanRepayments** - Individual loan payments
7. **issues** - Issue tracking tickets
8. **issueComments** - Issue discussion threads
9. **documents** - File metadata and references
10. **auditTrails** - System activity logs
11. **payrollSchedules** - Payroll generation records
12. **systemSettings** - Application configuration
13. **shareableLinks** - Public organogram links

### Performance Characteristics
- **Backup Speed**: ~1000 records/second
- **Compression Ratio**: ~70% size reduction with ZIP
- **Memory Usage**: Streaming operations minimize RAM usage
- **Concurrent Operations**: Single backup/restore at a time
- **File Size Limits**: 100MB for uploads, unlimited for creation

### Integration Points
- **Monitoring**: Prometheus metrics available
- **Logging**: Structured JSON logs with correlation IDs
- **Alerting**: Webhook support for backup events
- **Scheduling**: Cron job integration
- **CI/CD**: Automated backup testing in pipelines

## 📞 Support

### Getting Help
1. **Documentation**: Check this guide and API documentation
2. **Logs**: Review application and error logs
3. **Status**: Check system status dashboard
4. **Community**: Join the HRMS user community
5. **Professional**: Contact support team for enterprise issues

### Reporting Issues
When reporting backup-related issues, include:
- Error messages and codes
- Backup file details (size, format, timestamp)
- System information (OS, Node.js version, database version)
- Steps to reproduce the issue
- Relevant log entries

### Emergency Procedures
For critical backup failures:
1. **Immediate**: Stop all backup operations
2. **Assess**: Determine scope of data loss risk
3. **Communicate**: Notify stakeholders immediately
4. **Recover**: Use most recent known good backup
5. **Investigate**: Analyze root cause after recovery

---

**⚠️ Remember**: Always test backup and restore procedures in a development environment before using in production!

**📧 Support**: For technical support, contact your system administrator or the HRMS support team.

**🔄 Version**: This guide is for OWU Palace HRMS Backup System v1.0.0