import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { BackupData } from './backupService';

export interface BackupFileInfo {
  fileName: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  downloadUrl: string;
}

export interface BackupFileResult {
  fileName: string;
  filePath: string;
  size: number;
  downloadUrl: string;
}

export class FileManager {
  private backupDir: string;
  private tempDir: string;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureDirectories();
  }

  /**
   * Ensure backup and temp directories exist
   */
  ensureDirectories(): void {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
        console.log(`📁 Created backup directory: ${this.backupDir}`);
      }

      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
        console.log(`📁 Created temp directory: ${this.tempDir}`);
      }

      const uploadsDir = path.join(this.tempDir, 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log(`📁 Created uploads directory: ${uploadsDir}`);
      }
    } catch (error) {
      console.error('Failed to create directories:', error);
      throw new Error('Failed to initialize file system directories');
    }
  }

  /**
   * Create a backup file with ZIP compression
   */
  async createBackupFile(backupData: BackupData): Promise<BackupFileResult> {
    try {
      const timestamp = backupData.metadata.timestamp.replace(/[:.]/g, '-');
      const backupId = backupData.metadata.backupId.substring(0, 8);
      
      // Generate filenames
      const jsonFileName = `backup_${timestamp}_${backupId}.json`;
      const zipFileName = `backup_${timestamp}_${backupId}.zip`;
      
      const jsonFilePath = path.join(this.tempDir, jsonFileName);
      const zipFilePath = path.join(this.backupDir, zipFileName);

      console.log('💾 Creating backup files...');
      console.log(`   - JSON: ${jsonFileName}`);
      console.log(`   - ZIP: ${zipFileName}`);

      // Write JSON file
      fs.writeFileSync(jsonFilePath, JSON.stringify(backupData, null, 2));

      // Create ZIP archive
      const zipSize = await this.createZipArchive(jsonFilePath, zipFilePath, {
        jsonFileName,
        metadata: backupData.metadata
      });

      // Clean up temporary JSON file
      fs.unlinkSync(jsonFilePath);

      const result: BackupFileResult = {
        fileName: zipFileName,
        filePath: zipFilePath,
        size: zipSize,
        downloadUrl: `/api/backup/download/${zipFileName}`
      };

      console.log('✅ Backup file created successfully');
      console.log(`   - Size: ${this.formatFileSize(zipSize)}`);
      console.log(`   - Location: ${zipFilePath}`);

      return result;
    } catch (error) {
      console.error('❌ Failed to create backup file:', error);
      throw new Error(`Failed to create backup file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create ZIP archive with compression
   */
  private async createZipArchive(
    jsonFilePath: string, 
    zipFilePath: string, 
    options: { jsonFileName: string; metadata: any }
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => {
        const size = archive.pointer();
        resolve(size);
      });

      output.on('error', (err) => {
        reject(err);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add the JSON backup file
      archive.file(jsonFilePath, { name: options.jsonFileName });

      // Add metadata file
      const metadataContent = JSON.stringify(options.metadata, null, 2);
      archive.append(metadataContent, { name: 'metadata.json' });

      // Add README file
      const readmeContent = this.generateReadmeContent(options.metadata);
      archive.append(readmeContent, { name: 'README.txt' });

      archive.finalize();
    });
  }

  /**
   * Load backup data from file
   */
  async loadBackupFile(filePath: string): Promise<BackupData> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Backup file not found');
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const backupData = JSON.parse(fileContent);

      return backupData;
    } catch (error) {
      console.error('Failed to load backup file:', error);
      throw new Error(`Failed to load backup file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all backup files
   */
  listBackupFiles(): BackupFileInfo[] {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }

      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.zip'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          
          return {
            fileName: file,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            downloadUrl: `/api/backup/download/${file}`
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return files;
    } catch (error) {
      console.error('Failed to list backup files:', error);
      throw new Error('Failed to list backup files');
    }
  }

  /**
   * Delete a backup file
   */
  deleteBackupFile(fileName: string): void {
    try {
      const filePath = path.join(this.backupDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('Backup file not found');
      }

      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted backup file: ${fileName}`);
    } catch (error) {
      console.error('Failed to delete backup file:', error);
      throw new Error(`Failed to delete backup file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get backup file path
   */
  getBackupFilePath(fileName: string): string {
    return path.join(this.backupDir, fileName);
  }

  /**
   * Check if backup file exists
   */
  backupFileExists(fileName: string): boolean {
    const filePath = path.join(this.backupDir, fileName);
    return fs.existsSync(filePath);
  }

  /**
   * Clean up temporary files
   */
  cleanupTempFiles(): void {
    try {
      const uploadsDir = path.join(this.tempDir, 'uploads');
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          
          // Delete files older than 1 hour
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          if (stats.mtime < oneHourAgo) {
            fs.unlinkSync(filePath);
            console.log(`🧹 Cleaned up temp file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }

  /**
   * Format file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate README content for backup archive
   */
  private generateReadmeContent(metadata: any): string {
    return `# OWU Palace HRMS Backup

## Backup Information
- Backup ID: ${metadata.backupId}
- Created: ${new Date(metadata.timestamp).toLocaleString()}
- Created By: ${metadata.createdBy}
- Version: ${metadata.version}
- Total Records: ${metadata.totalRecords}

## Table Counts
${Object.entries(metadata.tables || {})
  .map(([table, count]) => `- ${table}: ${count} records`)
  .join('\n')}

## Files in this Archive
- backup_*.json: Complete database backup in JSON format
- metadata.json: Backup metadata and statistics
- README.txt: This information file

## Restore Instructions
1. Upload this backup file through the HRMS backup management interface
2. Confirm the restore operation (WARNING: This will replace all existing data)
3. Wait for the restore process to complete
4. The application will automatically refresh to reflect the restored data

## Important Notes
- This backup contains ALL system data including sensitive information
- Store this file securely and limit access to authorized personnel only
- Always create a current backup before restoring from an older backup
- Restore operations cannot be undone - ensure you have a recent backup before proceeding

## Support
For technical support or questions about this backup, contact your system administrator.

Generated by OWU Palace HRMS Backup System
`;
  }

  /**
   * Get disk space information
   */
  getDiskSpaceInfo(): { free: number; total: number; used: number } {
    try {
      const stats = fs.statSync(this.backupDir);
      // This is a simplified version - in production you might want to use a library like 'diskusage'
      return {
        free: 0, // Would need platform-specific implementation
        total: 0,
        used: 0
      };
    } catch (error) {
      console.error('Failed to get disk space info:', error);
      return { free: 0, total: 0, used: 0 };
    }
  }

  /**
   * Validate file upload
   */
  validateUploadedFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    try {
      // Check file size (100MB limit)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        return {
          valid: false,
          error: `File size exceeds limit. Maximum allowed: ${this.formatFileSize(maxSize)}`
        };
      }

      // Check file type
      const allowedTypes = ['application/json', 'application/zip'];
      const allowedExtensions = ['.json', '.zip'];
      
      const hasValidMimeType = allowedTypes.includes(file.mimetype);
      const hasValidExtension = allowedExtensions.some(ext => 
        file.originalname.toLowerCase().endsWith(ext)
      );

      if (!hasValidMimeType && !hasValidExtension) {
        return {
          valid: false,
          error: 'Invalid file type. Only JSON and ZIP files are allowed.'
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'Failed to validate file'
      };
    }
  }
}

export const fileManager = new FileManager();