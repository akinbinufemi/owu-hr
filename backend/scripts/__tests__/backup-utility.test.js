const fs = require('fs');
const path = require('path');
const { 
  createBackup, 
  validateEnvironment, 
  exportAllData, 
  formatFileSize, 
  maskDatabaseUrl 
} = require('../backup-utility');

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('fs');
jest.mock('archiver');

const mockPrisma = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  admin: { findMany: jest.fn() },
  staff: { findMany: jest.fn() },
  category: { findMany: jest.fn() },
  salaryStructure: { findMany: jest.fn() },
  loan: { findMany: jest.fn() },
  loanRepayment: { findMany: jest.fn() },
  issue: { findMany: jest.fn() },
  issueComment: { findMany: jest.fn() },
  document: { findMany: jest.fn() },
  auditTrail: { findMany: jest.fn() },
  payrollSchedule: { findMany: jest.fn() },
  systemSettings: { findMany: jest.fn() },
  shareableLink: { findMany: jest.fn() }
};

// Mock PrismaClient constructor
require('@prisma/client').PrismaClient = jest.fn(() => mockPrisma);

const mockFs = fs;
const mockArchiver = require('archiver');

describe('CLI Backup Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
    
    // Mock console methods to avoid test output noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateEnvironment', () => {
    it('should validate environment successfully', async () => {
      mockPrisma.$connect.mockResolvedValue(undefined);

      const result = await validateEnvironment();

      expect(result).toBe(true);
      expect(mockPrisma.$connect).toHaveBeenCalled();
    });

    it('should fail if DATABASE_URL is missing', async () => {
      delete process.env.DATABASE_URL;

      const result = await validateEnvironment();

      expect(result).toBe(false);
      expect(mockPrisma.$connect).not.toHaveBeenCalled();
    });

    it('should fail if database connection fails', async () => {
      mockPrisma.$connect.mockRejectedValue(new Error('Connection failed'));

      const result = await validateEnvironment();

      expect(result).toBe(false);
      expect(mockPrisma.$connect).toHaveBeenCalled();
    });
  });

  describe('exportAllData', () => {
    it('should export all data successfully', async () => {
      // Mock all database queries
      const mockData = {
        admins: [{ id: '1', email: 'admin@test.com' }],
        staff: [{ id: '1', fullName: 'Test Staff' }],
        categories: [{ id: '1', name: 'Test Category' }],
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
      };

      mockPrisma.admin.findMany.mockResolvedValue(mockData.admins);
      mockPrisma.staff.findMany.mockResolvedValue(mockData.staff);
      mockPrisma.category.findMany.mockResolvedValue(mockData.categories);
      mockPrisma.salaryStructure.findMany.mockResolvedValue(mockData.salaryStructures);
      mockPrisma.loan.findMany.mockResolvedValue(mockData.loans);
      mockPrisma.loanRepayment.findMany.mockResolvedValue(mockData.loanRepayments);
      mockPrisma.issue.findMany.mockResolvedValue(mockData.issues);
      mockPrisma.issueComment.findMany.mockResolvedValue(mockData.issueComments);
      mockPrisma.document.findMany.mockResolvedValue(mockData.documents);
      mockPrisma.auditTrail.findMany.mockResolvedValue(mockData.auditTrails);
      mockPrisma.payrollSchedule.findMany.mockResolvedValue(mockData.payrollSchedules);
      mockPrisma.systemSettings.findMany.mockResolvedValue(mockData.systemSettings);
      mockPrisma.shareableLink.findMany.mockResolvedValue(mockData.shareableLinks);

      const result = await exportAllData();

      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('data');
      expect(result.metadata.totalRecords).toBe(3); // admins + staff + categories
      expect(result.data.admins).toEqual(mockData.admins);
      expect(result.data.staff).toEqual(mockData.staff);
      expect(result.data.categories).toEqual(mockData.categories);
    });

    it('should handle database query errors', async () => {
      mockPrisma.admin.findMany.mockRejectedValue(new Error('Database error'));

      await expect(exportAllData()).rejects.toThrow('Database error');
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(1099511627776)).toBe('1 TB');
    });

    it('should handle decimal values', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB'); // 1.5 KB
      expect(formatFileSize(2621440)).toBe('2.5 MB'); // 2.5 MB
    });
  });

  describe('maskDatabaseUrl', () => {
    it('should mask database credentials', () => {
      const url = 'postgresql://username:password@localhost:5432/database';
      const masked = maskDatabaseUrl(url);
      
      expect(masked).toBe('postgresql://***:***@localhost:5432/database');
      expect(masked).not.toContain('username');
      expect(masked).not.toContain('password');
    });

    it('should handle invalid URLs gracefully', () => {
      const result = maskDatabaseUrl('invalid-url');
      expect(result).toBe('hidden');
    });

    it('should handle undefined input', () => {
      const result = maskDatabaseUrl(undefined);
      expect(result).toBe('hidden');
    });
  });

  describe('createBackup integration', () => {
    beforeEach(() => {
      // Mock file system operations
      mockFs.existsSync = jest.fn().mockReturnValue(true);
      mockFs.mkdirSync = jest.fn();
      mockFs.writeFileSync = jest.fn();
      mockFs.unlinkSync = jest.fn();
      mockFs.createWriteStream = jest.fn().mockReturnValue({
        on: jest.fn((event, callback) => {
          if (event === 'close') setTimeout(callback, 0);
        })
      });

      // Mock archiver
      const mockArchive = {
        pipe: jest.fn(),
        file: jest.fn(),
        append: jest.fn(),
        finalize: jest.fn().mockResolvedValue(undefined),
        pointer: jest.fn().mockReturnValue(1024),
        on: jest.fn()
      };
      mockArchiver.mockReturnValue(mockArchive);

      // Mock database connection and queries
      mockPrisma.$connect.mockResolvedValue(undefined);
      mockPrisma.$disconnect.mockResolvedValue(undefined);
      
      // Mock minimal data for all tables
      const mockEmptyArray = [];
      mockPrisma.admin.findMany.mockResolvedValue([{ id: '1', email: 'admin@test.com' }]);
      mockPrisma.staff.findMany.mockResolvedValue(mockEmptyArray);
      mockPrisma.category.findMany.mockResolvedValue(mockEmptyArray);
      mockPrisma.salaryStructure.findMany.mockResolvedValue(mockEmptyArray);
      mockPrisma.loan.findMany.mockResolvedValue(mockEmptyArray);
      mockPrisma.loanRepayment.findMany.mockResolvedValue(mockEmptyArray);
      mockPrisma.issue.findMany.mockResolvedValue(mockEmptyArray);
      mockPrisma.issueComment.findMany.mockResolvedValue(mockEmptyArray);
      mockPrisma.document.findMany.mockResolvedValue(mockEmptyArray);
      mockPrisma.auditTrail.findMany.mockResolvedValue(mockEmptyArray);
      mockPrisma.payrollSchedule.findMany.mockResolvedValue(mockEmptyArray);
      mockPrisma.systemSettings.findMany.mockResolvedValue(mockEmptyArray);
      mockPrisma.shareableLink.findMany.mockResolvedValue(mockEmptyArray);
    });

    it('should create backup successfully', async () => {
      const result = await createBackup();

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.result).toHaveProperty('fileName');
      expect(result.result).toHaveProperty('filePath');
      expect(result.result).toHaveProperty('size');
      expect(result.result).toHaveProperty('totalRecords');
      expect(result.result).toHaveProperty('backupId');
      expect(result.result).toHaveProperty('duration');
    });

    it('should handle database connection errors', async () => {
      mockPrisma.$connect.mockRejectedValue(new Error('Connection failed'));

      const result = await createBackup();

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(2);
    });

    it('should handle file system errors', async () => {
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      mockFs.existsSync.mockReturnValue(false);

      const result = await createBackup();

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(3);
    });

    it('should handle export errors', async () => {
      mockPrisma.admin.findMany.mockRejectedValue(new Error('Export failed'));

      const result = await createBackup();

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Export failed');
    });

    it('should disconnect from database on completion', async () => {
      await createBackup();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });

    it('should disconnect from database on error', async () => {
      mockPrisma.admin.findMany.mockRejectedValue(new Error('Test error'));

      await createBackup();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });

  describe('CLI argument handling', () => {
    const originalArgv = process.argv;

    afterEach(() => {
      process.argv = originalArgv;
    });

    it('should handle help flag', async () => {
      process.argv = ['node', 'backup-utility.js', '--help'];
      
      // Re-require to get updated args
      jest.resetModules();
      const { createBackup } = require('../backup-utility');
      
      const result = await createBackup();
      
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should handle verbose flag', async () => {
      process.argv = ['node', 'backup-utility.js', '--verbose'];
      
      // Test would need to check if verbose logging is enabled
      // This is more of an integration test that would verify console output
    });

    it('should handle output directory flag', async () => {
      process.argv = ['node', 'backup-utility.js', '--output', '/custom/path'];
      
      // Test would verify that the custom output path is used
      // This requires mocking the file system operations appropriately
    });
  });
});