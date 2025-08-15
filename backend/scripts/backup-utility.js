#!/usr/bin/env node

/**
 * OWU Palace HRMS Backup Utility
 * 
 * Standalone CLI tool for creating database backups
 * Can be used for automated backup scheduling
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

// Initialize Prisma client
const prisma = new PrismaClient();

// CLI argument parsing
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  silent: args.includes('--silent') || args.includes('-s'),
  output: getArgValue('--output') || getArgValue('-o'),
  help: args.includes('--help') || args.includes('-h')
};

function getArgValue(flag) {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
}

function showHelp() {
  console.log(`
🔄 OWU Palace HRMS Backup Utility

USAGE:
  node scripts/backup-utility.js [OPTIONS]

OPTIONS:
  -h, --help      Show this help message
  -v, --verbose   Enable verbose logging
  -s, --silent    Suppress all output except errors
  -o, --output    Specify output directory (default: ./backups)

EXAMPLES:
  node scripts/backup-utility.js
  node scripts/backup-utility.js --verbose
  node scripts/backup-utility.js --output /path/to/backups
  npm run backup

ENVIRONMENT VARIABLES:
  DATABASE_URL    PostgreSQL connection string (required)

EXIT CODES:
  0    Success
  1    General error
  2    Database connection error
  3    File system error
  4    Validation error
`);
}

function log(message, level = 'info') {
  if (options.silent && level !== 'error') return;
  
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📊',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍'
  }[level] || 'ℹ️';
  
  if (level === 'error') {
    console.error(`${prefix} [${timestamp}] ${message}`);
  } else if (options.verbose || level === 'success' || level === 'warning') {
    console.log(`${prefix} [${timestamp}] ${message}`);
  }
}

async function validateEnvironment() {
  log('Validating environment...', 'debug');
  
  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    log('DATABASE_URL environment variable is required', 'error');
    return false;
  }
  
  // Test database connection
  try {
    await prisma.$connect();
    log('Database connection successful', 'debug');
    return true;
  } catch (error) {
    log(`Database connection failed: ${error.message}`, 'error');
    return false;
  }
}

async function ensureOutputDirectory(outputDir) {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      log(`Created output directory: ${outputDir}`, 'debug');
    }
    return true;
  } catch (error) {
    log(`Failed to create output directory: ${error.message}`, 'error');
    return false;
  }
}

async function exportAllData() {
  log('Starting database export...', 'info');
  
  try {
    // Fetch all data with relationships
    const [
      admins,
      staff,
      categories,
      salaryStructures,
      loans,
      loanRepayments,
      issues,
      issueComments,
      documents,
      auditTrails,
      payrollSchedules,
      systemSettings,
      shareableLinks
    ] = await Promise.all([
      prisma.admin.findMany({
        include: {
          createdByAdmin: {
            select: { id: true, fullName: true, email: true }
          }
        }
      }),
      prisma.staff.findMany({
        include: {
          reportingManager: {
            select: { id: true, fullName: true, employeeId: true, jobTitle: true }
          },
          subordinates: {
            select: { id: true, fullName: true, employeeId: true, jobTitle: true }
          },
          position: {
            select: { id: true, name: true, type: true }
          },
          departmentCategory: {
            select: { id: true, name: true, type: true }
          },
          jobType: {
            select: { id: true, name: true, type: true }
          }
        }
      }),
      prisma.category.findMany(),
      prisma.salaryStructure.findMany({
        include: {
          staff: {
            select: { id: true, fullName: true, employeeId: true }
          }
        }
      }),
      prisma.loan.findMany({
        include: {
          staff: {
            select: { id: true, fullName: true, employeeId: true }
          },
          updatedByAdmin: {
            select: { id: true, fullName: true, email: true }
          }
        }
      }),
      prisma.loanRepayment.findMany({
        include: {
          loan: {
            select: { id: true, staffId: true, amount: true }
          }
        }
      }),
      prisma.issue.findMany({
        include: {
          staff: {
            select: { id: true, fullName: true, employeeId: true }
          },
          admin: {
            select: { id: true, fullName: true, email: true }
          },
          issueCategory: {
            select: { id: true, name: true, type: true }
          }
        }
      }),
      prisma.issueComment.findMany({
        include: {
          issue: {
            select: { id: true, ticketNumber: true, title: true }
          }
        }
      }),
      prisma.document.findMany({
        include: {
          staff: {
            select: { id: true, fullName: true, employeeId: true }
          }
        }
      }),
      prisma.auditTrail.findMany({
        include: {
          admin: {
            select: { id: true, fullName: true, email: true }
          }
        }
      }),
      prisma.payrollSchedule.findMany(),
      prisma.systemSettings.findMany(),
      prisma.shareableLink.findMany()
    ]);

    // Calculate record counts
    const tableCounts = {
      admins: admins.length,
      staff: staff.length,
      categories: categories.length,
      salaryStructures: salaryStructures.length,
      loans: loans.length,
      loanRepayments: loanRepayments.length,
      issues: issues.length,
      issueComments: issueComments.length,
      documents: documents.length,
      auditTrails: auditTrails.length,
      payrollSchedules: payrollSchedules.length,
      systemSettings: systemSettings.length,
      shareableLinks: shareableLinks.length
    };

    const totalRecords = Object.values(tableCounts).reduce((sum, count) => sum + count, 0);

    if (options.verbose) {
      log('Export summary:', 'info');
      Object.entries(tableCounts).forEach(([table, count]) => {
        log(`  - ${table}: ${count} records`, 'debug');
      });
    }
    
    log(`Exported ${totalRecords} total records`, 'success');

    // Create backup metadata
    const backupId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const metadata = {
      version: '1.0.0',
      timestamp,
      databaseUrl: maskDatabaseUrl(process.env.DATABASE_URL),
      totalRecords,
      backupId,
      createdBy: 'CLI Utility',
      tables: tableCounts,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform
    };

    return {
      metadata,
      data: {
        admins,
        staff,
        categories,
        salaryStructures,
        loans,
        loanRepayments,
        issues,
        issueComments,
        documents,
        auditTrails,
        payrollSchedules,
        systemSettings,
        shareableLinks
      }
    };

  } catch (error) {
    log(`Database export failed: ${error.message}`, 'error');
    throw error;
  }
}

function maskDatabaseUrl(url) {
  try {
    return url.replace(/\/\/.*@/, '//***:***@');
  } catch {
    return 'hidden';
  }
}

async function createBackupFile(backupData, outputDir) {
  const timestamp = backupData.metadata.timestamp.replace(/[:.]/g, '-');
  const backupId = backupData.metadata.backupId.substring(0, 8);
  
  const jsonFileName = `backup_${timestamp}_${backupId}.json`;
  const zipFileName = `backup_${timestamp}_${backupId}.zip`;
  
  const jsonFilePath = path.join(outputDir, jsonFileName);
  const zipFilePath = path.join(outputDir, zipFileName);

  log(`Creating backup files...`, 'info');
  log(`  - JSON: ${jsonFileName}`, 'debug');
  log(`  - ZIP: ${zipFileName}`, 'debug');

  try {
    // Write JSON file
    fs.writeFileSync(jsonFilePath, JSON.stringify(backupData, null, 2));
    
    // Create ZIP archive
    const zipSize = await createZipArchive(jsonFilePath, zipFilePath, {
      jsonFileName,
      metadata: backupData.metadata
    });

    // Clean up temporary JSON file
    fs.unlinkSync(jsonFilePath);

    const fileSizeFormatted = formatFileSize(zipSize);
    log(`Backup created successfully: ${zipFileName} (${fileSizeFormatted})`, 'success');

    return {
      fileName: zipFileName,
      filePath: zipFilePath,
      size: zipSize,
      formattedSize: fileSizeFormatted
    };

  } catch (error) {
    // Clean up on error
    if (fs.existsSync(jsonFilePath)) {
      fs.unlinkSync(jsonFilePath);
    }
    throw error;
  }
}

function createZipArchive(jsonFilePath, zipFilePath, options) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      const size = archive.pointer();
      resolve(size);
    });

    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);

    // Add the JSON backup file
    archive.file(jsonFilePath, { name: options.jsonFileName });

    // Add metadata file
    const metadataContent = JSON.stringify(options.metadata, null, 2);
    archive.append(metadataContent, { name: 'metadata.json' });

    // Add README file
    const readmeContent = generateReadmeContent(options.metadata);
    archive.append(readmeContent, { name: 'README.txt' });

    archive.finalize();
  });
}

function generateReadmeContent(metadata) {
  return `# OWU Palace HRMS Backup

## Backup Information
- Backup ID: ${metadata.backupId}
- Created: ${new Date(metadata.timestamp).toLocaleString()}
- Created By: ${metadata.createdBy}
- Version: ${metadata.version}
- Total Records: ${metadata.totalRecords}
- Environment: ${metadata.environment}
- Node Version: ${metadata.nodeVersion}
- Platform: ${metadata.platform}

## Table Counts
${Object.entries(metadata.tables || {})
  .map(([table, count]) => `- ${table}: ${count} records`)
  .join('\n')}

## Files in this Archive
- ${metadata.timestamp.replace(/[:.]/g, '-')}_*.json: Complete database backup in JSON format
- metadata.json: Backup metadata and statistics
- README.txt: This information file

## Restore Instructions
1. Upload this backup file through the HRMS backup management interface
2. Confirm the restore operation (WARNING: This will replace all existing data)
3. Wait for the restore process to complete
4. The application will automatically refresh to reflect the restored data

## CLI Usage
This backup was created using the CLI utility:
\`\`\`bash
node scripts/backup-utility.js
\`\`\`

## Important Notes
- This backup contains ALL system data including sensitive information
- Store this file securely and limit access to authorized personnel only
- Always create a current backup before restoring from an older backup
- Restore operations cannot be undone - ensure you have a recent backup before proceeding

## Support
For technical support or questions about this backup, contact your system administrator.

Generated by OWU Palace HRMS Backup System CLI v1.0.0
`;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function createBackup() {
  const startTime = Date.now();
  
  try {
    log('🚀 Starting OWU Palace HRMS backup process...', 'info');
    
    // Show help if requested
    if (options.help) {
      showHelp();
      return { success: true, exitCode: 0 };
    }

    // Validate environment
    if (!(await validateEnvironment())) {
      return { success: false, exitCode: 2 };
    }

    // Determine output directory
    const outputDir = options.output || path.join(process.cwd(), 'backups');
    
    // Ensure output directory exists
    if (!(await ensureOutputDirectory(outputDir))) {
      return { success: false, exitCode: 3 };
    }

    // Export all data
    const backupData = await exportAllData();

    // Create backup file
    const backupFile = await createBackupFile(backupData, outputDir);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log('🎉 Backup process completed successfully!', 'success');
    log(`📁 File: ${backupFile.fileName}`, 'info');
    log(`📍 Location: ${backupFile.filePath}`, 'info');
    log(`📊 Size: ${backupFile.formattedSize}`, 'info');
    log(`⏱️  Duration: ${duration}s`, 'info');
    log(`🔢 Records: ${backupData.metadata.totalRecords}`, 'info');

    return {
      success: true,
      exitCode: 0,
      result: {
        fileName: backupFile.fileName,
        filePath: backupFile.filePath,
        size: backupFile.size,
        totalRecords: backupData.metadata.totalRecords,
        backupId: backupData.metadata.backupId,
        duration: parseFloat(duration)
      }
    };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log('💥 Backup process failed!', 'error');
    log(`❌ Error: ${error.message}`, 'error');
    log(`⏱️  Duration: ${duration}s`, 'error');
    
    if (options.verbose && error.stack) {
      log(`Stack trace: ${error.stack}`, 'error');
    }

    return {
      success: false,
      exitCode: 1,
      error: error.message
    };
  } finally {
    // Cleanup
    try {
      await prisma.$disconnect();
      log('Database connection closed', 'debug');
    } catch (error) {
      log(`Failed to close database connection: ${error.message}`, 'warning');
    }
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  log('Received SIGINT, shutting down gracefully...', 'warning');
  try {
    await prisma.$disconnect();
  } catch (error) {
    // Ignore cleanup errors during shutdown
  }
  process.exit(130); // 128 + SIGINT
});

process.on('SIGTERM', async () => {
  log('Received SIGTERM, shutting down gracefully...', 'warning');
  try {
    await prisma.$disconnect();
  } catch (error) {
    // Ignore cleanup errors during shutdown
  }
  process.exit(143); // 128 + SIGTERM
});

// Run backup if called directly
if (require.main === module) {
  createBackup()
    .then((result) => {
      process.exit(result.exitCode);
    })
    .catch((error) => {
      log(`Unexpected error: ${error.message}`, 'error');
      process.exit(1);
    });
}

// Export for testing
module.exports = {
  createBackup,
  validateEnvironment,
  exportAllData,
  formatFileSize,
  maskDatabaseUrl
};