import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  createBackup,
  downloadBackup,
  restoreBackup,
  listBackups,
  deleteBackup,
  getBackupStatus
} from '../backupController';
import { backupService } from '../../services/backupService';
import { fileManager } from '../../services/fileManager';

// Mock services
jest.mock('../../services/backupService');
jest.mock('../../services/fileManager');
jest.mock('fs');

const mockBackupService = backupService as jest.Mocked<typeof backupService>;
const mockFileManager = fileManager as jest.Mocked<typeof fileManager>;

describe('BackupController', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSetHeader: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockSetHeader = jest.fn();

    mockRes = {
      json: mockJson,
      status: mockStatus,
      setHeader: mockSetHeader
    };

    mockReq = {
      admin: {
        id: 'admin-1',
        email: 'admin@test.com',
        fullName: 'Test Admin',
        role: 'SUPER_ADMIN',
        permissions: []
      }
    };

    jest.clearAllMocks();
  });

  describe('createBackup', () => {
    it('should create backup successfully for SUPER_ADMIN', async () => {
      const mockBackupData = {
        metadata: {
          version: '1.0.0',
          timestamp: '2024-01-15T10:30:00.000Z',
          databaseUrl: 'masked-url',
          totalRecords: 100,
          backupId: 'test-backup-id',
          createdBy: 'Test Admin',
          tables: { admins: 5, staff: 50 }
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

      const mockBackupFile = {
        fileName: 'backup_test.zip',
        filePath: '/path/to/backup_test.zip',
        size: 1024,
        downloadUrl: '/api/backup/download/backup_test.zip'
      };

      mockBackupService.exportAllData.mockResolvedValue(mockBackupData);
      mockFileManager.createBackupFile.mockResolvedValue(mockBackupFile);
      mockFileManager.cleanupTempFiles.mockReturnValue(undefined);

      await createBackup(mockReq as AuthRequest, mockRes as Response);

      expect(mockBackupService.exportAllData).toHaveBeenCalledWith('Test Admin');
      expect(mockFileManager.createBackupFile).toHaveBeenCalledWith(mockBackupData);
      expect(mockFileManager.cleanupTempFiles).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          backupId: 'test-backup-id',
          fileName: 'backup_test.zip',
          totalRecords: 100
        }),
        timestamp: expect.any(String)
      });
    });

    it('should deny access for non-SUPER_ADMIN users', async () => {
      mockReq.admin!.role = 'ADMIN';

      await createBackup(mockReq as AuthRequest, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super administrators can create backups'
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle backup creation errors', async () => {
      mockBackupService.exportAllData.mockRejectedValue(new Error('Database error'));

      await createBackup(mockReq as AuthRequest, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BACKUP_CREATION_FAILED',
          message: 'Failed to create backup',
          details: 'Database error'
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('downloadBackup', () => {
    beforeEach(() => {
      mockReq.params = { fileName: 'backup_test.zip' };
    });

    it('should download backup file successfully', async () => {
      mockFileManager.backupFileExists.mockReturnValue(true);
      mockFileManager.getBackupFilePath.mockReturnValue('/path/to/backup_test.zip');

      // Mock fs.createReadStream
      const mockStream = {
        on: jest.fn(),
        pipe: jest.fn()
      };
      require('fs').createReadStream = jest.fn().mockReturnValue(mockStream);

      await downloadBackup(mockReq as AuthRequest, mockRes as Response);

      expect(mockFileManager.backupFileExists).toHaveBeenCalledWith('backup_test.zip');
      expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
      expect(mockSetHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="backup_test.zip"');
    });

    it('should return 404 if backup file not found', async () => {
      mockFileManager.backupFileExists.mockReturnValue(false);

      await downloadBackup(mockReq as AuthRequest, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BACKUP_NOT_FOUND',
          message: 'Backup file not found'
        },
        timestamp: expect.any(String)
      });
    });

    it('should reject invalid filenames', async () => {
      mockReq.params = { fileName: '../../../etc/passwd' };

      await downloadBackup(mockReq as AuthRequest, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_FILENAME',
          message: 'Invalid filename provided'
        },
        timestamp: expect.any(String)
      });
    });

    it('should deny access for non-SUPER_ADMIN users', async () => {
      mockReq.admin!.role = 'ADMIN';

      await downloadBackup(mockReq as AuthRequest, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super administrators can download backups'
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('restoreBackup', () => {
    const mockFile = {
      originalname: 'backup.json',
      path: '/temp/backup.json',
      size: 1024,
      mimetype: 'application/json'
    } as Express.Multer.File;

    beforeEach(() => {
      mockReq.file = mockFile;
    });

    it('should restore backup successfully', async () => {
      const mockBackupData = {
        metadata: {
          version: '1.0.0',
          timestamp: '2024-01-15T10:30:00.000Z',
          totalRecords: 100,
          backupId: 'test-backup-id',
          createdBy: 'Original User',
          tables: { admins: 5, staff: 50 }
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

      mockFileManager.validateUploadedFile.mockReturnValue({ valid: true });
      mockFileManager.loadBackupFile.mockResolvedValue(mockBackupData);
      mockBackupService.validateBackupData.mockReturnValue(true);
      mockBackupService.importBackupData.mockResolvedValue(undefined);

      // Mock fs.existsSync and fs.unlinkSync
      require('fs').existsSync = jest.fn().mockReturnValue(true);
      require('fs').unlinkSync = jest.fn();

      await restoreBackup(mockReq as AuthRequest, mockRes as Response);

      expect(mockFileManager.validateUploadedFile).toHaveBeenCalledWith(mockFile);
      expect(mockFileManager.loadBackupFile).toHaveBeenCalledWith(mockFile.path);
      expect(mockBackupService.validateBackupData).toHaveBeenCalledWith(mockBackupData);
      expect(mockBackupService.importBackupData).toHaveBeenCalledWith(mockBackupData);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          restoredRecords: 100,
          backupId: 'test-backup-id',
          restoredBy: 'Test Admin'
        }),
        message: 'Database restored successfully from backup',
        timestamp: expect.any(String)
      });
    });

    it('should return error if no file provided', async () => {
      mockReq.file = undefined;

      await restoreBackup(mockReq as AuthRequest, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NO_FILE_PROVIDED',
          message: 'Please provide a backup file'
        },
        timestamp: expect.any(String)
      });
    });

    it('should reject invalid file', async () => {
      mockFileManager.validateUploadedFile.mockReturnValue({
        valid: false,
        error: 'File too large'
      });

      // Mock fs for cleanup
      require('fs').existsSync = jest.fn().mockReturnValue(true);
      require('fs').unlinkSync = jest.fn();

      await restoreBackup(mockReq as AuthRequest, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: 'File too large'
        },
        timestamp: expect.any(String)
      });
    });

    it('should deny access for non-SUPER_ADMIN users', async () => {
      mockReq.admin!.role = 'ADMIN';

      await restoreBackup(mockReq as AuthRequest, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super administrators can restore backups'
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('listBackups', () => {
    it('should list backups successfully', async () => {
      const mockBackupFiles = [
        {
          fileName: 'backup1.zip',
          size: 1024,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          modifiedAt: new Date('2024-01-15T10:00:00Z'),
          downloadUrl: '/api/backup/download/backup1.zip'
        }
      ];

      const mockDbStats = {
        admins: 5,
        staff: 50,
        categories: 10
      };

      mockFileManager.listBackupFiles.mockReturnValue(mockBackupFiles);
      mockBackupService.getDatabaseStats.mockResolvedValue(mockDbStats);
      mockFileManager.formatFileSize.mockReturnValue('1 KB');

      await listBackups(mockReq as AuthRequest, mockRes as Response);

      expect(mockFileManager.listBackupFiles).toHaveBeenCalled();
      expect(mockBackupService.getDatabaseStats).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          backups: expect.arrayContaining([
            expect.objectContaining({
              fileName: 'backup1.zip',
              formattedSize: '1 KB'
            })
          ]),
          total: 1,
          currentDatabase: expect.objectContaining({
            totalRecords: 65,
            tables: mockDbStats
          })
        }),
        timestamp: expect.any(String)
      });
    });

    it('should deny access for non-SUPER_ADMIN users', async () => {
      mockReq.admin!.role = 'ADMIN';

      await listBackups(mockReq as AuthRequest, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super administrators can list backups'
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('deleteBackup', () => {
    beforeEach(() => {
      mockReq.params = { fileName: 'backup_test.zip' };
    });

    it('should delete backup successfully', async () => {
      mockFileManager.backupFileExists.mockReturnValue(true);
      mockFileManager.deleteBackupFile.mockReturnValue(undefined);

      await deleteBackup(mockReq as AuthRequest, mockRes as Response);

      expect(mockFileManager.backupFileExists).toHaveBeenCalledWith('backup_test.zip');
      expect(mockFileManager.deleteBackupFile).toHaveBeenCalledWith('backup_test.zip');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          deletedFile: 'backup_test.zip',
          deletedBy: 'Test Admin'
        }),
        message: 'Backup file deleted successfully',
        timestamp: expect.any(String)
      });
    });

    it('should return 404 if backup file not found', async () => {
      mockFileManager.backupFileExists.mockReturnValue(false);

      await deleteBackup(mockReq as AuthRequest, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BACKUP_NOT_FOUND',
          message: 'Backup file not found'
        },
        timestamp: expect.any(String)
      });
    });

    it('should deny access for non-SUPER_ADMIN users', async () => {
      mockReq.admin!.role = 'ADMIN';

      await deleteBackup(mockReq as AuthRequest, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super administrators can delete backups'
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('getBackupStatus', () => {
    it('should return backup system status', async () => {
      const mockBackupFiles = [
        {
          fileName: 'backup1.zip',
          size: 1024,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          modifiedAt: new Date('2024-01-15T10:00:00Z'),
          downloadUrl: '/api/backup/download/backup1.zip'
        }
      ];

      const mockDbStats = {
        admins: 5,
        staff: 50,
        categories: 10
      };

      mockFileManager.listBackupFiles.mockReturnValue(mockBackupFiles);
      mockBackupService.getDatabaseStats.mockResolvedValue(mockDbStats);
      mockFileManager.formatFileSize.mockReturnValue('1 KB');

      await getBackupStatus(mockReq as AuthRequest, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          system: expect.objectContaining({
            status: 'operational',
            version: '1.0.0'
          }),
          database: expect.objectContaining({
            totalRecords: 65,
            tables: mockDbStats
          }),
          backups: expect.objectContaining({
            totalFiles: 1,
            totalSize: 1024,
            formattedTotalSize: '1 KB'
          }),
          recommendations: expect.any(Array)
        }),
        timestamp: expect.any(String)
      });
    });

    it('should deny access for non-SUPER_ADMIN users', async () => {
      mockReq.admin!.role = 'ADMIN';

      await getBackupStatus(mockReq as AuthRequest, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only super administrators can view backup status'
        },
        timestamp: expect.any(String)
      });
    });
  });
});