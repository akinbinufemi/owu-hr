import { BackupService, BackupData } from '../backupService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client');
const mockPrisma = {
  admin: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  staff: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  category: {
    findMany: jest.fn(),
    count: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn()
  },
  salaryStructure: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  loan: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  loanRepayment: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  issue: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  issueComment: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  document: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  auditTrail: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  payrollSchedule: {
    findMany: jest.fn(),
    count: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn()
  },
  systemSettings: {
    findMany: jest.fn(),
    count: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn()
  },
  shareableLink: {
    findMany: jest.fn(),
    count: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn()
  },
  $transaction: jest.fn()
};

(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

describe('BackupService', () => {
  let backupService: BackupService;

  beforeEach(() => {
    backupService = new BackupService();
    jest.clearAllMocks();
  });

  describe('exportAllData', () => {
    it('should export all data successfully', async () => {
      // Mock data
      const mockAdmins = [{ id: '1', email: 'admin@test.com', fullName: 'Test Admin' }];
      const mockStaff = [{ id: '1', employeeId: 'EMP001', fullName: 'Test Staff' }];
      const mockCategories = [{ id: '1', name: 'Test Category', type: 'POSITION' }];

      // Setup mocks
      mockPrisma.admin.findMany.mockResolvedValue(mockAdmins);
      mockPrisma.staff.findMany.mockResolvedValue(mockStaff);
      mockPrisma.category.findMany.mockResolvedValue(mockCategories);
      mockPrisma.salaryStructure.findMany.mockResolvedValue([]);
      mockPrisma.loan.findMany.mockResolvedValue([]);
      mockPrisma.loanRepayment.findMany.mockResolvedValue([]);
      mockPrisma.issue.findMany.mockResolvedValue([]);
      mockPrisma.issueComment.findMany.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.auditTrail.findMany.mockResolvedValue([]);
      mockPrisma.payrollSchedule.findMany.mockResolvedValue([]);
      mockPrisma.systemSettings.findMany.mockResolvedValue([]);
      mockPrisma.shareableLink.findMany.mockResolvedValue([]);

      const result = await backupService.exportAllData('test-user');

      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('data');
      expect(result.metadata.totalRecords).toBe(3);
      expect(result.data.admins).toEqual(mockAdmins);
      expect(result.data.staff).toEqual(mockStaff);
      expect(result.data.categories).toEqual(mockCategories);
    });

    it('should handle export errors gracefully', async () => {
      mockPrisma.admin.findMany.mockRejectedValue(new Error('Database error'));

      await expect(backupService.exportAllData()).rejects.toThrow('Failed to export data');
    });
  });

  describe('validateBackupData', () => {
    it('should validate correct backup data structure', () => {
      const validBackupData: BackupData = {
        metadata: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          databaseUrl: 'masked-url',
          totalRecords: 1,
          backupId: 'test-id',
          createdBy: 'test-user',
          tables: { admins: 1 }
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

      expect(backupService.validateBackupData(validBackupData)).toBe(true);
    });

    it('should reject invalid backup data structure', () => {
      const invalidData = { invalid: 'data' };
      expect(backupService.validateBackupData(invalidData)).toBe(false);
    });

    it('should reject backup data without metadata', () => {
      const invalidData = {
        data: {
          admins: [],
          staff: []
        }
      };
      expect(backupService.validateBackupData(invalidData)).toBe(false);
    });

    it('should reject backup data without required data fields', () => {
      const invalidData = {
        metadata: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          totalRecords: 0,
          backupId: 'test-id'
        },
        data: {
          admins: []
          // Missing other required fields
        }
      };
      expect(backupService.validateBackupData(invalidData)).toBe(false);
    });
  });

  describe('importBackupData', () => {
    it('should import backup data successfully', async () => {
      const mockBackupData: BackupData = {
        metadata: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          databaseUrl: 'masked-url',
          totalRecords: 2,
          backupId: 'test-id',
          createdBy: 'test-user',
          tables: { admins: 1, categories: 1 }
        },
        data: {
          admins: [{ id: '1', email: 'admin@test.com', fullName: 'Test Admin' }],
          staff: [],
          categories: [{ id: '1', name: 'Test Category', type: 'POSITION' }],
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

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          ...mockPrisma,
          admin: { ...mockPrisma.admin, create: jest.fn() },
          category: { ...mockPrisma.category, createMany: jest.fn() }
        };
        return callback(mockTx);
      });

      await backupService.importBackupData(mockBackupData);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle import errors gracefully', async () => {
      const mockBackupData: BackupData = {
        metadata: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          databaseUrl: 'masked-url',
          totalRecords: 0,
          backupId: 'test-id',
          createdBy: 'test-user',
          tables: {}
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

      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(backupService.importBackupData(mockBackupData)).rejects.toThrow('Failed to import data');
    });
  });

  describe('getDatabaseStats', () => {
    it('should return database statistics', async () => {
      // Mock count methods
      mockPrisma.admin.count.mockResolvedValue(5);
      mockPrisma.staff.count.mockResolvedValue(10);
      mockPrisma.category.count.mockResolvedValue(3);
      mockPrisma.salaryStructure.count.mockResolvedValue(8);
      mockPrisma.loan.count.mockResolvedValue(2);
      mockPrisma.loanRepayment.count.mockResolvedValue(4);
      mockPrisma.issue.count.mockResolvedValue(1);
      mockPrisma.issueComment.count.mockResolvedValue(2);
      mockPrisma.document.count.mockResolvedValue(15);
      mockPrisma.auditTrail.count.mockResolvedValue(20);
      mockPrisma.payrollSchedule.count.mockResolvedValue(6);
      mockPrisma.systemSettings.count.mockResolvedValue(12);
      mockPrisma.shareableLink.count.mockResolvedValue(1);

      const stats = await backupService.getDatabaseStats();

      expect(stats).toEqual({
        admins: 5,
        staff: 10,
        categories: 3,
        salaryStructures: 8,
        loans: 2,
        loanRepayments: 4,
        issues: 1,
        issueComments: 2,
        documents: 15,
        auditTrails: 20,
        payrollSchedules: 6,
        systemSettings: 12,
        shareableLinks: 1
      });
    });

    it('should handle database stats errors', async () => {
      mockPrisma.admin.count.mockRejectedValue(new Error('Database error'));

      await expect(backupService.getDatabaseStats()).rejects.toThrow('Database error');
    });
  });
});