import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { backupService } from '../services/backupService';
import { fileManager } from '../services/fileManager';

export interface BackupResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  timestamp: string;
}

/**
 * Create a complete database backup
 */
export const createBackup = async (req: AuthRequest, res: Response) => {
  try {
    console.log('🚀 Backup creation requested by:', req.admin?.email);

    // Check if user has SUPER_ADMIN permissions
    if (req.admin?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super administrators can create backups'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    // Export all data from database
    const backupData = await backupService.exportAllData(req.admin.fullName);

    // Create compressed backup file
    const backupFile = await fileManager.createBackupFile(backupData);

    // Clean up old temporary files
    fileManager.cleanupTempFiles();

    console.log('✅ Backup created successfully:', backupFile.fileName);

    res.json({
      success: true,
      data: {
        backupId: backupData.metadata.backupId,
        fileName: backupFile.fileName,
        filePath: backupFile.filePath,
        timestamp: backupData.metadata.timestamp,
        totalRecords: backupData.metadata.totalRecords,
        size: backupFile.size,
        downloadUrl: backupFile.downloadUrl,
        tables: backupData.metadata.tables
      },
      timestamp: new Date().toISOString()
    } as BackupResponse);

  } catch (error) {
    console.error('❌ Backup creation failed:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'BACKUP_CREATION_FAILED',
        message: 'Failed to create backup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: new Date().toISOString()
    } as BackupResponse);
  }
};

/**
 * Download a backup file
 */
export const downloadBackup = async (req: AuthRequest, res: Response) => {
  try {
    // Check permissions
    if (req.admin?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super administrators can download backups'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    const { fileName } = req.params;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FILENAME',
          message: 'Backup filename is required'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    // Validate filename to prevent path traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILENAME',
          message: 'Invalid filename provided'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    if (!fileManager.backupFileExists(fileName)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BACKUP_NOT_FOUND',
          message: 'Backup file not found'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    const filePath = fileManager.getBackupFilePath(fileName);

    console.log('📥 Backup download requested:', fileName, 'by:', req.admin?.email);

    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Stream the file
    const fs = require('fs');
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error: Error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: 'FILE_STREAM_ERROR',
            message: 'Failed to stream backup file'
          },
          timestamp: new Date().toISOString()
        } as BackupResponse);
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Backup download failed:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          code: 'DOWNLOAD_FAILED',
          message: 'Failed to download backup',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }
  }
};

/**
 * Restore database from backup file
 */
export const restoreBackup = async (req: AuthRequest, res: Response) => {
  try {
    console.log('🔄 Backup restore requested by:', req.admin?.email);

    // Check if user has SUPER_ADMIN permissions
    if (req.admin?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super administrators can restore backups'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_PROVIDED',
          message: 'Please provide a backup file'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    // Validate uploaded file
    const validation = fileManager.validateUploadedFile(file);
    if (!validation.valid) {
      // Clean up uploaded file
      const fs = require('fs');
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: validation.error || 'Invalid backup file'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    console.log('📂 Processing backup file:', file.originalname, `(${fileManager.formatFileSize(file.size)})`);

    // Load and parse backup data
    let backupData;
    try {
      backupData = await fileManager.loadBackupFile(file.path);
    } catch (parseError) {
      // Clean up uploaded file
      const fs = require('fs');
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BACKUP_FILE',
          message: 'Invalid backup file format or corrupted data'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    // Validate backup structure
    if (!backupService.validateBackupData(backupData)) {
      // Clean up uploaded file
      const fs = require('fs');
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BACKUP_STRUCTURE',
          message: 'Backup file has invalid structure or missing required data'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    console.log('✅ Backup file validated successfully');
    console.log(`📊 Backup contains ${backupData.metadata.totalRecords} records from ${backupData.metadata.timestamp}`);

    // Import backup data with transaction safety
    await backupService.importBackupData(backupData);

    // Clean up uploaded file
    const fs = require('fs');
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    console.log('✅ Database restore completed successfully');

    res.json({
      success: true,
      data: {
        restoredRecords: backupData.metadata.totalRecords,
        backupId: backupData.metadata.backupId,
        originalTimestamp: backupData.metadata.timestamp,
        originalCreatedBy: backupData.metadata.createdBy,
        restoredAt: new Date().toISOString(),
        restoredBy: req.admin.fullName,
        tables: backupData.metadata.tables
      },
      message: 'Database restored successfully from backup',
      timestamp: new Date().toISOString()
    } as BackupResponse);

  } catch (error) {
    console.error('❌ Backup restore failed:', error);

    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        const fs = require('fs');
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'RESTORE_FAILED',
        message: 'Failed to restore backup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: new Date().toISOString()
    } as BackupResponse);
  }
};

/**
 * List all available backup files
 */
export const listBackups = async (req: AuthRequest, res: Response) => {
  try {
    // Check permissions
    if (req.admin?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super administrators can list backups'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    const backupFiles = fileManager.listBackupFiles();

    // Get current database statistics
    const dbStats = await backupService.getDatabaseStats();
    const totalCurrentRecords = Object.values(dbStats).reduce((sum, count) => sum + count, 0);

    res.json({
      success: true,
      data: {
        backups: backupFiles.map(file => ({
          ...file,
          formattedSize: fileManager.formatFileSize(file.size),
          formattedCreatedAt: file.createdAt.toLocaleString(),
          formattedModifiedAt: file.modifiedAt.toLocaleString()
        })),
        total: backupFiles.length,
        currentDatabase: {
          totalRecords: totalCurrentRecords,
          tables: dbStats
        }
      },
      timestamp: new Date().toISOString()
    } as BackupResponse);

  } catch (error) {
    console.error('❌ Failed to list backups:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'LIST_BACKUPS_FAILED',
        message: 'Failed to list backup files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: new Date().toISOString()
    } as BackupResponse);
  }
};

/**
 * Delete a backup file
 */
export const deleteBackup = async (req: AuthRequest, res: Response) => {
  try {
    // Check permissions
    if (req.admin?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super administrators can delete backups'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    const { fileName } = req.params;

    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FILENAME',
          message: 'Backup filename is required'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    // Validate filename to prevent path traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILENAME',
          message: 'Invalid filename provided'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    if (!fileManager.backupFileExists(fileName)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BACKUP_NOT_FOUND',
          message: 'Backup file not found'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    fileManager.deleteBackupFile(fileName);

    console.log('🗑️ Backup deleted:', fileName, 'by:', req.admin?.email);

    res.json({
      success: true,
      data: {
        deletedFile: fileName,
        deletedBy: req.admin.fullName,
        deletedAt: new Date().toISOString()
      },
      message: 'Backup file deleted successfully',
      timestamp: new Date().toISOString()
    } as BackupResponse);

  } catch (error) {
    console.error('❌ Failed to delete backup:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_BACKUP_FAILED',
        message: 'Failed to delete backup file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: new Date().toISOString()
    } as BackupResponse);
  }
};

/**
 * Get backup system status and statistics
 */
export const getBackupStatus = async (req: AuthRequest, res: Response) => {
  try {
    // Check permissions
    if (req.admin?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super administrators can view backup status'
        },
        timestamp: new Date().toISOString()
      } as BackupResponse);
    }

    const backupFiles = fileManager.listBackupFiles();
    const dbStats = await backupService.getDatabaseStats();
    const totalCurrentRecords = Object.values(dbStats).reduce((sum, count) => sum + count, 0);

    // Calculate total backup storage used
    const totalBackupSize = backupFiles.reduce((sum, file) => sum + file.size, 0);

    res.json({
      success: true,
      data: {
        system: {
          status: 'operational',
          version: '1.0.0',
          lastCheck: new Date().toISOString()
        },
        database: {
          totalRecords: totalCurrentRecords,
          tables: dbStats
        },
        backups: {
          totalFiles: backupFiles.length,
          totalSize: totalBackupSize,
          formattedTotalSize: fileManager.formatFileSize(totalBackupSize),
          oldestBackup: backupFiles.length > 0 ? backupFiles[backupFiles.length - 1].createdAt : null,
          newestBackup: backupFiles.length > 0 ? backupFiles[0].createdAt : null
        },
        recommendations: generateRecommendations(backupFiles, totalCurrentRecords)
      },
      timestamp: new Date().toISOString()
    } as BackupResponse);

  } catch (error) {
    console.error('❌ Failed to get backup status:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_CHECK_FAILED',
        message: 'Failed to get backup system status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: new Date().toISOString()
    } as BackupResponse);
  }
};

/**
 * Generate backup recommendations based on current state
 */
function generateRecommendations(backupFiles: any[], totalRecords: number): string[] {
  const recommendations: string[] = [];

  if (backupFiles.length === 0) {
    recommendations.push('Create your first backup to protect your data');
  } else {
    const latestBackup = backupFiles[0];
    const daysSinceLastBackup = Math.floor(
      (Date.now() - latestBackup.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastBackup > 7) {
      recommendations.push('Consider creating a new backup - last backup is over a week old');
    } else if (daysSinceLastBackup > 1) {
      recommendations.push('Last backup is recent, but consider regular backup schedule');
    }

    if (backupFiles.length > 10) {
      recommendations.push('Consider cleaning up old backup files to save storage space');
    }

    if (totalRecords > 10000) {
      recommendations.push('Large dataset detected - ensure adequate storage for backups');
    }
  }

  return recommendations;
}