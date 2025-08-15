import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import backupRoutes from '../backup';
import { authenticateToken } from '../../middleware/auth';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('fs');
jest.mock('../../services/backupService');
jest.mock('../../services/fileManager');

const mockPrisma = {
  admin: {
    findFirst: jest.fn()
  }
};

(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

// Mock services
const mockBackupService = {
  exportAllData: jest.fn(),
  validateBackupData: jest.fn(),
  importBackupData: jest.fn(),
  getDatabaseStats: jest.fn()
};

const mockFileManager = {
  createBackupFile: jest.fn(),
  cleanupTempFiles: jest.fn(),
  listBackupFiles: jest.fn(),
  backupFileExists: jest.fn(),
  getBackupFilePath: jest.fn(),
  deleteBackupFile: jest.fn(),
  validateUploadedFile: jest.fn(),
  loadBackupFile: jest.fn(),
  formatFileSize: jest.fn()
};

jest.doMock('../../services/backupService', () => ({
  backupService: mockBackupService
}));

jest.doMock('../../services/fileManager', () => ({
  fileManager: mockFileManager
}));

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock authentication middleware
  app.use((req: any, res, next) => {
    req.admin = {
      id: 'test-admin-id',
      email: 'admin@test.com',
      fullName: 'Test Admin',
      role: 'SUPER_ADMIN',
      permissions: []
    };
    next();
  });
  
  app.use('/backup', backupRoutes);
  return app;
};

describe('Backup Routes Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
    
    // Mock fs methods
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.createReadStream as jest.Mock).mockReturnValue({
      pipe: jest.fn(),
      on: jest.fn()
    });
  });

  describe('POST /backup/create', () => {
    it('should create backup successfully', async () => {
      const mockBackupData = {
        metadata: {
          version: '1.0.0',
          timestamp: '2024-01-15T10:30:00.000Z',
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

      const response = await request(app)
        .post('/backup/create')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('backupId');
      expect(response.body.data).toHaveProperty('fileName');
      expect(response.body.data).toHaveProperty('totalRecords');
      expect(mockBackupService.exportAllData).toHaveBeenCalledWith('Test Admin');
      expect(mockFileManager.createBackupFile).toHaveBeenCalledWith(mockBackupData);
      expect(mockFileManager.cleanupTempFiles).toHaveBeenCalled();
    });

    it('should deny access for non-SUPER_ADMIN users', async () => {
      // Create app with regular admin
      const restrictedApp = express();
      restrictedApp.use(express.json());
      restrictedApp.use((req: any, res, next) => {
        req.admin = {
          id: 'test-admin-id',
          email: 'admin@test.com',
          fullName: 'Test Admin',
          role: 'ADMIN', // Not SUPER_ADMIN
          permissions: []
        };
        next();
      });
      restrictedApp.use('/backup', backupRoutes);

      const response = await request(restrictedApp)
        .post('/backup/create')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should handle backup creation errors', async () => {
      mockBackupService.exportAllData.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/backup/create')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BACKUP_CREATION_FAILED');
      expect(response.body.error.details).toBe('Database error');
    });
  });

  describe('GET /backup/list', () => {
    it('should list backup files successfully', async () => {
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

      const response = await request(app)
        .get('/backup/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.backups).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.currentDatabase).toHaveProperty('totalRecords');
      expect(response.body.data.currentDatabase.totalRecords).toBe(65); // 5 + 50 + 10
    });

    it('should handle empty backup list', async () => {
      mockFileManager.listBackupFiles.mockReturnValue([]);
      mockBackupService.getDatabaseStats.mockResolvedValue({});

      const response = await request(app)
        .get('/backup/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.backups).toHaveLength(0);
      expect(response.body.data.total).toBe(0);
    });
  });

  describe('GET /backup/download/:fileName', () => {
    it('should download backup file successfully', async () => {
      const fileName = 'backup_test.zip';
      mockFileManager.backupFileExists.mockReturnValue(true);
      mockFileManager.getBackupFilePath.mockReturnValue('/path/to/backup_test.zip');

      const response = await request(app)
        .get(`/backup/download/${fileName}`)
        .expect(200);

      expect(mockFileManager.backupFileExists).toHaveBeenCalledWith(fileName);
      expect(mockFileManager.getBackupFilePath).toHaveBeenCalledWith(fileName);
    });

    it('should return 404 for non-existent backup file', async () => {
      const fileName = 'nonexistent.zip';
      mockFileManager.backupFileExists.mockReturnValue(false);

      const response = await request(app)
        .get(`/backup/download/${fileName}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BACKUP_NOT_FOUND');
    });

    it('should reject invalid filenames', async () => {
      const fileName = '../../../etc/passwd';

      const response = await request(app)
        .get(`/backup/download/${fileName}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FILENAME');
    });
  });

  describe('POST /backup/restore', () => {
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

      // Mock fs for cleanup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      const response = await request(app)
        .post('/backup/restore')
        .attach('backupFile', Buffer.from('backup content'), 'backup.json')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.restoredRecords).toBe(100);
      expect(response.body.data.backupId).toBe('test-backup-id');
      expect(response.body.data.restoredBy).toBe('Test Admin');
    });

    it('should return error if no file provided', async () => {
      const response = await request(app)
        .post('/backup/restore')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE_PROVIDED');
    });

    it('should reject invalid backup file', async () => {
      mockFileManager.validateUploadedFile.mockReturnValue({
        valid: false,
        error: 'Invalid file type'
      });

      // Mock fs for cleanup
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      const response = await request(app)
        .post('/backup/restore')
        .attach('backupFile', Buffer.from('invalid content'), 'invalid.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FILE');
    });
  });

  describe('DELETE /backup/:fileName', () => {
    it('should delete backup file successfully', async () => {
      const fileName = 'backup_test.zip';
      mockFileManager.backupFileExists.mockReturnValue(true);
      mockFileManager.deleteBackupFile.mockReturnValue(undefined);

      const response = await request(app)
        .delete(`/backup/${fileName}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedFile).toBe(fileName);
      expect(response.body.data.deletedBy).toBe('Test Admin');
      expect(mockFileManager.deleteBackupFile).toHaveBeenCalledWith(fileName);
    });

    it('should return 404 for non-existent backup file', async () => {
      const fileName = 'nonexistent.zip';
      mockFileManager.backupFileExists.mockReturnValue(false);

      const response = await request(app)
        .delete(`/backup/${fileName}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BACKUP_NOT_FOUND');
    });
  });

  describe('GET /backup/status', () => {
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

      const response = await request(app)
        .get('/backup/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.system).toHaveProperty('status');
      expect(response.body.data.database).toHaveProperty('totalRecords');
      expect(response.body.data.backups).toHaveProperty('totalFiles');
      expect(response.body.data.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      const unauthenticatedApp = express();
      unauthenticatedApp.use(express.json());
      unauthenticatedApp.use('/backup', backupRoutes);

      await request(unauthenticatedApp)
        .post('/backup/create')
        .expect(401);

      await request(unauthenticatedApp)
        .get('/backup/list')
        .expect(401);

      await request(unauthenticatedApp)
        .get('/backup/status')
        .expect(401);
    });

    it('should require SUPER_ADMIN role for all operations', async () => {
      const regularUserApp = express();
      regularUserApp.use(express.json());
      regularUserApp.use((req: any, res, next) => {
        req.admin = {
          id: 'test-admin-id',
          email: 'admin@test.com',
          fullName: 'Test Admin',
          role: 'ADMIN', // Not SUPER_ADMIN
          permissions: []
        };
        next();
      });
      regularUserApp.use('/backup', backupRoutes);

      await request(regularUserApp)
        .post('/backup/create')
        .expect(403);

      await request(regularUserApp)
        .get('/backup/list')
        .expect(403);

      await request(regularUserApp)
        .get('/backup/status')
        .expect(403);

      await request(regularUserApp)
        .delete('/backup/test.zip')
        .expect(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockBackupService.exportAllData.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/backup/create')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should handle file system errors', async () => {
      mockFileManager.listBackupFiles.mockImplementation(() => {
        throw new Error('File system error');
      });

      const response = await request(app)
        .get('/backup/list')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LIST_BACKUPS_FAILED');
    });
  });
});