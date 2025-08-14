import fs from 'fs';
import path from 'path';
import { FileManager, BackupFileInfo } from '../fileManager';
import { BackupData } from '../backupService';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock archiver
jest.mock('archiver', () => {
  const mockArchive = {
    pipe: jest.fn(),
    file: jest.fn(),
    append: jest.fn(),
    finalize: jest.fn(),
    pointer: jest.fn().mockReturnValue(1024),
    on: jest.fn()
  };
  
  return jest.fn(() => mockArchive);
});

describe('FileManager', () => {
  let fileManager: FileManager;
  const mockBackupData: BackupData = {
    metadata: {
      version: '1.0.0',
      timestamp: '2024-01-15T10:30:00.000Z',
      databaseUrl: 'masked-url',
      totalRecords: 100,
      backupId: 'test-backup-id-123',
      createdBy: 'test-user',
      tables: {
        admins: 5,
        staff: 50,
        categories: 10
      }
    },
    data: {
      admins: [],
      staff: [],
      categories: [],
      salaryStructures: [],
      loans: [],
      loanRepayments: [],
      issues: [],
      issueComments: [],
      documents: [],
      auditTrails: [],
      payrollSchedules: [],
      systemSettings: [],
      shareableLinks: []
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fs.existsSync to return true for directories
    mockFs.existsSync.mockReturnValue(true);
    mockFs.mkdirSync.mockReturnValue(undefined);
    
    fileManager = new FileManager();
  });

  describe('ensureDirectories', () => {
    it('should create directories if they do not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      fileManager.ensureDirectories();
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('backups'),
        { recursive: true }
      );
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('temp'),
        { recursive: true }
      );
    });

    it('should not create directories if they already exist', () => {
      mockFs.existsSync.mockReturnValue(true);
      
      fileManager.ensureDirectories();
      
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should handle directory creation errors', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => fileManager.ensureDirectories()).toThrow('Failed to initialize file system directories');
    });
  });

  describe('createBackupFile', () => {
    beforeEach(() => {
      mockFs.writeFileSync.mockReturnValue(undefined);
      mockFs.unlinkSync.mockReturnValue(undefined);
      
      // Mock createWriteStream
      const mockWriteStream = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(callback, 0);
          }
        })
      };
      mockFs.createWriteStream.mockReturnValue(mockWriteStream as any);
    });

    it('should create backup file successfully', async () => {
      const result = await fileManager.createBackupFile(mockBackupData);

      expect(result).toHaveProperty('fileName');
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('downloadUrl');
      expect(result.fileName).toMatch(/^backup_.*\.zip$/);
      expect(result.downloadUrl).toMatch(/^\/api\/backup\/download\//);
    });

    it('should handle file creation errors', async () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });

      await expect(fileManager.createBackupFile(mockBackupData)).rejects.toThrow('Failed to create backup file');
    });
  });

  describe('loadBackupFile', () => {
    it('should load backup file successfully', async () => {
      const mockFileContent = JSON.stringify(mockBackupData);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockFileContent);

      const result = await fileManager.loadBackupFile('/path/to/backup.json');

      expect(result).toEqual(mockBackupData);
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/backup.json', 'utf8');
    });

    it('should throw error if file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(fileManager.loadBackupFile('/path/to/nonexistent.json')).rejects.toThrow('Backup file not found');
    });

    it('should handle JSON parse errors', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      await expect(fileManager.loadBackupFile('/path/to/backup.json')).rejects.toThrow('Failed to load backup file');
    });
  });

  describe('listBackupFiles', () => {
    it('should list backup files successfully', () => {
      const mockFiles = ['backup1.zip', 'backup2.zip', 'other.txt'];
      const mockStats = {
        size: 1024,
        birthtime: new Date('2024-01-15T10:00:00Z'),
        mtime: new Date('2024-01-15T10:30:00Z')
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(mockFiles as any);
      mockFs.statSync.mockReturnValue(mockStats as any);

      const result = fileManager.listBackupFiles();

      expect(result).toHaveLength(2); // Only .zip files
      expect(result[0]).toHaveProperty('fileName');
      expect(result[0]).toHaveProperty('size');
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[0]).toHaveProperty('downloadUrl');
    });

    it('should return empty array if backup directory does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = fileManager.listBackupFiles();

      expect(result).toEqual([]);
    });

    it('should handle directory read errors', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => fileManager.listBackupFiles()).toThrow('Failed to list backup files');
    });
  });

  describe('deleteBackupFile', () => {
    it('should delete backup file successfully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockReturnValue(undefined);

      fileManager.deleteBackupFile('backup.zip');

      expect(mockFs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('backup.zip')
      );
    });

    it('should throw error if file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => fileManager.deleteBackupFile('nonexistent.zip')).toThrow('Backup file not found');
    });

    it('should handle file deletion errors', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => fileManager.deleteBackupFile('backup.zip')).toThrow('Failed to delete backup file');
    });
  });

  describe('backupFileExists', () => {
    it('should return true if file exists', () => {
      mockFs.existsSync.mockReturnValue(true);

      const result = fileManager.backupFileExists('backup.zip');

      expect(result).toBe(true);
    });

    it('should return false if file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = fileManager.backupFileExists('backup.zip');

      expect(result).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(fileManager.formatFileSize(0)).toBe('0 Bytes');
      expect(fileManager.formatFileSize(1024)).toBe('1 KB');
      expect(fileManager.formatFileSize(1048576)).toBe('1 MB');
      expect(fileManager.formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('validateUploadedFile', () => {
    it('should validate correct file', () => {
      const mockFile = {
        size: 1024 * 1024, // 1MB
        mimetype: 'application/json',
        originalname: 'backup.json'
      } as Express.Multer.File;

      const result = fileManager.validateUploadedFile(mockFile);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject file that is too large', () => {
      const mockFile = {
        size: 200 * 1024 * 1024, // 200MB
        mimetype: 'application/json',
        originalname: 'backup.json'
      } as Express.Multer.File;

      const result = fileManager.validateUploadedFile(mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File size exceeds limit');
    });

    it('should reject invalid file type', () => {
      const mockFile = {
        size: 1024,
        mimetype: 'text/plain',
        originalname: 'backup.txt'
      } as Express.Multer.File;

      const result = fileManager.validateUploadedFile(mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should accept ZIP files', () => {
      const mockFile = {
        size: 1024,
        mimetype: 'application/zip',
        originalname: 'backup.zip'
      } as Express.Multer.File;

      const result = fileManager.validateUploadedFile(mockFile);

      expect(result.valid).toBe(true);
    });
  });

  describe('cleanupTempFiles', () => {
    it('should clean up old temporary files', () => {
      const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const mockFiles = ['temp1.json', 'temp2.json'];
      const mockStats = {
        mtime: oldDate
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(mockFiles as any);
      mockFs.statSync.mockReturnValue(mockStats as any);
      mockFs.unlinkSync.mockReturnValue(undefined);

      fileManager.cleanupTempFiles();

      expect(mockFs.unlinkSync).toHaveBeenCalledTimes(2);
    });

    it('should not clean up recent files', () => {
      const recentDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const mockFiles = ['temp1.json'];
      const mockStats = {
        mtime: recentDate
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(mockFiles as any);
      mockFs.statSync.mockReturnValue(mockStats as any);

      fileManager.cleanupTempFiles();

      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw error
      expect(() => fileManager.cleanupTempFiles()).not.toThrow();
    });
  });
});