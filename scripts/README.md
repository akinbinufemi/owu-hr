# OWU Palace HRMS - Management Scripts

This directory contains utility scripts for managing the OWU Palace HRMS Docker deployment.

## Scripts Overview

### 🔄 backup.sh
Automated database backup script that:
- Creates compressed PostgreSQL dumps
- Maintains backup retention (7 days)
- Verifies backup integrity
- Logs all operations
- Can be scheduled with cron

**Usage:**
```bash
./scripts/backup.sh
```

### 📊 monitor.sh
System monitoring script that checks:
- Docker container health
- System resource usage (CPU, memory, disk)
- Database connectivity
- API health endpoints
- SSL certificate expiry
- Log file sizes

**Usage:**
```bash
./scripts/monitor.sh
```

### 🔄 restore.sh
Database restore script that:
- Restores from backup files
- Creates safety backups before restore
- Handles compressed and uncompressed backups
- Verifies restore success
- Manages container lifecycle during restore

**Usage:**
```bash
./scripts/restore.sh hrms_backup_20250114_120000.sql.gz
```

## Setup Instructions

### 1. Make Scripts Executable (Linux/macOS)
```bash
chmod +x scripts/*.sh
```

### 2. Windows Users
On Windows, run scripts using Git Bash or WSL:
```bash
bash scripts/backup.sh
bash scripts/monitor.sh
bash scripts/restore.sh backup_file.sql.gz
```

### 3. Schedule Automated Backups
Add to crontab (Linux/macOS):
```bash
crontab -e

# Add these lines:
# Daily backup at 2 AM
0 2 * * * /path/to/your/project/scripts/backup.sh

# Monitor every 5 minutes
*/5 * * * * /path/to/your/project/scripts/monitor.sh
```

### 4. Configure Notifications (Optional)
Edit the scripts to uncomment and configure notification functions:
- Email notifications
- Slack webhooks
- Discord webhooks

## Log Files

All scripts create log files in the `logs/` directory:
- `logs/backup.log` - Backup operations
- `logs/monitor.log` - Monitoring checks
- `logs/restore.log` - Restore operations
- `logs/alerts.log` - System alerts

## Troubleshooting

### Script Permissions
If you get permission denied errors:
```bash
chmod +x scripts/script_name.sh
```

### Docker Access
Ensure your user is in the docker group:
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

### Path Issues
Always run scripts from the project root directory or use absolute paths in cron jobs.

## Security Notes

- Scripts create safety backups before restore operations
- Backup files contain sensitive data - store securely
- Monitor log files for security events
- Regularly rotate log files to prevent disk space issues